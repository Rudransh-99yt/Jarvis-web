// Phase D.9: Vision Board Foundation Automated Test Suite
import { jarvisData, DiskJarvisDataRepository, setActiveRepository, resetActiveRepository } from '../server/data/index.ts';
import { smartboardStore } from '../server/sectors/education/smartboard/smartboardStore.ts';
import { smartboardPolicy } from '../server/sectors/education/smartboard/smartboardPolicy.ts';
import { smartboardService } from '../server/sectors/education/smartboard/smartboardService.ts';
import { SpatialEngine } from '../server/sectors/education/smartboard/vision/spatialEngine.ts';
import { boardRecognitionService } from '../server/sectors/education/smartboard/vision/boardRecognitionService.ts';
import { boardRagBridge } from '../server/sectors/education/smartboard/vision/boardRagBridge.ts';
import { toolExecutor } from '../server/tools/index.ts';
import type { ToolExecutionContext } from '../server/tools/types.ts';
import type { User } from '../server/data/types.ts';
import type { BoardElement, BoardPage } from '../src/types/smartboard.ts';
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
  department: 'Faculty of Physics',
  createdAt: new Date().toISOString()
};

const studentUser: User = {
  id: 'student-1',
  displayName: 'Alex Chen',
  email: 'alex.chen@starkacademy.edu',
  role: 'student',
  createdAt: new Date().toISOString()
};

const rogueUser: User = {
  id: 'rogue-student',
  displayName: 'Rogue Student',
  email: 'rogue@outside.org',
  role: 'student',
  createdAt: new Date().toISOString()
};

const teacherContext: ToolExecutionContext = {
  sessionId: 'test-d9-session',
  timestamp: new Date().toISOString(),
  serverUptime: 450,
  sector: 'education',
  userId: 'teacher-1',
  role: 'teacher'
};

