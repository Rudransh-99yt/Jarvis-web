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
