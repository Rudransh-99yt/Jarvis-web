// Canvas Interaction Engine for SmartBoard Hardening (D.8.5)
import type {
  BoardElement,
  BoundingBox,
  SemanticCandidate
} from '../../../types/smartboard.ts';

export interface Point {
  x: number;
  y: number;
}

export interface MarqueeRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Computes the axis-aligned bounding box of a single BoardElement.
 */
export function getElementBoundingBox(elem: BoardElement): BoundingBox {
  if (elem.type === 'stroke' && elem.points && elem.points.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of elem.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const pad = (elem.width || 4) / 2;
    return {
      minX: Math.max(0, minX - pad),
      minY: Math.max(0, minY - pad),
      maxX: maxX + pad,
      maxY: maxY + pad,
      width: Math.max(1, maxX - minX + pad * 2),
      height: Math.max(1, maxY - minY + pad * 2)
    };
  }

  if (elem.type === 'shape') {
    const x = elem.x ?? 0;
    const y = elem.y ?? 0;
    const w = elem.widthPx ?? (elem.endX !== undefined ? Math.abs(elem.endX - x) : 60);
    const h = elem.heightPx ?? (elem.endY !== undefined ? Math.abs(elem.endY - y) : 60);
    const minX = Math.min(x, elem.endX ?? x);
    const minY = Math.min(y, elem.endY ?? y);

    return {
      minX,
      minY,
      maxX: minX + w,
      maxY: minY + h,
      width: Math.max(1, w),
      height: Math.max(1, h)
    };
  }

  if (elem.type === 'text') {
    const x = elem.x ?? 0;
    const y = elem.y ?? 0;
    const len = elem.text?.length || 10;
    const fs = elem.fontSize || 20;
    const w = len * (fs * 0.6);
    const h = fs * 1.2;

    return {
      minX: x,
      minY: Math.max(0, y - h),
      maxX: x + w,
      maxY: y,
      width: Math.max(1, w),
      height: Math.max(1, h)
    };
  }

  if (elem.type === 'visualization') {
    const x = elem.x ?? 100;
    const y = elem.y ?? 100;
    const w = elem.widthPx ?? 500;
    const h = elem.heightPx ?? 350;

    return {
      minX: x,
      minY: y,
      maxX: x + w,
      maxY: y + h,
      width: Math.max(1, w),
      height: Math.max(1, h)
    };
  }

  const x = elem.x ?? 0;
  const y = elem.y ?? 0;
  return {
    minX: x,
    minY: y,
    maxX: x + 80,
    maxY: y + 40,
    width: 80,
    height: 40
  };
}

/**
 * Computes the union bounding box across multiple specified elements.
 */
export function getCombinedBoundingBox(
  elements: BoardElement[],
  targetIds: string[]
): BoundingBox | null {
  const targetElements = elements.filter((e) => targetIds.includes(e.id));
  if (targetElements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const elem of targetElements) {
    const b = getElementBoundingBox(elem);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }

  return {
    minX: Math.round(minX),
    minY: Math.round(minY),
    maxX: Math.round(maxX),
    maxY: Math.round(maxY),
    width: Math.max(1, Math.round(maxX - minX)),
    height: Math.max(1, Math.round(maxY - minY))
  };
}

/**
 * Standard ray-casting test for point in polygon.
 */
export function isPointInPolygon(pt: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Evaluates whether an element is selected by a freeform lasso boundary.
 */
export function doesLassoSelectElement(
  elem: BoardElement,
  lassoPolygon: Point[]
): boolean {
  if (lassoPolygon.length < 3) return false;

  const box = getElementBoundingBox(elem);
  const center: Point = {
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2
  };

  // 1. Center is inside lasso
  if (isPointInPolygon(center, lassoPolygon)) {
    return true;
  }

  // 2. Stroke points test: if >= 30% of stroke points fall inside lasso
  if (elem.type === 'stroke' && elem.points && elem.points.length > 0) {
    let insideCount = 0;
    for (const p of elem.points) {
      if (isPointInPolygon(p, lassoPolygon)) {
        insideCount++;
      }
    }
    if (insideCount / elem.points.length >= 0.3) {
      return true;
    }
  }

  // 3. All 4 corners test
  const corners: Point[] = [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.maxX, y: box.maxY },
    { x: box.minX, y: box.maxY }
  ];
  const cornersInside = corners.filter((c) => isPointInPolygon(c, lassoPolygon)).length;
  return cornersInside >= 2;
}

