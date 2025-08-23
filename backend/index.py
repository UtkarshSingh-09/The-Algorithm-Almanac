import os, json
import chromadb
from sentence_transformers import SentenceTransformer

DB_PATH      = "chroma_db"
COLLECTION   = "ml_knowledge"
JSON_FILE    = "knowledge_base.json"
MODEL_NAME   = "all-MiniLM-L6-v2"
BATCH_SIZE   = 100

# 1) Fresh start
if os.path.isdir(DB_PATH):
    import shutil
    shutil.rmtree(DB_PATH)

# 2) Load KB
with open(JSON_FILE, "r", encoding="utf-8") as f:
    knowledge_base = json.load(f)

# 3) Init Chroma + model
client = chromadb.PersistentClient(path=DB_PATH)
try:
    client.delete_collection(COLLECTION)
except Exception:
    pass
collection = client.create_collection(COLLECTION)
embedder = SentenceTransformer(MODEL_NAME)

# 4) Prepare batches
ids, embeddings, documents, metadatas = [], [], [], []
counter = 1

for question, answer in knowledge_base.items():
    if not isinstance(answer, str) or not answer.strip():
        continue

    # Embed the QUESTION (retrieval key)
    emb = embedder.encode([question]).tolist()[0]

    # Store a document that includes BOTH Q and A for fallback usefulness
    doc = f"Q: {question}\nA: {answer}"

    ids.append(f"qa_{counter:05d}")
    embeddings.append(emb)
    documents.append(doc)
    metadatas.append({"question": question, "answer": answer})

    counter += 1

    # Write periodically in batches
    if len(ids) >= BATCH_SIZE:
        collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
        ids, embeddings, documents, metadatas = [], [], [], []

# Flush remaining
if ids:
    collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)

print(f"Indexed {counter-1} Q&A pairs")
print(f"Collection now contains {collection.count()} documents")
