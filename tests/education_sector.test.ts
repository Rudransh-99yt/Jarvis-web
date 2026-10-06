import { toolRegistry, toolExecutor } from '../server/tools/index.ts';
import type { ToolExecutionContext } from '../server/tools/types.ts';
import { educationStore } from '../server/sectors/education/educationStore.ts';

function assert(condition: boolean, message: string, details?: any) {
  if (!condition) {
    console.error(`[FAIL] ${message}`, details || '');
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

const dummyContext: ToolExecutionContext = {
  sessionId: 'test-edu-session',
  callCount: 1,
  maxRounds: 5,
  executedTools: [],
  userId: 'user-tony',
  role: 'commander'
};

import { authService } from '../server/auth/tokens.ts';
async function runEducationTests() {
  console.log('\n=== [WEB JARVIS] EDUCATION SECTOR & KNOWLEDGE SUITE ===');

  // 1. Initial Education Store Data
  const classes = educationStore.getClasses();
  assert(Array.isArray(classes) && classes.length >= 4, '1. Education store initial classes loaded');

  const assignments = educationStore.getAssignments();
  assert(Array.isArray(assignments) && assignments.length >= 4, '2. Education store initial assignments loaded');

  const spaces = educationStore.getKnowledgeSpaces();
  assert(Array.isArray(spaces) && spaces.length >= 2, '3. Knowledge spaces initial collection loaded');

  // 2. Tool Execution - education.class.list
  const classListRes = await toolExecutor.execute({ name: 'education.class.list', args: {} }, dummyContext);
  assert(classListRes.ok && (classListRes.data?.totalClasses as number) >= 4, '4. Tool education.class.list execution');

  // 3. Tool Execution - education.assignment.list
  const asgListRes = await toolExecutor.execute({ name: 'education.assignment.list', args: { classId: 'class-phys-301' } }, dummyContext);
  assert(asgListRes.ok && Array.isArray(asgListRes.data?.assignments), '5. Tool education.assignment.list with classId filter');

  // 4. Tool Execution - education.assignment.create
  const createAsgRes = await toolExecutor.execute({
    name: 'education.assignment.create',
    args: {
      classId: 'class-phys-301',
      title: 'Quantum Entanglement & Bell Inequalities Lab',
      description: 'Analyze experimental Bell state correlations.',
      instructions: 'Submit lab observations and Bell parameter S calculations.',
      dueDate: '2026-11-15',
      maxScore: 100,
      category: 'Lab Report'
    }
  }, dummyContext);
  assert(createAsgRes.ok && typeof createAsgRes.data?.id === 'string', '6. Tool education.assignment.create validation and execution');

  // 5. Tool Execution - education.student.progress
  const progressRes = await toolExecutor.execute({ name: 'education.student.progress', args: { studentId: 'student-1' } }, dummyContext);
  assert(progressRes.ok && typeof progressRes.data?.averageGradePercentage === 'number', '7. Tool education.student.progress execution');

  // 6. Tool Execution - knowledge.space.list
  const spaceListRes = await toolExecutor.execute({ name: 'knowledge.space.list', args: {} }, dummyContext);
  assert(spaceListRes.ok && (spaceListRes.data?.totalSpaces as number) >= 2, '8. Tool knowledge.space.list execution');

  // 7. Tool Execution - knowledge.query (Grounded Retrieval)
  const queryRes = await toolExecutor.execute({
    name: 'knowledge.query',
    args: {
      spaceId: 'ks-quantum',
      query: 'What is the Schrödinger equation and wave function collapse?'
    }
  }, dummyContext);
  assert(
    queryRes.ok &&
    typeof queryRes.data?.answer === 'string' &&
    Array.isArray(queryRes.data?.citations) &&
    queryRes.data.citations.length > 0,
    '9. Tool knowledge.query grounded retrieval with citations',
    JSON.stringify(queryRes)
  );

  let authHeaders: any = { 'Content-Type': 'application/json' };
  try {
    const authRes = await fetch(`http://localhost:3000/api/auth/dev-login`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ userId: 'user-tony' })
    });
    if (authRes.ok) {
      const authData = await authRes.json();
      authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authData.token}` };
    }
  } catch (e) {}
  // 8. REST API Endpoints Verification
  const stateRes = await fetch('http://localhost:3000/api/education/state', { headers: authHeaders });
  const stateData: any = await stateRes.json();
  assert(stateRes.ok && Array.isArray(stateData.classes) && Array.isArray(stateData.knowledgeSpaces), '10. REST API GET /api/education/state', JSON.stringify(stateData));

  const groundedApiRes = await fetch('http://localhost:3000/api/education/knowledge-spaces/ks-quantum/query', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ query: 'Explain decoherence in quantum systems' })
  });
  const groundedData: any = await groundedApiRes.json();
  assert(groundedApiRes.ok && typeof groundedData.answer === 'string', '11. REST API POST /api/education/knowledge-spaces/:id/query');

  console.log('\n=== ALL 11 EDUCATION & KNOWLEDGE TESTS PASSED! ===\n');
}

runEducationTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[TEST SUITE ERROR]', err);
    process.exit(1);
  });
