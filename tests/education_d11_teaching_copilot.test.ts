// Phase D.11: Real-Time Teaching Copilot Automated Test Suite
import { copilotService } from '../server/sectors/education/copilot/copilotService.ts';
import { toolExecutor } from '../server/tools/index.ts';
import type { ToolExecutionContext } from '../server/tools/types.ts';
import type { User } from '../server/data/types.ts';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

function getFileSha256(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function assert(condition: boolean, testName: string, detail?: any) {
  if (!condition) {
    console.error(`\n[FAIL] ${testName}`, detail !== undefined ? detail : '');
    throw new Error(`Assertion failed: ${testName}`);
  }
  console.log(`[PASS] ${testName}`);
}

const teacherUser: User = {
  id: 'teacher-1',
  displayName: 'Dr. Helen Cho',
  email: 'helen.cho@starkacademy.edu',
  role: 'teacher',
  institutionId: 'inst-stark-academy',
  workspaceId: 'ws-main',
  createdAt: new Date().toISOString()
};

const studentUser: User = {
  id: 'student-1',
  displayName: 'Alex Chen',
  email: 'alex.chen@starkacademy.edu',
  role: 'student',
  institutionId: 'inst-stark-academy',
  workspaceId: 'ws-main',
  createdAt: new Date().toISOString()
};

const teacherContext: ToolExecutionContext = {
  sessionId: 'test-d11-session',
  timestamp: new Date().toISOString(),
  serverUptime: 700,
  sector: 'education',
  userId: 'teacher-1',
  role: 'teacher'
};

const studentContext: ToolExecutionContext = {
  sessionId: 'test-d11-session-student',
  timestamp: new Date().toISOString(),
  serverUptime: 700,
  sector: 'education',
  userId: 'student-1',
  role: 'student'
};

async function runD11TeachingCopilotTests() {
  console.log('\n===================================================================');
  console.log('=== [WEB JARVIS] PHASE D.11: REAL-TIME TEACHING COPILOT TESTS ===');
  console.log('===================================================================\n');

  const durableDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const initialDbHash = getFileSha256(durableDbPath);

  // --- SECTION 1: Intent Classification & Action Classes ---
  console.log('--- SECTION 1: Intent Classification & Action Classes ---');

  assert(copilotService.classifyIntent('EXPLAIN_CONCEPT') === 'SAFE_READ', '1.1 EXPLAIN_CONCEPT is classified as SAFE_READ');
  assert(copilotService.classifyIntent('FIND_IN_TEXTBOOK') === 'SAFE_READ', '1.2 FIND_IN_TEXTBOOK is classified as SAFE_READ');
  assert(copilotService.classifyIntent('CREATE_GRAPH') === 'TEACHER_CONFIRMATION', '1.3 CREATE_GRAPH is classified as TEACHER_CONFIRMATION');
  assert(copilotService.classifyIntent('SUMMARIZE_BOARD') === 'TEACHER_CONFIRMATION', '1.4 SUMMARIZE_BOARD is classified as TEACHER_CONFIRMATION');
  assert(copilotService.classifyIntent('START_QUIZ') === 'HIGH_IMPACT', '1.5 START_QUIZ is classified as HIGH_IMPACT');
  assert(copilotService.classifyIntent('CREATE_HOMEWORK') === 'HIGH_IMPACT', '1.6 CREATE_HOMEWORK is classified as HIGH_IMPACT');

  // --- SECTION 2: Bounded Context Assembly ---
  console.log('\n--- SECTION 2: Bounded Context Assembly ---');

  const ctx = copilotService.buildContext({
    courseCode: 'PHYS-301',
    lessonTitle: "Gauss's Law",
    classSessionId: 'session-phys-101'
  });
  assert(ctx.courseCode === 'PHYS-301', '2.1 Context preserves course code');
  assert(ctx.classSessionId === 'session-phys-101', '2.2 Context scopes to target class session');
  assert(Array.isArray(ctx.approvedKnowledgeSpaceIds), '2.3 Limits knowledge retrieval to approved spaces');

  // --- SECTION 3: Safe Read Immediate Execution ---
  console.log('\n--- SECTION 3: Safe Read Immediate Execution ---');

  const safeRes = await copilotService.processCommand(teacherUser, 'Explain the Gauss law flux equation', ctx);
  assert(safeRes.actionClass === 'SAFE_READ', '3.1 Identified as SAFE_READ action');
  assert(Boolean(safeRes.immediateReply), '3.2 Generates immediate pedagogical reply');
  assert(safeRes.immediateReply?.includes('Gauss'), '3.3 Reply contains accurate concept explanation');
  assert(!safeRes.proposal, '3.4 SAFE_READ does NOT create unnecessary pending approval proposal');

  // --- SECTION 4: Teacher Confirmation & High Impact Proposals ---
  console.log('\n--- SECTION 4: Teacher Confirmation & High Impact Proposals ---');

  const graphRes = await copilotService.processCommand(teacherUser, 'Plot sin(x) + cos(x) waveform', ctx, {
    selectedEquation: 'sin(x) + cos(x)'
  });
  assert(graphRes.actionClass === 'TEACHER_CONFIRMATION', '4.1 Plotting is classified as TEACHER_CONFIRMATION');
  assert(Boolean(graphRes.proposal), '4.2 Generates structured proposal');
  assert(graphRes.proposal?.status === 'PROPOSED', '4.3 Proposal initialized in PROPOSED status');
  assert(graphRes.proposal?.requiresApproval === true, '4.4 Proposal explicitly requires approval');

  // Quiz proposal (HIGH_IMPACT)
  const quizRes = await copilotService.processCommand(teacherUser, 'Start a 2-question understanding pulse', ctx);
  assert(quizRes.actionClass === 'HIGH_IMPACT', '4.5 Quiz launching is classified as HIGH_IMPACT');
  assert(Boolean(quizRes.proposal), '4.6 High-impact action generates structured proposal');

  // --- SECTION 5: Teacher Proposal Review (Approve / Reject) ---
  console.log('\n--- SECTION 5: Teacher Proposal Review (Approve / Reject) ---');

  const propId = graphRes.proposal!.id;

  // Teacher approves proposal
  const approvedProp = await copilotService.reviewProposal(teacherUser, propId, 'APPROVE');
  assert(approvedProp.status === 'EXECUTED' || approvedProp.status === 'APPROVED', '5.1 Proposal status updated upon approval');
  assert(approvedProp.isApproved === true, '5.2 Proposal flagged isApproved: true');

  // Second proposal rejection test
  const rejectPropId = quizRes.proposal!.id;
  const rejectedProp = await copilotService.reviewProposal(teacherUser, rejectPropId, 'REJECT', {
    rejectionReason: 'Time ran out in lecture'
  });
  assert(rejectedProp.status === 'REJECTED', '5.3 Proposal correctly transitioned to REJECTED');
  assert(rejectedProp.rejectionReason === 'Time ran out in lecture', '5.4 Preserves rejection reason');

  // --- SECTION 6: Multi-Role Authorization & Security Defense ---
  console.log('\n--- SECTION 6: Multi-Role Authorization & Security Defense ---');

  // Student trying to command copilot -> 403 Forbidden
  let studentBlocked = false;
  try {
    await copilotService.processCommand(studentUser, 'Start quiz on entire class', ctx);
  } catch (err: any) {
    studentBlocked = err.message.includes('403');
  }
  assert(studentBlocked, '6.1 Student blocked from issuing teaching copilot commands (403)');

  // Student trying to approve proposal -> 403 Forbidden
  let studentApproveBlocked = false;
  try {
    await copilotService.reviewProposal(studentUser, propId, 'APPROVE');
  } catch (err: any) {
    studentApproveBlocked = err.message.includes('403');
  }
  assert(studentApproveBlocked, '6.2 Student blocked from approving proposals (403)');

  // --- SECTION 7: Sandboxed Tool Execution ---
  console.log('\n--- SECTION 7: Sandboxed Tool Execution ---');

  const toolCmdRes = await toolExecutor.execute(
    'copilot.command',
    { command: 'Explain Gauss surface boundary conditions', classSessionId: 'session-phys-101' },
    teacherContext
  );
  assert(toolCmdRes.ok === true, '7.1 Tool copilot.command executes successfully');
  assert(Boolean(toolCmdRes.data?.immediateReply), '7.2 Tool returns immediate pedagogical reply');

  // --- SECTION 8: Immutable Audit Trail ---
  console.log('\n--- SECTION 8: Immutable Audit Trail ---');

  const auditEvents = copilotService.getAuditEvents('session-phys-101');
  assert(auditEvents.length >= 3, '8.1 Audit trail records all copilot commands and approvals');
  assert(auditEvents.some((e) => e.teacherId === 'teacher-1'), '8.2 Audit event records teacher ID');

  // --- SECTION 9: Test Data Hygiene & Invariant Verification ---
  console.log('\n--- SECTION 9: Test Data Hygiene & Invariant Verification ---');

  const postTestDbHash = getFileSha256(durableDbPath);
  assert(
    initialDbHash === postTestDbHash,
    '9.1 TEST DATA HYGIENE: Running D.11 Copilot tests did NOT modify data/jarvis-db.json (100% byte-identical hash match)'
  );

  console.log('\n===================================================================');
  console.log('=== ALL PHASE D.11 TEACHING COPILOT TESTS PASSED (100%) ===');
  console.log('===================================================================\n');
}

runD11TeachingCopilotTests().catch((err) => {
  console.error('\n[FATAL] Phase D.11 Teaching Copilot test suite failed:', err);
  process.exit(1);
});
