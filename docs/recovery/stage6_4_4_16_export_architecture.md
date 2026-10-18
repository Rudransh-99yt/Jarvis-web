# Stage 6.4.4.16: Repository Boundary Cleanup and Secure Export Architecture

## 1. Overview
As part of the preparation for Stage 6.5 (PostgreSQL / Cloud SQL migration), this document specifies:
1. Complete elimination and verification of direct store bypasses (`jarvisData.store`, `(jarvisData as any)['store']`, `.getState()`, and `.mutate()`) in production callers.
2. The authentication, authorization, and secret verification model for administrative and internal data migration export operations.
3. Accurate analysis of transaction semantics (`runTransaction()`), explaining process-local mutex limitations and how snapshot consistency is guaranteed during concurrent writes.
4. Bounded streaming architecture for exporting all 45 `DatabaseSchema` collections with per-collection record counts, SHA-256 checksums, and payload limits.
5. Storage object manifest mapping for `data/storage/objects/` with binary keys, sizes, and checksums.

---

## 2. Production Caller Inventory & Boundary Cleanup (Part A)

### Prior State Audit
Direct access to internal store properties was audited across the entire codebase (`server/` and `src/`). The audit verified:
1. `server/session/sessionStore.ts`:
   - Previously relied on private synchronous in-memory store mutations.
   - Refactored to delegate to `jarvisData.conversations` sub-repository (`getOrCreateSession`, `addSessionMessage`, `getSessionMessages`, `clearSession`, `getActiveSessionCount`) with a Thenable wrapper preserving synchronous continuity for existing callers and full asynchronous persistence to repository storage.
2. `server/sectors/education/educationStore.ts`:
   - Previously directly accessed `jarvisData.getState().classes` and called `jarvisData.mutate(...)` across units, lessons, assignments, submissions, and knowledge spaces.
   - Refactored to delegate to `jarvisData.education` and `jarvisData.knowledge` sub-repositories with synchronous/asynchronous parity. Removed accidental duplicate code block.
3. `server/sectors/education/live/liveClassroomRoutes.ts` & `classroomRoutes.ts`:
   - Audited for membership fetching; both routes use typed `jarvisData.institutions.listMemberships()` with `authorizationPolicy.canReadClass()`.
4. `server/sectors/education/academicIntegrationService.ts`:
   - Uses `jarvisData.education.createLearningLink()` and `jarvisData.education.deleteLearningLink()` for durable repository persistence alongside memory index caching.
5. `server/tools/diagnostics.ts`:
   - Uses `sessionStore.getActiveSessionCount()`, removing unsafe `as any` store access.

### Repository Contract Preservation
The low-level contract methods `getState(): DatabaseSchema` and `mutate<T>(fn: (state: DatabaseSchema) => T): T` are preserved on `IJarvisDataRepository`, `DiskJarvisDataRepository`, and `MemoryJarvisDataRepository` for backward compatibility during transactional rollbacks and export routines, but zero external production callers invoke them directly.

---

## 3. Operator Authentication & Authorization Model (Part B)

### Threat Model
Exporting database records and binary objects exposes sensitive student, institutional, and conversational data. An export route must NEVER be accessible publicly or by unprivileged application users.

### Multi-Layer Operator Defense
The export path enforces a multi-layer gate:
1. **Internal Path Isolation**:
   - Mounted exclusively on `/api/internal/export/*`.
   - In production, internal ingress policies or reverse proxies restrict this path to operator VPC / localhost / internal subnets.
2. **Cryptographic Identity Verification**:
   - The caller must present a valid signed Bearer token issued by `AuthService`.
   - The token subject is resolved against the trusted database.
3. **Role & Capability Authorization**:
   - The authenticated principal must hold role `admin` or `commander` and possess the `admin.system.manage` capability.
   - Standard roles (`student`, `teacher`, `parent`, `principal`, `guest`) are denied with `403 FORBIDDEN`.
4. **Dedicated Operator Secret Gate**:
   - An operator secret can be configured via `INTERNAL_EXPORT_SECRET` or `EXPORT_OPERATOR_SECRET`.
   - When configured or when `REQUIRE_OPERATOR_SECRET=true`, the request must include the header `X-Operator-Secret` or `X-Internal-Export-Secret`.
   - Length validation: Secrets must be at least 32 characters in length.
   - Constant-time verification: Verification uses `crypto.timingSafeEqual` between fixed-length buffers to eliminate timing side-channel attacks.
   - Fail-closed: If the environment mandates an operator secret and it is missing or empty, the endpoint fails closed immediately (`403 FORBIDDEN`).
   - Logging hygiene: Operator secrets are NEVER printed in logs, error responses, or telemetry.

---

## 4. Concurrency Semantics and Snapshot Consistency

