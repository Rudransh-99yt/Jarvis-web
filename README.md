# J.A.R.V.I.S. Web Platform

An intelligent multi-sector AI operating platform and cybernetic assistant inspired by Stark Industries J.A.R.V.I.S., engineered with real-time telemetry, procedural audio feedback, speech synthesis, an interactive Arc Reactor core, academic workspace tooling, server-side tool execution, a durable core persistence foundation, and a source-grounded RAG knowledge engine.

---

## Project Purpose
Web Jarvis provides an intelligent in-browser operating environment featuring a tactical Command Deck, an academic Education Sector (Student & Teacher workflows, assignments, grading, and NotebookLM-style grounded knowledge workspaces), a scientific Research & Labs Sector (persistent research projects, question tracking, evidence locking, research notes, AI research assistant, and formal synthesis reports), server-side tool execution via Google Gemini streaming, durable local data persistence, and a source-grounded RAG retrieval & multi-source synthesis engine with verifiable citations.

---

## Architecture Overview
The project is built on **Full-Stack Decoupled Architecture with Modular Sectors & Persistence**:
- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4 with multi-sector AppShell.
- **Backend**: Node.js 22 + Express 5 API gateway running on unified port `3000`.
- **Core Persistence Layer**: Clean repository interfaces (`server/data/repository.ts`) backed by an atomic local JSON document store (`server/data/fileStore.ts`) ensuring all user workspaces, conversations, courses, assignments, submissions, knowledge spaces, sources, and vector chunks survive server restarts with 100% integrity.
- **AI Engine**: Google Gemini (`gemini-3.7-flash`) via the official `@google/genai` TypeScript SDK with real-time Server-Sent Events (SSE) streaming and multi-round function calling.
- **Grounded RAG Engine (`server/rag/`)**:
  - **Ingestion Pipeline**: Document extraction (Plain text, Markdown with header sections, PDF text streams), normalization, SHA-256 content hashing, duplicate ingestion prevention, paragraph/sentence chunking with stable IDs (`chunk-${sourceId}-${index}`), and local vector indexing.
  - **Embedding Provider Abstraction**: `EmbeddingProvider` interface with `DeterministicLocalEmbeddingProvider` (128-dim subword n-gram vector feature embedder, ₹0 local execution) and `GeminiEmbeddingProvider` (`text-embedding-004`).
  - **Local Persistent Vector Index**: Cosine similarity search over indexed chunks stored in `jarvisData.knowledgeChunks`.
  - **Hybrid Retrieval**: Weighted fusion of vector cosine similarity (65%) and BM25-style lexical keyword matching (35%).
  - **Grounded Synthesis & Refusal Guard**: Strict workspace/class authorization checks, refusal behavior for ungrounded queries (0 fake citations), and structured citations with source title, chunk ID, location, and excerpt.
- **Tool Execution Engine**: Isolated server-side `ToolExecutor` and `ToolRegistry` with 31 deterministic tools across system diagnostics, engineering telemetry, academic sector, RAG knowledge spaces, research & labs, and storage.
- **Unified File & Storage Foundation**: Provider-agnostic storage abstraction with secure `LocalStorageProvider` (`data/storage/objects/`), persistent `FileRecord` models, multi-tenant isolation, 25MB file validation, RAG ingestion bridge, and cloud-ready provider configuration (cloud storage is not yet enabled).
- **Resilience**: Clean provider abstraction with built-in auxiliary fallback if external keys are unconfigured or unavailable.

Refer to [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`PROJECT_STATE.md`](./PROJECT_STATE.md) for architectural details and implementation status.

---

## Development Commands

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (optional for live Gemini streaming)
cp .env.example .env
# Set GEMINI_API_KEY in .env

# 3. Start development server on port 3000
npm run dev

# 4. Run full automated test suite (Tools + Education + Persistence + RAG + Research + Storage)
npm test

# 5. Run type check and linting
npm run lint

# 6. Build for production
npm run build
```
