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

### Milestone 15 — AI Video Discovery & Grounded Video Q&A (COMPLETED)
- **AI-Powered Concept Discovery & Timestamped Search (`video.search`)**:
  - Semantic transcript search and lexical keyword matching across video segments.
  - Returns precise timestamped discovery entries with seconds offset, formatted `MM:SS` or `HH:MM:SS` timestamp labels, match confidence scores, and transcript excerpts.
  - Supports single-video and course-wide multi-video search scopes.
- **Transcript-Grounded Video Q&A (`video.ask`)**:
  - Multi-stage grounded question answering synthesizing answers strictly from indexed video transcripts and captions.
  - Strict course/class authorization verified prior to retrieval and synthesis.
  - Structured verifiable citations with video ID, video title, timestamp seconds offset, formatted timestamp string, and verbatim transcript excerpts.
  - Interactive timestamp seeking in Video Player UI when clicking citations or search results.
- **Security, Safety & Refusal Guards**:
  - Prompt-injection defense: User inquiries and transcript segments sanitized and fenced against instruction override.
  - Insufficient-evidence refusal: Returns polite refusal without fabricating information or hallucinations when evidence is absent or query relevance is below threshold.
  - Deterministic fallback synthesizer: High-fidelity deterministic local extraction and synthesis when Gemini API is unavailable or offline.
- **Registered Tools in `ToolRegistry`**:
  - `video.search`: Discover timestamped concepts across video materials.
  - `video.ask`: Grounded question answering over lecture transcripts with timestamped citations.
- **Comprehensive Automated Test Suite (`tests/milestone15_video_qa.test.ts`)**:
  - 25/25 test assertions passing across timestamp discovery, single & multi-video Q&A, structured citations, prompt injection defense, cross-course authorization enforcement, insufficient evidence refusals, and deterministic offline fallback.

### Phase D — Education OS Integration Foundation (COMPLETED)
- **Architectural Shift**: Transitioned Jarvis Education from siloed feature modules (Workspace, Community, Focus, Assignments, Calendar, Classes, RAG, Smart Classroom) into **one cohesive academic operating system** under the central tenet: *"One Academic Context → Many Connected Experiences"*.
- **Shared Academic Context Model (`AcademicContext`)**:
  - Dynamic resolution via `academicIntegrationService.resolveContext(type, id)` supporting ClassSession, Lesson, Assignment, WorkspacePage, and fallback hierarchies.
  - Carries context through deep navigation, focus locks, and tutoring sessions.
- **Canonical Learning Object Link Model (`LearningLink`)**:
  - Bidirectional, multi-entity relationships (`curriculum`, `notes`, `discussion`, `homework`, `assessment`, `material`) connecting all learning primitives without pairwise hardcoded bridges.
- **Teacher Workflow Anchor (`linkAllForClassSession`)**:
  - Operational anchor that turns an approved ClassSession into a fully provisioned academic package:
    1. Lesson curriculum mapping.
    2. Notion-style Workspace Page with blackboard plan, worked examples, and objectives.
    3. Homework Assignment linked into the assignment ledger and calendar feed.
    4. Formative interactive Quiz for in-class checks.
    5. Course Community channel discussion link.
    6. Synchronized calendar schedule.
- **Cross-Experience Workflows & Progressive Disclosure**:
  - `AcademicContextActions.tsx`: Contextual action strip rendering breadcrumbs (`PHYS-301 > Unit 2 > Lesson 202`) with 1-click jumps to Study, Focus (25m), Notes, Discuss, Assignment, and Sources.
  - Focus session mode integrated with academic targets, preventing unauthorized drift into unrelated views.
  - Unified calendar feed merging scheduled ClassSessions, assignment deadlines, and peer study groups.
- **Bounded AI Context Builder**:
  - Constructs bounded prompt contexts scoped to active academic locus and verified textbook sources, preventing hallucinations and context overflow.
- **Phase D.1 Integration Hardening & Security Boundaries**:
  - Implemented duplicate-link prevention in `createLink` to guarantee idempotent relational link creation.
  - Enforced server-authoritative permissions on `deleteLink` and REST endpoints: students cannot delete teacher links or manufacture official curriculum/session links.
  - Restricted student domain event publication (students can only emit completion/submission events, preventing unauthorized approval spoofing).
  - Enforced student draft isolation in `buildAiContext`: unapproved session drafts, teacher notes, and answer keys are strictly withheld from student contexts.
  - Connected live dynamic feed to `EducationCalendarView` and enhanced bidirectional context propagation to `CommunityShell`.
- **Phase D.2 Education OS Structural UX Audit & Application Shell Redesign**:
  - **Standalone Application Shell**: Redesigned `AppShell.tsx` in Education mode to eliminate all multi-sector platform noise (hidden command/research tabs, hidden platform OS telemetry badges, hidden uplink indicators, and hidden persistent "Active Core" platform footer). Education takes full ownership of the viewport.
  - **Unified Scroll Ownership**: Eliminated nested double-scrollbars by configuring `main-scroll-container` as overflow-hidden when in Education mode, delegating single-scroll ownership to `EducationSector`'s primary workspace area (`#education-workspace-scroll`) with a pinned desktop sidebar.
  - **Intent-Driven 4-Tier Navigation Model**:
    1. *Primary*: Home (role-tailored dashboard), My Learning (curriculum paths & lessons), Classes & Cohorts, Assignments & Grading, and Academic Calendar (plus Teacher Session Prep).
    2. *Productivity*: Focus Workspace (Focus Lock & academic target timer) and My Workspace (academic notes & block database).
    3. *Community*: Community discussions & channels and dedicated Peer Study Groups.
    4. *Knowledge & Media*: Study Notes & Formulas (`StudentPersonalNotesView`), Grounded Knowledge Spaces (RAG), Video Library & Q&A, and live Smart Classroom.
  - **Anti-Slop & Zero-Pill Compliance**: Removed static pill badges and bordered capsules across session lists, class cards, and mobile headers in favor of clean unboxed typography with typographic separators (`·`).
- **Comprehensive Test Suite (`tests/education_academic_integration.test.ts`)**:
  - 63/63 assertions passing across Context Resolution, Learning Links, Teacher Workflow Anchor, Event Bus & Notifications, Quiz Results, Unified Calendar Feed, Focus Session Tracking, Bounded AI Context, and Security/Hardening Boundaries.

---

## 4. Pre-M16 Checkpoint & Baseline Verification
- **Audit Verification Status**: 100% Passing (237/237 total assertions verified)
  - E2E Full Platform Audit Suite (`tests/audit_e2e_verification.test.ts`): 32/32 PASS
  - M4 Sandboxed Tools Suite (`tests/milestone4_tools.test.ts`): 20/20 PASS
  - M5 Persistence & Core Data Suite (`tests/persistence.test.ts`): 27/27 PASS
  - M8 Grounded RAG & Multi-Source Knowledge Suite (`tests/milestone8_rag.test.ts`): 23/23 PASS
  - M9 Research & Labs Sector Suite (`tests/milestone9_research.test.ts`): 33/33 PASS
  - M10 Unified File & Storage Foundation (`tests/milestone10_storage.test.ts`): 34/34 PASS
  - M11 Class Real-Time Messaging & Attachments (`tests/milestone11_messaging.test.ts`): 21/21 PASS
  - M12 Smart Classroom Collaboration (`tests/milestone12_classroom.test.ts`): 18/18 PASS
  - M13 Smart Quiz & Live Responses (`tests/milestone13_quiz.test.ts`, `tests/milestone13_1_multi_quiz.test.ts`): 35/35 PASS
  - M14 Academic Video Library & Media Knowledge (`tests/milestone14_video.test.ts`, `tests/milestone14_2_security.test.ts`): 42/42 PASS
  - M15 AI Video Discovery & Grounded Video Q&A (`tests/milestone15_video_qa.test.ts`): 25/25 PASS
  - Education Sector & Knowledge Suite (`tests/education_sector.test.ts`): 11/11 PASS
  - TypeScript Compiler (`tsc --noEmit`): 0 errors
  - Production Bundle Compilation (`npm run build`): Succeeded
- **Partial Run Audit & Triage**:
  - All features and sector bridges tested and verified in isolation with zero persistent storage mutation during test executions.

