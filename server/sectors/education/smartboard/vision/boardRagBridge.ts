import { requirePrincipal } from '../../../../auth/principal.ts';
// Board -> RAG Integration Bridge for Vision Board Foundation (D.9)
import type { User } from '../../../../data/types.ts';
import type { BoardDocument, BoardPage, BoardElement, SemanticCandidate, DiagramNode } from '../../../../../src/types/smartboard.ts';
import { jarvisData } from '../../../../data/index.ts';
import { ingestionPipeline } from '../../../../rag/ingestionPipeline.ts';
import { smartboardPolicy } from '../smartboardPolicy.ts';

export class BoardRagBridge {
  /**
   * Prepares and ingests an approved/released BoardDocument into RAG vector index.
   */
  async ingestBoardDocumentToRag(
    user: User,
    doc: BoardDocument,
    targetSpaceId?: string
  ): Promise<{ sourceId: string; chunksIndexed: number; summary: string }> {
    // 1. Enforce strict authorization
    const readCheck = await smartboardPolicy.canReadDocument(user, doc);
    if (!readCheck.allowed) {
      throw new Error(`Unauthorized to access board document for RAG: ${readCheck.reason}`);
    }

    // Students can NEVER ingest, and unreleased documents can NEVER become student-visible RAG
    if (user.role === 'student' && !doc.isReleasedToStudents) {
      throw new Error('Forbidden: Unreleased board documents cannot be ingested into student RAG.');
    }

    // 2. Synthesize structured text representations of board pages
    const pageTexts: string[] = [];
    doc.pages.forEach((page: BoardPage, idx: number) => {
      const pageHeader = `=== PAGE ${idx + 1}: ${page.title} ===\nBackground: ${page.background}`;
      const elementTexts: string[] = [];

      // Add text and formulas
      page.elements.forEach((elem: BoardElement) => {
        if (elem.latexFormula) {
          elementTexts.push(`Formula: ${elem.latexFormula}`);
        } else if (elem.text) {
          elementTexts.push(`Note: ${elem.text}`);
        } else if (elem.type === 'shape') {
          elementTexts.push(`Shape: ${elem.shapeType || 'block'} (${elem.label || 'unlabeled'})`);
        }
      });

      // Add semantic candidates
      if (page.semanticCandidates) {
        page.semanticCandidates.forEach((cand: SemanticCandidate) => {
          if (cand.equation) {
            elementTexts.push(`Recognized Equation: ${cand.equation.expression} (LaTeX: ${cand.equation.latex}) [Variables: ${cand.equation.variables.join(', ')}]`);
          }
          if (cand.diagram) {
            const nodeSummary = cand.diagram.nodes.map((n: DiagramNode) => n.label).join(', ');
            elementTexts.push(`Recognized Diagram (${cand.diagram.diagramType}): Nodes [${nodeSummary}], Edges count: ${cand.diagram.edges.length}`);
          }
          if (cand.recognizedText) {
            elementTexts.push(`Transcribed Text: ${cand.recognizedText}`);
          }
        });
      }

      pageTexts.push(`${pageHeader}\n${elementTexts.join('\n')}`);
    });

    const fullContent = `COURSE: ${doc.courseCode} - ${doc.courseName}
LESSON: ${doc.lessonTitle || doc.title}
INSTRUCTOR: ${doc.teacherName}
CLASSROOM: ${doc.classroomName}
SESSION ID: ${doc.classSessionId}
BOARD DOCUMENT ID: ${doc.id}
INSTITUTION: ${doc.institutionId}

${pageTexts.join('\n\n')}`;

    // 3. Locate or create Knowledge Space
    const workspaceId = 'ws-stark-core';
    const spaces = await jarvisData.knowledge.listSpaces(workspaceId);
    let space = spaces.find((s) => s.id === targetSpaceId || s.name.includes(doc.courseCode));
    if (!space) {
      space = spaces[0];
    }
    const finalSpaceId = space ? space.id : 'space-physics';

    // 4. Ingest into RAG pipeline
    const title = `${doc.courseCode} SmartBoard Notes: ${doc.title}`;
    const result = await ingestionPipeline.ingestSource({
      workspaceId,
      knowledgeSpaceId: finalSpaceId,
      name: title,
      rawContent: fullContent,
      type: 'notes',
      author: doc.teacherName
    });

    const summary = `Ingested ${doc.pages.length} board pages into Knowledge Space '${space ? space.name : finalSpaceId}' with ${result.chunkCount} semantic chunks.`;

    return {
      sourceId: result.sourceId,
      chunksIndexed: result.chunkCount,
      summary
    };
  }
}

export const boardRagBridge = new BoardRagBridge();
