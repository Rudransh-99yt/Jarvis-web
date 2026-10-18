import assert from 'node:assert/strict';
import {
  CURRENT_DATABASE_SCHEMA_VERSION,
  serializeDiagnosticSession,
  deserializeDiagnosticSession,
  type DatabaseSchema,
  type DiagnosticSessionRecord,
  type PersonalJarvisIdentity,
  type PersonalMemoryItem,
  type KnowledgeAsset,
  type LearnerQuestionExposure
} from '../server/data/types.ts';
import { INITIAL_DATABASE_SCHEMA } from '../server/data/seedData.ts';
import { DiskJarvisDataRepository } from '../server/data/diskRepository.ts';
import { MemoryJarvisDataRepository } from '../server/data/memoryRepository.ts';
import type { DiagnosticSession, DiagnosticQuestion } from '../server/personal/diagnosticService.ts';

console.log('=== [STAGE 6.4.1] REPOSITORY CONTRACT & SCHEMA EXPANSION TEST SUITE ===');

// 1. Schema Version and Metadata
console.log('\n--- Suite 1: Schema Versioning & Metadata Contract ---');
assert.equal(CURRENT_DATABASE_SCHEMA_VERSION, 2, 'Canonical schema version must be 2');
assert.ok(INITIAL_DATABASE_SCHEMA.meta, 'INITIAL_DATABASE_SCHEMA must include metadata');
assert.equal(INITIAL_DATABASE_SCHEMA.version, 2, 'Initial schema version is 2');
assert.equal(INITIAL_DATABASE_SCHEMA.meta?.compatibilityLevel, 'backwards_compatible', 'Compatibility level must be backwards_compatible');
assert.ok(INITIAL_DATABASE_SCHEMA.meta?.supportedDomains.includes('personalIdentities'), 'meta includes personalIdentities domain');
assert.ok(INITIAL_DATABASE_SCHEMA.meta?.supportedDomains.includes('diagnosticSessions'), 'meta includes diagnosticSessions domain');
assert.ok(INITIAL_DATABASE_SCHEMA.meta?.supportedDomains.includes('knowledgeAssets'), 'meta includes knowledgeAssets domain');
assert.ok(INITIAL_DATABASE_SCHEMA.meta?.supportedDomains.includes('learnerExposures'), 'meta includes learnerExposures domain');
console.log('[PASS] 1.1 Schema version and metadata invariants verified');

