# Web Jarvis Architecture

## Overview
Web Jarvis is an intelligent multi-sector AI operating platform and cybernetic assistant designed to operate as a full-stack web application. The architecture follows a decoupled client-server model enabling real-time voice interaction, high-fidelity HUD visualization, AI inference via Google Gemini, safe server-side tool execution, domain-specific academic and research sectors, a durable core persistence foundation, and a source-grounded RAG knowledge engine.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Tier (React 19)                        │
│               AppShell Multi-Sector Routing & Navigation                │
│                                                                         │
│  ┌──────────────────────┐  ┌─────────────────────┐  ┌────────────────┐  │
│  │     Command Deck     │  │  Education Sector   │  │ Research & Labs│  │
│  │ (Arc Reactor, Armor) │  │ (Student & Teacher) │  │(Workspace, RAG)│  │
│  └──────────────────────┘  └─────────────────────┘  └────────────────┘  │
└────────────────────────────────────▲────────────────────────────────────┘
                                     │ HTTP / SSE (Port 3000)
                                     │ (Streaming text/event-stream & JSON)
┌────────────────────────────────────▼────────────────────────────────────┐
│                         Node.js Server Tier                             │
│                  Express 5 API Gateway on Port 3000                     │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ REST Endpoints: /api/health, /api/protocols, /api/tools,          │  │
│  │                 /api/workspaces, /api/conversations,              │  │
│  │                 /api/knowledge-spaces, /api/education/*           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │     Grounded RAG Subsystem (server/rag/)                          │  │
│  │  ┌───────────────────┐   ┌───────────────────┐   ┌─────────────┐ │  │
│  │  │ Ingestion Pipeline│   │ Hybrid Retrieval  │   │  Grounding  │ │  │
│  │  │ (Extract/Chunk/   │──►│ (Vector Cosine +  │──►│  Synthesizer│ │  │
│  │  │  Content Hash)    │   │  BM25 Lexical)    │   │ & Citations │ │  │
│  │  └───────────────────┘   └───────────────────┘   └─────────────┘ │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
│                                     │                                   │
│  ┌──────────────────────────────────▼────────────────────────────────┐  │
│  │                /api/chat (Multi-Turn Tool Loop & SSE)             │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
│                                  │                                      │
│                   ┌──────────────▼──────────────┐                       │
│                   │      Provider Manager       │                       │
│                   │   (Registry & Fallback)     │                       │
│                   └──────┬───────────────┬──────┘                       │
│                          │               │                              │
│      ┌───────────────────▼───────┐  ┌────▼────────────────────┐         │
│      │     Gemini Provider       │  │  Fallback Mock Provider │         │
│      │ (gemini-3.7-flash, Tools) │  │   (Auxiliary Core Mock) │         │
│      └───────────────────┬───────┘  └────┬────────────────────┘         │
│                          │               │                              │
│                          └───────┬───────┘                              │
│                                  │                                      │
│                   ┌──────────────▼──────────────┐                       │
│                   │     Tool Execution Layer    │                       │
│                   │  ┌────────────────────────┐ │                       │
│                   │  │      ToolRegistry      │ │                       │
│                   │  │  (17 allowlisted tools)│ │                       │
│                   │  └───────────┬────────────┘ │                       │
│                   │  ┌───────────▼────────────┐ │                       │
│                   │  │      ToolExecutor      │ │                       │
│                   │  │ (Allowlist & Sandbox)  │ │                       │
│                   │  └───────────┬────────────┘ │                       │
│                   └──────────────┬──────────────┘                       │
│                                  │                                      │
│  ┌───────────────────────────────▼───────────────────────────────────┐  │
│  │               Core Platform Persistence Layer                     │  │
│  │                     (server/data/index.ts)                        │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                     Repository Interfaces                   │  │  │
│  │  │  • IUserRepository       • IWorkspaceRepository             │  │  │
│  │  │  • IConversationRepository • IKnowledgeRepository           │  │  │
│  │  │  • IEducationRepository  • IAuditRepository                 │  │  │
│  │  │  • IResearchRepository   • IFileRepository                  │  │  │
│  │  └──────────────────────────────┬──────────────────────────────┘  │  │
│  │                                 │                                 │  │
│  │  ┌──────────────────────────────▼──────────────────────────────┐  │  │
│  │  │              Durable Storage Adapter / Driver               │  │  │
│  │  │    • DiskJarvisDataRepository (Atomic JsonFileStore)        │  │  │
│  │  │    • MemoryJarvisDataRepository (Test isolation)            │  │  │
│  │  │    • Local Vector Store (Cosine similarity chunks)          │  │  │
│  │  └──────────────────────────────┬──────────────────────────────┘  │  │
│  └─────────────────────────────────┼─────────────────────────────────┘  │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │ File System I/O
                                     ▼
                          data/jarvis-db.json
```

---

## 1. System Components

### 1.1 React Frontend & Multi-Sector Shell
- **Framework**: React 19 SPA bundled by Vite 6 with Tailwind CSS v4 styling.
- **Application Shell (`src/components/layout/AppShell.tsx`)**: Reusable shell managing branding, active sector selection, API uplink telemetry, role switching, and global audio controls.
- **Sectors**:
  - **Command Deck (`src/sectors/command/`)**: Concentric rotating Arc Reactor cores, radar sweeps, armor vault matrix (Marks III through LXXXV), Stark protocol overrides, and streaming tactical terminal.
  - **Education Sector (`src/sectors/education/`)**: Dual-mode student/teacher academic environment, course syllabi, assignments and submission workflows, and NotebookLM-style knowledge workspaces.
  - **Research & Labs Sector (`src/sectors/research/`)**: Scientific hypothesis tracking, multi-source grounded investigations, structured evidence locking, research notes, and formal synthesis reports.
- **Audio & Speech Engine**:
  - Browser-native Web Speech API for voice transcription and synthesis.
  - Procedural Web Audio API synthesizer for tactile clicks, scan chimes, warning klaxons, and deployment cues.

### 1.2 Node.js Backend & API Gateway
- **Runtime**: Node.js 22 with Express 5 on port `3000`.
- **Endpoints**:
  - `GET /api/health`: Subsystem health, uptime, provider status, tool counts, and persistence status.
  - `GET /api/protocols`: Authoritative list and states of all Stark tactical security protocols.
  - `GET /api/tools`: Catalog of registered deterministic tools across all sectors (31 tools).
  - `GET/POST /api/workspaces`: Workspace directory and memberships.
  - `GET/POST /api/conversations`: Conversation management and message histories.
  - `GET/POST /api/knowledge-spaces`: Grounded knowledge spaces, source ingestion, deletion, retrieval, and grounded Q&A.
  - `GET/POST /api/education/*`: Classes, assignments, submissions, grading, and grounded Q&A.
  - `GET/POST/PATCH/DELETE /api/research/*`: Research projects, questions, evidence, notes, reports, and grounded investigation.
  - `GET/POST/DELETE /api/files/*`: Unified file upload, metadata lookup, controlled streaming/download, and RAG ingestion bridge.
  - `POST /api/chat`: Multi-turn conversational endpoint supporting unary JSON and SSE streaming with tool execution loop.

### 1.3 Grounded RAG Subsystem (`server/rag/`)
- **Document Extraction (`extractor.ts`)**: Plain text, Markdown (with header hierarchy), and lightweight PDF stream extraction. Normalization & SHA-256 content hashing.
- **Deterministic Chunker (`chunker.ts`)**: Sentence & paragraph boundary splitting with stable IDs (`chunk-${sourceId}-${index}`) and configurable overlap.
- **Embedding Provider Abstraction (`embeddingProvider.ts`)**:
  - `EmbeddingProvider` interface (`embedText`, `embedTexts`, `dimensions`).
  - `DeterministicLocalEmbeddingProvider`: 128-dim dense feature embedder using subword n-gram hashing and L2 norm unit vectors. 100% deterministic, ₹0 local execution.
  - `GeminiEmbeddingProvider`: Connects to `@google/genai` (`text-embedding-004`) when `GEMINI_API_KEY` is present.
- **Local Persistent Vector Index (`vectorIndex.ts`)**: Cosine similarity search with workspace & knowledge space filtering, stored in `jarvisData.knowledgeChunks`.
- **Hybrid Retrieval (`retrievalService.ts`)**: Combines vector similarity (cosine) with BM25 lexical term matching using weighted alpha fusion (`0.65 * vector + 0.35 * lexical`).
- **Grounded Synthesis & Refusal Guard (`groundingService.ts`)**:
  - Workspace & class authorization enforcement.
  - Refusal guard for ungrounded queries (zero fake citations).
  - Gemini 3.7 Flash synthesis with strict grounding instructions when online; deterministic local synthesizer fallback when offline.
  - Verifiable structured citations with source title, chunk ID, section/page, and excerpt text.

### 1.4 Model Provider Layer
- **Interface Abstraction (`AiProvider`)**: Decouples API endpoints from specific model SDKs and supports both standard text generation and tool-calling turns.
- **Active Providers**:
  - `GeminiProvider`: Connects to Google Gemini using `@google/genai` (`gemini-3.7-flash` / `gemini-3.8-flash`).
  - `FallbackMockProvider`: Engages automatically if `GEMINI_API_KEY` is omitted or unavailable.

### 1.5 Tool Execution Engine (`server/tools/`)
- **`ToolRegistry` (`registry.ts`)**: Central registry managing 31 tool definitions across diagnostics, telemetry, education, RAG knowledge spaces, research & labs, and storage.
- **`ToolExecutor` (`executor.ts`)**: Strict allowlist check, argument validation, and sandboxed execution.

### 1.6 Core Platform Persistence Layer (`server/data/`)
- **Repository Pattern (`repository.ts`)**: Explicit interface contracts for users, workspaces, conversations, knowledge spaces, sources, chunks, education entities, research projects, questions, evidence, notes, reports, file records, and audit events.
- **Durable Disk Driver (`fileStore.ts` & `diskRepository.ts`)**: Atomic write-to-temp and atomic rename strategy (`data/jarvis-db.json`).

### 1.7 Unified Storage & File Subsystem (`server/storage/`)
- **Provider Abstraction (`IStorageProvider`)**: Decouples binary storage operations (`putObject`, `getObject`, `getObjectStream`, `deleteObject`, `hasObject`, `getObjectMetadata`, `getSignedUrl`) from concrete storage backends.
- **`LocalStorageProvider`**: Writes binary payloads to application-controlled `data/storage/objects/` outside the web root using collision-resistant generated keys (`obj-${sha256Prefix}-${uuid}.${ext}`). Never uses client-provided filenames as filesystem paths.
- **Secure Validation (`validator.ts`)**: Strict extension allowlist (`pdf`, `png`, `jpg`, `jpeg`, `webp`, `txt`, `md`, `docx`), magic byte binary signature verification, filename normalization, and 25 MB max file size limit.
- **Tenant-Safe Deduplication & Cascading RAG Cleanup (`ragBridge.ts`)**: Same-content deduplication within workspace boundaries; direct ingestion into Knowledge Spaces; cascading purge of all derived vector chunks upon file deletion.
- **Cloud-Ready Strategy**: Provider configuration allows `STORAGE_PROVIDER=local` default, ready for future S3/GCS drivers without rewriting higher-level sectors. Note: Cloud storage is **not yet enabled**.

---

## 2. Security & Boundary Guarantees
1. **Zero Secret Leakage**: Server API keys and database file paths are strictly encapsulated on the backend process.
2. **Workspace Multi-Tenancy**: All conversation, knowledge space, source, file, and vector chunk queries require explicit workspace identification.
3. **Storage Isolation**: Raw filesystem paths are never exposed to clients; downloads and uploads are mediated exclusively through authorized API endpoints.
4. **Refusal Guard against Hallucinations**: Answers with insufficient evidence trigger explicit refusal responses with 0 manufactured citations.
5. **Graceful Tool Sandboxing**: Unhandled exceptions inside tool execution do not crash the server and are cleanly formatted as tool errors.