---

## 5. Current Architecture & Milestone 12, 13, 14 & 15 Achievements
- **Milestone 13: Deterministic Smart Quiz & Live Responses (Completed)**:
  - Complete server-authoritative lifecycle: `createQuiz`, `addQuestion`, `updateQuestion`, `removeQuestion`, `publishQuiz`, `startQuiz`, `startQuestion`, `lockQuestion`, `advanceQuestion`, `pauseQuiz`, `resumeQuiz`, `completeQuiz`, `cancelQuiz`.
  - Server-authoritative countdown deadlines, deterministic scoring, idempotent submission, anti-tamper answer immutability, role-tailored privacy guard, and recovery after restart.
  - Real-Time EventBus emission and 14 formal quiz tools declared and registered in `ToolRegistry`.
- **Milestone 14: Academic Video Library & Media Knowledge (Completed)**:
  - Unified storage architecture extension with binary validation, magic byte verification, and tenant-safe deduplication.
  - Video domain model in `DatabaseSchema.videos` via atomic `JsonFileStore` and full repository support.
  - Role-based authorization & multi-tenant boundaries (Teacher / Student / Workspace).
  - RAG transcript indexing with citation preservation and HTTP range streaming API (`GET /api/education/videos/:id/stream`).
  - Reusable, responsive `VideoPlayer.tsx` with keyboard shortcuts, speed selector, and layout containment.
- **Milestone 15: AI Video Discovery & Grounded Video Q&A (Completed)**:
  - `video.search` and `video.ask` integration in `ToolRegistry` and REST APIs.
  - Timestamped concept discovery and transcript-grounded RAG with clickable timestamp seek in UI.
  - Defense in depth: prompt injection neutralization, cross-course access verification before retrieval, insufficient evidence refusal, and deterministic fallback when Gemini is offline.

- **Phase D.2: Education OS Structural UX Audit & Architecture Redesign (Completed)**:
  - Transformed Education into its own dedicated application shell with minimal global chrome and quiet system identity.
  - Reorganized information architecture into 4 user-intent clusters: Primary (Home, My Learning, Classes, Assignments, Calendar), Productivity (Focus, My Workspace), Community (Community, Study Groups), and Knowledge (Notes, Knowledge Spaces, Video Library, Smart Classroom).
  - Single scroll owner per surface: resolved double/nested scrollbars across viewport sizes.
  - Created dedicated `StudentPersonalNotesView` with full search, tag filtering, and course association.

- **Phase D.3: Education OS Product Polish & Visual QA (Completed)**:
  - Replaced high-saturation neon/glowing cyan badges with calm surfaces, subtle borders, and intentional typographic hierarchy.
  - Streamlined `StudentHomeView`, `TeacherHomeView`, and `PrincipalExecutiveView` around role-specific primary actions.
  - Compacted course progression and assignments ledgers with dedicated detail workspaces.
  - Verified layout containment and accessibility across 1440x900, 1280x800, 1024x768, 768x1024, 430x932, and 390x844 viewports.

- **Phase D.4: Crystal-Clear Education Information Architecture & UX Hierarchy (Completed)**:
  - Canonical Education Hierarchy established and enforced across all surfaces:
    * `My Learning`: Curriculum progression (Course -> Chapter/Unit -> Lesson -> Study Room).
    * `Classes & Cohorts`: Social and organizational unit (Cohort, Schedule, Teacher, Classmates/Roster, Announcements, Syllabus link, Live Classroom link).
    * `Class Sessions`: Operational execution (Preparation -> SmartBoard Classroom -> Live Assessment -> Follow-up).
    * `Assignments`: Structured academic ledger with sortable table (Assignment, Course, Chapter/Lesson, Due Date, Status, Grade/Points, Context Actions).
    * `Calendar`: Temporal ledger (Day agenda, chronological timeline, color-coded class/deadline/study events with one-click navigation to canonical objects).
    * `Focus`: Calm study sanctuary with countdown clock, academic target, scratchpad, checklist, distraction blocking, and emergency escape friction.
    * `Teacher Home`: 5 prioritized action hubs (1. Next lecture to deliver, 2. Student grading queue, 3. Upcoming classes, 4. Active quizzes/polls, 5. Cadets needing remediation).
    * `Principal / Executive View`: Oversight system (1. High-level institutional health, 2. Cohort completion/retention table, 3. Live Smart Classroom utilization, 4. Faculty workload & velocity).
    * Visual Hierarchy Rules enforced: One page = one primary job, zero card walls, zero pill overload, contextual AI assist instead of generic AI buttons.

- **Phase D.5: Deep Education Navigation + Student Personal OS + Engagement & Leaderboard Foundation (Completed)**:
  - Multi-tier canonical curriculum navigation: Course -> Chapter/Unit -> Lesson/Study Room -> Practice Checkpoint -> Results & Conceptual Analysis.
  - Progressive disclosure with universal `SharedBackButton` and deep breadcrumb trails (`EducationBreadcrumbs`) maintaining contextual history across forward/backward browser navigation.
  - Student Personal OS foundation: Student Home greeting integrates real-time active streak, verified class rank, and points accumulator without pill clutter or generic AI buttons.
  - Student Engagement & Standings Foundation:
    * Authoritative point recording engine (`/api/education/engagement/events`) with anti-gaming idempotency (prevents duplicate submission gaming).
    * Scoped leaderboards (`class`, `cohort`, `school`) celebrating consistency, completed lessons, and problem sets rather than toxic pressure or grades.
    * Student Activity Ledger (`/api/education/engagement/my-activity`) providing chronological audit trail of completed tasks and points awarded.
    * Transparent rules & strict privacy boundaries: opt-out capability and isolation from private academic grade ledgers.
  - Integrated practice workflow: interactive question evaluation, instant feedback with explanations, points attribution, and one-click return to study room or next lesson.

- **Phase D.6: Teacher Operating System (Completed)**:
  - **Core Vision Realized**: One connected teacher workflow (TODAY -> PREPARE -> TEACH -> REVIEW -> ACT -> NEXT CLASS) answering critical context automatically without fragmented navigation.
  - **Teacher Command Center (`TeacherHomeView`)**: Calm vertical information hierarchy replacing dashboard card walls:
    * *TODAY*: Next scheduled lecture, class, room, preparation status, 1-click launch to SmartBoard or Prep Wizard, and operational headcount overview.
    * *TEACHER ACTION QUEUE*: First-class aggregated action queue derived dynamically from canonical entities (grading pending submissions, sessions awaiting review, approved sessions ready to schedule, evidence-backed student attention signals, and next curriculum preparation milestones) with filter tabs and deep page jumps.
    * *TEACHING QUEUE*: Instructional preparation and lifecycle status (DRAFT, GENERATING, READY_FOR_REVIEW, APPROVED, SCHEDULED, LIVE, COMPLETED) with direct links to plan and edit.
    * *REVIEW QUEUE*: Submissions awaiting grading, inline evaluation, and direct navigation to dedicated `TeacherReviewView`.
    * *STUDENTS NEEDING ATTENTION*: Evidence-based neutral signals (missed work, practice difficulty detected, low recent activity, unresolved feedback) with verifiable excerpts and suggested pedagogical follow-ups.
    * *RECENT CLASS ACTIVITY & POST-CLASS REVIEW*: Summary of delivered class session with 1-click navigation to full `PostClassReviewView` analytics and grounded next actions.
    * *NEXT IN CURRICULUM*: Tomorrow's scheduled class and next unprepared lesson milestone with 1-click "Prepare Tomorrow's Class".
  - **Dedicated Deep Class Intelligence Surface (`TeacherClassDetailView`)**:
    * 9-tab progressive disclosure hierarchy: Overview (What is happening? What needs attention? What was recently taught? What is coming next?), Today, Teaching (Curriculum chapters & lesson topics), Students (Enrolled cadet roster & progress), Assignments (Problem sets & submission tracking), Assessments (Formative quizzes & pulse checks), Community (Real-time Class Comm Link), Knowledge (Course syllabi, lecture notes & file uploads), and History (Delivered ClassSessions with Post-Class Review reports).
  - **Evidence-Grounded Post-Class Review (`PostClassReviewView`)**:
    * Post-delivery analytics for completed ClassSessions: duration taught, cadet participation rate, formative pulse accuracy, worked examples, and addressed misconceptions.
    * Grounded Next Actions (reteach, assign diagnostic practice, post formula to community, prepare next lesson) grounded strictly in verified quiz and classroom data.
  - **Teacher Review & Grading Engine (`TeacherReviewView`)**:
    * Comprehensive assessment review with status tabs (All, Pending, Graded), course selector, student/task search, in-place rubric scoring (0-100), and feedback publication.
  - **Evidence-Based Attention Engine (`TeacherAttentionView`)**:
    * Neutral, non-judgmental signals with verified evidence snippets and actionable remediation targets.
  - **End-to-End Test Suite (`tests/education_d6_teacher_os.test.ts`)**:
    * 50/50 test assertions passing across Action Queue derivation, priority sorting, ClassSession teaching anchor, teacher RBAC authorization, evidence-based attention signals, post-class review, and class intelligence.

