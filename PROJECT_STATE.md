# Web Jarvis — Project State

## 1. Project Identity & Purpose
Web Jarvis is an intelligent multi-sector AI operating platform and cybernetic assistant designed for browser environments with a full-stack Node.js API foundation, real-time streaming AI connectivity via Google Gemini, server-authoritative tool execution, durable core persistence, and a source-grounded RAG knowledge engine.

---

## 2. Architecture Decisions
- **Architectural Pattern**: **Option B (Full-Stack Decoupled with Modular Sector Architecture & Durable Persistence)** actively deployed.
  - Client: React 19 + TypeScript + Vite 6 + Tailwind CSS v4.
  - Backend: Node.js 22 + Express 5 running on unified port `3000` via `tsx server.ts`.
  - Development Mode: Express mounting Vite dev middleware (`vite.middlewares`).
  - Production Mode: Express serving compiled static frontend from `dist/`.
  - Persistence Layer: Atomic, lock-free local JSON document store (`server/data/fileStore.ts`) behind domain repository interfaces (`server/data/repository.ts`) with zero external native/C++ runtime dependencies.
  - Model Provider: Google Gemini (`gemini-3.7-flash` / `gemini-3.8-flash`) via `@google/genai` TypeScript SDK with server-side key isolation.
  - Provider Abstraction: `AiProvider` with dual support for normal text generation and multi-turn function calling with tool execution.
  - Tool Execution Engine: Whitelisted, sandboxed, isolated execution layer in `server/tools/` across core diagnostics, engineering telemetry, academic, and RAG knowledge sectors (17 active tools).
  - RAG Architecture: Isolated 7-stage ingestion pipeline (`extraction` -> `normalization` -> `content hashing` -> `deduplication` -> `chunking` -> `embedding` -> `local vector index`), hybrid vector similarity + lexical BM25 retrieval, and grounded synthesis engine with structured citations and refusal guards.
  - Workspace Isolation: Explicit `workspaceId` and class-membership boundaries across conversations, knowledge spaces, sources, vector chunks, and audit logs.
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
- Official Gemini SDK Integration (`server/providers/geminiProvider.ts`) with `gemini-3.7-flash`.
- Provider Abstraction Layer (`server/providers/providerManager.ts`) with `FallbackMockProvider`.
- Conversation session tracking with sliding-window history.
- Server-Sent Events (SSE) Streaming (`server/routes/chat.ts`).
- Frontend HUD Streaming Integration (`src/App.tsx`, `src/components/TerminalLogs.tsx`).

### Milestone 4 — Tool Calling & Multi-Sector Platform (COMPLETED)
- Server tool registry with allowlisted tools across core, diagnostics, telemetry, education, and knowledge spaces.
- Sandboxed `ToolExecutor` with argument schema validation and error isolation.
- Multi-round Gemini function calling loop with SSE tool events.
- Expanded multi-sector AppShell supporting Command Deck, Education (Student & Teacher modes).

### Milestone 5 — Core Platform Persistence & Data Foundation (COMPLETED)
- Repository Abstraction Layer (`server/data/repository.ts`) with atomic write-to-temp JsonFileStore (`jarvis-db.json`).
- In-memory repository driver for fast unit testing.
- Idempotent seed data for users, workspaces, classes, assignments, and knowledge spaces.

### Milestone 8 — Grounded RAG & Multi-Source Knowledge Engine (COMPLETED)
- **Supported Source Types**: Plain text, Markdown (with section header hierarchy), and lightweight PDF stream extraction.
- **Source Metadata & Lifecycle**: Extended `KnowledgeSourceRecord` with `contentHash` (SHA-256), `ingestionStatus`, `embeddingStatus`, `chunkCount`, `tokenCount`, `author`, `summary`, and `errorMessage`.
- **7-Stage Ingestion Pipeline (`server/rag/ingestionPipeline.ts`)**:
  1. Document extraction (Plain text, Markdown, PDF)
  2. Text normalization & SHA-256 content hashing
  3. Deduplication check (prevents duplicate re-indexing of identical content hashes)
  4. Persistent record update
  5. Deterministic paragraph/sentence chunking (`server/rag/chunker.ts`) with stable IDs (`chunk-${sourceId}-${index}`) and configurable overlap
  6. Embedding generation via provider abstraction
  7. Local persistent vector index upsert