/**
 * Evaluates whether an element intersects or is contained in a rectangular marquee.
 */
export function doesMarqueeSelectElement(
  elem: BoardElement,
  marquee: MarqueeRect
): boolean {
  const box = getElementBoundingBox(elem);
  return !(
    box.maxX < marquee.minX ||
    box.minX > marquee.maxX ||
    box.maxY < marquee.minY ||
    box.minY > marquee.maxY
  );
}

/**
 * Minimum distance from point Q to line segment P1-P2.
 */
export function distanceToSegment(q: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(q.x - p1.x, q.y - p1.y);

  let t = ((q.x - p1.x) * dx + (q.y - p1.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;
  return Math.hypot(q.x - projX, q.y - projY);
}

/**
 * Evaluates whether a continuous eraser gesture segment (from p1 to p2) intersects an element.
 */
export function doesEraserIntersectElement(
  elem: BoardElement,
  p1: Point,
  p2: Point,
  eraserRadius: number = 24,
  mode: 'stroke' | 'object' = 'stroke'
): boolean {
  const effectiveRadius = eraserRadius + (elem.width ? elem.width / 2 : 2);

  // 1. Stroke Elements
  if (elem.type === 'stroke' && elem.points && elem.points.length > 0) {
    for (const pt of elem.points) {
      if (distanceToSegment(pt, p1, p2) <= effectiveRadius) {
        return true;
      }
    }
    // Also check inter-point segments for long strokes
    for (let i = 0; i < elem.points.length - 1; i++) {
      const midPoint: Point = {
        x: (elem.points[i].x + elem.points[i + 1].x) / 2,
        y: (elem.points[i].y + elem.points[i + 1].y) / 2
      };
      if (distanceToSegment(midPoint, p1, p2) <= effectiveRadius) {
        return true;
      }
    }
    return false;
  }

  // 2. Shape Elements
  if (elem.type === 'shape') {
    const box = getElementBoundingBox(elem);
    // Center hit
    const center = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
    if (distanceToSegment(center, p1, p2) <= effectiveRadius + Math.min(box.width, box.height) / 2) {
      return true;
    }
    // Corner hit
    const corners = [
      { x: box.minX, y: box.minY },
      { x: box.maxX, y: box.minY },
      { x: box.maxX, y: box.maxY },
      { x: box.minX, y: box.maxY }
    ];
    for (const c of corners) {
      if (distanceToSegment(c, p1, p2) <= effectiveRadius) return true;
    }
    return false;
  }

  // 3. Text Elements
  if (elem.type === 'text') {
    const box = getElementBoundingBox(elem);
    const center = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
    if (distanceToSegment(center, p1, p2) <= effectiveRadius + 15) {
      return true;
    }
    return false;
  }

  // 4. Visualization Elements (Phase D.10)
  if (elem.type === 'visualization') {
    const box = getElementBoundingBox(elem);
    const inBox = (p: Point) =>
      p.x >= box.minX - effectiveRadius &&
      p.x <= box.maxX + effectiveRadius &&
      p.y >= box.minY - effectiveRadius &&
      p.y <= box.maxY + effectiveRadius;

    if (inBox(p1) || inBox(p2)) return true;

    const center = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
    if (distanceToSegment(center, p1, p2) <= effectiveRadius + Math.max(box.width, box.height) / 2) {
      return true;
    }
    return false;
  }

  // Fallback
  const box = getElementBoundingBox(elem);
  const center = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
  return distanceToSegment(center, p1, p2) <= effectiveRadius;
}

/**
 * Moves specified elements as a group by (dx, dy).
 * Preserves relative positions, stroke point sequences, and semantic metadata.
 */
export function moveElements(
  elements: BoardElement[],
  targetIds: string[],
  dx: number,
  dy: number
): BoardElement[] {
  if (dx === 0 && dy === 0) return elements;
  const now = new Date().toISOString();

  return elements.map((elem) => {
    if (!targetIds.includes(elem.id)) return elem;

    if (elem.type === 'stroke' && elem.points) {
      const movedPoints = elem.points.map((p) => ({
        ...p,
        x: Math.round(p.x + dx),
        y: Math.round(p.y + dy)
      }));
      return {
        ...elem,
        points: movedPoints,
        boundingBox: elem.boundingBox
          ? {
              ...elem.boundingBox,
              minX: elem.boundingBox.minX + dx,
              maxX: elem.boundingBox.maxX + dx,
              minY: elem.boundingBox.minY + dy,
              maxY: elem.boundingBox.maxY + dy
            }
          : undefined,
        updatedAt: now
      };
    }

    if (elem.type === 'shape') {
      return {
        ...elem,
        x: elem.x !== undefined ? Math.round(elem.x + dx) : undefined,
        y: elem.y !== undefined ? Math.round(elem.y + dy) : undefined,
        endX: elem.endX !== undefined ? Math.round(elem.endX + dx) : undefined,
        endY: elem.endY !== undefined ? Math.round(elem.endY + dy) : undefined,
        boundingBox: elem.boundingBox
          ? {
              ...elem.boundingBox,
              minX: elem.boundingBox.minX + dx,
              maxX: elem.boundingBox.maxX + dx,
              minY: elem.boundingBox.minY + dy,
              maxY: elem.boundingBox.maxY + dy
            }
          : undefined,
        updatedAt: now
      };
    }

    if (elem.type === 'text') {
      return {
        ...elem,
        x: elem.x !== undefined ? Math.round(elem.x + dx) : undefined,
        y: elem.y !== undefined ? Math.round(elem.y + dy) : undefined,
        boundingBox: elem.boundingBox
          ? {
              ...elem.boundingBox,
              minX: elem.boundingBox.minX + dx,
              maxX: elem.boundingBox.maxX + dx,
              minY: elem.boundingBox.minY + dy,
              maxY: elem.boundingBox.maxY + dy
            }
          : undefined,
        updatedAt: now
      };
    }

    return {
      ...elem,
      x: elem.x !== undefined ? Math.round(elem.x + dx) : undefined,
      y: elem.y !== undefined ? Math.round(elem.y + dy) : undefined,
      updatedAt: now
    };
  });
}

/**
 * Resizes / scales specified elements relative to an anchor point.
 * Preserves handwriting stroke geometry by scaling points proportionally.
 */
export function scaleElements(
  elements: BoardElement[],
  targetIds: string[],
  anchor: Point,
  rawScaleX: number,
  rawScaleY: number
): BoardElement[] {
  const scaleX = Math.max(0.1, Math.min(10, rawScaleX));
  const scaleY = Math.max(0.1, Math.min(10, rawScaleY));
  const now = new Date().toISOString();

  return elements.map((elem) => {
    if (!targetIds.includes(elem.id)) return elem;

    if (elem.type === 'stroke' && elem.points) {
      const scaledPoints = elem.points.map((p) => ({
        ...p,
        x: Math.round(anchor.x + (p.x - anchor.x) * scaleX),
        y: Math.round(anchor.y + (p.y - anchor.y) * scaleY)
      }));
      return {
        ...elem,
        points: scaledPoints,
        updatedAt: now
      };
    }

    if (elem.type === 'shape') {
      const origX = elem.x ?? anchor.x;
      const origY = elem.y ?? anchor.y;
      const origW = elem.widthPx ?? 60;
      const origH = elem.heightPx ?? 60;

      const newX = Math.round(anchor.x + (origX - anchor.x) * scaleX);
      const newY = Math.round(anchor.y + (origY - anchor.y) * scaleY);
      const newW = Math.max(8, Math.round(origW * Math.abs(scaleX)));
      const newH = Math.max(8, Math.round(origH * Math.abs(scaleY)));

      let newEndX = elem.endX !== undefined ? Math.round(anchor.x + (elem.endX - anchor.x) * scaleX) : undefined;
      let newEndY = elem.endY !== undefined ? Math.round(anchor.y + (elem.endY - anchor.y) * scaleY) : undefined;

      return {
        ...elem,
        x: newX,
        y: newY,
        widthPx: newW,
        heightPx: newH,
        endX: newEndX,
        endY: newEndY,
        updatedAt: now
      };
    }

    if (elem.type === 'text') {
      const origX = elem.x ?? anchor.x;
      const origY = elem.y ?? anchor.y;
      const origFs = elem.fontSize || 20;

      const newX = Math.round(anchor.x + (origX - anchor.x) * scaleX);
      const newY = Math.round(anchor.y + (origY - anchor.y) * scaleY);
      const newFs = Math.max(10, Math.min(80, Math.round(origFs * ((scaleX + scaleY) / 2))));

      return {
        ...elem,
        x: newX,
        y: newY,
        fontSize: newFs,
        updatedAt: now
      };
    }

    if (elem.type === 'visualization') {
      const origX = elem.x ?? anchor.x;
      const origY = elem.y ?? anchor.y;
      const origW = elem.widthPx ?? 500;
      const origH = elem.heightPx ?? 350;

      const newX = Math.round(anchor.x + (origX - anchor.x) * scaleX);
      const newY = Math.round(anchor.y + (origY - anchor.y) * scaleY);
      const newW = Math.max(200, Math.round(origW * Math.abs(scaleX)));
      const newH = Math.max(150, Math.round(origH * Math.abs(scaleY)));

      return {
        ...elem,
        x: newX,
        y: newY,
        widthPx: newW,
        heightPx: newH,
        updatedAt: now
      };
    }

    return elem;
  });
}

/**
 * Duplicates specified elements, allocating unique IDs and shifting them slightly.
 */
export function duplicateElements(
  elements: BoardElement[],
  targetIds: string[],
  offset: Point = { x: 25, y: 25 }
): { newElements: BoardElement[]; duplicatedIds: string[] } {
  const now = new Date().toISOString();
  const maxZ = elements.reduce((acc, e) => Math.max(acc, e.zIndex || 0), 0);

  const targets = elements.filter((e) => targetIds.includes(e.id));
  const duplicated: BoardElement[] = [];
  const duplicatedIds: string[] = [];

  targets.forEach((elem, index) => {
    const newId = `elem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${index}`;
    duplicatedIds.push(newId);

    if (elem.type === 'stroke' && elem.points) {
      duplicated.push({
        ...elem,
        id: newId,
        points: elem.points.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y, pressure: p.pressure })),
        zIndex: maxZ + index + 1,
        createdAt: now,
        updatedAt: now
      });
    } else if (elem.type === 'shape') {
      duplicated.push({
        ...elem,
        id: newId,
        x: elem.x !== undefined ? elem.x + offset.x : undefined,
        y: elem.y !== undefined ? elem.y + offset.y : undefined,
        endX: elem.endX !== undefined ? elem.endX + offset.x : undefined,
        endY: elem.endY !== undefined ? elem.endY + offset.y : undefined,
        zIndex: maxZ + index + 1,
        createdAt: now,
        updatedAt: now
      });
    } else if (elem.type === 'text') {
      duplicated.push({
        ...elem,
        id: newId,
        x: elem.x !== undefined ? elem.x + offset.x : undefined,
        y: elem.y !== undefined ? elem.y + offset.y : undefined,
        zIndex: maxZ + index + 1,
        createdAt: now,
        updatedAt: now
      });
    } else {
      duplicated.push({
        ...elem,
        id: newId,
        x: elem.x !== undefined ? elem.x + offset.x : undefined,
        y: elem.y !== undefined ? elem.y + offset.y : undefined,
        zIndex: maxZ + index + 1,
        createdAt: now,
        updatedAt: now
      });
    }
  });

  return {
    newElements: [...elements, ...duplicated],
    duplicatedIds
  };
}

/**
 * Deletes specified elements by ID.
 */
export function deleteElements(
  elements: BoardElement[],
  targetIds: string[]
): BoardElement[] {
  return elements.filter((e) => !targetIds.includes(e.id));
}

/**
 * Cleans up and maintains semantic candidates after element deletion.
 * Removes orphaned candidates whose source elements are all gone,
 * and updates relatedElementIds.
 */
export function cleanSemanticCandidatesAfterDeletion(
  candidates: SemanticCandidate[] | undefined,
  deletedIds: string[]
): SemanticCandidate[] {
  if (!candidates || candidates.length === 0) return [];
  const deletedSet = new Set(deletedIds);

  return candidates
    .filter((cand) => {
      // If all related elements were deleted, discard candidate
      const remainingIds = cand.relatedElementIds.filter((id) => !deletedSet.has(id));
      return remainingIds.length > 0;
    })
    .map((cand) => {
      const remainingIds = cand.relatedElementIds.filter((id) => !deletedSet.has(id));
      return {
        ...cand,
        relatedElementIds: remainingIds
      };
    });
}