- **Phase D.7: Family, Principal & Institutional Intelligence OS (Completed)**:
  - **Multi-Tier Authorized Intelligence Hierarchy**:
    * Unified canonical academic data model powering distinct, authorized perspectives without database duplication: Student Intelligence → Class Intelligence → Teacher Intelligence → Grade Intelligence → School Intelligence → Principal Intelligence, and separately Family / Parent Intelligence.
  - **Strict Server-Authoritative RBAC & Privacy Boundary Enforcement**:
    * Zero trust in client-asserted roles or IDs. Strict enforcement on every intelligence endpoint (`USER → ROLE → INSTITUTION → AUTHORIZED SCOPE → DATA`).
    * Parents only access their authorized, verified children (`parent-1` → `student-1`, `parent-2` → `student-2`). Requests for unauthorized students strictly rejected with 403 Forbidden.
    * Students and teachers forbidden from accessing institutional/leadership command endpoints.
  - **Parent / Family Portal (`ParentHomeView`)**:
    * Dedicated, non-technical, supportive family experience with multi-parent and multi-child profile switching.
    * *Recommended Next Step*: Clear, actionable card guiding parents on how to assist their child.
    * *Today's Learning*: Real-time schedule, room locations, instructor names, and active class statuses.
    * *Academic Progress*: Visual progress bars, completed lessons tally, current topic milestones.
    * *Work & Problem Sets*: Problem sets, lab reports, overdue indicators, and student feedback (strictly zero teacher internal notes).
    * *Test Results & Formative Diagnostics*: Numerical scores, accuracy percentages, and formative feedback (strictly zero answer keys or leaked exam questions).
    * *Teacher Updates*: Announcements, office hour schedules, and exam formula sheet notices.
    * *Habits & Consistency*: Weekly study hours in Focus room, consecutive day learning streaks, and homework status.
  - **Principal & Institutional Intelligence OS (`PrincipalExecutiveView`)**:
    * *Campus Operational Pulse*: Active classrooms live, scheduled lectures today, enrolled cadet headcount, faculty on duty, and verified overall attendance.
    * *Principal Command Interface*: Controlled AI diagnostic command generation with full proposal preview (covered topics, difficulty breakdown, duration, question count, sample questions).
    * *Explicit Approval & Execution Flow*: Strict principal approval required before publishing diagnostic quiz across cohorts via canonical `quizService`/repository.
    * *Grade Intelligence Drill-Down (`PrincipalGradeView`)*: Comprehensive grade-level overview (Grade 11 & Grade 12), enrolled classes, active courses, assigned faculty, upcoming assessments, evidence-based interventions, and 4-week progression/attendance trends.
    * *Faculty Leadership Projections (`PrincipalTeachersView`)*: Department velocity, scheduled vs. prepared packages, pending grading queue, and turnaround SLA hours (strictly operational workload, zero crude ratings or toxic rankings).
    * *Institutional Audit Ledger (`PrincipalAuditView`)*: Immutable governance trail recording actions, actors, scopes, source knowledge objects, generated entities, timestamps, and outcomes.
  - **End-to-End Test Suite (`tests/education_d7_family_principal_institutional.test.ts`)**:
    * 70/70 test assertions passing across RBAC boundaries, family intelligence sanitization, school operational pulse, grade drill-down, faculty workload projections, and controlled AI diagnostic generation with audit logging.

- **Phase D.8: SmartBoard OS Foundation & Live Teaching Surface (Completed)**:
  - **First-Class Physical Classroom Surface**:
    * Canonical device model `SmartBoardDevice` with status lifecycle (`OFFLINE`, `AVAILABLE`, `PAIRING`, `READY`, `LIVE`, `DISCONNECTED`), hardware capabilities (touch, pen, multiTouch, resolution), and physical classroom binding.
  - **Cryptographic Pairing & Scoped Ticket Auth**:
    * Ephemeral 6-digit PIN with 5-minute TTL and HMAC-SHA256 cryptographically signed board tickets scoped strictly to user, board, and active class session.
  - **Structured BoardDocument & Responsive Canvas**:
    * Canonical `BoardDocument` with multi-page support (`BoardPage`), element models (`BoardElement`: stroke, shape, text, formula, arrow), zero-blocker canvas initialization, monotonic autosave, and undo/redo history.
  - **Role-Based Sanitization & Board History**:
    * Strict stripping of private teacher notes and answer keys from physical board payloads; student board history access strictly restricted to teacher-released documents.

- **Phase D.8.5: SmartBoard Interaction Hardening (Completed)**:
  - **Professional Selection System**:
    * Tap/click single object selection and Shift+click multi-selection.
    * Freeform closed Lasso selection: point-in-polygon ray-casting algorithm capturing strokes, shapes, and formulas enclosed by freeform loop.
    * Rectangular Marquee selection: drag-to-select box boundary.
    * Real-time combined selection bounding box with 4 corner resize handles (NW, NE, SE, SW) and individual element outlines.
  - **Multi-Object Manipulation & Transformation**:
    * Group movement: dragging selection moves all selected elements together preserving relative geometry, stroke coordinates, and semantic bounding boxes.
    * Proportional scaling: corner handle drag scales stroke point sequences relative to opposite corner anchor without destroying handwriting fidelity.
    * Duplicate & Delete: contextual actions with fresh unique IDs (zero ID collisions) and semantic candidate reference cleanup.
    * Keyboard shortcuts: Delete/Backspace, Ctrl+D (duplicate), Ctrl+Z (undo), Ctrl+Y (redo), Escape (deselect).
  - **Continuous Multi-Stroke Eraser**:
    * Continuous pointer movement (down → move → up) evaluating line segment intersections dynamically across all elements without lifting the pen.
    * Submodes: continuous stroke eraser and whole-object eraser.
    * Live visual eraser radius cursor.
  - **Full Undo/Redo & Gesture Safety**:
    * Monotonic undo/redo covering drawing, continuous erasing, group movement, resizing, duplication, deletion, and background changes.
    * `touchAction: 'none'` preventing browser scrolling or accidental gesture confusion.
  - **End-to-End Test Suite (`tests/education_d8_5_interaction.test.ts`)**:
    * 100% passing across selection, lasso containment, marquee, group movement, transformation scaling, multi-stroke eraser, ID collision prevention, and semantic metadata hygiene.