- **Embedding Provider Abstraction (`server/rag/embeddingProvider.ts`)**:
  - `EmbeddingProvider` interface (`embedText`, `embedTexts`, `dimensions`).
  - `DeterministicLocalEmbeddingProvider`: 128-dimensional dense feature embedder using subword n-gram hashing and L2 norm unit vectors. 100% deterministic, ₹0 local cost, zero external dependencies.
  - `GeminiEmbeddingProvider`: Connects to `@google/genai` (`text-embedding-004`) when `GEMINI_API_KEY` is present, with automatic fallback to local embedder.
- **Local Persistent Vector Index (`server/rag/vectorIndex.ts`)**:
  - Cosine similarity search with workspace & knowledge space filtering.
  - Fully synchronized with `jarvisData`.
- **Hybrid Retrieval Service (`server/rag/retrievalService.ts`)**:
  - Combines vector similarity (cosine) with lexical term matching (BM25-style frequency & title bonuses) using weighted alpha fusion (`0.65 * vector + 0.35 * lexical`).
  - Returns deterministically ranked chunks with source title, chunk ID, text, section, page, and score metrics.
- **Grounded Synthesis Engine & Refusal Guard (`server/rag/groundingService.ts`)**:
  - Strict authorization check (workspace and class enrollment for students).
  - Insufficient evidence refusal: if query scores below threshold, politely refuses with zero manufactured citations: "Based on the verified documents in this Knowledge Space, there is insufficient evidence to answer your inquiry."
  - Gemini 3.7 Flash synthesis with strict grounding instructions when online; deterministic local synthesizer fallback when offline.
  - Verifiable structured citations: maps exact excerpts, source titles, locations, and confidence scores.
- **Extended Tool Registry (6 New RAG Tools in `server/tools/ragTools.ts`)**:
  - `knowledge.source.add`: Add document & run ingestion pipeline.
  - `knowledge.source.list`: List space sources with status, chunk counts, and hashes.
  - `knowledge.source.ingest`: Trigger or re-run ingestion/re-indexing pipeline.
  - `knowledge.source.delete`: Purge source document and vector chunks.
  - `knowledge.retrieve`: Run hybrid vector + lexical retrieval.
  - `knowledge.query`: Run grounded Q&A with synthesis and citations.
- **Upgraded Knowledge Space UI (`src/sectors/education/views/KnowledgeWorkspaceView.tsx`)**:
  - Document upload modal with format selection (Markdown, Plain Text, PDF Extract, Notes).
  - Ingestion status badges (`ready`, `processing`, `pending`, `failed`), chunk counts, and content hash preview.
  - Source deletion & re-indexing action buttons.
  - Document & Vector Chunk Inspector modal.
  - Grounded Q&A interface with quick suggested prompts.
  - Interactive clickable citation cards that open excerpt details.
  - Insufficient evidence alert badge for ungrounded queries.
- **Comprehensive Test Suite (`tests/milestone8_rag.test.ts`)**:
  - 23/23 test assertions passing across all 22 required RAG specifications and Milestones 1-7 regression checks.
  - TypeScript validation (`tsc --noEmit`): 0 errors.
  - Production build (`npm run build`): Succeeded.

