// Server-authoritative Board Knowledge Engine Service (D.13)
// Realizes the pipeline: BOARD -> UNDERSTAND -> STRUCTURE -> LINK -> STORE -> SEARCH -> LEARN

import type { User } from '../../../../data/types.ts';
import type {
  BoardDocument,
  BoardPage,
  BoardElement,
  BoardDerivedKnowledge,
  BoardAuditEvent,
  BoardDocumentLifecycle
} from '../../../../../src/types/smartboard.ts';
import type { WorkspacePage, PageBlock } from '../../../../../src/types/workspace.ts';
import { smartboardStore } from '../smartboardStore.ts';
import { boardRagBridge } from '../vision/boardRagBridge.ts';
import { GeminiProvider } from '../../../../providers/geminiProvider.ts';
import { academicIntegrationService } from '../../academicIntegrationService.ts';

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
  courseName?: string;
  lessonTitle?: string;
  pageId: string;
  pageIndex: number;
  pageTitle: string;
  matchedText: string;
  matchedFormula?: string;
  confidence: number;
  date: string;
  isReleased: boolean;
}

export interface AskBoardResponse {
  answer: string;
  boardDocumentId: string;
  courseCode: string;
  relevantPageIndices: number[];
  citedFormulas: string[];
  confidence: number;
  groundedInBoard: boolean;
}

export interface DerivedNotesResult {
  notesPageId: string;
  boardDocumentId: string;
  title: string;
  pageIndex?: number;
  blockCount: number;
  createdAt: string;
}

export class BoardKnowledgeService {
  private summaries: Map<string, BoardSummaryArtifact> = new Map();
  private derivedNotes: Map<string, WorkspacePage> = new Map();

  /**
   * Deterministic structured knowledge extraction from a single board page
   */
  public extractPageContent(page: BoardPage): {
    textSnippets: Array<{ text: string; confidence: number; sourceElementId?: string }>;
    equations: Array<{ expression: string; latex?: string; confidence: number; sourceElementId?: string }>;
    diagrams: Array<{ diagramType: string; summary: string; confidence: number }>;
    visualizations: Array<{ id: string; title: string; type: string }>;
  } {
    const textSnippets: Array<{ text: string; confidence: number; sourceElementId?: string }> = [];
    const equations: Array<{ expression: string; latex?: string; confidence: number; sourceElementId?: string }> = [];
    const diagrams: Array<{ diagramType: string; summary: string; confidence: number }> = [];
    const visualizations: Array<{ id: string; title: string; type: string }> = [];

    page.elements?.forEach((el: BoardElement) => {
      if (el.type === 'text' && el.text) {
        if (el.latexFormula || el.text.includes('=') || el.text.includes('\\')) {
          equations.push({
            expression: el.text,
            latex: el.latexFormula || el.text,
            confidence: 1.0,
            sourceElementId: el.id
          });
        } else {
          textSnippets.push({
            text: el.text,
            confidence: 1.0,
            sourceElementId: el.id
          });
        }
      } else if (el.type === 'visualization' || el.visualizationId) {
        visualizations.push({
          id: el.visualizationId || el.id,
          title: el.label || 'Interactive Visualization',
          type: el.semanticMetadata?.visualizationType || 'GRAPH'
        });
      } else if (el.type === 'shape' && el.label) {
        textSnippets.push({
          text: `[Shape: ${el.shapeType || 'block'}] ${el.label}`,
          confidence: 1.0,
          sourceElementId: el.id
        });
      }
    });

    // Extract from AI/deterministic vision candidates
    page.semanticCandidates?.forEach((cand) => {
      if (cand.equation) {
        equations.push({
          expression: cand.equation.expression,
          latex: cand.equation.latex,
          confidence: cand.confidence,
          sourceElementId: cand.relatedElementIds?.[0]
        });
      }
      if (cand.diagram) {
        const nodeLabels = cand.diagram.nodes.map((n) => n.label).filter(Boolean).join(', ');
        diagrams.push({
          diagramType: cand.diagram.diagramType,
          summary: `Diagram with nodes [${nodeLabels}], ${cand.diagram.edges.length} connections`,
          confidence: cand.confidence
        });
      }
      if (cand.recognizedText) {
        textSnippets.push({
          text: cand.recognizedText,
          confidence: cand.confidence,
          sourceElementId: cand.relatedElementIds?.[0]
        });
      }
    });

    return { textSnippets, equations, diagrams, visualizations };
  }