// 2. Backward Compatibility with v1 Snapshot (missing new collections)
console.log('\n--- Suite 2: Backward Compatibility with Version 1 Snapshots ---');
const v1Snapshot: DatabaseSchema = {
  version: 1,
  users: [
    {
      id: 'usr-legacy-1',
      displayName: 'Legacy User',
      email: 'legacy@stark.io',
      role: 'student',
      workspaceIds: ['ws-legacy'],
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ],
  institutions: [],
  institutionMemberships: [],
  workspaces: [],
  workspaceMemberships: [],
  conversations: [],
  messages: [],
  knowledgeSpaces: [],
  knowledgeSources: [],
  educationClasses: [],
  assignments: [],
  studentSubmissions: [],
  studyArtifacts: [],
  auditLogs: []
};
assert.equal(v1Snapshot.version, 1, 'v1 snapshot parsed correctly');
assert.equal(v1Snapshot.personalIdentities, undefined, 'v1 snapshot has undefined personal collections without error');
assert.equal(v1Snapshot.diagnosticSessions, undefined, 'v1 snapshot has undefined diagnosticSessions without error');
console.log('[PASS] 2.1 Version 1 schema remains compatible without field corruption');

// 3. Serialization and Deserialization of DiagnosticSession
console.log('\n--- Suite 3: Diagnostic Session Record Serialization & Integrity ---');
const sampleQuestion: DiagnosticQuestion = {
  id: 'q-diag-test-1',
  prompt: 'Define thermodynamic entropy.',
  concept: 'Thermodynamics',
  difficulty: 'foundational',
  hints: ['Statistical mechanics'],
  rubricId: 'rub-entropy',
  rubricKeywords: ['microstates', 'Boltzmann', 'order'],
  coreInvariants: ['S = k ln Omega']
};

const mockSession: DiagnosticSession = {
  sessionId: 'diag-session-contract-1',
  actionId: 'action-learn-123',
  userId: 'usr-student-tony',
  contextId: 'ctx-stark-sci',
  contextType: 'education',
  conceptName: 'Thermodynamics',
  subject: 'Physics',
  status: 'completed',
  completed: true,
  questions: [sampleQuestion],
  evaluatedCheckpoints: new Map([
    [
      'q-diag-test-1',
      {
        questionId: 'q-diag-test-1',
        conceptName: 'Thermodynamics',
        submittedAnswer: 'Entropy is Boltzmann constant times ln of microstates.',
        score: 0.95,
        isCorrect: true,
        isPartiallyCorrect: false,
        isProvisional: false,
        feedback: 'Excellent invariant statement.',
        masteryDelta: 0.15,
        evaluatedAt: '2026-10-09T12:00:00.000Z'
      }
    ]
  ]),
  createdAt: '2026-10-09T11:55:00.000Z',
  updatedAt: '2026-10-09T12:00:00.000Z',
  completedAt: '2026-10-09T12:00:00.000Z'
};

const serialized: DiagnosticSessionRecord = serializeDiagnosticSession(mockSession);
assert.equal(serialized.sessionId, mockSession.sessionId);
assert.equal(serialized.userId, mockSession.userId);
assert.equal(typeof serialized.evaluatedCheckpoints, 'object');
assert.ok(!(serialized.evaluatedCheckpoints instanceof Map), 'Serialized evaluatedCheckpoints must be plain JSON object');
assert.equal(serialized.evaluatedCheckpoints['q-diag-test-1'].score, 0.95);

const deserialized: DiagnosticSession = deserializeDiagnosticSession(serialized);
assert.equal(deserialized.sessionId, mockSession.sessionId);
assert.ok(deserialized.evaluatedCheckpoints instanceof Map, 'Deserialized evaluatedCheckpoints must be a Map');
assert.equal(deserialized.evaluatedCheckpoints.get('q-diag-test-1')?.score, 0.95);
console.log('[PASS] 3.1 serializeDiagnosticSession and deserializeDiagnosticSession preserve invariants');

// 4. Memory Repository Contract Fulfillment
console.log('\n--- Suite 4: Memory Repository Sub-Contract Verification ---');
const memRepo = new MemoryJarvisDataRepository();

// Identity contract check
assert.ok(memRepo.personalIdentities, 'personalIdentities sub-repository exists');
const mockIdentity: PersonalJarvisIdentity = {
  userId: 'usr-contract-test',
  userRole: 'student',
  profile: {
    name: 'Contract Test User',
    bio: 'Verification account',
    timezone: 'UTC',
    preferredSubjectInterests: ['Physics']
  },
  preferences: {
    tone: 'concise',
    guidancePacing: 'balanced',
    voiceResponseEnabled: false,
    theme: 'system'
  },
  learningGoals: [],
  activeContextId: 'ctx-default',
  contexts: [],
  stats: {
    totalConversations: 0,
    totalQuestionsAnswered: 0,
    totalMinutesStudied: 0,
    currentStreakDays: 0,
    conceptsMasteredCount: 0
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
await memRepo.personalIdentities.create(mockIdentity);
const fetchedIdentity = await memRepo.personalIdentities.getById('usr-contract-test');
assert.equal(fetchedIdentity?.userId, 'usr-contract-test');

// Memory contract check
assert.ok(memRepo.personalMemories, 'personalMemories sub-repository exists');
const mockMemory: PersonalMemoryItem = {
  id: 'mem-test-1',
  userId: 'usr-contract-test',
  category: 'preference',
  title: 'Prefers derivation over rote facts',
  content: 'User explicitly stated interest in first-principles explanations',
  provenance: {
    source: 'user_direct',
    confidence: 1.0,
    verifiedByUser: true
  },
  contextVisibility: 'all',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
await memRepo.personalMemories.create(mockMemory);
const userMemories = await memRepo.personalMemories.listForUser('usr-contract-test');
assert.equal(userMemories.length, 1);
assert.equal(userMemories[0].title, 'Prefers derivation over rote facts');

// Diagnostic Session sub-repository check
assert.ok(memRepo.diagnosticSessions, 'diagnosticSessions sub-repository exists');
await memRepo.diagnosticSessions.createSession(serialized);
const fetchedDiag = await memRepo.diagnosticSessions.getSessionById(serialized.sessionId);
assert.equal(fetchedDiag?.sessionId, serialized.sessionId);
assert.equal(fetchedDiag?.userId, 'usr-student-tony');

// Knowledge Asset sub-repository check
assert.ok(memRepo.knowledgeAssets, 'knowledgeAssets sub-repository exists');
const mockAsset: KnowledgeAsset = {
  id: 'asset-test-1',
  ownerId: 'usr-contract-test',
  assetType: 'QUESTION_SET',
  title: 'Classical Mechanics Problem Set',
  topic: 'Classical Mechanics',
  subject: 'Physics',
  educationLevel: 'undergraduate',
  difficulty: 'intermediate',
  workspaceId: 'ws-stark-core',
  reusable: true,
  provenance: {
    type: 'USER_CREATED',
    timestamp: new Date().toISOString()
  },
  validation: {
    status: 'VALIDATED'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
await memRepo.knowledgeAssets.create(mockAsset);
const fetchedAsset = await memRepo.knowledgeAssets.getById('asset-test-1');
assert.equal(fetchedAsset?.id, 'asset-test-1');

// Learner Exposure sub-repository check
assert.ok(memRepo.learnerExposures, 'learnerExposures sub-repository exists');
const mockExposure: LearnerQuestionExposure = {
  id: 'exp-test-1',
  userId: 'usr-contract-test',
  questionId: 'q-test-1',
  questionFingerprint: 'fp-q-test-1',
  concept: 'Thermodynamics',
  subject: 'Physics',
  topic: 'Entropy',
  status: 'COMPLETED',
  attemptCount: 1,
  incorrectCount: 0,
  latestResult: 'CORRECT',
  firstSeenAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString()
};
await memRepo.learnerExposures.recordExposures({
  userId: 'usr-contract-test',
  exposures: [mockExposure]
});
const expSummary = await memRepo.learnerExposures.getExposureSummary('usr-contract-test');
assert.equal(expSummary.totalSeen, 1);
assert.equal(expSummary.totalCompleted, 1);
console.log('[PASS] 4.1 MemoryJarvisDataRepository satisfies all Stage 6.4.1 sub-repository contracts');

// 5. Disk Repository Contract Fulfillment
console.log('\n--- Suite 5: Disk Repository Contract Verification ---');
const diskRepo = new DiskJarvisDataRepository();
await diskRepo.init();

assert.ok(diskRepo.personalIdentities, 'diskRepo.personalIdentities exists');
assert.ok(diskRepo.personalMemories, 'diskRepo.personalMemories exists');
assert.ok(diskRepo.personalKnowledge, 'diskRepo.personalKnowledge exists');
assert.ok(diskRepo.personalStudy, 'diskRepo.personalStudy exists');
assert.ok(diskRepo.activityTimeline, 'diskRepo.activityTimeline exists');
assert.ok(diskRepo.diagnosticSessions, 'diskRepo.diagnosticSessions exists');
assert.ok(diskRepo.knowledgeAssets, 'diskRepo.knowledgeAssets exists');
assert.ok(diskRepo.learnerExposures, 'diskRepo.learnerExposures exists');
console.log('[PASS] 5.1 DiskJarvisDataRepository exports all required typed sub-repository interfaces');

console.log('\n======================================================');
console.log('ALL STAGE 6.4.1 CONTRACT & SCHEMA EXPANSION TESTS PASSED!');
console.log('======================================================');