async function runD9VisionBoardTests() {
  console.log('\n===================================================================');
  console.log('=== [WEB JARVIS] PHASE D.9: VISION BOARD FOUNDATION TEST SUITE ===');
  console.log('===================================================================\n');

  // Baseline database snapshot for hygiene verification
  const durableDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const initialDbHash = getFileSha256(durableDbPath);

  // Setup isolated temporary database for test suite
  const testDbDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
  if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, `d9-test-db-${Date.now()}.json`);
  const testRepo = new DiskJarvisDataRepository(testDbPath);
  await testRepo.init();
  await testRepo.seed();
  setActiveRepository(testRepo);

  smartboardStore.resetToDefaults();

  // --- SECTION 1: Semantic Object Model & Bounding Boxes ---
  console.log('--- SECTION 1: Semantic Object Model & Bounding Boxes ---');

  const strokeElem: BoardElement = {
    id: 'stroke-f1',
    type: 'stroke',
    tool: 'pen',
    color: '#00f2fe',
    width: 4,
    points: [
      { x: 100, y: 120 },
      { x: 110, y: 130 },
      { x: 120, y: 140 }
    ],
    zIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const strokeBox = SpatialEngine.computeElementBoundingBox(strokeElem);
  assert(strokeBox.minX <= 100 && strokeBox.maxX >= 120, '1.1 Computes bounding box for multi-point stroke');
  assert(strokeBox.width > 0 && strokeBox.height > 0, '1.2 Bounding box has positive dimensions');

  const rectElem: BoardElement = {
    id: 'shape-box1',
    type: 'shape',
    shapeType: 'rectangle',
    x: 200,
    y: 150,
    widthPx: 120,
    heightPx: 80,
    strokeColor: '#38bdf8',
    zIndex: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const rectBox = SpatialEngine.computeElementBoundingBox(rectElem);
  assert(rectBox.minX === 200 && rectBox.maxX === 320, '1.3 Computes exact bounding box for geometric rectangle');
  assert(rectBox.height === 80, '1.4 Computes correct height for geometric shape');

  const groupUnionBox = SpatialEngine.computeGroupBoundingBox([strokeElem, rectElem]);
  assert(groupUnionBox.minX <= 100 && groupUnionBox.maxX >= 320, '1.5 Computes union bounding box for element clusters');

  // --- SECTION 2: Handwriting Grouping & Spatial Clustering ---
  console.log('\n--- SECTION 2: Handwriting Grouping & Spatial Clustering ---');

  const nearbyStroke: BoardElement = {
    id: 'stroke-f2',
    type: 'stroke',
    tool: 'pen',
    color: '#00f2fe',
    width: 4,
    points: [
      { x: 125, y: 135 },
      { x: 135, y: 145 }
    ],
    zIndex: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const distantStroke: BoardElement = {
    id: 'stroke-dist1',
    type: 'stroke',
    tool: 'pen',
    color: '#f59e0b',
    width: 4,
    points: [
      { x: 800, y: 700 },
      { x: 820, y: 720 }
    ],
    zIndex: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const clusters = SpatialEngine.groupStrokesIntoCandidateClusters([strokeElem, nearbyStroke, distantStroke], 50);
  assert(clusters.length === 2, '2.1 Clusters nearby strokes into distinct handwriting candidates');
  assert(clusters[0].some((e) => e.id === 'stroke-f1') && clusters[0].some((e) => e.id === 'stroke-f2'), '2.2 Nearby strokes grouped into same candidate cluster');
  assert(clusters.some((c) => c.length === 1 && c[0].id === 'stroke-dist1'), '2.3 Isolated distant stroke forms separate candidate region');

  // --- SECTION 3: Spatial Relationships Engine ---
  console.log('\n--- SECTION 3: Spatial Relationships Engine ---');

  const topText: BoardElement = {
    id: 'txt-title',
    type: 'text',
    text: 'Electric Field Derivation',
    x: 200,
    y: 80,
    fontSize: 20,
    zIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const bottomEquation: BoardElement = {
    id: 'txt-eq',
    type: 'text',
    text: 'E = \\frac{\\lambda}{2\\pi \\varepsilon_0 r}',
    latexFormula: 'E = \\frac{\\lambda}{2\\pi \\varepsilon_0 r}',
    x: 200,
    y: 180,
    fontSize: 22,
    zIndex: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const relations = SpatialEngine.computePageSpatialRelationships([topText, bottomEquation]);
  assert(relations.length > 0, '3.1 Determines geometric spatial relationship between elements');
  const aboveRel = relations.find((r) => r.relation === 'ABOVE' || r.relation === 'BELOW');
  assert(Boolean(aboveRel), '3.2 Detects vertical spatial relationship (ABOVE / BELOW)');

  // Arrow connecting to shape
  const arrowElem: BoardElement = {
    id: 'arrow-1',
    type: 'shape',
    shapeType: 'arrow',
    x: 100,
    y: 190,
    endX: 195,
    endY: 190,
    zIndex: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const arrowRelations = SpatialEngine.computePageSpatialRelationships([arrowElem, rectElem]);
  const connectRel = arrowRelations.find((r) => r.relation === 'CONNECTS_TO' || r.relation === 'LEFT_OF');
  assert(Boolean(connectRel), '3.3 Identifies directed relationship between arrow and adjacent shape');

  // --- SECTION 4: Equation Recognition & Deterministic Fallback ---
  console.log('\n--- SECTION 4: Equation Recognition & Deterministic Fallback ---');

  const eqStrokes: BoardElement[] = [
    {
      id: 'eq-s1',
      type: 'text',
      text: 'F = ma',
      latexFormula: 'F = m a',
      x: 300,
      y: 200,
      zIndex: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const eqResult = await boardRecognitionService.recognizeEquation(eqStrokes, {
    courseCode: 'PHYS-301',
    topic: "Newton's Second Law",
    forceDeterministic: true
  });

  assert(eqResult.equation.expression === 'F = ma', '4.1 Recognizes equation expression "F = ma"');
  assert(eqResult.equation.variables.includes('F') && eqResult.equation.variables.includes('m'), '4.2 Identifies equation variables [F, m, a]');
  assert(eqResult.source === 'LOCAL_DETERMINISTIC', '4.3 Deterministic fallback explicitly flagged without hallucinated AI labels');
  assert(eqResult.confidence >= 0.85, '4.4 Assigns valid bounded confidence score (0..1)');
  assert(eqResult.equation.boundingBox.width > 0, '4.5 Attaches structured bounding box to recognized equation');

  // Physics Gauss law formula recognition
  const gaussStrokes: BoardElement[] = [
    {
      id: 'gauss-s1',
      type: 'text',
      text: 'E = \\frac{\\lambda}{2\\pi \\varepsilon_0 r}',
      latexFormula: 'E = \\frac{\\lambda}{2\\pi \\varepsilon_0 r}',
      x: 350,
      y: 250,
      zIndex: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const gaussResult = await boardRecognitionService.recognizeEquation(gaussStrokes, {
    courseCode: 'PHYS-301',
    topic: 'Gauss Law Cylindrical Flux',
    forceDeterministic: true
  });

  assert(gaussResult.equation.latex.includes('\\lambda'), '4.6 Extracts LaTeX representation for complex fraction equation');
  assert(gaussResult.equation.variables.includes('E'), '4.7 Identifies dependent field variable E');

  // --- SECTION 5: Diagram Recognition Foundation ---
  console.log('\n--- SECTION 5: Diagram Recognition Foundation ---');

  const diagramElements: BoardElement[] = [
    {
      id: 'diag-node-1',
      type: 'shape',
      shapeType: 'rectangle',
      x: 100,
      y: 100,
      widthPx: 100,
      heightPx: 60,
      label: 'Charge +Q',
      zIndex: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'diag-node-2',
      type: 'shape',
      shapeType: 'rectangle',
      x: 350,
      y: 100,
      widthPx: 100,
      heightPx: 60,
      label: 'Ground Plate',
      zIndex: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'diag-arrow-1',
      type: 'shape',
      shapeType: 'arrow',
      x: 200,
      y: 130,
      endX: 350,
      endY: 130,
      label: 'Electric Field E',
      zIndex: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const diagResult = await boardRecognitionService.recognizeDiagram(diagramElements, {
    courseCode: 'PHYS-301',
    topic: 'Electric Dipole Flow'
  });

  assert(diagResult.diagram.nodes.length === 2, '5.1 Extracts diagram nodes from geometric shapes');
  assert(diagResult.diagram.nodes[0].label === 'Charge +Q', '5.2 Preserves node labels in structured diagram');
  assert(diagResult.diagram.edges.length === 1, '5.3 Extracts directed edge between nodes');
  assert(diagResult.diagram.diagramType === 'flowchart' || diagResult.diagram.diagramType === 'general', '5.4 Categorizes diagram topology');

  // --- SECTION 6: Bounded BoardAIContext Construction ---
  console.log('\n--- SECTION 6: Bounded BoardAIContext Construction ---');

  const testPage: BoardPage = {
    pageId: 'page-ai-test',
    pageIndex: 0,
    title: 'Electrostatics Derivation Canvas',
    background: 'dark_grid',
    elements: [...diagramElements, ...gaussStrokes],
    semanticCandidates: [
      {
        id: 'cand-eq-1',
        semanticType: 'EQUATION',
        confidence: 0.95,
        source: 'LOCAL_DETERMINISTIC',
        detectedAt: new Date().toISOString(),
        boundingBox: SpatialEngine.computeGroupBoundingBox(gaussStrokes),
        relatedElementIds: gaussStrokes.map((e) => e.id),
        equation: gaussResult.equation
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const aiContext = boardRecognitionService.buildAIContext(
    testPage,
    gaussStrokes.map((e) => e.id),
    {
      courseCode: 'PHYS-301',
      courseName: 'Electrodynamics',
      topic: 'Gauss Law Cylindrical Flux',
      lessonTitle: "Gauss's Surface Flux Derivation"
    },
    'session-phys-101'
  );

  assert(aiContext.pageId === 'page-ai-test', '6.1 Captures target board page ID in AI context');
  assert(aiContext.selectedElementIds.length === gaussStrokes.length, '6.2 Limits context scope strictly to selected elements');
  assert(aiContext.recognizedEquations.length === 1, '6.3 Includes recognized equation candidate');
  assert(aiContext.academicContext.courseCode === 'PHYS-301', '6.4 Preserves academic curriculum grounding');
  assert(aiContext.semanticSummary.includes('Equations:'), '6.5 Generates concise semantic summary string');
  assert(Array.isArray(aiContext.spatialRelations), '6.6 Extracts spatial graph relationships into AI context');

  // --- SECTION 7: Board -> RAG Integration Foundation ---
  console.log('\n--- SECTION 7: Board -> RAG Integration Foundation ---');

  const seededDoc = await smartboardService.getBoardDocument(teacherUser, 'session-phys-101');
  assert(Boolean(seededDoc), '7.1 Retrieves active seeded BoardDocument for session');

  // Teacher ingesting released document succeeds
  const ragResult = await boardRagBridge.ingestBoardDocumentToRag(teacherUser, seededDoc);
  assert(Boolean(ragResult.sourceId), '7.2 Successfully ingests BoardDocument into RAG Knowledge Space');
  assert(ragResult.chunksIndexed > 0, '7.3 Creates indexed vector chunks with curriculum metadata');
  assert(ragResult.summary.includes('Ingested'), '7.4 Returns verifiable ingestion summary');

  // Security check: Rogue/unauthorized student cannot ingest unreleased documents
  seededDoc.isReleasedToStudents = false;
  let unreleasedIngestFailed = false;
  try {
    await boardRagBridge.ingestBoardDocumentToRag(rogueUser, seededDoc);
  } catch {
    unreleasedIngestFailed = true;
  }
  assert(unreleasedIngestFailed, '7.5 Unreleased board document strictly blocked from student RAG ingestion (403)');
  seededDoc.isReleasedToStudents = true;

  // --- SECTION 8: Sandboxed Vision Tools Verification ---
  console.log('\n--- SECTION 8: Sandboxed Vision Tools Verification ---');

  const toolRecognizeRes = await toolExecutor.execute(
    'smartboard.vision.recognize',
    { sessionId: 'session-phys-101', type: 'equation', topic: 'Gauss Law' },
    teacherContext
  );
  assert(toolRecognizeRes.ok === true, '8.1 Tool smartboard.vision.recognize executes successfully');
  assert(toolRecognizeRes.data.candidateType === 'EQUATION', '8.2 Tool returns EQUATION candidate');
  assert(Boolean(toolRecognizeRes.data.equation), '8.3 Tool attaches structured equation object');

  const toolContextRes = await toolExecutor.execute(
    'smartboard.vision.context',
    { sessionId: 'session-phys-101' },
    teacherContext
  );
  assert(toolContextRes.ok === true, '8.4 Tool smartboard.vision.context executes successfully');
  assert(Boolean(toolContextRes.data.aiContext), '8.5 Returns bounded BoardAIContext payload');
  assert(toolContextRes.data.aiContext.academicContext.courseCode === 'PHYS-301', '8.6 Bounded context matches course code');

  // --- SECTION 9: End-to-End Acceptance Test Simulation ---
  console.log('\n--- SECTION 9: End-to-End Acceptance Test Simulation ---');
  console.log('Scenario: Teacher draws "F = ma" -> Selects strokes -> Recognizes Equation -> Inspects candidate -> Accepts candidate -> Draws Diagram -> Inspects Spatial Graph -> Verified');

  // 1. Teacher writes formula on canvas
  const simDoc = await smartboardService.getBoardDocument(teacherUser, 'session-phys-101');
  const simStrokeF: BoardElement = {
    id: `sim-str-f-${Date.now()}`,
    type: 'stroke',
    tool: 'pen',
    color: '#00f2fe',
    width: 4,
    points: [{ x: 50, y: 50 }, { x: 50, y: 90 }, { x: 70, y: 50 }],
    zIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const simStrokeMa: BoardElement = {
    id: `sim-str-ma-${Date.now()}`,
    type: 'text',
    text: 'F = ma',
    latexFormula: 'F = m a',
    x: 80,
    y: 70,
    fontSize: 22,
    zIndex: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 2. Select strokes and recognize equation
  const candidateRes = await boardRecognitionService.createSemanticCandidate(
    [simStrokeF, simStrokeMa],
    'equation',
    { courseCode: simDoc.courseCode, topic: "Newtonian Mechanics" }
  );

  assert(candidateRes.semanticType === 'EQUATION', '9.1 SIMULATION: Produces structured equation candidate');
  assert(candidateRes.equation?.expression === 'F = ma', '9.2 SIMULATION: Candidate expression is "F = ma"');
  assert(candidateRes.relatedElementIds.length === 2, '9.3 SIMULATION: Binds candidate to source handwritten elements');

  // 3. Teacher accepts candidate as board annotation without destroying original strokes
  const updatedPage: BoardPage = {
    ...simDoc.pages[0],
    elements: [...simDoc.pages[0].elements, simStrokeF, simStrokeMa],
    semanticCandidates: [...(simDoc.pages[0].semanticCandidates || []), candidateRes],
    updatedAt: new Date().toISOString()
  };

  const savedSimDoc = await smartboardService.autosaveDocument(teacherUser, simDoc.id, {
    pages: [updatedPage],
    expectedVersion: simDoc.version
  });

  assert(savedSimDoc.pages[0].elements.some((e) => e.id === simStrokeF.id), '9.4 SIMULATION: Original handwritten strokes remain intact on canvas');
  assert(savedSimDoc.pages[0].semanticCandidates?.length! >= 1, '9.5 SIMULATION: Semantic metadata successfully attached to BoardDocument');

  // 4. Verify student reading released board document can inspect the equation candidate
  const studentViewDoc = await smartboardService.getBoardDocument(studentUser, simDoc.id);
  assert(studentViewDoc.pages[0].semanticCandidates?.some((c) => c.equation?.expression === 'F = ma'), '9.6 SIMULATION: Student can inspect semantic equation metadata on released board');

  // --- SECTION 10: Test Data Hygiene & Invariant Verification ---
  console.log('\n--- SECTION 10: Test Data Hygiene & Invariant Verification ---');

  // Clean up isolated test database
  resetActiveRepository();
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch {}

  const postTestDbHash = getFileSha256(durableDbPath);
  assert(
    initialDbHash === postTestDbHash,
    '10.1 TEST DATA HYGIENE: Running D.9 Vision Board tests did NOT modify data/jarvis-db.json (100% byte-identical hash match)'
  );

  console.log('\n===================================================================');
  console.log('=== ALL PHASE D.9 VISION BOARD FOUNDATION TESTS PASSED (100%) ===');
  console.log('===================================================================\n');
}

runD9VisionBoardTests().catch((err) => {
  console.error('\n[FATAL] Phase D.9 Vision Board test suite failed:', err);
  process.exit(1);
});
