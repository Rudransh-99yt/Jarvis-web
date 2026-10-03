# Web Jarvis — Project State

## 1. Project Identity & Purpose
Web Jarvis is an intelligent multi-sector AI operating platform and cybernetic assistant designed for browser environments with a full-stack Node.js API foundation, real-time streaming AI connectivity via Google Gemini, server-authoritative tool execution, and a durable core persistence and data foundation.

---

## 2. Architecture Decisions
- **Architectural Pattern**: **Option B (Full-Stack Decoupled with Modular Sector Architecture & Durable Persistence)** actively deployed.
  - Client: React 19 + TypeScript + Vite 6 + Tailwind CSS v4.
  - Backend: Node.js 22 + Express 5 running on unified port `3000` via `tsx server.ts`.
  - Development Mode: Express mounting Vite dev middleware (`vite.middlewares`).
  - Production Mode: Express serving compiled static frontend from `dist/`.
  - Persistence Layer: Atomic, lock-free local JSON document store (`server/data/fileStore.ts`) behind domain repository interfaces (`server/data/repository.ts`) with zero external native/C++ runtime dependencies.
  - Model Provider: Google Gemini (`gemini-3.8-flash`) via `@google/genai` TypeScript SDK with server-side key isolation.
  - Provider Abstraction: `AiProvider` with dual support for normal text generation and multi-turn function calling with tool execution.
  - Tool Execution Engine: Whitelisted, sandboxed, isolated execution layer in `server/tools/` across core diagnostics, engineering telemetry, and academic sectors.
  - Workspace Isolation: Explicit `workspaceId` boundaries across conversations, knowledge spaces, sources, and audit logs.
  - Protocol State: Server-authoritative `serverProtocolStore`.
  - Conversation History: Durable, sliding-window message persistence backed by `jarvisData.conversations`.
  - Streaming: Server-Sent Events (SSE) on `POST /api/chat` with `start`, `tool_start`, `tool_result`, `chunk`, `done`, `error`.

---

## 3. Completed Work

### Milestone 1 — Backend & API Foundation (COMPLETED)
- Node.js Express server (`server.ts`) implemented with Vite middleware support on port `3000`.
- Health check endpoint `GET /api/health` and alias `GET /api/system/health`.
- Shared API TypeScript schemas in `src/types/api.ts`.
- Non-blocking client API health handshake on mount.

### Milestone 2 + 3 — Gemini Provider & Streaming Conversation Foundation (COMPLETED)
- Official Gemini SDK Integration (`server/providers/geminiProvider.ts`) with `gemini-3.8-flash`.
- Provider Abstraction Layer (`server/providers/providerManager.ts`) with `FallbackMockProvider`.
- Conversation session tracking with sliding-window history.
- Server-Sent Events (SSE) Streaming (`server/routes/chat.ts`).
- Frontend HUD Streaming Integration (`src/App.tsx`, `src/components/TerminalLogs.tsx`).

### Milestone 4 — Tool Calling & Multi-Sector Platform (COMPLETED)
- Server tool registry with 12 allowlisted tools across core, diagnostics, telemetry, education, and knowledge spaces.
- Sandboxed `ToolExecutor` with argument schema validation and error isolation.
- Multi-round Gemini function calling loop with SSE tool events.
- Expanded multi-sector AppShell supporting Command Deck, Education (Student & Teacher modes), and future planned sectors.

### Milestone 5 — Core Platform Persistence & Data Foundation (COMPLETED)
- **Core Data Contracts (`server/data/types.ts`)**:
  - `User`: id, displayName, email, role, department, createdAt.
  - `Workspace`: id, name, description, ownerId, activeSectors, createdAt, updatedAt.
  - `WorkspaceMembership`: id, workspaceId, userId, role, joinedAt.
  - `Conversation`: id, workspaceId, userId, title, sector, createdAt, updatedAt, messageCount.
  - `Message`: id, conversationId, role, content, timestamp, toolCall?, toolResult?.
  - `KnowledgeSpaceRecord`: id, workspaceId, name, description, category, ownerId, classId, tags, suggestedQuestions, createdAt, updatedAt.
  - `KnowledgeSourceRecord`: id, workspaceId, knowledgeSpaceId, name, type, mimeType, size, status (`pending` | `processing` | `ready` | `failed`), author, summary, fullText, tokenCount, createdAt, updatedAt.
  - `ToolAuditEvent`: id, workspaceId, sessionId, toolName, sector, args, ok, executionTimeMs, timestamp, errorMessage?.
  - `DatabaseSchema`: Full typed snapshot definition for durable storage.
