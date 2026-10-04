// Test Suite for Phase D.10: AI Visualization Engine
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { MathEvaluator } from '../server/sectors/education/visualization/mathEvaluator.ts';
import { PhysicsEngine } from '../server/sectors/education/visualization/physicsEngine.ts';
import { ChemistryEngine, CPK_COLORS } from '../server/sectors/education/visualization/chemistryEngine.ts';
import { DiagramEngine } from '../server/sectors/education/visualization/diagramEngine.ts';
import { visualizationService } from '../server/sectors/education/visualization/visualizationService.ts';
import { visualizationStore } from '../server/sectors/education/visualization/visualizationStore.ts';
import {
  getElementBoundingBox,
  moveElements,
  scaleElements,
  doesEraserIntersectElement,
  duplicateElements
} from '../src/sectors/education/smartboard/canvasInteractionEngine.ts';
import { toolExecutor, toolRegistry } from '../server/tools/index.ts';
import type { User } from '../server/data/types.ts';
import type { BoardElement, EquationObject } from '../src/types/smartboard.ts';
import type { VisualizationDocument } from '../src/types/visualization.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

function getFileSha256(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function runD10VisualizationTests() {
  console.log('\n======================================================================');
  console.log('=== [WEB JARVIS] PHASE D.10: AI VISUALIZATION ENGINE TEST SUITE ===');
  console.log('======================================================================\n');

  const durableDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const initialDbHash = getFileSha256(durableDbPath);

  const teacherUser: User = {
    id: 'teacher-1',
    displayName: 'Dr. Sarah Connor',
    email: 'sarah@starkacademy.edu',
    role: 'teacher',
    createdAt: new Date().toISOString()
  };

  const studentUser: User = {
    id: 'student-1',
    displayName: 'Alex Chen',
    email: 'alex@starkacademy.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  // --- SECTION 1: Schema Validation & Security Invariants ---
  console.log('--- SECTION 1: Schema Validation & Security Invariants ---');

  const validGraphDoc = visualizationStore.get('vis-graph-parabola')!;
  const val1 = visualizationService.validateVisualization(validGraphDoc);
  assert(val1.valid === true, '1.1 Valid Graph document passes schema validation');
  assert(val1.errors.length === 0, '1.2 Zero errors on valid Graph specification');

  const validPhysDoc = visualizationStore.get('vis-physics-projectile')!;
  const val2 = visualizationService.validateVisualization(validPhysDoc);
  assert(val2.valid === true, '1.3 Valid Physics simulation document passes schema validation');

  const validChemDoc = visualizationStore.get('vis-chem-water')!;
  const val3 = visualizationService.validateVisualization(validChemDoc);
  assert(val3.valid === true, '1.4 Valid Chemistry molecule document passes schema validation');

  // Test malformed document (missing id and title)
  const malformedDoc = { type: 'GRAPH', parameters: {} };
  const valMalformed = visualizationService.validateVisualization(malformedDoc);
  assert(valMalformed.valid === false, '1.5 Malformed document without id/title fails validation');
  assert(valMalformed.errors.some((e) => e.includes('id')), '1.6 Reports missing id error');

  // Test prompt injection / arbitrary code injection defense
  const unsafeExpr1 = 'process.exit(1)';
  const unsafeExpr2 = '<script>alert(1)</script>';
  const unsafeExpr3 = 'eval("2+2")';
  assert(!MathEvaluator.isSafeExpression(unsafeExpr1), '1.7 Rejects Node.js process injection in math formula');
  assert(!MathEvaluator.isSafeExpression(unsafeExpr2), '1.8 Rejects HTML/script injection in formula');
  assert(!MathEvaluator.isSafeExpression(unsafeExpr3), '1.9 Rejects eval() execution token');

  // Test inverted domain [5, -5]
  const badDomainDoc = {
    ...validGraphDoc,
    parameters: {
      ...validGraphDoc.parameters,
      domain: [5, -5]
    }
  };
  const valBadDomain = visualizationService.validateVisualization(badDomainDoc);
  assert(valBadDomain.valid === false, '1.10 Inverted mathematical domain [5, -5] is strictly rejected');

  // --- SECTION 2: Safe Mathematical Evaluator & AST Engine ---
  console.log('\n--- SECTION 2: Safe Mathematical Evaluator & AST Engine ---');

  // Test quadratic evaluation
  const quadFn = MathEvaluator.compile('x^2 - 4');
  assert(quadFn(0) === -4, '2.1 Evaluates x^2 - 4 at vertex x=0 to -4');
  assert(quadFn(2) === 0, '2.2 Evaluates x^2 - 4 at root x=2 to 0');
  assert(quadFn(-2) === 0, '2.3 Evaluates x^2 - 4 at root x=-2 to 0');

  // Test implicit multiplication: 2x, 3sin(x)
  const implFn = MathEvaluator.compile('2x + 1');
  assert(implFn(3) === 7, '2.4 Evaluates implicit multiplication 2x + 1 at x=3 to 7');

  // Test trigonometric evaluation
  const trigFn = MathEvaluator.compile('sin(x)');
  assert(Math.abs(trigFn(0)) < 0.001, '2.5 Evaluates sin(0) = 0');
  assert(Math.abs(trigFn(Math.PI / 2) - 1) < 0.001, '2.6 Evaluates sin(pi/2) = 1');

  // Test curve generation
  const curvePoints = MathEvaluator.generateCurvePoints('x^2 - 4', [-4, 4], 50);
  assert(curvePoints.length > 40, '2.7 Generates high-density curve points');
  assert(curvePoints.some((p) => p.x === 0 && p.y === -4), '2.8 Curve includes vertex point (0, -4)');

  // Test analytical roots and extrema detection
  const analysis = MathEvaluator.analyzeFunction('x^2 - 4', [-5, 5]);
  assert(analysis.yIntercept?.y === -4, '2.9 Correctly detects Y-intercept at y = -4');
  assert(analysis.roots.length >= 2, '2.10 Correctly identifies roots at x = -2 and x = 2');
  assert(analysis.extrema.some((e) => e.type === 'min' && Math.abs(e.x) < 0.1), '2.11 Correctly identifies local minimum at x = 0');

  // --- SECTION 3: Physics Simulation Engine (Projectile Motion) ---
  console.log('\n--- SECTION 3: Physics Simulation Engine (Projectile Motion) ---');

  // v0 = 25 m/s, angle = 45 deg, g = 9.8 m/s^2, h0 = 0
  const sim = PhysicsEngine.simulateProjectile({ v0: 25, angleDeg: 45, g: 9.8, h0: 0 });

  // Theoretical: vy0 = 25 * sin(45) = 17.6776 m/s
  // Apex H = vy0^2 / (2*g) = 15.94 m
  // Time of flight T = 2 * vy0 / g = 3.61 s
  // Range R = vx0 * T = 25 * cos(45) * 3.61 = 63.78 m
  assert(Math.abs(sim.maxHeight - 15.94) < 0.1, '3.1 Computes exact maximum height (apex) ~15.94m');
  assert(Math.abs(sim.range - 63.78) < 0.2, '3.2 Computes exact horizontal range ~63.78m');
  assert(Math.abs(sim.timeOfFlight - 3.61) < 0.1, '3.3 Computes exact flight time ~3.61s');
  assert(sim.trajectory.length === 101, '3.4 Generates 101 discrete trajectory time-series points');
  assert(sim.keyPoints.length === 3, '3.5 Attaches structured Launch, Apex, and Impact key points');

  // Elevated launch test (h0 = 10m)
  const simElevated = PhysicsEngine.simulateProjectile({ v0: 20, angleDeg: 30, g: 9.8, h0: 10 });
  assert(simElevated.maxHeight > 10, '3.6 Elevated launch apex accounts for initial height h0');
  assert(simElevated.range > 0, '3.7 Elevated launch range correctly computed via quadratic discriminant');

  // --- SECTION 4: Chemistry & Diagram Model Foundations ---
  console.log('\n--- SECTION 4: Chemistry & Diagram Model Foundations ---');

  const water = ChemistryEngine.getMolecule('water');
  assert(water.formula === 'H₂O', '4.1 Retrieves water molecule formula H2O');
  assert(water.atoms.length === 3, '4.2 Water molecule contains 3 atoms (1 Oxygen, 2 Hydrogen)');
  assert(water.bonds.length === 2, '4.3 Water molecule contains 2 covalent bonds');
  assert(water.atoms.some((a) => a.element === 'O' && a.color === CPK_COLORS.O), '4.4 Oxygen atom mapped to standard CPK red color');

  const co2 = ChemistryEngine.getMolecule('co2');
  assert(co2.formula === 'CO₂', '4.5 Carbon dioxide formula CO2');
  assert(co2.bonds.every((b) => b.order === 2), '4.6 Carbon dioxide modeled with double covalent bonds');

  const circuit = DiagramEngine.buildCircuit();
  assert(circuit.diagramType === 'circuit', '4.7 Circuit diagram type is circuit');
  assert(circuit.nodes.some((n) => n.id === 'node-batt'), '4.8 Circuit contains battery node');
  assert(circuit.nodes.some((n) => n.id === 'node-resistor'), '4.9 Circuit contains resistor node');
  assert(circuit.nodes.some((n) => n.id === 'node-led'), '4.10 Circuit contains LED node');
  assert(circuit.edges.length >= 4, '4.11 Circuit closed-loop connections modeled');

  const flowchart = DiagramEngine.buildFlowchart();
  assert(flowchart.diagramType === 'flowchart', '4.12 Flowchart topology generated');
  assert(flowchart.nodes.some((n) => n.subType === 'diamond'), '4.13 Flowchart contains conditional diamond node');

  // --- SECTION 5: Recognition -> Visualization Flow (D.9 -> D.10 Bridge) ---
  console.log('\n--- SECTION 5: Recognition -> Visualization Flow (D.9 -> D.10 Bridge) ---');

  const highConfEq: EquationObject = {
    id: 'eq-quad-high',
    expression: 'y = x^2 - 4',
    normalizedExpression: 'x^2 - 4',
    latex: 'y = x^2 - 4',
    variables: ['x'],
    confidence: 0.95,
    sourceElementIds: ['s1', 's2'],
    boundingBox: { minX: 100, minY: 100, maxX: 300, maxY: 200, width: 200, height: 100 }
  };

  const highResult = await visualizationService.generateFromEquation(highConfEq, {
    user: teacherUser,
    courseCode: 'MATH-201',
    topic: 'Quadratic Curves'
  });
  assert(highResult.needsConfirmation === false, '5.1 High confidence equation (95%) converts without warning');
  assert(highResult.document.type === 'GRAPH', '5.2 Produced structured GRAPH document');
  assert(highResult.document.parameters.functions[0].expression === 'x^2 - 4', '5.3 Extracted verified mathematical expression');

  // Low confidence equation candidate (65%)
  const lowConfEq: EquationObject = {
    id: 'eq-quad-low',
    expression: 'y = x^3 - 3x',
    normalizedExpression: 'x^3 - 3*x',
    latex: 'y = x^3 - 3x',
    variables: ['x'],
    confidence: 0.65,
    sourceElementIds: ['s3'],
    boundingBox: { minX: 100, minY: 100, maxX: 300, maxY: 200, width: 200, height: 100 }
  };

  const lowResult = await visualizationService.generateFromEquation(lowConfEq, {
    user: teacherUser,
    confirmLowConfidence: false,
    courseCode: 'MATH-201'
  });
  assert(lowResult.needsConfirmation === true, '5.4 Low confidence equation (65%) requires explicit human confirmation');
  assert(Boolean(lowResult.warning), '5.5 Emits human review warning message');

  // Confirmed low confidence equation
  const confirmedResult = await visualizationService.generateFromEquation(lowConfEq, {
    user: teacherUser,
    confirmLowConfidence: true,
    courseCode: 'MATH-201'
  });
  assert(confirmedResult.needsConfirmation === false, '5.6 Confirmed low confidence equation successfully converts to graph');

  // --- SECTION 6: SmartBoard & BoardDocument Integration ---
  console.log('\n--- SECTION 6: SmartBoard & BoardDocument Integration ---');

  const visBoardElem: BoardElement = {
    id: 'elem-vis-1',
    type: 'visualization',
    semanticType: 'GRAPH',
    visualizationId: highResult.document.id,
    visualization: highResult.document,
    x: 100,
    y: 100,
    widthPx: 500,
    heightPx: 350,
    zIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const box = getElementBoundingBox(visBoardElem);
  assert(box.minX === 100 && box.maxX === 600, '6.1 Computes exact visualization bounding box horizontal span');
  assert(box.minY === 100 && box.maxY === 450, '6.2 Computes exact visualization bounding box height');

  // Move visualization
  const moved = moveElements([visBoardElem], ['elem-vis-1'], 50, -25);
  const movedElem = moved[0];
  assert(movedElem.x === 150 && movedElem.y === 75, '6.3 Group move shifts visualization x and y coordinates');

  // Scale visualization
  const scaled = scaleElements([visBoardElem], ['elem-vis-1'], { x: 100, y: 100 }, 1.5, 1.2);
  const scaledElem = scaled[0];
  assert(scaledElem.widthPx === 750, '6.4 Corner handle scaling resizes widthPx to 750px');
  assert(scaledElem.heightPx === 420, '6.5 Corner handle scaling resizes heightPx to 420px');

  // Eraser intersection
  const hitEraser = doesEraserIntersectElement(visBoardElem, { x: 300, y: 50 }, { x: 300, y: 250 }, 24);
  assert(hitEraser === true, '6.6 Eraser path intersects visualization element boundary');

  // Duplication with unique ID
  const { newElements: dupElems, duplicatedIds } = duplicateElements([visBoardElem], ['elem-vis-1']);
  assert(duplicatedIds.length === 1 && duplicatedIds[0] !== 'elem-vis-1', '6.7 Duplication assigns fresh collision-proof ID');
  assert(dupElems.length === 2, '6.8 Appends duplicated visualization to elements array');

  // --- SECTION 7: RBAC & Tenant Authorization Boundaries ---
  console.log('\n--- SECTION 7: RBAC & Tenant Authorization Boundaries ---');

  // Teacher can update parameters
  const updatedDoc = await visualizationService.updateParameters(
    highResult.document.id,
    { domain: [-10, 10] },
    teacherUser
  );
  assert((updatedDoc.parameters as any).domain[0] === -10, '7.1 Teacher authorized to update visualization parameters');

  // Student CANNOT mutate teacher visualization parameters
  let studentMutateBlocked = false;
  try {
    await visualizationService.updateParameters(
      highResult.document.id,
      { domain: [-100, 100] },
      studentUser
    );
  } catch (err: any) {
    studentMutateBlocked = true;
  }
  assert(studentMutateBlocked === true, '7.2 Student blocked from mutating teacher visualization parameters (403)');

  // Student CANNOT delete teacher visualization
  let studentDeleteBlocked = false;
  try {
    await visualizationService.deleteVisualization(highResult.document.id, studentUser);
  } catch {
    studentDeleteBlocked = true;
  }
  assert(studentDeleteBlocked === true, '7.3 Student blocked from deleting teacher visualization (403)');

  // Student CANNOT attach visualizations to classroom resources
  let studentAttachBlocked = false;
  try {
    await visualizationService.attachVisualization(highResult.document.id, { classSessionId: 'session-phys-101' }, studentUser);
  } catch {
    studentAttachBlocked = true;
  }
  assert(studentAttachBlocked === true, '7.4 Student blocked from attaching visualizations to classroom sessions (403)');

  // --- SECTION 8: Sandboxed AI Tools Verification ---
  console.log('\n--- SECTION 8: Sandboxed AI Tools Verification ---');

  // 1. visualization.create
  const createResult = await toolExecutor.execute(
    'visualization.create',
    { prompt: 'Plot sine wave y = sin(x)', courseCode: 'MATH-201' },
    { userId: 'teacher-1', role: 'teacher' }
  );
  assert(createResult.ok === true, '8.1 Tool visualization.create executes successfully');
  assert(createResult.data?.type === 'GRAPH', '8.2 Creates structured GRAPH visualization');

  // 2. visualization.preview
  const previewResult = await toolExecutor.execute(
    'visualization.preview',
    { prompt: 'Simulate projectile motion at 30 m/s at 60 degrees' },
    { userId: 'teacher-1', role: 'teacher' }
  );
  assert(previewResult.ok === true, '8.3 Tool visualization.preview executes successfully');
  assert(previewResult.data?.preview?.needsApproval === true, '8.4 Preview flagged with needsApproval for teacher review');

  // 3. visualization.validate
  const validateResult = await toolExecutor.execute(
    'visualization.validate',
    { document: highResult.document },
    { userId: 'teacher-1', role: 'teacher' }
  );
  assert(validateResult.ok === true && validateResult.data?.valid === true, '8.5 Tool visualization.validate confirms valid schema');

  // 4. visualization.attach
  const attachResult = await toolExecutor.execute(
    'visualization.attach',
    { visualizationId: highResult.document.id, classSessionId: 'session-phys-101' },
    { userId: 'teacher-1', role: 'teacher' }
  );
  assert(attachResult.ok === true, '8.6 Tool visualization.attach binds to classSession');

  // 5. visualization.update
  const updateToolResult = await toolExecutor.execute(
    'visualization.update',
    { visualizationId: highResult.document.id, parameters: { showGrid: false } },
    { userId: 'teacher-1', role: 'teacher' }
  );
  assert(updateToolResult.ok === true, '8.7 Tool visualization.update updates parameters');

  // 6. visualization.delete
  const deleteToolResult = await toolExecutor.execute(
    'visualization.delete',
    { visualizationId: createResult.data?.visualizationId },
    { userId: 'teacher-1', role: 'teacher' }
  );
  assert(deleteToolResult.ok === true, '8.8 Tool visualization.delete removes visualization');

  // --- SECTION 9: Test Data Hygiene & Invariant Verification ---
  console.log('\n--- SECTION 9: Test Data Hygiene & Invariant Verification ---');

  const postTestDbHash = getFileSha256(durableDbPath);
  assert(
    initialDbHash === postTestDbHash,
    '9.1 TEST DATA HYGIENE: Running D.10 tests did NOT modify data/jarvis-db.json (100% byte-identical hash match)'
  );

  console.log('\n======================================================================');
  console.log('=== ALL PHASE D.10 AI VISUALIZATION ENGINE TESTS PASSED (100%) ===');
  console.log('======================================================================\n');
}

runD10VisualizationTests().catch((err) => {
  console.error('\n[FATAL] Phase D.10 AI Visualization test suite failed:', err);
  process.exit(1);
});
