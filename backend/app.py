# ──────────────────────────────────────────────────────────────
#  AI Answer Generator – RAG with Flan‑T5 + ChromaDB (enhanced)
# ──────────────────────────────────────────────────────────────
import asyncio
import numpy as np
import torch
import chromadb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import T5Tokenizer, T5ForConditionalGeneration
from sentence_transformers import SentenceTransformer


# ── FastAPI & CORS ─────────────────────────────────────────────
app = FastAPI(title="AI Answer Generator", description="RAG Pipeline with Flan‑T5")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ────────────────────────────────────────────────────
print("--- MODEL LOADING ---")
GEN_NAME = "google/flan-t5-base"
gen_tok = T5Tokenizer.from_pretrained(GEN_NAME)
gen_lm = T5ForConditionalGeneration.from_pretrained(GEN_NAME)
ret_model = SentenceTransformer("all-MiniLM-L6-v2")
print("--- MODELS LOADED SUCCESSFULLY ---")

# ── ChromaDB ──────────────────────────────────────────────────
DB_PATH = "chroma_db"
COLLECTION_NAME = "ml_knowledge"
print(f"--- CONNECTING TO DATABASE AT: {DB_PATH} ---")

client = chromadb.PersistentClient(path=DB_PATH)
try:
    collection = client.get_collection(COLLECTION_NAME)
    print(f"--- SUCCESSFULLY CONNECTED TO COLLECTION '{COLLECTION_NAME}' ---")
    print(f"--- COLLECTION CONTAINS {collection.count()} DOCUMENTS ---")
except Exception:
    collection = None
    print(f"--- FATAL: COULD NOT CONNECT TO COLLECTION '{COLLECTION_NAME}' ---")
    print("--- DELETE 'chroma_db' AND RE-RUN YOUR INDEXER IF NEEDED ---")


# ── Helpers ───────────────────────────────────────────────────
def _only_dicts(items):
    """Yield only dict metadata items."""
    for it in items:
        if isinstance(it, dict):
            yield it

def _cos(a, b):
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) or 1e-8
    return float(np.dot(a, b) / denom)

SIMILARITY_VERBATIM = 0.87  # confident threshold to return KB verbatim


def _query_chroma(query_text: str, n: int = 5):
    """Return (metas:list[dict], docs:list[str], q_emb:list[list[float]]) safely."""
    if collection is None:
        return [], [], []
    q_emb = ret_model.encode([query_text]).tolist()
    res = collection.query(query_embeddings=q_emb, n_results=n)
    docs = res.get("documents", [[]])
    metas = res.get("metadatas", [[]])
    docs0 = docs[0] if docs else []
    metas0 = list(_only_dicts(metas)) if metas else []
    return metas0, docs0, q_emb


def _verbatim_if_confident(query_text: str, metas, q_emb):
    """Return KB answer directly when the top match is clearly correct."""
    if not metas:
        return None
    if isinstance(metas, list):
        top = metas[0] if metas else None
    else:
        top = metas
    if not isinstance(top, dict):
        return None
    top = metas
    q_norm = query_text.lower().strip(" ?")
    top_q = (top.get("question") or "").lower().strip(" ?")
    if top_q and q_norm == top_q:
        return top.get("answer")
    try:
        if q_emb is not None:
            top_q_emb = ret_model.encode([top.get("question", "")])[0]
            if _cos(q_emb, top_q_emb) >= SIMILARITY_VERBATIM:
                return top.get("answer")

    except Exception:
        pass
    return None


def _build_context_from_hits(metas, docs, max_items=3):
    """Prefer metadata Q/A; fall back to documents if needed."""
    blocks = []
    for m in metas[:max_items]:
        q = m.get("question") or ""
        a = m.get("answer") or ""
        if a:
            blocks.append(f"Q: {q}\nA: {a}")
    if not blocks and docs:
        for d in docs[:max_items]:
            if d:
                blocks.append(f"Doc: {d}")
    return "\n\n".join(blocks)


def _prompt(context: str, question: str):
    # Deterministic copy instruction to avoid paraphrases.
    return (
        "Copy the answer text exactly as it appears after 'A:'. "
        "Do not add or remove words. If the context doesn't contain an answer, say \"I don't know based on the provided knowledge.\".\n\n"
        f"{context}\n\n"
        f"Q: {question}\nA:"
    )


def _generate(prompt: str):
    """Deterministic generation to preserve KB wording."""
    enc = gen_tok(prompt, return_tensors="pt", truncation=True, max_length=1024)
    with torch.no_grad():
        out = gen_lm.generate(
            enc.input_ids,
            attention_mask=enc.attention_mask,
            max_new_tokens=180,
            temperature=0.0,
            do_sample=False,
            num_beams=1,
            eos_token_id=gen_tok.eos_token_id,
            pad_token_id=gen_tok.eos_token_id,
        )
    text = gen_tok.decode(out[0], skip_special_tokens=True)
    return text.split("A:")[-1].strip() if "A:" in text else text.strip()

# ===================== ADDITIONS: Query expansion + multi-retrieval =====================