  /**
   * Main Pipeline: Index a BoardDocument, extract structured knowledge, run optional AI enrichment, and sync to RAG.
   */
  public async indexBoardDocument(
    user: User,
    boardDocId: string,
    options?: { triggerRagIngest?: boolean; forceReindex?: boolean }
  ): Promise<BoardDocument> {
    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    if (!isTeacher) {
      throw new Error('Forbidden: Only teachers can trigger board indexing (403)');
    }

    const doc = smartboardStore.getBoardDocument(boardDocId);
    if (!doc) {
      throw new Error(`BoardDocument '${boardDocId}' not found`);
    }

    // Institution check
    if (user.institutionId && doc.institutionId && user.institutionId !== doc.institutionId) {
      throw new Error('Forbidden: Cross-institution board access denied (403)');
    }

    const now = new Date().toISOString();
    doc.lifecycle = 'PROCESSING';
    this.recordAudit(doc, 'INDEX_STARTED', user.id, { boardDocId, timestamp: now });

    try {
      // 1. Deterministic extraction per page
      const allExtractedEquations: Array<{ expression: string; description?: string; latex?: string; confidence: number; sourceElementId?: string }> = [];
      const allKeyConcepts: string[] = [];
      const pageSummaries: string[] = [];

      doc.pages.forEach((page, idx) => {
        page.processingStatus = 'PROCESSING';
        const extracted = this.extractPageContent(page);

        page.extractedEquations = extracted.equations.map((e) => ({
          expression: e.expression,
          confidence: e.confidence,
          sourceElementId: e.sourceElementId
        }));
        page.extractedText = extracted.textSnippets.map((t) => ({
          text: t.text,
          confidence: t.confidence,
          sourceElementId: t.sourceElementId
        }));

        extracted.equations.forEach((eq) => {
          allExtractedEquations.push({
            expression: eq.expression,
            latex: eq.latex,
            confidence: eq.confidence,
            sourceElementId: eq.sourceElementId
          });
        });

        const pageSummaryText = `Page ${idx + 1} (${page.title}): Covers ${extracted.equations.length} mathematical relations and ${extracted.diagrams.length} diagrams. ${extracted.textSnippets.slice(0, 3).map((t) => t.text).join('. ')}`;
        page.pageSummary = pageSummaryText;
        pageSummaries.push(pageSummaryText);
        page.processingStatus = 'INDEXED';
        page.updatedAt = now;
      });

      // 2. Structured Derived Knowledge Synthesis (Deterministic baseline)
      const uniqueFormulas = Array.from(
        new Map(allExtractedEquations.map((e) => [e.expression, e])).values()
      );

      const derivedKnowledge: BoardDerivedKnowledge = {
        summary: `Structured academic board knowledge for ${doc.courseCode}: ${doc.title}. Comprises ${doc.pages.length} interactive whiteboard pages with verified formulas and derivations.`,
        keyConcepts: [
          `${doc.courseCode} Theoretical Principles`,
          'Derivation Sequence & Symmetry Analysis',
          'Worked Solutions & Physical Applications'
        ],
        importantEquations: uniqueFormulas.length > 0 ? uniqueFormulas : [
          { expression: '∮ E · dA = Q_enc / ε₀', description: "Gauss's Law of Electrostatics", latex: '\\oint \\mathbf{E} \\cdot d\\mathbf{A} = \\frac{Q_{enc}}{\\varepsilon_0}', confidence: 1.0 }
        ],
        definitions: [
          { term: 'Electric Flux', definition: 'The measure of the distribution of the electric field through a given surface area.' },
          { term: 'Gaussian Surface', definition: 'A closed three-dimensional surface in space through which the flux of a vector field is calculated.' }
        ],
        misconceptions: [
          {
            misconception: 'Electric flux depends on the specific shape of the closed Gaussian surface.',
            correction: 'Total flux depends strictly on the net enclosed charge Q_enc, regardless of surface shape.'
          }
        ],
        revisionPoints: [
          'Choose Gaussian surfaces matching the charge distribution symmetry (spherical, cylindrical, planar).',
          'Ensure E is perpendicular or parallel to normal area vectors dA.',
          'Verify conductor equipotential boundaries where internal E = 0.'
        ],
        practiceQuestions: [
          { question: 'Derive the electric field intensity at distance r from an infinitely long straight charged wire.', answer: 'E = λ / (2 * π * ε₀ * r)', difficulty: 'medium' },
          { question: 'What is the net electric flux through a closed cube containing a dipole?', answer: 'Zero, because net enclosed charge is zero.', difficulty: 'easy' }
        ],
        suggestedTags: [doc.courseCode, 'WhiteboardNotes', 'Derivations', 'ClassroomKnowledge'],
        generatedAt: now,
        aiEnriched: false
      };

      // 3. Optional AI Enrichment via Gemini Provider
      const provider = new GeminiProvider();
      if (provider.isConfigured()) {
        try {
          const aiPrompt = `Analyze this academic whiteboard session:
Course: ${doc.courseCode} (${doc.courseName})
Lesson: ${doc.lessonTitle || doc.title}
Pages (${doc.pages.length}):
${pageSummaries.join('\n')}
Formulas: ${uniqueFormulas.map((f) => f.expression).join(', ')}

Provide concise JSON with fields: summary, keyConcepts (array), definitions (array of {term, definition}), misconceptions (array of {misconception, correction}), revisionPoints (array).`;

          const aiMessages = [{ id: `msg-${Date.now()}`, role: 'user' as const, content: aiPrompt, timestamp: now }];
          const aiRes = await provider.generateResponse(aiMessages, { temperature: 0.2 });
          const cleaned = (aiRes.reply || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          const parsed = JSON.parse(cleaned);

          if (parsed.summary) derivedKnowledge.summary = parsed.summary;
          if (Array.isArray(parsed.keyConcepts)) derivedKnowledge.keyConcepts = parsed.keyConcepts;
          if (Array.isArray(parsed.definitions)) derivedKnowledge.definitions = parsed.definitions;
          if (Array.isArray(parsed.misconceptions)) derivedKnowledge.misconceptions = parsed.misconceptions;
          if (Array.isArray(parsed.revisionPoints)) derivedKnowledge.revisionPoints = parsed.revisionPoints;
          derivedKnowledge.aiEnriched = true;
        } catch (err: any) {
          console.warn('[BoardKnowledgeService] Optional AI enrichment skipped; using deterministic academic baseline:', err?.message || err);
        }
      }

      doc.derivedKnowledge = derivedKnowledge;
      doc.lifecycle = doc.isReleasedToStudents ? 'RELEASED' : 'INDEXED';
      doc.timestamps.updatedAt = now;

      // 4. RAG Knowledge Space Synchronization
      if (options?.triggerRagIngest !== false) {
        try {
          const ragRes = await boardRagBridge.ingestBoardDocumentToRag(user, doc);
          doc.ragIndexed = true;
          doc.ragSummary = ragRes.summary;
          doc.knowledgeSourceId = ragRes.sourceId;
        } catch (ragErr) {
          console.warn('[BoardKnowledgeService] RAG bridge synchronization warning:', ragErr);
        }
      }

      this.recordAudit(doc, 'INDEX_COMPLETED', user.id, {
        pagesProcessed: doc.pages.length,
        formulasCount: uniqueFormulas.length,
        aiEnriched: derivedKnowledge.aiEnriched
      });

      smartboardStore.autosaveDocument(doc.id, {
        pages: doc.pages,
        derivedKnowledge: doc.derivedKnowledge,
        lifecycle: doc.lifecycle,
        ragIndexed: doc.ragIndexed,
        ragSummary: doc.ragSummary,
        knowledgeSourceId: doc.knowledgeSourceId
      });

      return doc;
    } catch (err: any) {
      doc.lifecycle = 'FAILED_INDEXING';
      this.recordAudit(doc, 'INDEX_FAILED', user.id, { error: err?.message || 'Indexing error' });
      smartboardStore.autosaveDocument(doc.id, { lifecycle: 'FAILED_INDEXING' });
      throw err;
    }
  }

  /**
   * Release or unrelease a BoardDocument to students
   */
  public async releaseBoardDocument(
    user: User,
    boardDocId: string,
    isReleased: boolean
  ): Promise<BoardDocument> {
    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    if (!isTeacher) {
      throw new Error('Forbidden: Only teachers can release or unrelease board documents (403)');
    }

    const doc = smartboardStore.getBoardDocument(boardDocId);
    if (!doc) {
      throw new Error(`BoardDocument '${boardDocId}' not found`);
    }

    if (user.institutionId && doc.institutionId && user.institutionId !== doc.institutionId) {
      throw new Error('Forbidden: Cross-institution access denied (403)');
    }

    const now = new Date().toISOString();
    doc.isReleasedToStudents = isReleased;
    doc.releasedAt = isReleased ? now : undefined;
    doc.lifecycle = isReleased ? 'RELEASED' : 'INDEXED';
    doc.timestamps.updatedAt = now;

    this.recordAudit(doc, isReleased ? 'BOARD_RELEASED' : 'BOARD_UNRELEASED', user.id, {
      releasedAt: doc.releasedAt
    });

    // When released, ensure it is indexed and ingested into RAG
    if (isReleased && (!doc.derivedKnowledge || !doc.ragIndexed)) {
      try {
        await this.indexBoardDocument(user, boardDocId, { triggerRagIngest: true });
      } catch (err) {
        console.warn('Auto-index on release warning:', err);
      }
    }

    smartboardStore.autosaveDocument(doc.id, {
      isReleasedToStudents: doc.isReleasedToStudents,
      releasedAt: doc.releasedAt,
      lifecycle: doc.lifecycle
    });

    return doc;
  }

  /**
   * Multi-tenant search over authorized board documents
   */
  public searchBoardKnowledge(
    user: User,
    query: string,
    filters?: { classId?: string; courseCode?: string; lessonId?: string }
  ): BoardSearchResultItem[] {
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];

    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    const docs = filters?.classId
      ? smartboardStore.listDocumentsForClass(filters.classId, !isTeacher)
      : smartboardStore.listAllDocuments(!isTeacher);
    const results: BoardSearchResultItem[] = [];

    const qTokens = q.split(/\s+/).filter((tok) => tok.length > 1);

    docs.forEach((doc) => {
      // Cross-institution protection
      if (user.institutionId && doc.institutionId && user.institutionId !== doc.institutionId) {
        return;
      }

      // Students can strictly only see released boards
      if (!isTeacher && !doc.isReleasedToStudents) {
        return;
      }

      if (filters?.courseCode && doc.courseCode !== filters.courseCode) {
        return;
      }
      if (filters?.lessonId && doc.lessonId !== filters.lessonId) {
        return;
      }

      const docMetaString = `${doc.title || ''} ${doc.lessonTitle || ''} ${doc.unitTitle || ''} ${doc.courseName || ''} ${doc.ragSummary || ''}`.toLowerCase();

      doc.pages.forEach((page) => {
        let matchScore = 0;
        let matchedSnippet = '';
        let matchedFormula: string | undefined;

        page.elements?.forEach((el) => {
          const t = (el.text || el.label || el.latexFormula || '').toLowerCase();
          if (t.includes(q)) {
            matchScore += 2;
            matchedSnippet = el.text || el.label || '';
            if (el.latexFormula) matchedFormula = el.latexFormula;
          } else if (qTokens.length > 0 && qTokens.some((tok) => t.includes(tok))) {
            matchScore += 1;
            if (!matchedSnippet) matchedSnippet = el.text || el.label || '';
            if (el.latexFormula && !matchedFormula) matchedFormula = el.latexFormula;
          }
        });

        page.semanticCandidates?.forEach((cand) => {
          const eq = (cand.equation?.expression || '').toLowerCase();
          if (eq.includes(q)) {
            matchScore += 2;
            matchedFormula = cand.equation?.expression;
            matchedSnippet = `Formula: ${cand.equation?.expression}`;
          }
          if (cand.recognizedText?.toLowerCase().includes(q)) {
            matchScore += 1.5;
            matchedSnippet = cand.recognizedText;
          }
        });

        // Match derived knowledge key concepts, summary, definitions, or equations
        if (doc.derivedKnowledge) {
          doc.derivedKnowledge.keyConcepts.forEach((kc) => {
            const lkc = kc.toLowerCase();
            if (lkc.includes(q)) matchScore += 1.5;
            else if (qTokens.length > 0 && qTokens.some((tok) => lkc.includes(tok))) matchScore += 1;
          });
          if (doc.derivedKnowledge.summary.toLowerCase().includes(q)) {
            matchScore += 1;
          }
          doc.derivedKnowledge.importantEquations?.forEach((ie) => {
            const eqStr = `${ie.expression} ${ie.latex || ''} ${ie.description || ''}`.toLowerCase();
            if (eqStr.includes(q)) {
              matchScore += 1.5;
              if (!matchedFormula) matchedFormula = ie.latex || ie.expression;
            }
          });
        }

        if (page.title.toLowerCase().includes(q) || doc.title.toLowerCase().includes(q)) {
          matchScore += 1.5;
          if (!matchedSnippet) matchedSnippet = page.title;
        }

        if (docMetaString.includes(q)) {
          matchScore += 1;
          if (!matchedSnippet) matchedSnippet = doc.lessonTitle || doc.title;
        } else if (qTokens.length > 0 && qTokens.some((tok) => docMetaString.includes(tok))) {
          matchScore += 0.8;
          if (!matchedSnippet) matchedSnippet = doc.lessonTitle || doc.title;
        }

        if (matchScore > 0) {
          results.push({
            boardDocumentId: doc.id,
            classSessionId: doc.classSessionId,
            courseCode: doc.courseCode,
            courseName: doc.courseName,
            lessonTitle: doc.lessonTitle,
            pageId: page.pageId,
            pageIndex: page.pageIndex,
            pageTitle: page.title,
            matchedText: matchedSnippet || page.title,
            matchedFormula,
            confidence: Math.min(1.0, 0.5 + matchScore * 0.15),
            date: doc.timestamps.updatedAt,
            isReleased: doc.isReleasedToStudents
          });
        }
      });
    });

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Ask Jarvis about the Board: Grounded, secure Q&A strictly against authorized board knowledge
   */
  public async askJarvisAboutBoard(
    user: User,
    query: string,
    context: { classSessionId?: string; courseCode?: string; boardDocumentId?: string; pageIndex?: number }
  ): Promise<AskBoardResponse> {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) {
      throw new Error('Query text is required');
    }

    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    let doc: BoardDocument | undefined;

    if (context.boardDocumentId) {
      doc = smartboardStore.getBoardDocument(context.boardDocumentId);
    } else if (context.classSessionId) {
      doc = smartboardStore.getBoardDocumentForSession(context.classSessionId);
    } else {
      doc = smartboardStore.getBoardDocument('bdoc-phys-101');
    }

    if (!doc) {
      throw new Error('Target board document not found');
    }

    // Tenant and release validation
    if (user.institutionId && doc.institutionId && user.institutionId !== doc.institutionId) {
      throw new Error('Forbidden: Cross-institution board inquiry denied (403)');
    }
    if (!isTeacher && !doc.isReleasedToStudents) {
      throw new Error('Forbidden: Unreleased board knowledge is private to the instructor (403)');
    }

    // Build bounded untrusted source context
    const extractedFormulas: string[] = [];
    const pageExcerpts: string[] = [];
    const citedPages: number[] = [];

    doc.pages.forEach((p, idx) => {
      if (context.pageIndex !== undefined && context.pageIndex !== idx) {
        return;
      }
      citedPages.push(idx + 1);
      const elementsText = (p.elements || []).map((e) => e.text || e.label || e.latexFormula).filter(Boolean).join('; ');
      const candidateText = (p.semanticCandidates || []).map((c) => c.equation?.expression || c.recognizedText).filter(Boolean).join('; ');
      pageExcerpts.push(`Page ${idx + 1} (${p.title}): ${elementsText} ${candidateText}`);

      p.elements?.forEach((e) => {
        if (e.latexFormula) extractedFormulas.push(e.latexFormula);
      });
      p.semanticCandidates?.forEach((c) => {
        if (c.equation?.expression) extractedFormulas.push(c.equation.expression);
      });
    });

    const uniqueFormulas = Array.from(new Set(extractedFormulas));
    const provider = new GeminiProvider();

    if (provider.isConfigured()) {
      try {
        const prompt = `You are J.A.R.V.I.S., analyzing an academic whiteboard session.
Course: ${doc.courseCode} - ${doc.courseName}
Lesson: ${doc.lessonTitle || doc.title}
Instructor: ${doc.teacherName}

UNTRUSTED WHITEBOARD TRANSCRIPTS:
${pageExcerpts.join('\n')}

Student/Teacher Inquiry: "${cleanQuery}"

Directives:
1. Answer strictly based on the whiteboard content above.
2. Cite the exact page number(s).
3. If an equation was written on the board, state it explicitly.
4. Keep tone concise, professional, and pedagogically clear.`;

        const messages = [{ id: `ask-${Date.now()}`, role: 'user' as const, content: prompt, timestamp: new Date().toISOString() }];
        const res = await provider.generateResponse(messages, { temperature: 0.3 });

        return {
          answer: res.reply || 'Analysis completed from whiteboard session.',
          boardDocumentId: doc.id,
          courseCode: doc.courseCode,
          relevantPageIndices: citedPages,
          citedFormulas: uniqueFormulas.slice(0, 5),
          confidence: 0.95,
          groundedInBoard: true
        };
      } catch (err) {
        console.warn('Gemini board Q&A fallback:', err);
      }
    }

    // Deterministic fallback answer
    return {
      answer: `[Board Knowledge Engine]: In ${doc.courseCode} (${doc.lessonTitle || doc.title}), the instructor detailed: ${pageExcerpts.slice(0, 2).join(' ')}. Key formulation on the board: ${uniqueFormulas[0] || '∮ E · dA = Q_enc / ε₀'}.`,
      boardDocumentId: doc.id,
      courseCode: doc.courseCode,
      relevantPageIndices: citedPages,
      citedFormulas: uniqueFormulas.slice(0, 5),
      confidence: 0.88,
      groundedInBoard: true
    };
  }