- **Phase D.9: Vision Board Foundation (Completed)**:
  - **Semantic Object Model & Handwriting Grouping**:
    * Extensible semantic categories (`HANDWRITING`, `TEXT`, `EQUATION`, `SHAPE`, `DIAGRAM`, `GRAPH`, `IMAGE`, `ARROW`, `ANNOTATION`) with bounding boxes, confidence metrics, and non-destructive binding preserving original handwriting strokes.
    * Spatial clustering grouping nearby strokes into candidate regions based on Euclidean distance and bounding box proximity.
  - **Text, Equation & Diagram Recognition Foundation**:
    * `BoardRecognitionService` with capability boundaries for `recognizeText`, `recognizeEquation`, and `recognizeDiagram`.
    * Clean provenance tracking distinguishing `AI_RECOGNIZED`, `LOCAL_DETERMINISTIC`, and `UNRECOGNIZED` with zero fabricated AI labels.
    * Robust fallback supporting physics and math curricula with variables, constants, and LaTeX generation.
    * Structured `DiagramObject` topology with nodes, edges, labels, and geometry.
  - **Spatial Understanding Engine (`SpatialEngine`)**:
    * Real geometry-based relationship inference supporting `ABOVE`, `BELOW`, `LEFT_OF`, `RIGHT_OF`, `NEAR`, `CONTAINS`, `CONNECTS_TO`, and `LABELS` using horizontal/vertical overlap thresholds.
  - **Bounded BoardAIContext & RAG Knowledge Bridge**:
    * Bounded `BoardAIContext` restricting context payload to selected page/elements, recognized equations, diagrams, and curriculum grounding.
    * `BoardRagBridge` ingesting released board documents into vector spaces with strict 403 authorization checks.
    * Sandboxed tools: `smartboard.vision.recognize` and `smartboard.vision.context`.
  - **End-to-End Test Suite (`tests/education_d9_vision_board.test.ts`)**:
    * 100% passing across semantic models, handwriting grouping, spatial relationships, equation & diagram recognition, AI context generation, RAG ingestion, and simulation scenarios with byte-identical `data/jarvis-db.json` preservation.

- **Phase D.10: AI Visualization Engine & SmartBoard Integration (Completed)**:
  - Safe, deterministic, bounded mathematical expression evaluator (`MathEvaluator`) with zero `eval()` / `Function()` execution vectors and prototype pollution defenses.
  - Interactive renderers for Math Graphs (dynamic sampling, multiple parameter sliders), 2D Kinematics Projectile Motion with trajectory physics, Molecular Structures (covalent bonds, element metadata), Diagrams, and Data Charts.
  - Server-authoritative `visualizationService`, atomic storage, RBAC controls, and sandboxed tools (`visualization.validate`, `visualization.create`, `visualization.list`, `visualization.get`, `visualization.attach`).
  - Automated test suite (`tests/education_d10_visualization_engine.test.ts`): 100% PASS.

- **Phase D.11: Real-Time Teaching Copilot & Action Planning Engine (Completed)**:
  - Server-authoritative action classification (`SAFE_READ`, `TEACHER_CONFIRMATION`, `HIGH_IMPACT`) with bounded prompt context assembly.
  - Safe reads execute immediately; high-impact actions (quizzes, board mutations, assignments) create structured proposals requiring explicit teacher approval/rejection.
  - Sandboxed tools (`copilot.command`, `copilot.proposals.review`), REST endpoints, and immutable audit event ledger.
  - Automated test suite (`tests/education_d11_teaching_copilot.test.ts`): 100% PASS.

- **Phase D.12: Mobile Control Plane & Classroom Surface Integration (Completed)**:
  - Ephemeral 6-digit PIN challenges, QR payload generation, and HMAC cryptographic ticket verification for pairing teacher mobile devices to physical smartboards.
  - Remote actions (`NEXT_PAGE`, `PREV_PAGE`, `GOTO_PAGE`, `CLEAR_PAGE`, `TOGGLE_LASER`, `FIT_VIEW`) and idempotent session delivery.
  - Automated test suite (`tests/education_d12_mobile_control_plane.test.ts`): 100% PASS.

- **Phase D.13: Board Knowledge Engine & Structured Whiteboard Intelligence (Completed)**:
  - Pipeline connecting physical board derivations to academic learning: `BOARD -> UNDERSTAND -> STRUCTURE -> LINK -> STORE -> SEARCH -> LEARN`.
  - Deterministic knowledge extraction, AI enrichment, multi-tenant search, and derived notes/homework generators.
  - Sandboxed tools (`smartboard.knowledge.index`, `smartboard.knowledge.release`, `smartboard.knowledge.search`, `smartboard.knowledge.ask`, `smartboard.knowledge.derive_notes`).
  - Automated test suite (`tests/education_d13_board_knowledge.test.ts`): 100% PASS (27/27 assertions).

- **Phase D.14: Student Live Classroom Surface (Completed)**:
  - Unified, focused live classroom surface replacing fragmented tab hopping across SmartBoard, Quiz, Notes, Resources, Community, and AI Assistant.
  - Canonical `LiveClassroomState` view model anchored to existing `ClassSession`, course curriculum hierarchy, and institutional boundary.
  - Dominant center-stage SmartBoard & presentation canvas with live page synchronization and history navigation.
  - Bounded in-class **Ask Jarvis** AI tutor grounded strictly in active lesson objectives, whiteboard derivations, and recognized equations.
  - Private in-class student notes with provenance tracking (`sourceBoardId`, `sourcePageId`, `sourceClassSessionId`) and automatic Workspace synchronization.
  - Seamless formative in-class quiz integration, released lesson resources, class comm link, and post-class transition summary with actionable next steps.
  - Realtime SSE integration with auto-reconnect resiliency and robust cross-institution RBAC defenses.
  - Automated test suite (`tests/education_d14_student_live_classroom.test.ts`): 100% PASS (20/20 assertions).

- **Phase D.15: Classroom Intelligence Engine (Completed)**:
  - Evidence-backed classroom intelligence answering: *"What happened? What does it mean? What should happen next?"*
  - Canonical `ClassroomIntelligence` model anchored strictly to canonical `ClassSession` without a secondary or competing analytics database.
  - 100% deterministic calculation of factual metrics (participation rate, assessment accuracy, recognized board derivations, homework submissions, focus duration, discussion activity) and transparent evidence items with source provenance (`QUIZ_QUESTION`, `QUIZ_RESULT`, `BOARD_KNOWLEDGE`, `ASSIGNMENT_SUBMISSION`, `FOCUS_SESSION`, `COMMUNITY_ACTIVITY`).
  - Deterministic Misconception Engine identifying concept failure rates and clearly separating factual observations from AI hypotheses.
  - Bounded AI Interpretation Layer generating structured JSON summaries and pedagogical advice with SHA-256 evidenceHash caching to prevent redundant LLM invocations and ₹0 offline deterministic fallback.
  - Actionable Teacher Pedagogical Recommendations (reteach, diagnostic checkpoints, community posts) with 1-click navigation links.
  - Non-leaking Student Action Recommendations (lesson review, practice checkpoints, focus sessions).
  - Next ClassSession Carry-Forward Teaching Signals linking prior difficulties into lesson prep wizards.
  - Strict privacy & RBAC boundaries across Student, Teacher, Parent/Family, and Principal/Executive views with IDOR protection.
  - Automated test suite (`tests/education_d15_classroom_intelligence.test.ts`): 100% PASS (22/22 assertions).

- **Stage 4: Progressive Onboarding, Sovereign Identity & Workspace Context (Completed)**:
  - Fundamental Principle Enforced: One persistent personal identity. Multiple contexts. Zero forced institutional dependency.
  - Progressive Onboarding flow with age-appropriate and role-aware profile calibration (Personal vs Institutional pathways).
  - Isolated sovereign personal workspace (`ws-pers-${userId}`) provisioned with every individual account with `institutionId: undefined`.
  - Secure Institution Invitation Code subsystem (`IInstitutionRepository` on `diskRepository` and `memoryRepository`):
    - Real-time validation endpoint (`POST /api/auth/invitation/validate`) verifying status, expiration, and capacity limits without credential leakage.
    - Authenticated redemption endpoint (`POST /api/auth/invitation/join`) and registration redemption with anti-privilege escalation (authorized role enforced server-side).
  - Personal vs Institutional workspace boundary enforcement on all workspace endpoints (`GET /api/workspaces/my`, `POST /api/workspaces/switch`, `GET /api/workspaces/:id`).
  - First-class UI Workspace Switcher in AppShell with instant switching, clear badges (`SOVEREIGN` vs `INSTITUTION`), and an in-app dialog to link institutions with invitation codes.
  - Dedicated `/app/personal` sector view rendering sovereign memory vault, personal learning goals, and multi-context switcher.
  - Automated test suite (`tests/stage4_progressive_onboarding_workspace.test.ts`): 100% PASS.

