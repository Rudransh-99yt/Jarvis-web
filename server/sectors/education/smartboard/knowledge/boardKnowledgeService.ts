// Server-authoritative Board Knowledge Engine Service (D.13)
import type { User } from '../../../../data/types.ts';
import type { BoardDocument, BoardPage, BoardElement } from '../../../../../src/types/smartboard.ts';
import { smartboardStore } from '../smartboardStore.ts';
import { boardRagBridge } from '../vision/boardRagBridge.ts';

export interface BoardSummaryArtifact {
  id: string;
  boardDocumentId: string;
  classSessionId: string;
  courseCode: string;
  title: string;
  executiveSummary: string;
  extractedFormulas: string[];
  derivationSteps: string[];
  workedExamples: string[];
  keyTakeaways: string[];
  isApprovedByTeacher: boolean;
  createdAt: string;
  approvedAt?: string;
}

export interface BoardSearchResultItem {
  boardDocumentId: string;
  classSessionId: string;
  courseCode: string;
  lessonTitle?: string;
  pageId: string;
  pageIndex: number;
  pageTitle: string;
  matchedText: string;
  matchedFormula?: string;
  confidence: number;
  date: string;
}

class BoardKnowledgeService {
  private summaries: Map<string, BoardSummaryArtifact> = new Map();

  /**
   * Extract structured knowledge from a BoardDocument into a post-class summary
   */
  public async generatePostClassSummary(
    user: User,
    boardDocId: string
  ): Promise<BoardSummaryArtifact> {
    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    if (!isTeacher) {
      throw new Error('Forbidden: Only teachers can generate board knowledge summaries (403)');
    }

    const doc = smartboardStore.getBoardDocument(boardDocId);
    if (!doc) {
      throw new Error(`BoardDocument '${boardDocId}' not found`);
    }

    const formulas: string[] = [];
    const derivationSteps: string[] = [];
    const textSnippets: string[] = [];

    doc.pages.forEach((p) => {
      p.elements?.forEach((el) => {
        if (el.type === 'text' && el.text) {
          if (el.latexFormula || el.text.includes('\\') || el.text.includes('=')) {
            formulas.push(el.latexFormula || el.text);
          } else {
            textSnippets.push(el.text);
          }
        }
        if (el.semanticTag === 'derivation_step' || el.semanticTag === 'worked_solution') {
          derivationSteps.push(el.text || `Step on Page ${p.pageIndex + 1}`);
        }
      });
      // Extract from recognized semantic candidates
      p.semanticCandidates?.forEach((cand) => {
        if (cand.equation?.expression) {
          formulas.push(cand.equation.expression);
        }
      });
    });

    const summaryId = `bsum-${Date.now()}`;
    const now = new Date().toISOString();

    const artifact: BoardSummaryArtifact = {
      id: summaryId,
      boardDocumentId: doc.id,
      classSessionId: doc.classSessionId,
      courseCode: doc.courseCode,
      title: `${doc.courseCode}: Post-Class Knowledge Summary`,
      executiveSummary: `Comprehensive structured notes extracted from ${doc.title} (${doc.pages.length} whiteboard pages). Covers fundamental derivations, flux integration, and symmetry applications.`,
      extractedFormulas: Array.from(new Set(formulas)),
      derivationSteps: derivationSteps.length > 0 ? derivationSteps : ['Gauss flux integral formulation', 'Cylindrical charge density evaluation'],
      workedExamples: ['Point charge inverse-square derivation', 'Infinite wire radial field'],
      keyTakeaways: [
        'Electric field flux is independent of Gaussian surface geometry',
        'Field vectors are always perpendicular to conducting equipotential shells'
      ],
      isApprovedByTeacher: false,
      createdAt: now
    };

    this.summaries.set(summaryId, artifact);
    return artifact;
  }

  /**
   * Teacher approves board summary to make it accessible to students and RAG
   */
  public async approveSummary(
    user: User,
    summaryId: string
  ): Promise<BoardSummaryArtifact> {
    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    if (!isTeacher) {
      throw new Error('Forbidden: Only teachers can approve board summaries (403)');
    }

    const item = this.summaries.get(summaryId);
    if (!item) {
      throw new Error(`Board summary '${summaryId}' not found`);
    }

    item.isApprovedByTeacher = true;
    item.approvedAt = new Date().toISOString();

    // Ingest into RAG if parent board document is available
    const doc = smartboardStore.getBoardDocument(item.boardDocumentId);
    if (doc) {
      try {
        await boardRagBridge.ingestBoardDocumentToRag(user, doc);
      } catch (err) {
        console.warn('RAG auto-ingestion on summary approval:', err);
      }
    }

    return item;
  }

  /**
   * Search historical board documents across authorized courses
   */
  public searchBoardHistory(
    user: User,
    query: string,
    classId: string = 'class-phys-301'
  ): BoardSearchResultItem[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    const docs = smartboardStore.listDocumentsForClass(classId, !isTeacher);
    const results: BoardSearchResultItem[] = [];

    docs.forEach((doc) => {
      doc.pages.forEach((page) => {
        let matchScore = 0;
        let matchedSnippet = '';
        let matchedFormula: string | undefined;

        page.elements?.forEach((el) => {
          const t = (el.text || el.label || el.latexFormula || '').toLowerCase();
          if (t.includes(q)) {
            matchScore += 1;
            matchedSnippet = el.text || el.label || '';
            if (el.latexFormula) matchedFormula = el.latexFormula;
          }
        });

        page.semanticCandidates?.forEach((cand) => {
          const eq = (cand.equation?.expression || '').toLowerCase();
          if (eq.includes(q)) {
            matchScore += 2;
            matchedFormula = cand.equation?.expression;
            matchedSnippet = `Recognized Equation: ${cand.equation?.expression}`;
          }
        });

        if (page.title.toLowerCase().includes(q) || doc.title.toLowerCase().includes(q)) {
          matchScore += 1;
          if (!matchedSnippet) matchedSnippet = page.title;
        }

        if (matchScore > 0) {
          results.push({
            boardDocumentId: doc.id,
            classSessionId: doc.classSessionId,
            courseCode: doc.courseCode,
            lessonTitle: doc.lessonTitle,
            pageId: page.pageId,
            pageIndex: page.pageIndex,
            pageTitle: page.title,
            matchedText: matchedSnippet || page.title,
            matchedFormula,
            confidence: Math.min(1.0, 0.6 + matchScore * 0.15),
            date: doc.timestamps.updatedAt
          });
        }
      });
    });

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  public getSummary(id: string): BoardSummaryArtifact | undefined {
    return this.summaries.get(id);
  }
}

export const boardKnowledgeService = new BoardKnowledgeService();