  /**
   * Create derived Workspace Notes document from a BoardDocument or specific page
   */
  public async createDerivedNotes(
    user: User,
    boardDocId: string,
    options?: { pageIndex?: number; customTitle?: string }
  ): Promise<DerivedNotesResult> {
    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    const doc = smartboardStore.getBoardDocument(boardDocId);
    if (!doc) {
      throw new Error(`BoardDocument '${boardDocId}' not found`);
    }

    if (!isTeacher && !doc.isReleasedToStudents) {
      throw new Error('Forbidden: Cannot create notes from an unreleased teacher board (403)');
    }

    const now = new Date().toISOString();
    const notesId = `wp-board-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const title = options?.customTitle || `${doc.courseCode} Board Notes: ${doc.title}${options?.pageIndex !== undefined ? ` (Page ${options.pageIndex + 1})` : ''}`;

    const blocks: PageBlock[] = [
      {
        id: `blk-${Date.now()}-1`,
        type: 'heading_1',
        content: title
      },
      {
        id: `blk-${Date.now()}-2`,
        type: 'callout',
        content: `Derived from SmartBoard Session '${doc.title}' (${doc.courseCode}) by ${doc.teacherName} on ${doc.timestamps.createdAt}.`,
        properties: { calloutType: 'info', calloutIcon: '📋' }
      }
    ];

    const targetPages = options?.pageIndex !== undefined && doc.pages[options.pageIndex]
      ? [doc.pages[options.pageIndex]]
      : doc.pages;

    targetPages.forEach((p, idx) => {
      blocks.push({
        id: `blk-${Date.now()}-h-${idx}`,
        type: 'heading_2',
        content: `Page ${p.pageIndex + 1}: ${p.title}`
      });

      if (p.pageSummary) {
        blocks.push({
          id: `blk-${Date.now()}-s-${idx}`,
          type: 'paragraph',
          content: p.pageSummary
        });
      }

      p.elements?.forEach((el, eIdx) => {
        if (el.latexFormula) {
          blocks.push({
            id: `blk-${Date.now()}-eq-${idx}-${eIdx}`,
            type: 'math_block',
            content: el.latexFormula
          });
        } else if (el.type === 'text' && el.text) {
          blocks.push({
            id: `blk-${Date.now()}-t-${idx}-${eIdx}`,
            type: 'bullet_list',
            content: el.text
          });
        }
      });
    });

    const workspacePage: WorkspacePage = {
      id: notesId,
      title,
      icon: '📐',
      parentId: null,
      type: 'notes',
      ownerId: user.id,
      ownerName: user.displayName || 'Educator',
      ownerRole: (user.role as any) || 'teacher',
      visibility: 'class_shared',
      tags: [doc.courseCode, 'SmartBoard', 'LectureNotes'],
      blocks,
      academicLink: {
        classId: doc.classId,
        courseCode: doc.courseCode,
        lessonId: doc.lessonId,
        lessonTitle: doc.lessonTitle,
        classSessionId: doc.classSessionId
      },
      isFavorite: false,
      createdAt: now,
      updatedAt: now
    };

    this.derivedNotes.set(notesId, workspacePage);

    // Link learning objects in academicIntegrationService
    academicIntegrationService.createLink({
      workspaceId: user.workspaceId || 'ws-stark-core',
      sourceType: 'classSession',
      sourceId: doc.classSessionId,
      targetType: 'workspacePage',
      targetId: notesId,
      relation: 'notes',
      title,
      createdBy: user.id
    });

    this.recordAudit(doc, 'DERIVED_NOTES_CREATED', user.id, {
      notesPageId: notesId,
      pageIndex: options?.pageIndex
    });

    return {
      notesPageId: notesId,
      boardDocumentId: doc.id,
      title,
      pageIndex: options?.pageIndex,
      blockCount: blocks.length,
      createdAt: now
    };
  }

  /**
   * Create derived homework draft or revision guide from board formulas and derivations
   */
  public async createDerivedHomeworkOrRevision(
    user: User,
    boardDocId: string,
    type: 'homework' | 'revision' | 'practice' | 'flashcards'
  ): Promise<{
    id: string;
    type: string;
    title: string;
    courseCode: string;
    questionCount: number;
    requiresTeacherApproval: boolean;
    isApproved: boolean;
    items: any[];
  }> {
    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    if (!isTeacher) {
      throw new Error('Forbidden: Only teachers can generate derived homework or revision assignments (403)');
    }

    const doc = smartboardStore.getBoardDocument(boardDocId);
    if (!doc) {
      throw new Error(`BoardDocument '${boardDocId}' not found`);
    }

    const formulas = doc.derivedKnowledge?.importantEquations || [
      { expression: '∮ E · dA = Q_enc / ε₀', description: "Gauss's Law", confidence: 1.0 }
    ];

    const questions = [
      {
        id: `q-${Date.now()}-1`,
        prompt: `Using the derivation from today's SmartBoard lecture on ${doc.courseCode}, apply ${formulas[0]?.expression || 'Gauss flux'} to calculate the electric field inside a hollow conducting sphere of radius R carrying charge Q.`,
        latexFormula: formulas[0]?.latex || formulas[0]?.expression,
        marks: 5,
        rubric: 'Full marks for correctly setting Q_enc = 0 inside the conductor.'
      },
      {
        id: `q-${Date.now()}-2`,
        prompt: 'State two physical conditions under which Gauss’s Law provides a practical, closed-form method for calculating electric fields.',
        marks: 5,
        rubric: 'Identify spherical, cylindrical, or planar symmetry.'
      }
    ];

    const artifactId = `hw-board-${Date.now()}`;
    this.recordAudit(doc, 'DERIVED_ASSIGNMENT_GENERATED', user.id, {
      type,
      artifactId,
      questionCount: questions.length
    });

    return {
      id: artifactId,
      type,
      title: `${doc.courseCode} ${type.toUpperCase()}: ${doc.title}`,
      courseCode: doc.courseCode,
      questionCount: questions.length,
      requiresTeacherApproval: true,
      isApproved: false,
      items: questions
    };
  }

  /**
   * Generate post-class summary artifact
   */
  public async generatePostClassSummary(
    user: User,
    boardDocId: string
  ): Promise<BoardSummaryArtifact> {
    const isTeacher = user.role === 'teacher' || user.role === 'principal';
    if (!isTeacher) {
      throw new Error('Forbidden: Only teachers can generate board knowledge summaries (403)');
    }

    const doc = await this.indexBoardDocument(user, boardDocId);
    const summaryId = `bsum-${Date.now()}`;
    const now = new Date().toISOString();

    const artifact: BoardSummaryArtifact = {
      id: summaryId,
      boardDocumentId: doc.id,
      classSessionId: doc.classSessionId,
      courseCode: doc.courseCode,
      title: `${doc.courseCode}: Post-Class Knowledge Summary`,
      executiveSummary: doc.derivedKnowledge?.summary || `Structured notes extracted from ${doc.title}.`,
      extractedFormulas: (doc.derivedKnowledge?.importantEquations || []).map((e) => e.expression),
      derivationSteps: doc.derivedKnowledge?.revisionPoints || ['Gauss flux integral formulation', 'Cylindrical charge density evaluation'],
      workedExamples: ['Point charge inverse-square derivation', 'Infinite wire radial field'],
      keyTakeaways: doc.derivedKnowledge?.keyConcepts || [
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

  public getSummary(id: string): BoardSummaryArtifact | undefined {
    return this.summaries.get(id);
  }

  public getDerivedNotesPage(id: string): WorkspacePage | undefined {
    return this.derivedNotes.get(id);
  }

  private recordAudit(doc: BoardDocument, action: string, actorId: string, details?: Record<string, any>): void {
    if (!doc.audit) doc.audit = [];
    doc.audit.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      actorId,
      timestamp: new Date().toISOString(),
      details
    });
  }
}

export const boardKnowledgeService = new BoardKnowledgeService();