- **Stage 6.4.1: Canonical Repository Contract & Schema Expansion (Completed)**:
  - Canonical database schema version incremented to 2 (`CURRENT_DATABASE_SCHEMA_VERSION = 2`) with backwards-compatible schema metadata (`compatibilityLevel: backwards_compatible`).
  - Strict type contracts defined on `IJarvisDataRepository` across disk and memory implementations: `personalIdentities`, `personalMemories`, `personalKnowledge`, `personalStudy`, `activityTimeline`, `diagnosticSessions`, `knowledgeAssets`, and `learnerExposures`.
  - Automated test suite (`tests/stage6_4_1_repository_contract.test.ts`): 100% PASS.

- **Stage 6.4.2: Personal Core Store Repository Integration (Completed)**:
  - Migrated `personalIdentityStore`, `personalMemoryStore`, and `personalKnowledgeStore` from process-volatile Maps to the unified `IJarvisDataRepository` contract.
  - Personal profiles, preferences, learning goals, sovereign memory items with explicit provenance, and concept mastery state persist across process restarts with `DiskJarvisDataRepository`.
  - Automated test suite (`tests/stage6_4_2_personal_store_repository_integration.test.ts`): 100% PASS.

- **Stage 6.4.3: Remaining Personal-Store Persistence (Completed)**:
  - Migrated `PersonalNotesStore` (study notes, flashcards, session plans) and `ActivityTimelineStore` from in-memory Maps to `IPersonalStudyRepository` and `IActivityTimelineRepository`.
  - Study notes, flashcards, and study plans survive cold process restarts with authenticated user and context isolation.
  - Action activity history and safe undo state (`undone: true`, deleted target artifact) survive process restarts while preventing cross-user rollback or leaks.
  - Integrated `DiagnosticService` with `IDiagnosticSessionRepository`: diagnostic session records, action retry index, and checkpoint evaluations persist truthfully while keeping in-flight concurrency locks in memory.
  - Preserved backward compatibility with version 1 database snapshots and full compatibility with `MemoryJarvisDataRepository`.
  - Automated test suite (`tests/stage6_4_3_remaining_personal_store_persistence.test.ts`): 100% PASS (5/5 suites).

- **Stage 6.4.4: Atomic Multi-Store Updates and Consistency Audit (Completed)**:
  - Audited multi-store mutations across personal identity, memory vault, knowledge mastery, study notes, diagnostic sessions, and activity timeline.
  - Implemented bounded Unit-of-Work / atomic transaction pattern (`runTransaction`) on `IJarvisDataRepository`, supported across both `DiskJarvisDataRepository` and `MemoryJarvisDataRepository`.
  - Staging & Snapshot Rollback for JSON Storage: Staged in-memory during active transactions, suppressing intermediate disk flushes until commit; on rollback, pre-transaction state snapshot is immediately restored and disk remains completely untouched; on commit, flushed atomically via temporary file and rename (`rename(2)`).
  - Integrated process-local concurrency control: Transient FIFO mutex (`AsyncMutex`) with timeout support and nested savepoints via `AsyncLocalStorage`.
  - Wrapped multi-store operations in atomic transactions:
    - Diagnostic checkpoint submission (`DiagnosticService.evaluateCheckpoint`): coordinates `personalKnowledge`, `personalIdentities`, `diagnosticSessions`, and `activityTimeline`.
    - Activity timeline reversible rollback (`ActivityTimelineStore.undoActivity`): coordinates target artifact deletion and timeline item `undone: true`.
    - Personal goal activation (`POST /api/personal/goals`): coordinates `personalIdentities.goals`, `personalMemories`, and `activityTimeline`.
    - Note creation actions (`POST /api/personal/actions/execute`): coordinates `personalStudy`, `personalIdentities` study minutes, and `activityTimeline`.
  - Parity & Failure Boundaries: 100% behavioral parity between disk and memory repositories under commit, injected fault rollback, duplicate submissions, and concurrency.
  - Automated test suite (`tests/stage6_4_4_atomic_multi_store_consistency.test.ts`): 100% PASS (8/8 suites).

- **Stage 6.4.4.16: Repository Boundary Cleanup and Secure Export Architecture (Completed & Verified)**:
  - Repository Boundary Hardening:
    - Zero direct store bypasses (`.store`, `(jarvisData as any)['store']`, `getState()`, `mutate()`) across all application domain callers.
    - Verified all 5 prior callers (`sessionStore`, `educationStore`, `liveClassroomRoutes`, `academicIntegrationService`, `diagnostics.ts`) cleanly interact through typed repository interfaces (`jarvisData.conversations`, `jarvisData.education`, `jarvisData.institutions`, etc.).
  - Secure Internal Migration Export Routes (`server/export/exportRoutes.ts` & `exportService.ts`):
    - Multi-layer operator protection: mounted on `/api/internal/export/*`, requires authenticated principal with `admin` or `commander` role and explicit capability check `admin.system.manage`.
    - Dedicated operator secret gate: constant-time (`crypto.timingSafeEqual`) matching on `X-Operator-Secret` / `X-Internal-Export-Secret` with >= 32 char enforcement and fail-closed semantics. Zero secrets logged.
    - Complete 45-collection schema coverage: machine-checkable enumeration of all collections in `DatabaseSchema`, per-collection record counts, SHA-256 collection checksums, and top-level overall payload checksum.
    - Storage object manifest & binary streaming: scans `data/storage/objects/` with SHA-256 hashes and sizes; streams binary files with path traversal prevention (`..` and directory escaping blocked).

- **Stage 6.4.4.17: Independent Verification and Export Safety Hardening (Verified & Closed)**:
  - Independent Code & Execution Audit:
    - All tests, type checking, and production builds were executed and verified independently (not relying on prior unverified claims).
    - `npm run lint` (`tsc --noEmit`): 0 errors.
    - `npm run build`: Succeeded.
    - Boundary Regression Suite (`tests/stage6_4_4_16_repository_boundary_regression.test.ts`): 5/5 PASS.
    - Secure Export & Integrity Suite (`tests/stage6_4_4_16_secure_export.test.ts`): 7/7 PASS (covering unauthenticated 401, expired tokens 401, corrupted signatures 401, unauthorized role 403, missing/invalid operator secret 403, 45 collections verification, binary streaming, path traversal rejection 400, non-existent key 404).
  - Snapshot Consistency Hardening:
    - Traced `DiskJarvisDataRepository.runTransaction()` and `AsyncMutex`. Verified process-local scoping: transactions isolate working state in `transactionStates` on the current `AsyncLocalStorage` context.
    - Verified that concurrent in-flight transactions are isolated from external export streams: external export HTTP requests run in independent async contexts and see only committed state; uncommitted mutations are never observed by external exports.
    - Verified snapshot immutability via `structuredClone()`; concurrent repository mutations after snapshot capture do not mutate or tear the export snapshot.
    - Verified rollback and nested transaction savepoint isolation: rolled-back mutations never enter committed snapshots.
  - Export Safety & Memory Boundedness Hardening:
    - Replaced `fs.promises.readFile` buffer loading in `generateStorageManifest` and `getStorageObjectStream` with constant-memory streaming SHA-256 hashing (`computeFileSha256`), guaranteeing safe processing of multi-megabyte and multi-gigabyte binary assets without V8 heap exhaustion.
    - Added disconnect and stream abort detection in `writeWithDrain` and `streamDatabaseExport`: premature client closures and destroyed streams cleanly reject without hanging or leaking event listeners.
    - Hardened incomplete export detection: exports aborted by payload limit ceiling (`MAX_EXPORT_BYTES`) terminate abruptly without valid JSON envelope, without `overallChecksum`, and without `collectionChecksums`, making it impossible for clients to mistake truncated exports for valid backups.
    - Added explicit `hasCapability(actor, 'admin.system.manage')` verification in `requireOperatorAuth` in addition to role verification.
  - Stage Closeout Decision: **STAGE 6.4.4.16 AND STAGE 6.4.4.17 OFFICIALLY CLOSED AND VERIFIED.**