### Realistic Analysis of `runTransaction()`
- `DiskJarvisDataRepository.runTransaction()` acquires an in-memory `AsyncMutex` within the current Node.js process.
- **Critical Limitation**: `runTransaction()` is process-local. It does NOT lock the underlying JSON file across multiple OS processes or distributed worker nodes.
- Furthermore, non-transactional single-entity mutations (e.g., standard `repo.users.update()`) invoke `store.mutate()` synchronously without acquiring `this.mutex`.
- Therefore, claiming that `runTransaction()` provides a "globally consistent read lock" across the entire database or external systems would be technically false.

### Snapshot Consistency Strategy for Export
To guarantee snapshot consistency without blocking concurrent reads or causing torn reads:
1. **Discrete Point-in-Time Snapshot Capture**:
   - Because the in-memory JavaScript execution loop is single-threaded between microtasks, calling `repo.getState()` and performing an immediate deep-clone snapshot (`structuredClone` or deterministic deep copy) within a synchronous execution frame captures an atomic point-in-time state.
   - During transactional writes, `this.mutex` is acquired if available to coordinate with active transactions.
2. **Isolated Streaming from Immutable Snapshot**:
   - The export serializer streams strictly from this frozen, immutable in-memory snapshot.
   - Any writes occurring concurrently during the streaming process mutate new or existing array references in the live repository state, but cannot mutate or tear the frozen export snapshot.
   - This guarantees that foreign key references, collection record counts, and checksums in the export are 100% mutually consistent as of `exportedAt`.

---

## 5. Export Format & Complete Schema Coverage

### All 45 Array Collections
The export payload includes all 45 collections defined in `DatabaseSchema` (plus `version` and `meta`):
1. `users`
2. `institutions`
3. `institutionMemberships`
4. `institutionInvitations`
5. `workspaces`
6. `memberships`
7. `conversations`
8. `messages`
9. `knowledgeSpaces`
10. `knowledgeSources`
11. `knowledgeChunks`
12. `classes`
13. `assignments`
14. `submissions`
15. `studyArtifacts`
16. `auditEvents`
17. `researchProjects`
18. `researchQuestions`
19. `evidenceRecords`
20. `researchNotes`
21. `researchReports`
22. `files`
23. `classroomSessions`
24. `classroomParticipants`
25. `quizzes`
26. `quizQuestions`
27. `quizResponses`
28. `quizParticipantStates`
29. `videos`
30. `learningLinks`
31. `academicEvents`
32. `academicNotifications`
33. `quizResults`
34. `smartboardDevices`
35. `boardDocuments`
36. `personalIdentities`
37. `personalMemories`
38. `personalKnowledgeStates`
39. `personalStudyNotes`
40. `personalFlashcards`
41. `personalStudyPlans`
42. `activityTimeline`
43. `diagnosticSessions`
44. `knowledgeAssets`
45. `learnerExposures`

### Checksums & Counts
- Schema version: `CURRENT_DATABASE_SCHEMA_VERSION` (2).
- Metadata: `meta` object from `DatabaseSchema`.
- `exportedAt`: Consistent ISO timestamp.
- `counts`: Record counts for all 45 collections.
- `collectionChecksums`: SHA-256 hash computed over each collection's serialized content.
- `overallChecksum`: Cumulative SHA-256 hash over the canonical collection payload.

---

## 6. Binary Storage Manifest (`data/storage/objects/`)

Binary objects stored on disk cannot be naively embedded into a single JSON document without inflating memory by 33%+ (Base64) and risking heap exhaustion.
Instead:
1. **Manifest Endpoint**: `/api/internal/export/storage-manifest`
   - Scans `data/storage/objects/` (ignoring `.gitkeep` and `.tmp.*`).
   - Computes actual byte size and SHA-256 checksum for each binary file.
   - Correlates with the `files` collection in `DatabaseSchema` (matching `storageKey`).
   - Produces a manifest with total objects, total size, per-file metadata, and manifest-level checksum.
2. **Object Stream Endpoint**: `/api/internal/export/storage-objects/:storageKey`
   - Streams the raw binary content of a specified object.
   - Enforces operator authentication and capability checks.
   - Streams directly using Node.js read streams with bounded buffers and HTTP content headers.

---

## 7. Bounded Streaming & Payload Limits

- The export stream serializer does not generate a single in-memory string.
- Collections are serialized chunk by chunk to the response stream, observing Node.js backpressure (`stream.write()` awaiting `'drain'`).
- Enforces `MAX_EXPORT_BYTES` (default: 100MB). If total emitted bytes exceed the limit, streaming terminates with an error.
- If a client connection aborts or an error is thrown, the stream terminates cleanly without resource leakage.
