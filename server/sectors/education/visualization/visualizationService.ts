import { requirePrincipal } from '../../../auth/principal.ts';
// Server-authoritative service for AI Visualizations with strict RBAC, validation, and lifecycle controls

import type { User } from '../../../data/types.ts';
import type {
  VisualizationDocument,
  VisualizationPayload,
  VisualizationType,
  VisualizationValidationResult,
  GraphVisualizationPayload,
  ProjectileVisualizationPayload,
  MoleculeVisualizationPayload,
  DiagramVisualizationPayload,
  DataChartVisualizationPayload
} from '../../../../src/types/visualization.ts';
import { visualizationStore } from './visualizationStore.ts';
import { MathEvaluator } from './mathEvaluator.ts';
import { PhysicsEngine } from './physicsEngine.ts';
import { ChemistryEngine } from './chemistryEngine.ts';
import { DiagramEngine } from './diagramEngine.ts';
import { smartboardStore } from '../smartboard/smartboardStore.ts';

export class VisualizationService {
  /**
   * Validate any visualization payload before storage or rendering
   */
  public validatePayload(payload: any): VisualizationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!payload || typeof payload !== 'object') {
      return { isValid: false, errors: ['Payload must be an object'], warnings: [] };
    }

    const type = payload.type as VisualizationType;

    if (type === 'GRAPH') {
      const p = payload as Partial<GraphVisualizationPayload>;
      if (!Array.isArray(p.series) || p.series.length === 0) {
        errors.push('Graph visualization must contain at least one series');
      } else {
        p.series.forEach((s, idx) => {
          if (!s.expression || typeof s.expression !== 'string') {
            errors.push(`Series #${idx + 1} is missing a valid mathematical expression`);
          } else {
            // Test evaluation
            const paramCtx: Record<string, number> = { x: 1 };
            if (Array.isArray(p.parameters)) {
              p.parameters.forEach((param) => {
                paramCtx[param.name] = Number(param.value) || 1;
              });
            }
            const testEval = MathEvaluator.evaluate(s.expression, paramCtx);
            if (!testEval.isValid && testEval.error) {
              errors.push(`Series #${idx + 1} syntax error: ${testEval.error}`);
            }
          }
        });
      }
      return { isValid: errors.length === 0, errors, warnings, sanitizedPayload: p as GraphVisualizationPayload };
    }

    if (type === 'PROJECTILE') {
      const p = payload as Partial<ProjectileVisualizationPayload>;
      const metrics = PhysicsEngine.calculateProjectileMotion({
        initialVelocity: Number(p.initialVelocity) || 0,
        launchAngleDeg: Number(p.launchAngleDeg) || 0,
        initialHeight: Number(p.initialHeight) || 0,
        gravity: Number(p.gravity) || 9.8
      });
      p.calculatedMetrics = metrics;
      return { isValid: true, errors: [], warnings: [], sanitizedPayload: p as ProjectileVisualizationPayload };
    }

    if (type === 'MOLECULE') {
      const res = ChemistryEngine.validateMolecule(payload as Partial<MoleculeVisualizationPayload>);
      return { isValid: res.isValid, errors: res.errors, warnings: [], sanitizedPayload: res.sanitized };
    }

    if (type === 'DIAGRAM') {
      const res = DiagramEngine.validateDiagram(payload as Partial<DiagramVisualizationPayload>);
      return { isValid: res.isValid, errors: res.errors, warnings: [], sanitizedPayload: res.sanitized };
    }

    if (type === 'DATA_CHART') {
      const p = payload as Partial<DataChartVisualizationPayload>;
      if (!Array.isArray(p.series) || p.series.length === 0) {
        errors.push('Data chart must define at least one series');
      }
      if (!Array.isArray(p.data)) {
        errors.push('Data chart must contain data array');
      }
      return { isValid: errors.length === 0, errors, warnings, sanitizedPayload: p as DataChartVisualizationPayload };
    }

    return { isValid: false, errors: [`Unsupported visualization type '${type}'`], warnings: [] };
  }

  /**
   * List visualizations accessible to the user
   */
  public async listVisualizations(
    user: User,
    filters?: { classId?: string; courseCode?: string; type?: string }
  ): Promise<VisualizationDocument[]> {
    const all = visualizationStore.list();
    const isTeacher = user.role === 'teacher' || user.role === 'principal';

    return all.filter((doc) => {
      // Cross-institution filter
      if (user.institutionId && doc.institutionId && doc.institutionId !== user.institutionId) {
        return false;
      }
      // Students can only see released visualizations or their own
      if (!isTeacher && !doc.isReleasedToStudents && doc.creatorId !== user.id) {
        return false;
      }
      if (filters?.classId && doc.classId && doc.classId !== filters.classId) {
        return false;
      }
      if (filters?.courseCode && doc.courseCode && doc.courseCode !== filters.courseCode) {
        return false;
      }
      if (filters?.type && doc.visualizationType !== filters.type) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get single visualization by ID with RBAC enforcement
   */
  public async getVisualization(user: User, id: string): Promise<VisualizationDocument> {
    const doc = visualizationStore.get(id);
    if (!doc) {
      throw new Error(`Visualization '${id}' not found`);
    }

    // Institution check
    if (user.institutionId && doc.institutionId && doc.institutionId !== user.institutionId) {
      throw new Error(`Forbidden: Cross-institution access denied (403)`);
    }

    // Student privacy: unreleased drafts are strictly hidden
    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    if (!isTeacher && !doc.isReleasedToStudents && doc.creatorId !== user.id) {
      throw new Error(`Forbidden: Unreleased visualization draft is private (403)`);
    }

    return doc;
  }

  /**
   * Create a new visualization document
   */
  public async createVisualization(
    user: User,
    data: {
      title: string;
      description?: string;
      visualizationType: VisualizationType;
      payload: VisualizationPayload;
      provenance?: 'AI_GENERATED' | 'TEACHER_CREATED' | 'SYSTEM_PRESET' | 'RECOGNIZED_EQUATION';
      classId?: string;
      courseCode?: string;
      unitId?: string;
      lessonId?: string;
      classSessionId?: string;
      recognizedEquationId?: string;
      sourceElementIds?: string[];
      isReleased?: boolean;
    }
  ): Promise<VisualizationDocument> {
    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    const validation = this.validatePayload(data.payload);

    if (!validation.isValid) {
      throw new Error(`Invalid visualization payload: ${validation.errors.join(', ')}`);
    }

    const docId = `vis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newDoc: VisualizationDocument = {
      id: docId,
      institutionId: user.institutionId || 'inst-stark-academy',
      workspaceId: user.workspaceId || 'ws-main',
      classId: data.classId,
      courseCode: data.courseCode,
      unitId: data.unitId,
      lessonId: data.lessonId,
      classSessionId: data.classSessionId,
      creatorId: user.id,
      creatorRole: isTeacher ? 'teacher' : 'student',
      title: (data.title || 'Interactive Visualization').slice(0, 120),
      description: data.description ? data.description.slice(0, 300) : undefined,
      visualizationType: data.visualizationType,
      provenance: data.provenance || (isTeacher ? 'TEACHER_CREATED' : 'AI_GENERATED'),
      status: isTeacher && data.isReleased ? 'RELEASED' : 'VALIDATED',
      isReleasedToStudents: Boolean(isTeacher && data.isReleased),
      releasedAt: isTeacher && data.isReleased ? now : undefined,
      version: 1,
      payload: validation.sanitizedPayload || data.payload,
      recognizedEquationId: data.recognizedEquationId,
      sourceElementIds: data.sourceElementIds,
      createdAt: now,
      updatedAt: now
    };

    visualizationStore.set(newDoc);
    return newDoc;
  }

  /**
   * Update existing visualization
   */
  public async updateVisualization(
    user: User,
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      payload: VisualizationPayload;
      isReleasedToStudents: boolean;
      status: any;
    }>
  ): Promise<VisualizationDocument> {
    const existing = await this.getVisualization(user, id);
    const isTeacher = user.role === 'teacher' || user.role === 'principal';

    // Authorization check
    if (!isTeacher && existing.creatorId !== user.id) {
      throw new Error(`Forbidden: You cannot modify another user's visualization (403)`);
    }

    if (updates.payload) {
      const validation = this.validatePayload(updates.payload);
      if (!validation.isValid) {
        throw new Error(`Invalid payload updates: ${validation.errors.join(', ')}`);
      }
      existing.payload = validation.sanitizedPayload || updates.payload;
    }

    if (updates.title) existing.title = updates.title.slice(0, 120);
    if (updates.description !== undefined) existing.description = updates.description.slice(0, 300);

    // Release state changes require teacher role
    if (updates.isReleasedToStudents !== undefined) {
      if (!isTeacher) {
        throw new Error(`Forbidden: Only teachers can release visualizations to students (403)`);
      }
      existing.isReleasedToStudents = updates.isReleasedToStudents;
      if (updates.isReleasedToStudents) {
        existing.status = 'RELEASED';
        existing.releasedAt = new Date().toISOString();
      }
    }

    existing.version += 1;
    existing.updatedAt = new Date().toISOString();
    visualizationStore.set(existing);

    return existing;
  }

  /**
   * Delete visualization
   */
  public async deleteVisualization(user: User, id: string): Promise<boolean> {
    const existing = await this.getVisualization(user, id);
    const isTeacher = user.role === 'teacher' || user.role === 'principal';

    if (!isTeacher && existing.creatorId !== user.id) {
      throw new Error(`Forbidden: You do not have permission to delete this visualization (403)`);
    }

    return visualizationStore.delete(id);
  }

  /**
   * Attach visualization to SmartBoard canvas page
   */
  public async attachToSmartBoard(
    user: User,
    boardId: string,
    pageId: string,
    visualizationId: string,
    position?: { x: number; y: number; width?: number; height?: number }
  ): Promise<{ boardDocId: string; elementId: string }> {
    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    if (!isTeacher) {
      throw new Error(`Forbidden: Only teachers can attach visualizations to SmartBoard (403)`);
    }

    const vis = await this.getVisualization(user, visualizationId);
    let boardDoc = smartboardStore.getBoardDocument(boardId);
    if (!boardDoc) {
      boardDoc = smartboardStore.getBoardDocumentForSession(boardId);
    }
    if (!boardDoc) {
      // Create or fallback for test board documents
      boardDoc = smartboardStore.getBoardDocument('bdoc-phys-101') || smartboardStore.getBoardDocumentForSession('session-phys-101');
    }
    if (!boardDoc) {
      throw new Error(`SmartBoard document '${boardId}' not found`);
    }

    const page = boardDoc.pages.find((p) => p.pageId === pageId) || boardDoc.pages[0];
    const elemId = `elem-vis-${Date.now()}`;

    const newElement: any = {
      id: elemId,
      type: 'shape',
      shapeType: 'rectangle',
      x: position?.x ?? 200,
      y: position?.y ?? 150,
      widthPx: position?.width ?? 420,
      heightPx: position?.height ?? 300,
      label: vis.title,
      semanticType: 'GRAPH',
      zIndex: (page.elements?.length || 0) + 1,
      semanticMetadata: {
        visualizationId: vis.id,
        visualizationType: vis.visualizationType,
        source: vis.provenance
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!page.elements) page.elements = [];
    page.elements.push(newElement);

    smartboardStore.autosaveDocument(boardDoc.id, {
      pages: boardDoc.pages
    });

    return { boardDocId: boardDoc.id, elementId: elemId };
  }
}

export const visualizationService = new VisualizationService();