- **Stage 6.4.4.18: Production Persistence and Recovery Readiness Audit (Completed)**:
  - Runtime Persistence Architecture Audit:
    - Verified runtime storage selections: DiskRepository (`data/jarvis-db.json`) and DiskFileStore (`data/storage/objects/`) operate as local file-system stores.
    - Cloud Run instance replacement risk identified: Cloud Run container instances operate on ephemeral file systems; restarts or re-deployments discard local disk changes unless external persistent volume (e.g. Cloud Storage / Cloud SQL) is configured.
    - Export artifact boundary: Database export (`/api/internal/export/stream`) and binary manifest (`/api/internal/export/storage-manifest`) provide raw export primitives but lacked offline bundled packaging and automated validation tooling.
  - Recovery Prerequisite: Built offline bundling tool and strict restore validator with dry-run capabilities prior to any schema or database migration.

- **Stage 6.4.4.19: Offline Backup Bundle, Restore Validation, and Recovery Proof (Completed & Verified)**:
  - Backup Bundling Tool (`scripts/backup_bundle.ts`):
    - Implemented CLI and programmatic bundler combining complete 45-collection database export (`database_export.json`) and physical binary storage objects (`objects/*`).
    - Emits self-authenticating `bundle_manifest.json` (Format Version 1) with per-object byte sizes, relative paths, mime types, FileRecord IDs, and SHA-256 digests.
    - Streams binary assets via bounded-memory file pipeline hashing (`streamCopyAndHash`); database JSON parsed in-memory (bounded by V8 heap, recommended limit ~100MB / ~200,000 records).
    - Guards against path traversal (`assertSafeStorageKey`), symlink escapes, duplicate storage keys, missing files, and active directory overwrites. Employs atomic rename from staging directory.
  - Restore Validation & Safe Restore Tool (`scripts/restore.ts`):
    - Comprehensive offline validator (`validateBackupBundle`) verifying manifest self-checksum, schema versions, all 45 collections, per-collection counts, collection SHA-256 hashes, overall checksum, and physical binary asset digests.
    - Strict restore engine (`restoreBackupBundle`) with mandatory dry-run default, path-traversal prevention, canonical `realpath` symlink alias defenses, explicit destination directory requirements, and active database safeguards (`data/jarvis-db.json` and `data/storage/objects` overwrite refused).
    - Preserves all primary identifiers, timestamps, relationships, and audit history across all 45 collections without data reseeding.
  - Deterministic Recovery Test Suite (`tests/stage6_4_4_19_recovery.test.ts`):
    - Verified all 8 test scenarios passing: (1) valid bundle creation & restore into temp directory, (2) missing and corrupted binary object detection, (3) collection & overall checksum tamper detection, (4) format and schema version checks, (5) directory traversal and key sanitization, (6) interrupted staging cleanup, (7) large binary streaming copy, (8) active database, symlink alias, and destination overwrite protection.

- **Stage 6.4 Final Closeout Audit & Repair (Completed & Verified)**:
  - Tracked Database Cleanup (`data/jarvis-db.json`):
    - Identified and removed 14 synthetic test user records (`user-mv24jqwy-phk9`, `user-mv24jrn9-fgne`, `user-mv24jrnu-mleu`, `user-mv24jsfd-f4ti`, `user-mv24jsfz-1dbm`, `user-concurrent-*`, `user-tx-uncommitted-*`, `user-nested-outer-*`) and their associated test records in `personalIdentities` (5), `personalMemories` (1), `personalKnowledgeStates` (4), `personalStudyNotes` (2), `activityTimeline` (16), and `diagnosticSessions` (4).
    - Preserved legitimate seed records (`user-tony`, `teacher-1`, `student-1`, `student-2`, `principal-1`, `parent-1`, `parent-2`) and user account (`user-mv26vh89-dczd` / RANJAN SAHU).
  - Test Isolation Hardening:
    - Updated `server/data/fileStore.ts` to respect `process.env.JARVIS_DB_PATH`.
    - Hardened `tests/httpHarness.ts` to automatically isolate `jarvisData` to a temporary repository whenever called, guaranteeing tests never mutate tracked durable database file.
  - Recovery Test Integration in Standard Suite (`package.json`):
    - Added `tests/stage6_4_4_19_recovery.test.ts` to standard `npm test` workflow with top-level `await` to ensure process execution waits for completion and propagates non-zero exit codes.
  - Memory Characteristics Clarified:

- **Formation #03: Quantum Atomic Orbitals Implementation (Completed & Verified)**:
  - Architecture: Dedicated high-density Canvas 2D volumetric layer (`src/components/landing/formations/atomicOrbitalsDetailRenderer.ts`).
  - Quantum Mechanical Topology: Central nucleus cluster with subatomic binding glow, isotropic s-orbital probability clouds (1s/2s), dumbbell-shaped pz (vertical) and px (horizontal) probability lobes, diagonal hybridized dxy cloverleaf lobes, and equatorial dz^2 toroidal nodal ring with opposite wave-function phase sign coloring (+ψ vs -ψ).
  - 100% Determinism: Zero `Math.random()` calls in renderer or coordinate generation.
  - Coordinate Lockstep: Constellation anchor nodes (52 nodes) in `computeSynchronizedFormationTarget` share exact 3D Larmor quantum precession and inclination tilt transformations with volumetric detail points without planar drift.
  - Verification: Dedicated test suite `tests/formation03_atomic_orbitals.test.ts` passed (100%), multi-formation audit `tests/final_formation_audit.test.ts` passed (100%), `lint_applet` and `compile_applet` succeeded with 0 errors.

- **Formation #04: Relativistic Black-Hole Vortex Implementation (Completed & Verified)**:
  - Architecture: Dedicated high-density Canvas 2D volumetric layer (`src/components/landing/formations/blackHoleVortexDetailRenderer.ts`).
  - Astrophysical Relativistic Topology: Central dark Schwarzschild event horizon void ($r < 0.052$), brilliant photon sphere boundary ring, gravitationally lensed Einstein light arches, differential relativistic Keplerian accretion disk with Doppler beaming asymmetry, and collimated polar relativistic plasma jets with synchrotron emission knots.
  - 100% Determinism: Zero `Math.random()` calls across detail renderer, coordinate generation, and transform calculation.
  - Coordinate Lockstep: Constellation anchor nodes (54 nodes) in `computeSynchronizedFormationTarget` share exact 3D relativistic disk tilt and precession transformations with volumetric detail points without planar drift.
  - Verification: Dedicated test suite `tests/formation04_black_hole_vortex.test.ts` passed (100%), multi-formation audit `tests/final_formation_audit.test.ts` passed (100%), regression suites passed, `lint_applet` and `compile_applet` succeeded with 0 errors.

- **Formation #05: Connected Knowledge Constellation Implementation (Completed & Verified)**:
  - Architecture: Dedicated high-density Canvas 2D volumetric layer (`src/components/landing/formations/knowledgeConstellationDetailRenderer.ts`).
  - Connected Intelligence Topology: 5 Hierarchical Primary Knowledge Hubs (Central Synthesis Nexus, Empirical Observatory Spire in NE, Theoretical Archive Bastion in SW, Systems Architecture Pivot in SE, Speculative Frontier Beacon in NW), concentric harmonic resonance wave rings, arterial knowledge highways linking the central nexus to regional hubs, circumferential bridging arches, and propagating data packets/photon pulses streaming along conduits.
  - Volumetric Detail: ~3,444 deterministic micro-knowledge stars partitioned across the 5 knowledge clusters, highway streamers, and celestial framing field (exceeds >= 2,500 requirement).
  - 100% Determinism: Zero `Math.random()` calls across detail renderer, coordinate generator (`generateKnowledgeConstellationCoords`), and transformation pipeline.
  - Coordinate Lockstep: 54 anchor nodes in `computeSynchronizedFormationTarget` share exact 3D celestial inclination (0.22 rad) and slow equatorial drift transformations with volumetric detail points without planar drift.
  - Inactive Envelope: Strictly 0 draw calls when `progress <= 0.02`.
  - Sequential Registry: Registered as Formation #05 (index 4) immediately after `black_hole_vortex` in `MILESTONE1_FORMATIONS`.
  - Protection Guarantees: Protected 48-node Signature J, ambient particle counts (190 mobile / 360 desktop), and 10.5s lifecycle cycle timings 100% preserved.
  - Verification: Dedicated test suite `tests/formation05_knowledge_constellation.test.ts` passed (100%), multi-formation audit `tests/final_formation_audit.test.ts` passed (100%), regression suites passed, `lint_applet` and `compile_applet` succeeded with 0 errors.

