# J.A.R.V.I.S. Web Platform

An intelligent multi-sector AI operating platform and cybernetic assistant inspired by Stark Industries J.A.R.V.I.S., engineered with real-time telemetry, procedural audio feedback, speech synthesis, an interactive Arc Reactor core, academic workspace tooling, server-side tool execution, and a durable core persistence foundation.

---

## Project Purpose
Web Jarvis provides an intelligent in-browser operating environment featuring a tactical Command Deck, an academic Education Sector (Student & Teacher workflows, assignments, grading, and NotebookLM-style grounded knowledge workspaces), server-side tool execution via Google Gemini streaming, and durable local data persistence.

---

## Architecture Overview
The project is built on **Full-Stack Decoupled Architecture with Modular Sectors & Persistence**:
- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4 with multi-sector AppShell.
- **Backend**: Node.js 22 + Express 5 API gateway running on unified port `3000`.
- **Core Persistence Layer**: Clean repository interfaces (`server/data/repository.ts`) backed by an atomic local JSON document store (`server/data/fileStore.ts`) ensuring all user workspaces, conversations, courses, assignments, submissions, and knowledge spaces survive server restarts.
- **AI Engine**: Google Gemini (`gemini-3.8-flash`) via the official `@google/genai` TypeScript SDK with real-time Server-Sent Events (SSE) streaming and multi-round function calling.
- **Tool Execution Engine**: Isolated server-side `ToolExecutor` and `ToolRegistry` with 12 deterministic tools across system diagnostics, engineering telemetry, and education.
- **Grounded Knowledge Spaces**: Multi-source document indexing (PDFs, notes, lecture transcripts) with grounded RAG query engine and citation tracking.
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

# 4. Run automated test suites (Milestone 4 Tools + Education Sector + Persistence)
npm test

# 5. Run type check and linting
npm run lint

# 6. Build for production
npm run build
```
