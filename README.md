# The-Algorithm-Almanac

![Python](https://img.shields.io/badge/PYTHON-3.9%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FASTAPI-0.95%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![ChromaDB](https://img.shields.io/badge/CHROMADB-VECTOR_STORE-E85E00?style=for-the-badge)
![PyTorch](https://img.shields.io/badge/PYTORCH-DEEP_LEARNING-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)

A **Retrieval-Augmented Generation (RAG)** system designed to answer technical questions based on the book *"Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow"* by Aurélien Géron.

This project processes the book's content into a vector database and uses the **Flan-T5** Large Language Model to provide accurate, context-aware answers to user queries via a FastAPI backend.

---

## 🏗️ System Architecture

The application follows a modern microservice-style architecture, ensuring scalability and separation of concerns.

1.  **📥 Ingestion Layer** Raw JSON data is processed, chunked, and embedded using `sentence-transformers`.
2.  **💾 Storage Layer** Vector embeddings are persisted in **ChromaDB** for lightning-fast semantic search.
3.  **🤖 Inference Layer** User queries are expanded, context-matched, and synthesized into natural language using **Google's Flan-T5 LLM**.
4.  **💻 Presentation Layer** A responsive React frontend consumes the API to deliver a seamless, ChatGPT-like experience.

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| 🔍 **RAG Pipeline** | Grounded generation retrieves exact context to minimize hallucinations. |
| 🧠 **Smart Expansion** | Automatically expands acronyms (e.g., "SVM" → "Support Vector Machine") for better search. |
| 🛡️ **Verbatim Guardrails** | Deterministic routing bypasses the LLM for direct definitions, ensuring **100% accuracy**. |
| 🏷️ **Source Transparency** | UI indicators show if a response was "Generated" or "Retrieved" directly from text. |
| 🎨 **Modern UI/UX** | A polished interface built with **Tailwind CSS** and **Shadcn UI** principles. |

---

## 🛠️ Technical Stack

### **Backend & AI**
![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.95+-009688?style=flat-square&logo=fastapi&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-orange?style=flat-square)
![HuggingFace](https://img.shields.io/badge/LLM-Flan_T5-yellow?style=flat-square)

### **Frontend**
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Type_Safe-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF?style=flat-square&logo=vite&logoColor=white)

---

## 📂 Repository Structure

```text
The-Algorithm-Almanac/
├── 🐍 backend/               # Server-side Logic
│   ├── chroma_db/            # Persistent Vector Store
│   ├── main.py               # FastAPI Application Entry Point
│   ├── index.py              # Data Ingestion & Indexing Script
│   ├── knowledge_base.json   # Source Data (Q&A Pairs)
│   └── requirements.txt      # Python Dependencies
│
├── ⚛️ frontend/              # Client-side Application
│   ├── src/                  # Source Code
│   │   ├── main.tsx          # Core Chat Component
│   │   └── index.css         # Global Styles
│   ├── package.json          # NPM Configuration
│   ├── tailwind.config.ts    # Design System Config
│   └── vite.config.ts        # Bundler Config
│
└── 📄 README.md              # Project Documentation
```
---

## ⚡ Getting Started Guide

### Prerequisites
* **Python 3.9+**
* **Node.js 16+**
* Legal copy of source material (converted to `knowledge_base.json`)

### Backend Configuration

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```
**Data Ingestion (Critical Step):**
```bash
python index.py
```
**Launch Server**
```bash
python main.py
```

**Server active at http://localhost:8000**

### Frontend Configuration
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
**Access app at http://localhost:5173**

---
## 🔌 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/ask` | **Primary Endpoint.** Accepts `{"text": "query"}`. Returns answer & source metadata. |
| `GET` | `/health` | Status check for models and DB. |
| `GET` | `/test-retrieval/{q}` | **Debug.** Inspect raw vector matches. |
| `GET` | `/docs` | Interactive Swagger UI. |

---

## 🔧 Troubleshooting

* **Error: "Knowledge base unavailable"**
    * *Fix:* Run `python index.py` to build the `chroma_db` folder.
* **Error: CORS issues**
    * *Fix:* Whitelist `http://localhost:5173` in `main.py` middleware.
* **Performance: Slow first response**
    * *Note:* Models must download from Hugging Face on the first run.

---

## 📜 License & Disclaimer

This project is distributed under the **MIT License**.

> **Disclaimer:** This tool is for **educational purposes only**. The `knowledge_base.json` file is not included. Users must generate their own dataset from legally purchased copies of the source material.

---

<div align="center">
  <sub>Built with ❤️ by Utkarsh Singh</sub>
</div>
