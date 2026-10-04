// Phase D.10: AI Visualization Engine & SmartBoard Integration Automated Test Suite
import { MathEvaluator } from '../server/sectors/education/visualization/mathEvaluator.ts';
import { PhysicsEngine } from '../server/sectors/education/visualization/physicsEngine.ts';
import { ChemistryEngine } from '../server/sectors/education/visualization/chemistryEngine.ts';
import { DiagramEngine } from '../server/sectors/education/visualization/diagramEngine.ts';
import { visualizationStore } from '../server/sectors/education/visualization/visualizationStore.ts';
import { visualizationService } from '../server/sectors/education/visualization/visualizationService.ts';
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

const teacherUserB: User = {
  id: 'teacher-2',
  displayName: 'Prof. Erik Selvig',
  email: 'erik.selvig@starkacademy.edu',
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

const studentUserB: User = {
  id: 'student-2',
  displayName: 'Peter Parker',
  email: 'peter.parker@starkacademy.edu',
  role: 'student',
  institutionId: 'inst-stark-academy',
  workspaceId: 'ws-main',
  createdAt: new Date().toISOString()
};

const outsideInstitutionUser: User = {
  id: 'external-user',
  displayName: 'External Hacker',
  email: 'hacker@oscorp.io',
  role: 'teacher',
  institutionId: 'inst-oscorp-external',
  workspaceId: 'ws-oscorp',
  createdAt: new Date().toISOString()
};

const teacherContext: ToolExecutionContext = {
  sessionId: 'test-d10-session',
  timestamp: new Date().toISOString(),
  serverUptime: 600,
  sector: 'education',
  userId: 'teacher-1',
  role: 'teacher'
};

const studentContext: ToolExecutionContext = {
  sessionId: 'test-d10-session-student',
  timestamp: new Date().toISOString(),
  serverUptime: 600,
  sector: 'education',
  userId: 'student-1',
  role: 'student'
};

async function runD10VisualizationTests() {
  console.log('\n===================================================================');
  console.log('=== [WEB JARVIS] PHASE D.10: AI VISUALIZATION ENGINE TEST SUITE ===');
  console.log('===================================================================\n');

  const durableDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const initialDbHash = getFileSha256(durableDbPath);

  visualizationStore.resetToDefaults();

  // --- SECTION 1: Math Evaluator Arithmetic & Functions ---
  console.log('--- SECTION 1: Math Evaluator Arithmetic & Functions ---');

  const r1 = MathEvaluator.evaluate('2 + 3 * 4');
  assert(r1.isValid && r1.value === 14, '1.1 Evaluates operator precedence 2 + 3 * 4 = 14');

  const r2 = MathEvaluator.evaluate('(2 + 3) * 4');
  assert(r2.isValid && r2.value === 20, '1.2 Evaluates parentheses (2 + 3) * 4 = 20');

  const r3 = MathEvaluator.evaluate('2^3 + 4^2');
  assert(r3.isValid && r3.value === 24, '1.3 Evaluates exponentiation 2^3 + 4^2 = 24');

  const r4 = MathEvaluator.evaluate('sin(pi / 2)');
  assert(r4.isValid && Math.abs(r4.value - 1) < 1e-6, '1.4 Evaluates trigonometric sin(pi / 2) = 1');

  const r5 = MathEvaluator.evaluate('cos(0) + sqrt(16) + abs(-5)');
  assert(r5.isValid && r5.value === 10, '1.5 Evaluates composite functions cos(0) + sqrt(16) + abs(-5) = 10');

  const r6 = MathEvaluator.evaluate('2x + 3', { x: 4 });
  assert(r6.isValid && r6.value === 11, '1.6 Evaluates implicit multiplication 2x + 3 with x=4 -> 11');

  const r7 = MathEvaluator.evaluate('A * cos(w * x)', { A: 3, w: 2, x: 0 });
  assert(r7.isValid && r7.value === 3, '1.7 Evaluates multi-parameter waveform A*cos(w*x) = 3');

  const samplePts = MathEvaluator.sampleCurve('sin(x)', -Math.PI, Math.PI, 50);
  assert(samplePts.length === 50, '1.8 Samples smooth curve points across [-pi, pi]');
  assert(Math.abs(samplePts[0].y) < 0.1, '1.9 Verifies sampled curve boundary point');

  // --- SECTION 2: Adversarial Math Evaluator Security Tests ---
  console.log('\n--- SECTION 2: Adversarial Math Evaluator Security Tests ---');

  // Malicious JS Injection
  const bad1 = MathEvaluator.evaluate('process.exit(1)');
  assert(!bad1.isValid, '2.1 Rejects malicious property access "process.exit(1)"');

  const bad2 = MathEvaluator.evaluate('console.log("XSS")');
  assert(!bad2.isValid, '2.2 Rejects "console.log" injection');

  const bad3 = MathEvaluator.evaluate('<script>alert(1)</script>');
  assert(!bad3.isValid, '2.3 Rejects HTML/script tag injection');

  const bad4 = MathEvaluator.evaluate('constructor.constructor("return 1")()');
  assert(!bad4.isValid, '2.4 Rejects prototype constructor sandbox escape attempts');

  const bad5 = MathEvaluator.evaluate('__proto__');
  assert(!bad5.isValid, '2.5 Rejects __proto__ access');

  // Infinite/Huge operations
  const divZero = MathEvaluator.evaluate('1 / 0');
  assert(isNaN(divZero.value), '2.6 Division by zero produces NaN safely without throwing runtime crashes');

  const negSqrt = MathEvaluator.evaluate('sqrt(-4)');
  assert(isNaN(negSqrt.value), '2.7 Sqrt of negative number returns NaN safely');

  const longExpr = '1+' + '1+'.repeat(600) + '1';
  const longRes = MathEvaluator.evaluate(longExpr);
  assert(!longRes.isValid, '2.8 Rejects runaway expressions exceeding MAX_EXPRESSION_LENGTH');

  // --- SECTION 3: Physics Engine Projectile Calculations ---
  console.log('\n--- SECTION 3: Physics Engine Projectile Calculations ---');

  const proj1 = PhysicsEngine.calculateProjectileMotion({
    initialVelocity: 20,
    launchAngleDeg: 45,
    initialHeight: 0,
    gravity: 9.8
  });

  assert(proj1.flightTimeSeconds > 2.8 && proj1.flightTimeSeconds < 3.0, '3.1 Computes correct flight time for 45 deg launch');
  assert(proj1.maxHeightMeters > 10.0 && proj1.maxHeightMeters < 10.5, '3.2 Computes correct maximum apex height');
  assert(proj1.horizontalRangeMeters > 40.0 && proj1.horizontalRangeMeters < 42.0, '3.3 Computes correct horizontal range');
  assert(proj1.trajectoryPoints.length > 20, '3.4 Generates discrete trajectory points');

  // Edge cases
  const projZeroVel = PhysicsEngine.calculateProjectileMotion({
    initialVelocity: 0,
    launchAngleDeg: 45
  });
  assert(projZeroVel.horizontalRangeMeters === 0, '3.5 Handles zero initial velocity safely');

  const proj90Deg = PhysicsEngine.calculateProjectileMotion({
    initialVelocity: 30,
    launchAngleDeg: 90
  });
  assert(proj90Deg.horizontalRangeMeters === 0, '3.6 Vertical 90 degree launch produces 0 horizontal range');
  assert(proj90Deg.maxHeightMeters > 45, '3.7 Vertical 90 degree launch reaches full vertical height');

  // --- SECTION 4: Chemistry Engine Molecular Topology ---
  console.log('\n--- SECTION 4: Chemistry Engine Molecular Topology ---');

  const waterPreset = ChemistryEngine.getStandardPreset('H2O');
  assert(Boolean(waterPreset), '4.1 Retrieves standard Water (H2O) preset');
  assert(waterPreset?.atoms.length === 3, '4.2 Water molecule contains 3 atoms (1 Oxygen, 2 Hydrogen)');
  assert(waterPreset?.bonds.length === 2, '4.3 Water molecule contains 2 covalent single bonds');

  const validMol = ChemistryEngine.validateMolecule({
    chemicalFormula: 'CO2',
    commonName: 'Carbon Dioxide',
    atoms: [
      { id: 'C1', element: 'C', x: 100, y: 100 },
      { id: 'O1', element: 'O', x: 50, y: 100 },
      { id: 'O2', element: 'O', x: 150, y: 100 }
    ],
    bonds: [
      { id: 'b1', sourceAtomId: 'C1', targetAtomId: 'O1', bondType: 'double' },
      { id: 'b2', sourceAtomId: 'C1', targetAtomId: 'O2', bondType: 'double' }
    ]
  });
  assert(validMol.isValid, '4.4 Validates correct CO2 molecular topology');

  // Malformed molecule with dangling bond target
  const badMol = ChemistryEngine.validateMolecule({
    chemicalFormula: 'X',
    commonName: 'Broken',
    atoms: [{ id: 'C1', element: 'C', x: 100, y: 100 }],
    bonds: [{ id: 'b1', sourceAtomId: 'C1', targetAtomId: 'NON_EXISTENT_ATOM', bondType: 'single' }]
  });
  assert(!badMol.isValid, '4.5 Rejects molecule referencing non-existent target atom');

  // --- SECTION 5: Diagram Engine Topology & Validation ---
  console.log('\n--- SECTION 5: Diagram Engine Topology & Validation ---');

  const validDiag = DiagramEngine.validateDiagram({
    title: 'RC Circuit',
    diagramCategory: 'circuit',
    nodes: [
      { id: 'n1', label: 'Battery', type: 'battery', x: 50, y: 50 },
      { id: 'n2', label: 'Resistor', type: 'resistor', x: 150, y: 50 }
    ],
    edges: [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', directed: true }]
  });
  assert(validDiag.isValid, '5.1 Validates circuit diagram topology');

  const badDiag = DiagramEngine.validateDiagram({
    title: 'Broken Diag',
    nodes: [{ id: 'n1', label: 'Node 1', type: 'default', x: 0, y: 0 }],
    edges: [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'dangling_node', directed: true }]
  });
  assert(!badDiag.isValid, '5.2 Rejects diagram with dangling edge node reference');

  // --- SECTION 6: Visualization Service & Multi-Role Authorization (RBAC) ---
  console.log('\n--- SECTION 6: Visualization Service & Multi-Role Authorization (RBAC) ---');

  // Teacher creates a draft visualization
  const teacherVis = await visualizationService.createVisualization(teacherUser, {
    title: 'Teacher Secret Waveform Draft',
    visualizationType: 'GRAPH',
    courseCode: 'PHYS-301',
    isReleased: false,
    payload: {
      type: 'GRAPH',
      title: 'Secret Wave',
      series: [{ id: 's1', name: 'Wave', expression: 'sin(x)', color: '#00f2fe' }],
      xDomain: [-5, 5],
      yDomain: [-2, 2]
    }
  });

  assert(teacherVis.status === 'VALIDATED', '6.1 Teacher draft visualization created in VALIDATED status');
  assert(!teacherVis.isReleasedToStudents, '6.2 Draft visualization is unreleased by default');

  // Student attempting to access unreleased teacher draft -> 403 Forbidden
  let studentAccessBlocked = false;
  try {
    await visualizationService.getVisualization(studentUser, teacherVis.id);
  } catch (err: any) {
    studentAccessBlocked = err.message.includes('403');
  }
  assert(studentAccessBlocked, '6.3 Student access to unreleased teacher draft is strictly forbidden (403)');

  // Student listing visualizations does NOT leak unreleased teacher drafts
  const studentVisibleList = await visualizationService.listVisualizations(studentUser, { courseCode: 'PHYS-301' });
  const leakedDraft = studentVisibleList.find((v) => v.id === teacherVis.id);
  assert(!leakedDraft, '6.4 Unreleased teacher draft is hidden from student list queries');

  // Teacher releases visualization to students
  const releasedVis = await visualizationService.updateVisualization(teacherUser, teacherVis.id, {
    isReleasedToStudents: true
  });
  assert(releasedVis.isReleasedToStudents && releasedVis.status === 'RELEASED', '6.5 Teacher successfully releases visualization');

  // Now student can access released visualization
  const studentAccessible = await visualizationService.getVisualization(studentUser, teacherVis.id);
  assert(Boolean(studentAccessible), '6.6 Student can now access released visualization');

  // Student attempting to mutate teacher visualization -> 403 Forbidden
  let studentMutationBlocked = false;
  try {
    await visualizationService.updateVisualization(studentUser, teacherVis.id, {
      title: 'Hacked by Student'
    });
  } catch (err: any) {
    studentMutationBlocked = err.message.includes('403');
  }
  assert(studentMutationBlocked, '6.7 Student cannot mutate teacher-owned visualization (403)');

  // Cross-institution user access -> 403 Forbidden
  let crossInstBlocked = false;
  try {
    await visualizationService.getVisualization(outsideInstitutionUser, teacherVis.id);
  } catch (err: any) {
    crossInstBlocked = err.message.includes('403');
  }
  assert(crossInstBlocked, '6.8 Cross-institution unauthorized access strictly blocked (403)');

  // --- SECTION 7: SmartBoard Attachment Integration ---
  console.log('\n--- SECTION 7: SmartBoard Attachment Integration ---');

  const attachRes = await visualizationService.attachToSmartBoard(
    teacherUser,
    'doc-session-phys-101',
    'page-session-phys-101-1',
    releasedVis.id,
    { x: 300, y: 200, width: 450, height: 320 }
  );
  assert(Boolean(attachRes.elementId), '7.1 Successfully attached visualization to SmartBoard canvas page');

  // --- SECTION 8: Sandboxed Server Tools Execution ---
  console.log('\n--- SECTION 8: Sandboxed Server Tools Execution ---');

  const toolValidateRes = await toolExecutor.execute(
    'visualization.validate',
    {
      payload: {
        type: 'GRAPH',
        title: 'Tool Test Wave',
        series: [{ id: 's1', expression: 'cos(2*x)', color: '#38bdf8' }],
        xDomain: [-5, 5],
        yDomain: [-2, 2]
      }
    },
    teacherContext
  );
  assert(toolValidateRes.ok === true, '8.1 Tool visualization.validate executes successfully');

  const toolCreateRes = await toolExecutor.execute(
    'visualization.create',
    {
      title: 'Tool Generated Projectile',
      visualizationType: 'PROJECTILE',
      courseCode: 'PHYS-301',
      isReleased: true,
      payload: {
        type: 'PROJECTILE',
        title: 'Ball Launch',
        initialVelocity: 22,
        launchAngleDeg: 50,
        gravity: 9.8
      }
    },
    teacherContext
  );
  assert(toolCreateRes.ok === true, '8.2 Tool visualization.create executes successfully');
  assert(Boolean(toolCreateRes.data?.visualization?.id), '8.3 Tool creates valid visualization document');

  const toolListRes = await toolExecutor.execute(
    'visualization.list',
    { courseCode: 'PHYS-301' },
    studentContext
  );
  assert(toolListRes.ok === true, '8.4 Tool visualization.list executes for student context');
  assert(toolListRes.data?.visualizations?.length >= 1, '8.5 Student list returns released visualizations');

  // --- SECTION 9: Test Data Hygiene & Invariant Verification ---
  console.log('\n--- SECTION 9: Test Data Hygiene & Invariant Verification ---');

  const postTestDbHash = getFileSha256(durableDbPath);
  assert(
    initialDbHash === postTestDbHash,
    '9.1 TEST DATA HYGIENE: Running D.10 Visualization tests did NOT modify data/jarvis-db.json (100% byte-identical hash match)'
  );

  console.log('\n===================================================================');
  console.log('=== ALL PHASE D.10 AI VISUALIZATION ENGINE TESTS PASSED (100%) ===');
  console.log('===================================================================\n');
}

runD10VisualizationTests().catch((err) => {
  console.error('\n[FATAL] Phase D.10 Visualization test suite failed:', err);
  process.exit(1);
});
