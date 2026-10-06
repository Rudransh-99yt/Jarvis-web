// Test Suite for Phase D.8.5: SmartBoard Interaction Hardening
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { BoardElement, BoardPage, SemanticCandidate } from '../src/types/smartboard.ts';
import {
  getElementBoundingBox,
  getCombinedBoundingBox,
  isPointInPolygon,
  doesLassoSelectElement,
  doesMarqueeSelectElement,
  distanceToSegment,
  doesEraserIntersectElement,
  moveElements,
  scaleElements,
  duplicateElements,
  deleteElements,
  cleanSemanticCandidatesAfterDeletion
} from '../src/sectors/education/smartboard/canvasInteractionEngine.ts';

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

import { authService } from '../server/auth/tokens.ts';
async function runD85InteractionTests() {
  console.log('\n======================================================================');
  console.log('=== [WEB JARVIS] PHASE D.8.5: SMARTBOARD INTERACTION HARDENING TEST SUITE ===');
  console.log('======================================================================\n');

  const durableDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const initialDbHash = getFileSha256(durableDbPath);

  // --- SECTION 1: Single Object Selection & Bounding Boxes ---
  console.log('--- SECTION 1: Single Object Selection & Bounding Boxes ---');

  const strokeElem1: BoardElement = {
    id: 'stroke-1',
    type: 'stroke',
    tool: 'pen',
    color: '#00f2fe',
    width: 4,
    points: [
      { x: 100, y: 100 },
      { x: 150, y: 120 },
      { x: 200, y: 100 }
    ],
    zIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const box1 = getElementBoundingBox(strokeElem1);
  assert(box1.minX <= 100 && box1.maxX >= 200, '1.1 Computes accurate stroke bounding box');
  assert(box1.minY <= 100 && box1.maxY >= 120, '1.2 Bounding box captures stroke vertical extent');

  const rectElem: BoardElement = {
    id: 'shape-rect-1',
    type: 'shape',
    shapeType: 'rectangle',
    x: 300,
    y: 200,
    widthPx: 120,
    heightPx: 80,
    strokeColor: '#38bdf8',
    zIndex: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const rectBox = getElementBoundingBox(rectElem);
  assert(rectBox.minX === 300 && rectBox.maxX === 420, '1.3 Computes exact rectangle bounding box');
  assert(rectBox.minY === 200 && rectBox.maxY === 280, '1.4 Computes exact rectangle height');

  const combinedBox = getCombinedBoundingBox([strokeElem1, rectElem], ['stroke-1', 'shape-rect-1']);
  assert(Boolean(combinedBox), '1.5 Generates combined group bounding box');
  assert(combinedBox!.minX <= 100 && combinedBox!.maxX >= 420, '1.6 Combined box spans all selected elements');

  // --- SECTION 2: Freeform Lasso Selection ---
  console.log('\n--- SECTION 2: Freeform Lasso Selection ---');

  // A triangular/pentagonal lasso polygon enclosing stroke-1 but NOT rectElem
  const lassoPolygon = [
    { x: 50, y: 50 },
    { x: 250, y: 50 },
    { x: 250, y: 180 },
    { x: 50, y: 180 }
  ];

  const strokeInLasso = doesLassoSelectElement(strokeElem1, lassoPolygon);
  assert(strokeInLasso === true, '2.1 Freeform lasso selects fully contained stroke element');

  const rectInLasso = doesLassoSelectElement(rectElem, lassoPolygon);
  assert(rectInLasso === false, '2.2 Elements outside lasso boundary are strictly excluded');

  // Multi-stroke lasso containment
  const strokeElem2: BoardElement = {
    id: 'stroke-2',
    type: 'stroke',
    tool: 'pen',
    color: '#f59e0b',
    width: 4,
    points: [
      { x: 110, y: 110 },
      { x: 130, y: 130 }
    ],
    zIndex: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const stroke2InLasso = doesLassoSelectElement(strokeElem2, lassoPolygon);
  assert(stroke2InLasso === true, '2.3 Lasso simultaneously captures multiple clustered strokes');

  // --- SECTION 3: Rectangular / Marquee Selection ---
  console.log('\n--- SECTION 3: Rectangular / Marquee Selection ---');

  const marqueeBox = {
    minX: 250,
    minY: 150,
    maxX: 450,
    maxY: 350
  };

  const rectInMarquee = doesMarqueeSelectElement(rectElem, marqueeBox);
  assert(rectInMarquee === true, '3.1 Marquee selection selects overlapping rectangle shape');

  const strokeInMarquee = doesMarqueeSelectElement(strokeElem1, marqueeBox);
  assert(strokeInMarquee === false, '3.2 Marquee excludes non-intersecting stroke element');

  // --- SECTION 4: Group Movement of Selected Objects ---
  console.log('\n--- SECTION 4: Group Movement of Selected Objects ---');

  const allElements = [strokeElem1, strokeElem2, rectElem];
  const selectedIds = ['stroke-1', 'stroke-2'];

  const dx = 50;
  const dy = -30;
  const moved = moveElements(allElements, selectedIds, dx, dy);

  const movedStroke1 = moved.find((e) => e.id === 'stroke-1')!;
  const movedStroke2 = moved.find((e) => e.id === 'stroke-2')!;
  const unselectedRect = moved.find((e) => e.id === 'shape-rect-1')!;

  assert(movedStroke1.points![0].x === 150 && movedStroke1.points![0].y === 70, '4.1 Moves first stroke points accurately by (dx, dy)');
  assert(movedStroke2.points![0].x === 160 && movedStroke2.points![0].y === 80, '4.2 Moves second stroke in group maintaining relative distance');
  assert(unselectedRect.x === 300 && unselectedRect.y === 200, '4.3 Leaves unselected elements at exact original coordinates');

  // --- SECTION 5: Resize / Scaling Transformations ---
  console.log('\n--- SECTION 5: Resize / Scaling Transformations ---');

  const anchor = { x: 100, y: 100 };
  const scaleX = 2.0;
  const scaleY = 1.5;

  const scaled = scaleElements(allElements, ['stroke-1'], anchor, scaleX, scaleY);
  const scaledStroke = scaled.find((e) => e.id === 'stroke-1')!;

  assert(scaledStroke.points![0].x === 100 && scaledStroke.points![0].y === 100, '5.1 Anchor point coordinate remains invariant during scaling');
  assert(scaledStroke.points![2].x === 300 && scaledStroke.points![2].y === 100, '5.2 Preserves point sequence and scales x coordinate by 2x');
  assert(scaledStroke.points![1].y === 130, '5.3 Scales y coordinate proportionally by 1.5x');

  // Shape scaling
  const scaledShape = scaleElements([rectElem], ['shape-rect-1'], { x: 300, y: 200 }, 1.5, 2.0)[0];
  assert(scaledShape.widthPx === 180, '5.4 Scales geometric rectangle width proportionally');
  assert(scaledShape.heightPx === 160, '5.5 Scales geometric rectangle height proportionally');

  // --- SECTION 6: Continuous Multi-Stroke Eraser ---
  console.log('\n--- SECTION 6: Continuous Multi-Stroke Eraser ---');

  // Stroke A at y=100
  const strokeA: BoardElement = {
    id: 's-A',
    type: 'stroke',
    points: [{ x: 50, y: 100 }, { x: 150, y: 100 }],
    zIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Stroke B at y=150
  const strokeB: BoardElement = {
    id: 's-B',
    type: 'stroke',
    points: [{ x: 50, y: 150 }, { x: 150, y: 150 }],
    zIndex: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Stroke C at y=200
  const strokeC: BoardElement = {
    id: 's-C',
    type: 'stroke',
    points: [{ x: 50, y: 200 }, { x: 150, y: 200 }],
    zIndex: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Continuous eraser drag downwards from (100, 80) down to (100, 220)
  const p1 = { x: 100, y: 80 };
  const p2 = { x: 100, y: 220 };

  const hitA = doesEraserIntersectElement(strokeA, p1, p2, 24);
  const hitB = doesEraserIntersectElement(strokeB, p1, p2, 24);
  const hitC = doesEraserIntersectElement(strokeC, p1, p2, 24);

  assert(hitA === true, '6.1 Continuous eraser intersects first horizontal stroke');
  assert(hitB === true, '6.2 Continuous eraser intersects second horizontal stroke without pen lift');
  assert(hitC === true, '6.3 Continuous eraser intersects third horizontal stroke in single drag');

  // Distant stroke D at x=800 should NOT be hit
  const strokeD: BoardElement = {
    id: 's-D',
    type: 'stroke',
    points: [{ x: 800, y: 800 }, { x: 850, y: 850 }],
    zIndex: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const hitD = doesEraserIntersectElement(strokeD, p1, p2, 24);
  assert(hitD === false, '6.4 Distant strokes remain completely untouched by continuous eraser');

  // --- SECTION 7: Duplicate with ID Collision Prevention ---
  console.log('\n--- SECTION 7: Duplicate with ID Collision Prevention ---');

  const { newElements: dupList, duplicatedIds } = duplicateElements([strokeA, rectElem], ['s-A', 'shape-rect-1']);
  assert(dupList.length === 4, '7.1 Duplicate produces 2 new elements appending to list');
  assert(duplicatedIds.length === 2, '7.2 Returns 2 new duplicated unique IDs');
  assert(!duplicatedIds.includes('s-A') && !duplicatedIds.includes('shape-rect-1'), '7.3 Duplicated IDs are fresh and do NOT collide with originals');

  const dupStrokeA = dupList.find((e) => e.id === duplicatedIds[0])!;
  assert(dupStrokeA.points![0].x === strokeA.points![0].x + 25, '7.4 Duplicated stroke is offset by +25px for immediate visual clarity');

  // --- SECTION 8: Delete & Semantic Metadata Hygiene ---
  console.log('\n--- SECTION 8: Delete & Semantic Metadata Hygiene ---');

  const delList = deleteElements([strokeA, strokeB, strokeC], ['s-B']);
  assert(delList.length === 2, '8.1 Delete removes target element');
  assert(!delList.some((e) => e.id === 's-B'), '8.2 Element s-B is completely removed');

  const mockCandidate: SemanticCandidate = {
    id: 'cand-1',
    semanticType: 'EQUATION',
    confidence: 0.95,
    source: 'LOCAL_DETERMINISTIC',
    detectedAt: new Date().toISOString(),
    boundingBox: { minX: 50, minY: 100, maxX: 150, maxY: 150, width: 100, height: 50 },
    relatedElementIds: ['s-A', 's-B']
  };

  const cleanedCandidates = cleanSemanticCandidatesAfterDeletion([mockCandidate], ['s-B']);
  assert(cleanedCandidates.length === 1, '8.3 Retains candidate when partial source elements remain');
  assert(!cleanedCandidates[0].relatedElementIds.includes('s-B'), '8.4 Purges deleted ID from relatedElementIds');
  assert(cleanedCandidates[0].relatedElementIds.includes('s-A'), '8.5 Preserves remaining active source elements in candidate');

  const fullyDeletedCandidates = cleanSemanticCandidatesAfterDeletion(cleanedCandidates, ['s-A']);
  assert(fullyDeletedCandidates.length === 0, '8.6 Removes orphan candidate when all related elements are deleted');

  // --- SECTION 9: Undo / Redo State Simulation ---
  console.log('\n--- SECTION 9: Undo / Redo State Simulation ---');

  const pageState0: BoardPage[] = [{
    pageId: 'page-1',
    pageIndex: 0,
    title: 'Page 1',
    background: 'dark_grid',
    elements: [strokeA],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }];

  const pageState1: BoardPage[] = [{
    ...pageState0[0],
    elements: [strokeA, strokeB]
  }];

  const pageState2: BoardPage[] = [{
    ...pageState0[0],
    elements: moveElements([strokeA, strokeB], ['s-A'], 30, 40)
  }];

  const historyStack = [pageState0, pageState1, pageState2];
  let hIndex = 2;

  // Undo move
  hIndex--;
  assert(historyStack[hIndex][0].elements.length === 2, '9.1 Undo restores pre-move state');
  assert(historyStack[hIndex][0].elements[0].points![0].x === 50, '9.2 Undo restores original coordinates');

  // Redo move
  hIndex++;
  assert(historyStack[hIndex][0].elements[0].points![0].x === 80, '9.3 Redo restores moved coordinates');

  // Undo draw of stroke B
  hIndex -= 2;
  assert(historyStack[hIndex][0].elements.length === 1, '9.4 Undo restores single stroke state');

  // --- SECTION 10: Test Data Hygiene & Invariant Verification ---
  console.log('\n--- SECTION 10: Test Data Hygiene & Invariant Verification ---');

  const postTestDbHash = getFileSha256(durableDbPath);
  assert(
    initialDbHash === postTestDbHash,
    '10.1 TEST DATA HYGIENE: Running D.8.5 tests did NOT modify data/jarvis-db.json (100% byte-identical hash match)'
  );

  console.log('\n======================================================================');
  console.log('=== ALL PHASE D.8.5 SMARTBOARD INTERACTION TESTS PASSED (100%) ===');
  console.log('======================================================================\n');
}

runD85InteractionTests().catch((err) => {
  console.error('\n[FATAL] Phase D.8.5 SmartBoard interaction test suite failed:', err);
  process.exit(1);
});