- **Formation #06: Celestial Planetary Orbital System Implementation (Completed & Verified)**:
  - Architecture: Dedicated high-density Canvas 2D volumetric layer (`src/components/landing/formations/orbitalSystemDetailRenderer.ts`).
  - Celestial Planetary Topology: Brilliant Central Star (photosphere, chromosphere, extended radiant corona with solar prominence flares), 5 distinct Keplerian elliptical orbital tracks with spatial depth and system inclination tilt (0.38 rad), varied orbital velocities obeying Kepler's laws, Planet II with orbiting satellite moon, Planet III with multi-strand Saturnian equatorial ring system, and dense Main Asteroid Belt corridor ($r \sim 0.185$).
  - Volumetric Detail: ~3,475 deterministic micro-points partitioned across solar corona flares, asteroid belt debris, Saturnian planetary rings, orbital resonance tracks, and outer zodiacal dust cloud (exceeds >= 2,500 requirement).
  - 100% Determinism: Zero `Math.random()` calls across detail renderer, coordinate generator (`generateOrbitalSystemCoords`), and transformation pipeline.
  - Coordinate Lockstep: 54 anchor nodes in `computeSynchronizedFormationTarget` share exact 3D celestial inclination tilt (0.38 rad), slow orbital precession, and Keplerian planetary motion with volumetric detail points without planar drift.
  - Inactive Envelope: Strictly 0 draw calls when `progress <= 0.02`.
  - Sequential Registry: Registered as Formation #06 (index 5) immediately after `knowledge_constellation` in `MILESTONE1_FORMATIONS`.
  - Protection Guarantees: Protected 48-node Signature J, ambient particle counts (190 mobile / 360 desktop), and 10.5s lifecycle cycle timings 100% preserved.
  - Verification: Dedicated test suite `tests/formation06_orbital_system.test.ts` passed (100%), multi-formation audit `tests/final_formation_audit.test.ts` passed (100%), regression suites passed, `lint_applet` and `compile_applet` succeeded with 0 errors.

- **Formation #08: Computational Neural Network Separation (Completed & Verified)**:
  - Architecture: Dedicated high-density Canvas 2D volumetric layer (`src/components/landing/formations/neuralNetworkDetailRenderer.ts`).
  - Computational Intelligence Topology: Clean 4-layer feedforward AI architecture (8 input nodes at $x = -0.35$, 12 feature/hidden nodes at $x = -0.15$, 16 latent bottleneck/nucleus nodes at $x = 0.08$, 10 decision/output nodes at $x = 0.32$, plus 4 modulatory bias nodes = 50 nodes).
  - Clean Separation: Removed microscopic biological vesicles, neurotransmitter clouds, and glial sheaths; replaced with ~1,280 activation stream packets along weight channels, ~1,120 latent-space manifold/embedding points, and ~750 output decision wavefronts (total 3,312 volumetric micro-points).
  - Backward Compatibility: Full dual-dispatch for `'neural_network'` and `'neural_synapse'` preserved across `formationDetailEngine.ts` and `formationRegistry.ts`.
  - Verification: Dedicated test suite `tests/formation08_neural_network.test.ts` passed (100%), updated `tests/deterministic_formations_milestone1.test.ts` passed (100%), master audit `tests/final_formation_audit.test.ts` passed (100%), regression suites passed, `lint_applet` and `compile_applet` succeeded with 0 errors.

- **Formation #10: Multipolar Single Neuron Implementation (Completed & Verified)**:
  - Architecture: Dedicated high-density Canvas 2D volumetric layer (`src/components/landing/formations/singleNeuronDetailRenderer.ts`).
  - Biological Single-Cell Topology: Prominent central soma with luminous nucleus and rough ER Nissl bodies, multipolar dendritic arbor with secondary/tertiary bifurcations and visible spines, tapered axon hillock initial segment trigger zone, segmented myelinated axon with 4 myelin sheaths and uninsulated Nodes of Ranvier gaps exhibiting saltatory conduction, and branching telodendria with 6 terminal boutons.
  - Volumetric Detail: 3,430 deterministic micro-points and 93 structural filaments (exceeds >= 2,500 requirement).
  - 100% Determinism: Zero `Math.random()` calls across detail renderer, coordinate generator (`generateSingleNeuronCoords`), and transformation pipeline.
  - Coordinate Lockstep: 52 anchor nodes in `computeSynchronizedFormationTarget` share exact bio-electric wave dynamics without planar drift or NaN.
  - Inactive Envelope: Strictly 0 draw calls when `progress <= 0.02`.
  - Sequential Registry: Registered as Formation #10 (index 9) immediately after `neural_synapse` in `MILESTONE1_FORMATIONS`.
  - Verification: Dedicated test suite `tests/formation10_single_neuron.test.ts` passed (100%), regression test suites passed, `lint_applet` and `compile_applet` succeeded with 0 errors.

- **Formation #11: Biological Synaptic Web Implementation (Completed & Verified)**:
  - Architecture: Dedicated high-density Canvas 2D volumetric layer (`src/components/landing/formations/synapticWebDetailRenderer.ts`).
  - Biological Synaptic Microcircuit Topology: Multi-neuronal microcircuit featuring presynaptic axonal feeders and terminal boutons (16 nodes), 3 active synaptic clefts with quantal active zones and intercellular 20nm cleft boundaries (12 nodes), and postsynaptic density with mushroom/thin dendritic spines and receptive arbors (24 nodes = 52 total).
  - Distinct Visual Identity: Distinguished clearly from #08 (purely computational feedforward weight matrix) and #10 (single isolated cell body) by depicting a multi-neuronal microcircuit with presynaptic bouton envelopes, docked vesicle clusters (50nm spheres), quantum neurotransmitter diffusion clouds in the cleft, and thickened postsynaptic densities.
  - Volumetric Detail: 3,501 deterministic micro-points and 12 structural filaments (exceeds >= 2,500 requirement).
  - 100% Determinism: Zero `Math.random()` calls across detail renderer, coordinate generator (`generateSynapticWebCoords`), and transformation pipeline.
  - Coordinate Lockstep: 52 anchor nodes in `computeSynchronizedFormationTarget` share exact bio-electric depolarization wave, transmitter exocytosis bursts, and postsynaptic EPSP propagation without planar drift or NaN.
  - Inactive Envelope: Strictly 0 draw calls when `progress <= 0.02`.
  - Sequential Registry: Registered as Formation #11 (index 10) in `MILESTONE1_FORMATIONS`, reached via automatic cycle progression with seamless wraparound back to `galaxy_spiral`.
  - Verification: Dedicated test suite `tests/formation11_synaptic_web.test.ts` passed (100%), all regression suites passed, `npm run lint` and `npm run build` succeeded with exit code 0.

