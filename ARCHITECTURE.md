# Web Jarvis Architecture

## Overview
Web Jarvis is an intelligent multi-sector AI operating platform and cybernetic assistant designed to operate as a full-stack web application. The architecture follows a decoupled client-server model enabling real-time voice interaction, high-fidelity HUD visualization, AI inference via Google Gemini, safe server-side tool execution, domain-specific academic and research sectors, and a durable core persistence foundation.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Tier (React 19)                        │
│               AppShell Multi-Sector Routing & Navigation                │
│                                                                         │
│  ┌──────────────────────┐  ┌─────────────────────┐  ┌────────────────┐  │
│  │     Command Deck     │  │  Education Sector   │  │ Voice & Audio  │  │
│  │ (Arc Reactor, Armor) │  │ (Student & Teacher) │  │ Synthesizer    │  │
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
│      │ (gemini-3.8-flash, Tools) │  │   (Auxiliary Core Mock) │         │
│      └───────────────────┬───────┘  └────┬────────────────────┘         │
│                          │               │                              │
│                          └───────┬───────┘                              │
│                                  │                                      │
│                   ┌──────────────▼──────────────┐                       │
│                   │     Tool Execution Layer    │                       │
│                   │  ┌────────────────────────┐ │                       │
│                   │  │      ToolRegistry      │ │                       │
│                   │  │  (12 allowlisted tools)│ │                       │
│                   │  └───────────┬────────────┘ │                       │
│                   │  ┌───────────▼────────────┐ │                       │
│                   │  │      ToolExecutor      │ │                       │
│                   │  │ (Allowlist & Sandbox)  │ │                       │
│                   │  └───────────┬────────────┘ │                       │
│                   │  ┌───────────▼────────────┐ │                       │
│                   │  │   serverProtocolStore  │ │                       │
│                   │  │ (Single Source of Truth│ │                       │
│                   │  └────────────────────────┘ │                       │
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
│  │  └──────────────────────────────┬──────────────────────────────┘  │  │
│  │                                 │                                 │  │
│  │  ┌──────────────────────────────▼──────────────────────────────┐  │  │
│  │  │              Durable Storage Adapter / Driver               │  │  │
│  │  │    • DiskJarvisDataRepository (Atomic JsonFileStore)        │  │  │
│  │  │    • MemoryJarvisDataRepository (Test isolation)            │  │  │
│  │  │    • Seed Data Engine (Deterministic & Idempotent)          │  │  │
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
- **Audio & Speech Engine**:
  - Browser-native Web Speech API for voice transcription and synthesis.
  - Procedural Web Audio API synthesizer for tactile clicks, scan chimes, warning klaxons, and deployment cues.

### 1.2 Node.js Backend & API Gateway
- **Runtime**: Node.js 22 with Express 5.
- **Dev Mode Integration**: Express server mounting Vite dev middleware (`tsx server.ts`) on single port `3000`.
- **Endpoints**:
  - `GET /api/health`: Subsystem health, uptime, provider status, tool counts, and persistence status.
  - `GET /api/protocols`: Authoritative list and states of all Stark tactical security protocols.
  - `GET /api/tools`: Catalog of registered deterministic tools across all sectors.
  - `GET /api/workspaces` & `GET /api/workspaces/:id`: Workspace directory and memberships.
  - `GET /api/conversations` & `POST /api/conversations`: Conversation management and message histories.
  - `GET /api/knowledge-spaces` & `POST /api/knowledge-spaces`: Grounded knowledge spaces and indexed documents.
  - `GET/POST /api/education/*`: Classes, assignments, submissions, grading, and grounded Q&A.
  - `POST /api/chat`: Multi-turn conversational endpoint supporting unary JSON and SSE streaming with tool execution loop.

### 1.3 Model Provider Layer
- **Interface Abstraction (`AiProvider`)**: Decouples API endpoints from specific model SDKs and supports both standard text generation and tool-calling turns.
- **Active Providers**:
  - `GeminiProvider`: Connects to Google Gemini using `@google/genai` (`gemini-3.8-flash`). Exposes function declarations to Gemini and handles multi-turn tool loops preserving `rawCandidateContent` thought signatures.
  - `FallbackMockProvider`: Engages automatically if `GEMINI_API_KEY` is omitted or unavailable, providing intelligent intent matching to trigger the same server-side tool execution pipeline.

### 1.4 Tool Execution Engine (`server/tools/`)
- **`ToolRegistry` (`registry.ts`)**: Central registry managing 12 tool definitions, parameter validations, and SDK function declarations across core diagnostics, telemetry, education, and knowledge sectors.
- **`ToolExecutor` (`executor.ts`)**: Strict allowlist check, argument validation, and sandboxed try/catch execution preventing unhandled exceptions from crashing the server.
- **Audit Logging**: Every tool execution is recorded with timing, arguments, success status, and error messages to `jarvisData.audit`.

### 1.5 Core Platform Persistence Layer (`server/data/`)
- **Repository Pattern (`repository.ts`)**: Explicit interface contracts for users, workspaces, conversations, knowledge spaces, education entities, and audit events.
- **Durable Disk Driver (`fileStore.ts` & `diskRepository.ts`)**: Atomic write-to-temp and atomic rename strategy (`data/jarvis-db.json`) ensuring 100% data durability across server restarts.
- **Memory Driver (`memoryRepository.ts`)**: Isolated in-memory implementation for automated testing.
- **Deterministic Seeding (`seedData.ts`)**: Idempotent seeding of default workspace, users, classes, assignments, and knowledge spaces.
- **Workspace Isolation**: Strict workspace-scoped boundaries ensuring records cannot leak across workspaces.

---

## 2. Request & Response Schemas

### 2.1 Chat / Query Schema (`POST /api/chat`)

**Client Request**:
```typescript
export interface ChatRequest {
  message: string;
  sessionId?: string;
  conversationId?: string;
  context?: {
    sector?: string;
    role?: string;
    userId?: string;
    workspaceId?: string;
    activeSpaceId?: string;
    activeClassId?: string;
    activeProtocol?: string;
    deployedArmors?: string[];
  };
  stream?: boolean;
}
```

**Streaming SSE Protocol** (`stream: true`):
- `Content-Type: text/event-stream`
- Event types emitted over connection:
  - `start`: `{ "type": "start", "id": "...", "sessionId": "..." }`
  - `tool_start`: `{ "type": "tool_start", "tool": { "name": "...", "callId": "..." } }`
  - `tool_result`: `{ "type": "tool_result", "tool": { "name": "..." }, "result": { "ok": true, "data": { ... } }, "protocols": [ ... ] }`
  - `chunk`: `{ "type": "chunk", "chunk": "..." }`
  - `done`: `{ "type": "done", "fullReply": "...", "speechText": "...", "source": "gemini", "protocols": [ ... ] }`
  - `error`: `{ "type": "error", "error": "..." }`

---

## 3. Security & Boundary Guarantees
1. **Zero Secret Leakage**: Server API keys and database file paths are strictly encapsulated on the backend process.
2. **Workspace Multi-Tenancy**: All conversation and knowledge space queries require explicit workspace identification.
3. **Graceful Tool Sandboxing**: Unhandled exceptions inside tool execution do not crash the server and are cleanly formatted as tool errors.