### Milestone 9 — Research & Labs Sector (COMPLETED)
- **First-Class Operating Sector**: Added `research` to active sectors in `AppShell`, `App.tsx`, and backend `/api/health`.
- **Persistent Data Models**:
  - `ResearchProject`: `id`, `workspaceId`, `ownerId`, `title`, `description`, `status` (`active`, `paused`, `completed`, `archived`), `researchQuestion`, `knowledgeSpaceIds`, timestamps.
  - `ResearchQuestion`: `id`, `projectId`, `workspaceId`, `title`, `question`, `status` (`open`, `investigating`, `answered`, `archived`), `priority` (`low`, `medium`, `high`, `critical`), `notes`, `linkedEvidenceIds`, `answer`, timestamps.
  - `EvidenceRecord`: References real ingested chunks (`chunkId`, `knowledgeSourceId`, `knowledgeSpaceId`, `sourceTitle`, `chunkText`, `citation`, `relevance`, `userNote`, `tags`, `createdAt`). Never fabricates citations.
  - `ResearchNote`: `id`, `projectId`, `workspaceId`, `title`, `content`, `linkedQuestionIds`, `linkedEvidenceIds`, `tags`, timestamps.
  - `ResearchReport`: Structured executive report model with `title`, `researchQuestion`, `executiveSummary`, `findings`, `evidenceReferences`, `sourceCitations`, `limitations`, `generatedAt`.
- **Repository Support**: Extended `IResearchRepository` and implemented full CRUD across `DiskJarvisDataRepository` and `MemoryJarvisDataRepository` with atomic disk persistence.
- **AI Research Assistant (`server/sectors/research/researchAssistant.ts`)**:
  - Multi-source grounded RAG across project's authorized Knowledge Spaces using `retrievalService.retrieveMultiSpace`.
  - Supported modes: `investigate`, `summarize`, `compare`, `supporting_evidence`, `conflicting_evidence`, `outline`, `report`.
  - Strict insufficient evidence refusal guard (returns `isGrounded: false` with 0 fabricated citations).
  - Gemini 3.8 / 3.7 Flash provider with deterministic local fallback synthesizer for tests/offline.
- **10 Namespaced Research Tools in `ToolRegistry`**:
  - `research.project.create`, `research.project.list`, `research.project.get`
  - `research.question.create`, `research.question.list`
  - `research.evidence.list`
  - `research.note.create`, `research.note.list`
  - `research.investigate`
  - `research.report.generate`
- **Research & Labs Cybernetic UI (`src/sectors/research/`)**:
  - `ProjectsOverviewView`: Projects grid, hero telemetry, filter by status, search, project initializer modal.
  - `ProjectWorkspaceView`: Multi-tab workspace with Overview, Questions, Evidence, Notes, Assistant, Reports.
  - `ResearchQuestionsPanel`: Priority tagging, status transitions, direct investigation dispatch.
  - `EvidencePanel`: Grounded chunk excerpts, relevance meters, verification badges, question filters.
  - `NotesPanel`: Fast markdown/text notes with linked questions and evidence pills.
  - `ResearchAssistantView`: Interactive assistant with mode switcher, query suggestions, confidence meters, and one-click evidence locking.
  - `ReportsView`: Structured synthesis viewer and executive brief generator.
- **Comprehensive Automated Test Suite (`tests/milestone9_research.test.ts`)**:
  - 33/33 test assertions passing across project CRUD, question CRUD, workspace isolation, evidence integrity, real chunk linkages, grounded queries, refusal guards, multi-source synthesis, report generation, restart persistence, and tool execution.

### Milestone 10 — Unified File & Storage Foundation (COMPLETED)
- **Provider-Agnostic Storage Abstraction (`server/storage/`)**:
  - `IStorageProvider` interface defining `putObject`, `getObject`, `getObjectStream`, `deleteObject`, `hasObject`, `getObjectMetadata`, and `getSignedUrl`.
  - `LocalStorageProvider`: Secure local disk implementation writing objects to `data/storage/objects/` with generated collision-resistant keys (`obj-${sha256Prefix}-${uuid}.${ext}`). Zero physical filenames or direct filesystem paths chosen by clients.
  - `StorageProviderManager`: Configuration-driven provider resolver (`STORAGE_PROVIDER=local` default), architected for seamless cloud object storage extension (e.g. AWS S3, Google Cloud Storage) without application redesign. Note: Production cloud storage is **not yet enabled** in this local foundation.
