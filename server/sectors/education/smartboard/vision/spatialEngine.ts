// Spatial Understanding Engine for SmartBoard Elements (D.9)
import type {
  BoardElement,
  BoundingBox,
  SpatialRelationship,
  SpatialRelationType
} from '../../../../../src/types/smartboard.ts';

export class SpatialEngine {
  /**
   * Computes the bounding box of a single BoardElement.
   */
  static computeElementBoundingBox(element: BoardElement): BoundingBox {
    if (element.type === 'stroke' && element.points && element.points.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const pt of element.points) {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      }

      const padding = (element.width || 3) / 2;
      return {
        minX: Math.max(0, minX - padding),
        minY: Math.max(0, minY - padding),
        maxX: maxX + padding,
        maxY: maxY + padding,
        width: Math.max(1, maxX - minX + padding * 2),
        height: Math.max(1, maxY - minY + padding * 2)
      };
    }

    if (element.type === 'shape') {
      const x = element.x ?? 0;
      const y = element.y ?? 0;
      const w = element.widthPx ?? (element.endX !== undefined ? Math.abs(element.endX - x) : 50);
      const h = element.heightPx ?? (element.endY !== undefined ? Math.abs(element.endY - y) : 50);
      const minX = Math.min(x, element.endX ?? x);
      const minY = Math.min(y, element.endY ?? y);

      return {
        minX,
        minY,
        maxX: minX + w,
        maxY: minY + h,
        width: Math.max(1, w),
        height: Math.max(1, h)
      };
    }

    if (element.type === 'text') {
      const x = element.x ?? 0;
      const y = element.y ?? 0;
      const len = element.text?.length || 10;
      const fontSize = element.fontSize || 20;
      const approxWidth = len * (fontSize * 0.6);
      const approxHeight = fontSize * 1.2;

      return {
        minX: x,
        minY: Math.max(0, y - approxHeight),
        maxX: x + approxWidth,
        maxY: y,
        width: approxWidth,
        height: approxHeight
      };
    }

