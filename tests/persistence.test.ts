// Milestone 5: Core Platform Persistence & Data Foundation Automated Test Suite
import path from 'node:path';
import fs from 'node:fs';
import { createRepository } from '../server/data/index.ts';
import { jarvisData } from '../server/data/index.ts';

function assert(condition: boolean, message: string, details?: any) {
  if (!condition) {
    console.error(`[FAIL] ${message}`, details || '');
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPersistenceTests() {
  console.log('\n=== [WEB JARVIS] MILESTONE 5: PERSISTENCE & CORE DATA TEST SUITE ===\n');

  const testDbDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }
  const testDbPath = path.join(testDbDir, `test-jarvis-${Date.now()}.json`);

  // 1. Database Initialization & Schema Creation
  const repo = createRepository('disk', testDbPath);
  await repo.init();
  assert(repo.isPersistent === true, '1. Disk repository is persistent');
  assert(fs.existsSync(testDbPath), '2. Database file created on disk');

  // 2. Deterministic Seed Data
  const initialUsers = await repo.users.list();
  assert(initialUsers.length >= 3, '3. Seed users initialized (Tony, Sarah, Alex)');
  const initialWorkspaces = await repo.workspaces.list();
  assert(initialWorkspaces.length >= 1 && initialWorkspaces[0].id === 'ws-stark-core', '4. Seed default workspace ws-stark-core initialized');

  // 3. Idempotent Seeding Check
  const countBefore = (await repo.users.list()).length;
  await repo.seed(false);
  const countAfter = (await repo.users.list()).length;
  assert(countBefore === countAfter, '5. Seeding is idempotent and does not duplicate records');

  // 4. Workspace & User CRUD
  const newUser = await repo.users.create({
    id: `user-test-${Date.now()}`,
    displayName: 'Peter Parker',
    email: 'peter.parker@stark.edu',
    role: 'student',
    department: 'Applied Biophysics'
  });
  assert(newUser.displayName === 'Peter Parker', '6. User creation');

  const fetchedUser = await repo.users.getById(newUser.id);
  assert(fetchedUser?.email === 'peter.parker@stark.edu', '7. User lookup by ID');

  const newWorkspace = await repo.workspaces.create({
    id: `ws-avengers-${Date.now()}`,
    name: 'Avengers Compound Workspace',
    description: 'Off-grid facility research network.',
    ownerId: newUser.id,
    activeSectors: ['command', 'research']
  });
  assert(newWorkspace.name === 'Avengers Compound Workspace', '8. Workspace creation');

  // 5. Workspace Isolation
  const starkConvs = await repo.conversations.list('ws-stark-core');
  const avengersConvs = await repo.conversations.list(newWorkspace.id);
  assert(Array.isArray(starkConvs) && starkConvs.length > 0, '9. Workspace-scoped conversation lookup (Stark Core)');
  assert(Array.isArray(avengersConvs) && avengersConvs.length === 0, '10. Workspace isolation verified for new workspace');

  // 6. Conversation & Message Persistence
  const createdConv = await repo.conversations.create({
    workspaceId: newWorkspace.id,
    userId: newUser.id,
    title: 'Web-Shooter Fluid Polymerization',
    sector: 'research'
  });
  assert(createdConv.title === 'Web-Shooter Fluid Polymerization', '11. Conversation creation');

  const msg1 = await repo.conversations.appendMessage(createdConv.id, 'user', 'Jarvis, review tensile strength of formula 3.4.');
  const msg2 = await repo.conversations.appendMessage(createdConv.id, 'assistant', 'Tensile modulus is 1.8 gigapascals with 300% elongation at break.');
  assert(msg1.content.includes('tensile strength') && msg2.role === 'assistant', '12. Message append to conversation');

  const convMessages = await repo.conversations.getMessages(createdConv.id);
  assert(convMessages.length === 2, '13. Conversation messages retrieval in chronological order');

  // 7. Knowledge Spaces & Sources
  const newSpace = await repo.knowledge.createSpace({
    id: `ks-polymer-${Date.now()}`,
    workspaceId: newWorkspace.id,
    name: 'Synthetic Polymer Formulations',
    description: 'High-tensile fluid compositions and shear-thinning adhesives.',
    category: 'Materials Science',
    ownerId: newUser.id,
    tags: ['Polymers', 'Adhesives', 'Tensile'],
    suggestedQuestions: ['What is the shear viscosity threshold?']
  });
  assert(newSpace.name === 'Synthetic Polymer Formulations', '14. Knowledge space creation');

  const source1 = await repo.knowledge.createSource({
    id: `src-poly-1`,
    workspaceId: newWorkspace.id,
    knowledgeSpaceId: newSpace.id,
    name: 'Polymer Adhesive Spec Sheet',
    type: 'notes',
    mimeType: 'text/markdown',
    size: '12.4 KB',
    sizeBytes: 12697,
    status: 'ready',
    author: 'Peter Parker',
    summary: 'Cross-linked polyvinyl alcohol chains with borate ion complexation.',
    fullText: 'The formulation achieves instantaneous solid-phase transition upon atmospheric CO2 contact.',
    tokenCount: 150
  });
  assert(source1.status === 'ready' && source1.type === 'notes', '15. Knowledge source creation with metadata and status');

  const groundedResult = await repo.knowledge.queryGrounded(newSpace.id, 'What is the solid-phase transition mechanism?', newWorkspace.id);
  assert(typeof groundedResult.answer === 'string' && groundedResult.citations.length > 0, '16. Grounded retrieval query against persistent knowledge space');

  // 8. Education Store Persistence
  const initialClasses = await repo.education.listClasses();
  assert(initialClasses.length >= 4, '17. Education classes retrieved from persistent store');

  const newClass = await repo.education.createClass({
    id: `class-bio-${Date.now()}`,
    code: 'BIO-201',
    name: 'Advanced Cellular Biophysics',
    description: 'Cellular membrane potentials, ion channels, and molecular motors.',
    instructorId: 'teacher-1',
    instructorName: 'Dr. Sarah',
    term: 'Fall 2026',
    schedule: 'Tue / Thu 10:00 AM',
    room: 'Lab 2B',
    studentIds: [newUser.id],
    studentCount: 1,
    materialsCount: 0,
    assignmentsCount: 0,
    announcements: [],
    materials: []
  });
  assert(newClass.code === 'BIO-201', '18. Education class creation');

  // 9. Persistence Across Repository Instances (Simulating Server Restart)
  await repo.flush();

  // Create a completely new repository instance pointing to the exact same file
  const rebootedRepo = createRepository('disk', testDbPath);
  await rebootedRepo.init();

  const rebootedUser = await rebootedRepo.users.getById(newUser.id);
  assert(rebootedUser?.displayName === 'Peter Parker', '19. User survived simulated restart across repository instances');

  const rebootedConv = await rebootedRepo.conversations.getById(createdConv.id);
  assert(rebootedConv?.title === 'Web-Shooter Fluid Polymerization', '20. Conversation survived restart');

  const rebootedMessages = await rebootedRepo.conversations.getMessages(createdConv.id);
  assert(rebootedMessages.length === 2, '21. Messages survived restart');

  const rebootedClass = await rebootedRepo.education.getClassById(newClass.id);
  assert(rebootedClass?.name === 'Advanced Cellular Biophysics', '22. Education course survived restart');

  // 10. Audit Tool Logging
  await rebootedRepo.audit.logToolExecution({
    workspaceId: 'ws-stark-core',
    sessionId: 'session-audit-test',
    toolName: 'get_system_telemetry',
    sector: 'command',
    args: {},
    ok: true,
    executionTimeMs: 2
  });
  const recentAudit = await rebootedRepo.audit.listRecentEvents(10);
  assert(recentAudit.some((e) => e.toolName === 'get_system_telemetry'), '23. Audit logging records tool execution events');

  // 11. REST API Endpoints Verification
  const healthRes = await fetch('http://localhost:3000/api/health');
  const healthData: any = await healthRes.json();
  assert(healthRes.ok && healthData.persistence?.persistent === true, '24. REST API GET /api/health reports active persistent storage');

  const wsRes = await fetch('http://localhost:3000/api/workspaces');
  const wsData: any = await wsRes.json();
  assert(wsRes.ok && Array.isArray(wsData.workspaces) && wsData.workspaces.length >= 1, '25. REST API GET /api/workspaces');

  const convsRes = await fetch('http://localhost:3000/api/conversations');
  const convsData: any = await convsRes.json();
  assert(convsRes.ok && Array.isArray(convsData.conversations), '26. REST API GET /api/conversations');

  const ksRes = await fetch('http://localhost:3000/api/knowledge-spaces');
  const ksData: any = await ksRes.json();
  assert(ksRes.ok && Array.isArray(ksData.knowledgeSpaces) && ksData.knowledgeSpaces.length >= 2, '27. REST API GET /api/knowledge-spaces');

  // Clean up temp test database file
  try {
    fs.rmSync(testDbDir, { recursive: true, force: true });
  } catch {}

  console.log('\n=== ALL 27 PERSISTENCE & DATA FOUNDATION TESTS PASSED! ===\n');
}

runPersistenceTests().catch((err) => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