- **Persistent File Data Model (`FileRecord`)**:
  - Fields: `id`, `workspaceId`, `ownerUserId`, `originalName`, `storageKey`, `mimeType`, `sizeBytes`, `extension`, `sha256`, `status`, optional relational links (`classId`, `assignmentId`, `submissionId`, `knowledgeSpaceId`, `knowledgeSourceId`, `conversationId`, `messageId`, `researchProjectId`), `description`, `tags`, `downloadCount`, timestamps.
  - Clean separation: File metadata persists in repository (`DatabaseSchema.files`), raw binary objects live in `StorageProvider`.
- **File Lifecycle & Strict Validation (`server/storage/validator.ts`)**:
  - Lifecycle: `uploading` -> `stored` -> `validating` -> `ready` (with `failed` / `deleted` states).
  - Validation: 25 MB max size limit, strict allowlist (`pdf`, `png`, `jpg`, `jpeg`, `webp`, `txt`, `md`, `docx`), filename normalization stripping path traversal (`..`, `/`, `\`) and null bytes, and magic byte signature verification (PDF, PNG, JPEG, WebP, DOCX, UTF-8 text).
- **Tenant Isolation & Access Control (`server/storage/fileAuth.ts`)**:
  - Multi-tenant boundary checks: Workspace membership required.
  - Role-based authorization: Course instructors, enrolled students, assignment submission owners, and workspace commanders/admins have verified access boundaries. Cross-workspace attempts unconditionally blocked.
  - Tenant-safe deduplication: Identical content within the same workspace reuses physical storage keys while maintaining distinct metadata records. Deduplication never crosses tenant boundaries.
- **RAG & Knowledge Space Integration (`server/storage/ragBridge.ts`)**:
  - Direct pipeline bridge: Stored files can be ingested directly into Knowledge Spaces, extracting normalized text and triggering chunking, embeddings, and vector indexing.
  - Cascading deletion: Deleting a stored file cleanly purges the associated Knowledge Source and all derived vector chunks, guaranteeing zero orphaned RAG data.
- **Unified REST API (`server/routes/files.ts`)**:
  - `POST /api/files`: Secure upload with base64/binary payloads, metadata, and associations.
  - `GET /api/files`: List files matching workspace and relational filters.
  - `GET /api/files/:id`: Retrieve file metadata and controlled access references.
  - `GET /api/files/:id/download`: Authorized streaming / download with correct Content-Type, Content-Disposition, and cache headers (`?inline=true` support).
  - `DELETE /api/files/:id`: Authorized deletion with cascading RAG cleanup.
  - `POST /api/files/:id/ingest-to-knowledge`: Ingest file to Knowledge Space.
- **Registered Tools in `ToolRegistry` (31 total tools)**:
  - `storage.file.list`, `storage.file.get`, `storage.file.delete`, `storage.file.ingest`.
- **Reusable Frontend Components (`src/components/files/`)**:
  - `FileUploadModal`: Drag & drop, validation hints, size checks, image preview, progress state, and association targets.
  - `FileAttachmentBadge`: Reusable file chip showing icon, size, extension, download, and delete actions.
  - `FileViewerModal`: Inspection modal with inline preview, checksum, download metrics, and RAG ingestion button.
  - Integrated into Education `ClassesView` course materials workflow.
- **Comprehensive Automated Test Suite (`tests/milestone10_storage.test.ts`)**:
  - 34/34 tests passing across storage provider operations, security validation, path traversal defense, role-based authorization, tenant isolation, RAG bridge, deduplication, tool execution, and simulated restart persistence.

---

## 4. Pre-M11 Checkpoint & Baseline Verification
- **Audit Verification Status**: 100% Passing (180/180 total assertions verified)
  - E2E Full Platform Audit Suite (`tests/audit_e2e_verification.test.ts`): 32/32 PASS
  - M4 Sandboxed Tools Suite (`tests/milestone4_tools.test.ts`): 20/20 PASS
  - M5 Persistence & Core Data Suite (`tests/persistence.test.ts`): 27/27 PASS
  - M8 Grounded RAG & Multi-Source Knowledge Suite (`tests/milestone8_rag.test.ts`): 23/23 PASS
  - M9 Research & Labs Sector Suite (`tests/milestone9_research.test.ts`): 33/33 PASS
  - M10 Unified File & Storage Foundation (`tests/milestone10_storage.test.ts`): 34/34 PASS
  - M11 Class Real-Time Messaging & Attachments (`tests/milestone11_messaging.test.ts`): 21/21 PASS
  - Education Sector & Knowledge Suite (`tests/education_sector.test.ts`): 11/11 PASS
  - TypeScript Compiler (`tsc --noEmit`): 0 errors
  - Production Bundle Compilation (`npm run build`): Succeeded
- **Partial Run Audit & Triage**:
  - `src/sectors/education/views/ClassesView.tsx`: Integrated file upload modal for teacher syllabus materials. Verified safe, kept.
  - `src/sectors/research/views/ResearchAssistantView.tsx`: Complete multi-mode UI and evidence extraction. Verified safe, kept.
  - `server/storage/fileService.ts`: Added message/conversation relation bindings and status filtering. Verified safe, kept.
  - `server/routes/files.ts`: Robust REST query parsing and error handling. Verified safe, kept.
  - `server/storage/tools.ts`: Fully registered GenAI storage tool definitions. Verified safe, kept.
  - `tests/audit_e2e_verification.test.ts`: End-to-end audit passing 32/32. Verified safe, kept.

---

## 5. Current Architecture & Milestone 11 Implementation
- **Milestone 11 (Teacher ↔ Student Real-Time Messaging + File Attachments) Complete**:
  - **Data Model**: Extensible `ClassMessage` and `ClassConversationThread` structures persisting to core JSON store (`data/jarvis-db.json`) across reboots with zero loss.
  - **Authorization & Security**: Class membership validation (`validateClassAccess`) and workspace isolation enforce that only enrolled teachers and students can post/read messages and access attachments; non-enrolled students and cross-workspace attempts are strictly rejected.
  - **File Attachments**: Messages link directly to M10 `FileRecord` IDs (PDFs, images, documents) with validation of workspace boundaries, MIME types, and 25MB file size limits.
  - **Real-Time Delivery & Notifications**: Dedicated SSE uplink stream (`/api/messages/stream`) and `messageEventBus` deliver real-time events to connected clients with deduplication safeguards and automated notifications.
  - **Tool Engine**: 3 new deterministic tools (`messaging.thread.list`, `messaging.message.list`, `messaging.message.send`) registered to the tool registry (total 34 deterministic tools).
  - **Frontend UI**: Integrated `ClassMessagingDeck` into `ClassesView.tsx` with live SSE connection status, thread switching, multi-file attachment badging, modal viewers, and message composition.

---

## 6. Current Constraints & Active Invariants
- Zero server secrets or API keys leaked to client code or bundles.
- No third-party cloud database or cloud object storage required for local dev (durable local storage used).
- ₹0 local-first execution mode fully operational for offline development.
- Zero fake or manufactured citations produced.
- Strict workspace and class membership boundaries enforced across User -> Workspace -> File -> KnowledgeSpace -> Message.
- Raw filesystem paths are strictly encapsulated on backend and never exposed to clients.
- Production cloud storage (e.g. S3 / GCS) is **not yet enabled**; provider abstraction is cloud-ready.

---

## 7. Next Milestones & Roadmap
- **M12**: Voice & Audio Interaction (Web Audio API synthesis & STT integration).
- **M13**: Autonomous Task Agent & Multi-Sector Orchestration.