- **Repository Abstraction Layer (`server/data/repository.ts`)**:
  - `IUserRepository`, `IWorkspaceRepository`, `IConversationRepository`, `IKnowledgeRepository`, `IEducationRepository`, `IAuditRepository`, and root `IJarvisDataRepository`.
  - Decouples all sector and tool logic from underlying storage mechanism, enabling future migration to PostgreSQL or Cloud SQL without changing application domain code.
- **Durable Local Storage Engine (`server/data/fileStore.ts` & `server/data/diskRepository.ts`)**:
  - Atomic write-to-temp and atomic rename strategy (`jarvis-db.json`) preventing corruption on sudden termination.
  - Debounced auto-save flush with synchronous and asynchronous flush controls.
  - Survives server restarts with 100% data integrity.
- **In-Memory Repository Implementation (`server/data/memoryRepository.ts`)**:
  - Pure in-memory repository implementation for ultra-fast, isolated automated testing.
- **Deterministic & Idempotent Seed Data (`server/data/seedData.ts`)**:
  - Default workspace `ws-stark-core` ("Stark Industries Master Workspace").
  - Users: Tony Stark (Commander), Dr. Sarah (Teacher), Alex Chen (Student), Maya Lin (Student).
  - 4 Academic Classes (PHYS-301, MATH-240, CS-420, ENG-510).
  - 4 Assignments with student submissions and teacher grading records.
  - 2 Knowledge Spaces with indexed source documents and verified summaries.
  - Idempotent: does not duplicate or overwrite existing user data on subsequent server startups.
- **Migrated Stores**:
  - `server/sectors/education/educationStore.ts` migrated to persist all classes, assignments, submissions, and knowledge spaces to `jarvisData`.
  - `server/session/sessionStore.ts` migrated to persist conversations and chat history to `jarvisData.conversations`.
  - `server/routes/chat.ts` logs tool executions directly to `jarvisData.audit`.
- **REST API Routes (`server.ts`, `server/routes/`)**:
  - `GET /api/workspaces` & `GET /api/workspaces/:id`
  - `GET /api/conversations` & `POST /api/conversations` & `GET /api/conversations/:id`
  - `GET /api/knowledge-spaces` & `POST /api/knowledge-spaces` & `GET /api/knowledge-spaces/:id`
  - `GET /api/health` reports persistence status (`driver: 'json-file-store', persistent: true`).
- **Workspace Security & Boundary Isolation**:
  - Explicit workspaceId filtering on all knowledge, conversation, and membership queries.
  - API keys strictly isolated on the backend server.
- **Comprehensive Automated Test Coverage**:
  - 58/58 test assertions passing across `tests/milestone4_tools.test.ts`, `tests/education_sector.test.ts`, and `tests/persistence.test.ts`.

---

## 4. Current Constraints & Active Invariants
- Zero server secrets or API keys leaked to client code or bundles.
- No third-party cloud database required for local dev (durable local storage used).
- Full compatibility with all existing Command Deck HUD, Education Sector, and Gemini tool calling.

---

## 5. Next Planned Milestone
**Milestone 6 — Grounded RAG & Multi-Source Synthesis Engine**:
1. Deep vector embeddings & semantic search integration for Knowledge Spaces.
2. Full PDF/document ingestion and chunking pipeline.
3. Multi-source comparative synthesis with precision inline citations.
4. Audio briefing / synthesized lecture summary generation.