    // Default fallback box
    const x = element.x ?? 0;
    const y = element.y ?? 0;
    return {
      minX: x,
      minY: y,
      maxX: x + 100,
      maxY: y + 50,
      width: 100,
      height: 50
    };
  }

  /**
   * Computes the union bounding box across multiple elements.
   */
  static computeGroupBoundingBox(elements: BoardElement[]): BoundingBox {
    if (elements.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const elem of elements) {
      const b = this.computeElementBoundingBox(elem);
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
   * Groups strokes and text elements into spatial candidate clusters based on proximity.
   * Useful for handwriting grouping into words/lines/equations.
   */
  static groupStrokesIntoCandidateClusters(
    elements: BoardElement[],
    proximityThresholdPx: number = 60
  ): BoardElement[][] {
    const strokeElements = elements.filter((e) => e.type === 'stroke' || e.type === 'text');
    if (strokeElements.length === 0) return [];

    const boxes = strokeElements.map((e) => ({
      element: e,
      box: this.computeElementBoundingBox(e)
    }));

    const clusters: BoardElement[][] = [];
    const visited = new Set<string>();

    for (let i = 0; i < boxes.length; i++) {
      const itemA = boxes[i];
      if (visited.has(itemA.element.id)) continue;

      const currentCluster: BoardElement[] = [itemA.element];
      visited.add(itemA.element.id);

      const queue = [itemA];
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (let j = 0; j < boxes.length; j++) {
          const itemB = boxes[j];
          if (visited.has(itemB.element.id)) continue;

          const distance = this.boxDistance(current.box, itemB.box);
          if (distance <= proximityThresholdPx) {
            visited.add(itemB.element.id);
            currentCluster.push(itemB.element);
            queue.push(itemB);
          }
        }
      }

      clusters.push(currentCluster);
    }

    return clusters;
  }

  /**
   * Euclidean distance between two bounding boxes (0 if overlapping).
   */
  static boxDistance(a: BoundingBox, b: BoundingBox): number {
    const dx = Math.max(0, Math.max(a.minX - b.maxX, b.minX - a.maxX));
    const dy = Math.max(0, Math.max(a.minY - b.maxY, b.minY - a.maxY));
    return Math.hypot(dx, dy);
  }

  /**
   * Evaluates pairwise spatial relationships between two bounding boxes.
   */
  static determineRelationship(a: BoundingBox, b: BoundingBox): { relation: SpatialRelationType; confidence: number } | null {
    // 1. Check CONTAINS
    if (
      a.minX <= b.minX &&
      a.maxX >= b.maxX &&
      a.minY <= b.minY &&
      a.maxY >= b.maxY
    ) {
      return { relation: 'CONTAINS', confidence: 0.95 };
    }

    const dist = this.boxDistance(a, b);
    const centerAX = (a.minX + a.maxX) / 2;
    const centerAY = (a.minY + a.maxY) / 2;
    const centerBX = (b.minX + b.maxX) / 2;
    const centerBY = (b.minY + b.maxY) / 2;

    const deltaX = centerBX - centerAX;
    const deltaY = centerBY - centerAY;

    // Proximity threshold
    if (dist > 300) {
      return null;
    }

    // 2. Check overlap-based primary directions (robust against differing text lengths/widths)
    const horizontalOverlap = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
    const verticalOverlap = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
    const minW = Math.min(a.width, b.width);
    const minH = Math.min(a.height, b.height);

    if (horizontalOverlap > 0 && horizontalOverlap >= minW * 0.15) {
      if (a.maxY <= b.minY + 25) {
        return { relation: 'ABOVE', confidence: Math.max(0.7, 1 - dist / 300) };
      }
      if (b.maxY <= a.minY + 25) {
        return { relation: 'BELOW', confidence: Math.max(0.7, 1 - dist / 300) };
      }
    }

    if (verticalOverlap > 0 && verticalOverlap >= minH * 0.15) {
      if (a.maxX <= b.minX + 25) {
        return { relation: 'LEFT_OF', confidence: Math.max(0.7, 1 - dist / 300) };
      }
      if (b.maxX <= a.minX + 25) {
        return { relation: 'RIGHT_OF', confidence: Math.max(0.7, 1 - dist / 300) };
      }
    }

    // 3. Relative directions based on centers
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY > 0) {
        return { relation: 'ABOVE', confidence: Math.max(0.6, 1 - dist / 300) }; // A is above B
      } else {
        return { relation: 'BELOW', confidence: Math.max(0.6, 1 - dist / 300) }; // A is below B
      }
    } else if (Math.abs(deltaX) > 0) {
      if (deltaX > 0) {
        return { relation: 'LEFT_OF', confidence: Math.max(0.6, 1 - dist / 300) }; // A is left of B
      } else {
        return { relation: 'RIGHT_OF', confidence: Math.max(0.6, 1 - dist / 300) }; // A is right of B
      }
    }

    // 4. NEAR fallback
    if (dist < 100) {
      return { relation: 'NEAR', confidence: Math.max(0.7, 1 - dist / 120) };
    }

    return null;
  }

  /**
   * Computes spatial relationships across all elements on a page.
   */
  static computePageSpatialRelationships(elements: BoardElement[]): SpatialRelationship[] {
    const relationships: SpatialRelationship[] = [];
    const boxes = elements.map((e) => ({
      element: e,
      box: this.computeElementBoundingBox(e)
    }));

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const itemA = boxes[i];
        const itemB = boxes[j];

        // Specific relation: ARROW connecting to or near a shape/node
        if (
          (itemA.element.shapeType === 'arrow' || itemA.element.type === 'arrow') &&
          itemB.element.type === 'shape'
        ) {
          const arrowEnd = {
            x: itemA.element.endX ?? itemA.box.maxX,
            y: itemA.element.endY ?? itemA.box.maxY
          };
          if (
            arrowEnd.x >= itemB.box.minX - 25 &&
            arrowEnd.x <= itemB.box.maxX + 25 &&
            arrowEnd.y >= itemB.box.minY - 25 &&
            arrowEnd.y <= itemB.box.maxY + 25
          ) {
            relationships.push({
              sourceId: itemA.element.id,
              targetId: itemB.element.id,
              relation: 'CONNECTS_TO',
              distancePx: 0,
              confidence: 0.92
            });
            continue;
          }
        }

        // Specific relation: TEXT labeling a shape or formula
        if (itemA.element.type === 'text' && (itemB.element.type === 'shape' || itemB.element.type === 'stroke')) {
          const d = this.boxDistance(itemA.box, itemB.box);
          if (d < 50) {
            relationships.push({
              sourceId: itemA.element.id,
              targetId: itemB.element.id,
              relation: 'LABELS',
              distancePx: Math.round(d),
              confidence: 0.88
            });
            continue;
          }
        }

        const rel = this.determineRelationship(itemA.box, itemB.box);
        if (rel) {
          relationships.push({
            sourceId: itemA.element.id,
            targetId: itemB.element.id,
            relation: rel.relation,
            distancePx: Math.round(this.boxDistance(itemA.box, itemB.box)),
            confidence: rel.confidence
          });
        }
      }
    }

    return relationships;
  }
}