def _expand_queries(user_text: str):
    """Generate simple variants so short keywords match Q/A like 'What is ...?'"""
    q = (user_text or "").strip()
    if not q:
        return []
    q_lc = q.lower().strip(" ?!.,;:")

    variants = [q, q_lc]
    # If short (likely a topic), add definition-style variants
    if len(q_lc.split()) <= 3:
        variants += [
            f"what is {q_lc}?",
            f"define {q_lc}",
            f"definition of {q_lc}",
            f"explain {q_lc}",
        ]
    # Deduplicate preserving order
    seen, uniq = set(), []
    for v in variants:
        if v not in seen:
            uniq.append(v); seen.add(v)
    return uniq


def _multi_query_retrieve(user_text: str, n_per_query=4, max_total=10):
    """
    Run retrieval for several query variants and merge results.
    Returns (merged_metas, merged_docs).
    """
    if collection is None:
        return [], []
    variants = _expand_queries(user_text)
    scored = []

    for v in variants:
        try:
            v_emb = ret_model.encode([v])[0]
            res = collection.query(query_embeddings=[v_emb.tolist()], n_results=n_per_query)
        except Exception:
            continue

        docs = res.get("documents", [[]])
        metas = res.get("metadatas", [[]])

        docs0 = docs if docs else []
        metas0 = metas if metas else []

        for m, d in zip(metas0, docs0):
            if not isinstance(m, dict):
                continue
            q_hit = m.get("question", "")
            score = 0.0
            try:
                if q_hit:
                    q_hit_emb = ret_model.encode([q_hit])
                    score = _cos(v_emb, q_hit_emb)
            except Exception:
                score = 0.0
            scored.append((score, m, d))

    # Sort by score desc and keep unique (question, answer) pairs
    scored.sort(key=lambda x: x, reverse=True)
    seen = set()
    merged_metas, merged_docs = [], []
    for score, m, d in scored:
        key = (m.get("question", ""), m.get("answer", ""))
        if key in seen:
            continue
        seen.add(key)
        merged_metas.append(m)
        merged_docs.append(d)
        if len(merged_metas) >= max_total:
            break

    return merged_metas, merged_docs
# =================== END ADDITIONS ===================

# ── Request model ─────────────────────────────────────────────
class Question(BaseModel):
    text: str


# ── Endpoints ─────────────────────────────────────────────────
@app.post("/ask")
async def ask(q: Question):
    """Main QA endpoint: retrieve, optionally shortcut, else generate."""
    question = (q.text or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
        # ---------- ADD: expanded retrieval first (non-destructive) ----------
    exp_metas, exp_docs = _multi_query_retrieve(question, n_per_query=4, max_total=10)

    if exp_metas or exp_docs:
        metas, docs, q_emb = exp_metas, exp_docs, None
    else:
        # Fallback to your original single-query path
        pass
    # --------------------------------------------------------------------

    metas, docs, q_emb = _query_chroma(question, n=5)

    if collection is None:

        raise HTTPException(status_code=503, detail="Knowledge base unavailable")


    # Verbatim shortcut for high-confidence matches
    direct = _verbatim_if_confident(question, metas, q_emb)
    if direct:
        return {"question": question, "answer": direct, "source": "verbatim"}

    # Build context (uses metadata; falls back to docs)
    context = _build_context_from_hits(metas, docs, max_items=3)

    if not context.strip():
        raise HTTPException(status_code=503, detail="No relevant information found in knowledge base")

    prompt = _prompt(context, question)
    answer = await asyncio.to_thread(_generate, prompt)

    return {
        "question": question,
        "answer": answer,
        "source": "lm",
        "context_used": True,
        "context_chars": len(context),
    }


@app.get("/test-retrieval/{query}")
async def test_retrieval(query: str):
    """Diagnostic: inspect raw shapes to validate indexing correctness."""
    try:
        metas, docs, _ = _query_chroma(query, n=3)
        # Raw peek for verification
        res = collection.query(
            query_embeddings=ret_model.encode([query]).tolist(),
            n_results=3,
        ) if collection else {"metadatas": [], "documents": []}
        raw_metas = res.get("metadatas", [])
        raw_docs = res.get("documents", [])
        return {
            "query": query,
            "metas_count": len(metas),
            "docs_count": len(docs),
            "context_preview": _build_context_from_hits(metas, docs)[:400],
            "raw_metadatas_shape": f"{len(raw_metas)} x {len(raw_metas[0]) if raw_metas else 0}",
            "raw_metadatas_preview": raw_metas[:1],
            "raw_documents_preview": [d[:120] for d in (raw_docs if raw_docs else [])],
        }
    except Exception as e:
        return {"error": str(e), "query": query}


@app.get("/health")
async def health():
    return {
        "ok": True,
        "models_loaded": True,
        "collection_available": collection is not None,
        "collection_count": collection.count() if collection else 0,
    }


@app.get("/")
async def root():
    return {
        "message": "AI Answer Generator API",
        "endpoints": {
            "ask": "POST /ask",
            "test": "GET /test-retrieval/{query}",
            "health": "GET /health",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