- **Stage 6.4 Security & Test Suite Remediation (Completed & Verified)**:
  - Critical Classroom SSE Stream Security Fix (`server/sectors/education/classroomRoutes.ts`):
    - Completely removed the unauthenticated `req.query.userId` bypass on `/stream` endpoints.
    - Enforced cryptographically verified, short-lived SSE tickets (`ticketService.verifySSETicket`) or signed Bearer tokens (`requirePrincipal`) for all classroom SSE streams.
    - Added `POST /api/classroom/sessions/:id/ticket` endpoint allowing authenticated instructional users/students to request session-scoped SSE connection tickets.
  - Tracked Data Verification & Note Preservation (`data/jarvis-db.json`):
    - Verified `note-phys-1` in `personalStudyNotes` matching canonical `seedData.ts` definition.
    - Confirmed JSON validity and verified pre-test and post-test SHA-256 hash immutability (`c69972f14510170ccc45953d1ec05e18c6cdd86a537bcd585f4beac678618390`).
  - Test Suite Isolation & Registration (`package.json` & `tests/`):
    - Hardened `tests/p0_5_server_role_capabilities.test.ts` and `tests/milestone14_2_security.test.ts` with isolated temporary disk repositories to prevent tracked database mutation.
    - Explicitly set and restored `process.env.ALLOW_DEV_AUTH` in `milestone14_2_security.test.ts`.
    - Enhanced `tests/persistence.test.ts` to seamlessly fallback to `startHttpHarness` when port 3000 is not running.
    - Registered 100% of test suites on disk (70/70 suites) into `package.json`'s `test` script.
    - Added Section 5 to `tests/http_classroom_boundary.test.ts` verifying raw `?userId` rejection, ticket channel mismatch (403), expired tickets (401), forged tickets (403), and valid SSE stream connections.
  - Verification & Closeout Status:
    - `npm run lint` (`tsc --noEmit`): 0 errors.
    - `npm run build`: Succeeded (1706 modules transformed).
    - All targeted security, classroom boundary, role capability, persistence, recovery, and transaction suites passed (exit code 0).
    - **STAGE 6.4 OFFICIALLY CLOSED AND VERIFIED.**

  - Particle Formation Milestone 12 — Knowledge Graph:
    - Implemented Formation #12: Interconnected Knowledge Graph (`knowledge_graph`).
    - Dedicated Canvas 2D detail renderer: `src/components/landing/formations/knowledgeGraphDetailRenderer.ts`.
    - Generates 54 deterministic anchor nodes partitioned into 3 major conceptual hub nuclei (12 nodes: Alpha, Beta, Gamma), intermediate entity clusters (18 nodes), and peripheral fact leaves / trans-domain query loops (24 nodes) with 81 relational edges.
    - Volumetric detail layer renders ~3,554 micro-points (hub kernels, entity clusters, relational pulse conduits, and fact leaves) with 14 structural filaments and gradient glows.
    - Zero draw calls when inactive (`progress <= 0.02`), 100% deterministic (zero `Math.random()`), and seamless single-hue / multicolor theme adaptability.
    - Synchronized lockstep anchor transforms with epistemic resonance waves via `computeSynchronizedFormationTarget` and `renderFormationDetailEngine`.
    - Fully registered in `MILESTONE1_FORMATIONS` appended at index 11 after Formation #11 (`synaptic_web`).
    - Verified via dedicated suite `tests/formation12_knowledge_graph.test.ts` and all regression suites.

  - Particle Formation Milestone 13 — Infinity Loop:
    - Implemented Formation #13: Harmonic 3D Infinity Loop (`infinity_loop`).
    - Dedicated Canvas 2D detail renderer: `src/components/landing/formations/infinityLoopDetailRenderer.ts`.
    - Generates 52 deterministic anchor nodes partitioned into a primary 3D lemniscate backbone (32 nodes), inner braided counter-stream & secondary harmonic loop (12 nodes), and central energy crossover junction (8 nodes) with 66 relational edges.
    - Volumetric detail layer renders ~3,361 micro-points across 4 partitions (primary braided stream, retrograde stream core, luminous central crossover junction flux, outer lobe halos & nested orbital resonances) plus 6 structural filaments and 8 propagating activation wavefronts.
    - Zero draw calls when inactive (`progress <= 0.02`), 100% deterministic (zero `Math.random()`), and full color theme support.
    - Synchronized lockstep anchor transforms with dynamic lemniscate circulation and junction breathing waves via `computeSynchronizedFormationTarget` and `renderFormationDetailEngine`.
    - Registered in `MILESTONE1_FORMATIONS` appended at index 12 after Formation #12 (`knowledge_graph`).
    - Verified via dedicated suite `tests/formation13_infinity_loop.test.ts` and all regression suites.

  - Particle Formation Milestone 14 — Intelligence Crystal:
    - Implemented Formation #14: Structured Intelligence Crystal (`intelligence_crystal`).
    - Dedicated Canvas 2D detail renderer: `src/components/landing/formations/intelligenceCrystalDetailRenderer.ts`.
    - Generates 54 deterministic anchor nodes partitioned into an outer crystalline shell (20 nodes: top/bottom polar apexes, upper, equatorial, and lower hexagonal girdle rings), an inner core lattice & octahedral seed (14 nodes), and optical refraction ridge midpoints & resonance hubs (20 nodes) with 122 structural facet/lattice edges.
    - Volumetric detail layer renders 3,250 micro-points across 4 partitions (outer facet ridgelines, planar face surface sheen with angle-dependent specular glints, inner octahedral lattice core, and propagating energy pulse channels & prismatic refraction sparks) plus 5 structural filaments.
    - Zero draw calls when inactive (`progress <= 0.02`), 100% deterministic (zero `Math.random()`), and full color theme support across single-hue and multicolor palettes.
    - Synchronized lockstep anchor transforms with facet breathing tension and quantum nucleus vibration via `computeSynchronizedFormationTarget` and `renderFormationDetailEngine`.
    - Registered in `MILESTONE1_FORMATIONS` appended at index 13 after Formation #13 (`infinity_loop`).
    - Verified via dedicated suite `tests/formation14_intelligence_crystal.test.ts`, `tests/final_formation_audit.test.ts`, and all regression suites.

  - Particle Formation Milestone 16 — Geometric Mandala:
    - Implemented Formation #16: Ordered Geometric Mandala (`geometric_mandala`).
    - Note on Sequence Architecture: Preserves logical identity as Formation #16 while Formation #15 Tesseract remains intentionally postponed. Appended sequentially in `MILESTONE1_FORMATIONS` at index 14 directly following Formation #14 (`intelligence_crystal`) without reordering existing entries.
    - Dedicated Canvas 2D detail renderer: `src/components/landing/formations/geometricMandalaDetailRenderer.ts`.
    - Generates 54 deterministic anchor nodes partitioned across 4 concentric sacred geometry tiers: Tier 1 Inner Bindu Seed Core (6 nodes, $r = 0.052, z = +0.060$), Tier 2 Interlocking 12-Star & Hexagram (12 nodes, $r = 0.115-0.145, z = +0.035$), Tier 3 Intermediate 18-Petal Scalloped Lotus Ring (18 nodes, $r = 0.220-0.245, z = 0.000$), and Tier 4 Outer Cosmic Perimeter & 18 Gate Crenellations (18 nodes, $r = 0.335-0.365, z = -0.035$) with 99 structural edges.
    - Volumetric detail layer renders 3,355 deterministic micro-points across 4 partitions (Part A Inner Bindu Seed & Star Geometry, Part B Intermediate 18-Petal Lotus Arc Streams, Part C Outer Perimeter Ring & Gate Trusses, Part D 12 Arterial Radial Spoke Streamers & Traveling Pulse Packets) plus 13 structural filaments and 12 propagating photon wavefronts.
    - Multi-speed differential rotation (core forward, mid-ring counter-phase, outer ring forward) with 3D perspective pitch/yaw and Z-elevation parallax.
    - Zero draw calls when inactive (`progress <= 0.02`), 100% deterministic (zero `Math.random()`), and full color theme support across single-hue and multicolor modes.
    - Synchronized lockstep anchor transforms with radial breathing and petal waves via `computeSynchronizedFormationTarget` and `renderFormationDetailEngine`.
    - Dispatched in `CinematicParticleField.tsx` and registered in `MILESTONE1_FORMATIONS`.
    - Verified via dedicated suite `tests/formation16_geometric_mandala.test.ts` (100%), `tests/final_formation_audit.test.ts` (100%), all regression suites, `npm run lint`, and `npm run build`.


---

## 6. Current Constraints & Active Invariants
- Zero server secrets or API keys leaked to client code or bundles.
- No physical remote hardware or Bluetooth required (software remotes on web/mobile/tablet).
- Realtime quiz and video streaming engine remains deterministic and operates independently of Gemini/API availability.
- Strict workspace and class membership boundaries enforced across User -> Workspace -> File -> KnowledgeSpace -> Message -> ClassroomSession -> Quiz -> Video.
- Strict deny-by-default server-side authorization on all video, classroom, and quiz endpoints.
- Tests run in isolated test repositories and temporary storage providers, never modifying durable data.
- ₹0 local-first execution mode fully operational for offline development.

---

## 7. Next Milestones & Roadmap
- **Completed Milestones**: M1–M15 (Foundations, HUD, Terminal, Tools, Education, Persistence, Chat, RAG, Research, Storage, Messaging, Smart Classroom, Smart Quiz & Live Responses, Academic Video Library & Media Knowledge, AI Video Discovery & Grounded Video Q&A).
- **Next Milestone**: **M16 — Autonomous Task Agent & Multi-Sector Orchestration**.
