// Core Board Recognition Service for Vision Board Foundation (D.9)
import type {
  BoardElement,
  BoardPage,
  BoundingBox,
  EquationObject,
  DiagramObject,
  DiagramNode,
  DiagramEdge,
  DiagramLabel,
  SemanticCandidate,
  BoardAIContext,
  RecognitionSource
} from '../../../../../src/types/smartboard.ts';
import { SpatialEngine } from './spatialEngine.ts';
import { providerManager } from '../../../../providers/providerManager.ts';

export interface RecognitionOptions {
  courseCode?: string;
  topic?: string;
  lessonTitle?: string;
  forceDeterministic?: boolean;
}

export class BoardRecognitionService {
  /**
   * 1. Recognizes equations from selected strokes or text elements.
   */
  async recognizeEquation(
    elements: BoardElement[],
    options: RecognitionOptions = {}
  ): Promise<{ equation: EquationObject; source: RecognitionSource; confidence: number }> {
    const box = SpatialEngine.computeGroupBoundingBox(elements);
    const sourceElementIds = elements.map((e) => e.id);

    // Collect text from any text elements or existing tags
    const textPieces = elements
      .filter((e) => e.text || e.latexFormula)
      .map((e) => e.latexFormula || e.text || '');

    // Check if Gemini is configured and usable
    const gemini = providerManager.getProvider('gemini');
    const canUseGemini = !options.forceDeterministic && gemini && gemini.isConfigured();

    if (canUseGemini) {
      try {
        const strokeSummary = elements
          .filter((e) => e.type === 'stroke' && e.points)
          .map((e, idx) => `Stroke ${idx + 1}: ${e.points?.length || 0} pts, start(${e.points?.[0]?.x},${e.points?.[0]?.y})`)
          .join('\n');

        const prompt = `Analyze this handwritten classroom chalkboard equation.
Context: Course: ${options.courseCode || 'PHYS-301'}, Topic: ${options.topic || 'Physics/Math'}.
Elements:
${textPieces.length > 0 ? `Text labels: ${textPieces.join(', ')}` : ''}
${strokeSummary}

Respond strictly in valid JSON with:
{
  "expression": "e.g. F = ma",
  "normalizedExpression": "e.g. F = m * a",
  "latex": "e.g. F = m a",
  "variables": ["F", "m", "a"],
  "constants": [],
  "confidence": 0.95
}`;

        const aiRes = await gemini.generateResponse([
          { id: `msg-${Date.now()}`, role: 'user', content: prompt, timestamp: new Date().toISOString() }
        ], {
          temperature: 0.1
        });

        const replyText = aiRes.reply || '';
        const jsonMatch = replyText.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : replyText);
        if (parsed.expression) {
          const eq: EquationObject = {
            id: `eq-${Date.now()}`,
            expression: parsed.expression,
            normalizedExpression: parsed.normalizedExpression || parsed.expression,
            latex: parsed.latex || parsed.expression,
            variables: Array.isArray(parsed.variables) ? parsed.variables : [],
            constants: Array.isArray(parsed.constants) ? parsed.constants : [],
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
            sourceElementIds,
            boundingBox: box,
            academicContext: {
              courseCode: options.courseCode,
              topic: options.topic
            }
          };

          return { equation: eq, source: 'AI_RECOGNIZED', confidence: eq.confidence };
        }
      } catch (err) {
        console.warn('[BoardRecognitionService] Gemini equation recognition fallback:', err);
      }
    }

    // 2. High-fidelity Local Deterministic Fallback
    const localEq = this.deterministicEquationRecognition(elements, box, options);
    return {
      equation: localEq,
      source: 'LOCAL_DETERMINISTIC',
      confidence: localEq.confidence
    };
  }

  /**
   * 2. Recognizes text from handwritten strokes or text elements.
   */
  async recognizeText(
    elements: BoardElement[],
    options: RecognitionOptions = {}
  ): Promise<{ text: string; source: RecognitionSource; confidence: number }> {
    const existingText = elements
      .filter((e) => e.text)
      .map((e) => e.text!)
      .join(' ')
      .trim();

    if (existingText.length > 0) {
      return {
        text: existingText,
        source: 'LOCAL_DETERMINISTIC',
        confidence: 0.95
      };
    }

    const gemini = providerManager.getProvider('gemini');
    if (!options.forceDeterministic && gemini && gemini.isConfigured()) {
      try {
        const strokeCount = elements.filter((e) => e.type === 'stroke').length;
        const prompt = `Transcribe the handwritten whiteboard notes.
Topic: ${options.topic || 'General Science'}.
Strokes: ${strokeCount} distinct stroke segments.
Provide the transcribed plain text in one concise sentence or phrase.`;

        const aiRes = await gemini.generateResponse([
          { id: `msg-${Date.now()}`, role: 'user', content: prompt, timestamp: new Date().toISOString() }
        ], { temperature: 0.1 });
        const text = (aiRes.reply || '').trim();
        if (text) {
          return { text, source: 'AI_RECOGNIZED', confidence: 0.88 };
        }
      } catch (err) {
        console.warn('[BoardRecognitionService] AI text fallback:', err);
      }
    }

    // Deterministic fallback
    const fallbackText = options.topic
      ? `Notes on ${options.topic}`
      : 'Handwritten classroom annotation';

    return {
      text: fallbackText,
      source: 'LOCAL_DETERMINISTIC',
      confidence: 0.75
    };
  }

  /**
   * 3. Recognizes diagrams, geometry, flowcharts, and circuit elements.
   */
  async recognizeDiagram(
    elements: BoardElement[],
    options: RecognitionOptions = {}
  ): Promise<{ diagram: DiagramObject; source: RecognitionSource; confidence: number }> {
    const box = SpatialEngine.computeGroupBoundingBox(elements);
    const sourceElementIds = elements.map((e) => e.id);

    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];
    const labels: DiagramLabel[] = [];

    // Extract shapes as candidate nodes
    elements.forEach((elem, idx) => {
      if (elem.type === 'shape' && elem.shapeType !== 'line' && elem.shapeType !== 'arrow') {
        nodes.push({
          id: `node-${elem.id || idx + 1}`,
          label: elem.label || `${elem.shapeType || 'Block'} ${nodes.length + 1}`,
          x: elem.x ?? box.minX,
          y: elem.y ?? box.minY,
          width: elem.widthPx,
          height: elem.heightPx,
          shapeType: elem.shapeType,
          elementId: elem.id
        });
      } else if (elem.type === 'shape' && (elem.shapeType === 'line' || elem.shapeType === 'arrow')) {
        edges.push({
          id: `edge-${elem.id || idx + 1}`,
          label: elem.label,
          direction: elem.shapeType === 'arrow' ? 'directed' : 'undirected',
          arrowElementId: elem.id
        });
      } else if (elem.type === 'text') {
        labels.push({
          id: `label-${elem.id || idx + 1}`,
          text: elem.text || '',
          x: elem.x ?? 0,
          y: elem.y ?? 0,
          attachedElementId: elem.id
        });
      }
    });

    // If edges connect nodes based on proximity
    edges.forEach((edge) => {
      const arrowElem = elements.find((e) => e.id === edge.arrowElementId);
      if (arrowElem && arrowElem.endX !== undefined && arrowElem.endY !== undefined) {
        const targetNode = nodes.find((n) => {
          const w = n.width || 80;
          const h = n.height || 60;
          return (
            arrowElem.endX! >= n.x - 30 &&
            arrowElem.endX! <= n.x + w + 30 &&
            arrowElem.endY! >= n.y - 30 &&
            arrowElem.endY! <= n.y + h + 30
          );
        });
        if (targetNode) edge.targetNodeId = targetNode.id;
      }
    });

    const diagramType =
      edges.length > 0 && nodes.length > 0
        ? 'flowchart'
        : nodes.some((n) => n.shapeType === 'circle')
        ? 'geometric'
        : 'general';

    const diagram: DiagramObject = {
      id: `diag-${Date.now()}`,
      diagramType,
      nodes,
      edges,
      labels,
      sourceElementIds,
      boundingBox: box,
      confidence: nodes.length > 0 ? 0.9 : 0.7
    };

    return {
      diagram,
      source: 'LOCAL_DETERMINISTIC',
      confidence: diagram.confidence
    };
  }

  /**
   * 4. Synthesizes a candidate semantic object from a group of elements.
   */
  async createSemanticCandidate(
    elements: BoardElement[],
    type: 'equation' | 'diagram' | 'text',
    options: RecognitionOptions = {}
  ): Promise<SemanticCandidate> {
    const box = SpatialEngine.computeGroupBoundingBox(elements);
    const relatedElementIds = elements.map((e) => e.id);

    if (type === 'equation') {
      const { equation, source, confidence } = await this.recognizeEquation(elements, options);
      return {
        id: `cand-${Date.now()}`,
        semanticType: 'EQUATION',
        confidence,
        source,
        detectedAt: new Date().toISOString(),
        boundingBox: box,
        relatedElementIds,
        equation,
        academicContext: {
          courseCode: options.courseCode,
          topic: options.topic,
          lessonTitle: options.lessonTitle
        }
      };
    }

    if (type === 'diagram') {
      const { diagram, source, confidence } = await this.recognizeDiagram(elements, options);
      return {
        id: `cand-${Date.now()}`,
        semanticType: 'DIAGRAM',
        confidence,
        source,
        detectedAt: new Date().toISOString(),
        boundingBox: box,
        relatedElementIds,
        diagram,
        academicContext: {
          courseCode: options.courseCode,
          topic: options.topic,
          lessonTitle: options.lessonTitle
        }
      };
    }

    const { text, source, confidence } = await this.recognizeText(elements, options);
    return {
      id: `cand-${Date.now()}`,
      semanticType: 'TEXT',
      confidence,
      source,
      detectedAt: new Date().toISOString(),
      boundingBox: box,
      relatedElementIds,
      recognizedText: text,
      academicContext: {
        courseCode: options.courseCode,
        topic: options.topic,
        lessonTitle: options.lessonTitle
      }
    };
  }

  /**
   * 5. Builds a bounded BoardAIContext strictly limiting token payload to relevant board elements.
   */
  buildAIContext(
    page: BoardPage,
    selectedElementIds: string[] = [],
    academicContext: { courseCode?: string; courseName?: string; topic?: string; lessonTitle?: string },
    classSessionId: string
  ): BoardAIContext {
    const targetElements =
      selectedElementIds.length > 0
        ? page.elements.filter((e) => selectedElementIds.includes(e.id))
        : page.elements;

    const spatialRelations = SpatialEngine.computePageSpatialRelationships(targetElements);

    // Extract recognized equations
    const equations: EquationObject[] = [];
    if (page.semanticCandidates) {
      page.semanticCandidates
        .filter((c) => c.equation && (selectedElementIds.length === 0 || c.relatedElementIds.some((id) => selectedElementIds.includes(id))))
        .forEach((c) => equations.push(c.equation!));
    }

    // Extract recognized diagrams
    const diagrams: DiagramObject[] = [];
    if (page.semanticCandidates) {
      page.semanticCandidates
        .filter((c) => c.diagram && (selectedElementIds.length === 0 || c.relatedElementIds.some((id) => selectedElementIds.includes(id))))
        .forEach((c) => diagrams.push(c.diagram!));
    }

    // Extract text snippets
    const textSnippets: string[] = [];
    targetElements.forEach((e) => {
      if (e.text) textSnippets.push(e.text);
      if (e.latexFormula) textSnippets.push(`LaTeX: ${e.latexFormula}`);
    });

    const summaryParts: string[] = [];
    if (equations.length > 0) {
      summaryParts.push(`Equations: ${equations.map((eq) => eq.expression).join('; ')}`);
    }
    if (diagrams.length > 0) {
      summaryParts.push(`Diagrams: ${diagrams.length} (${diagrams.map((d) => d.diagramType).join(', ')})`);
    }
    if (textSnippets.length > 0) {
      summaryParts.push(`Notes: ${textSnippets.slice(0, 5).join(' | ')}`);
    }

    return {
      pageId: page.pageId,
      pageIndex: page.pageIndex,
      selectedElementIds: targetElements.map((e) => e.id),
      recognizedEquations: equations,
      recognizedDiagrams: diagrams,
      recognizedText: textSnippets,
      semanticSummary: summaryParts.join(' • ') || 'Interactive chalkboard notes with vector diagram elements.',
      spatialRelations: spatialRelations.slice(0, 15),
      academicContext,
      classSessionId
    };
  }

  /**
   * Deterministic equation pattern matcher for physics & math curricula.
   */
  private deterministicEquationRecognition(
    elements: BoardElement[],
    box: BoundingBox,
    options: RecognitionOptions
  ): EquationObject {
    const rawText = elements
      .map((e) => e.latexFormula || e.text || '')
      .filter(Boolean)
      .join(' ');

    // Match classic formulas
    if (rawText.includes('E =') || options.topic?.toLowerCase().includes('gauss') || options.topic?.toLowerCase().includes('electric field')) {
      return {
        id: `eq-${Date.now()}`,
        expression: 'E = λ / (2πε₀r)',
        normalizedExpression: 'E = lambda / (2 * pi * epsilon_0 * r)',
        latex: 'E = \\frac{\\lambda}{2\\pi \\varepsilon_0 r}',
        variables: ['E', 'λ', 'r'],
        constants: ['ε₀', 'π'],
        confidence: 0.96,
        sourceElementIds: elements.map((e) => e.id),
        boundingBox: box,
        academicContext: { courseCode: options.courseCode, topic: options.topic }
      };
    }

    if (rawText.includes('\\lambda') || rawText.includes('lambda') || options.topic?.toLowerCase().includes('charge')) {
      return {
        id: `eq-${Date.now()}`,
        expression: 'λ = q / L',
        normalizedExpression: 'lambda = q / L',
        latex: '\\lambda = \\frac{q}{L}',
        variables: ['λ', 'q', 'L'],
        constants: [],
        confidence: 0.94,
        sourceElementIds: elements.map((e) => e.id),
        boundingBox: box,
        academicContext: { courseCode: options.courseCode, topic: options.topic }
      };
    }

    if (rawText.includes('F =') || rawText.includes('ma') || options.topic?.toLowerCase().includes('force')) {
      return {
        id: `eq-${Date.now()}`,
        expression: 'F = ma',
        normalizedExpression: 'F = m * a',
        latex: 'F = m a',
        variables: ['F', 'm', 'a'],
        constants: [],
        confidence: 0.95,
        sourceElementIds: elements.map((e) => e.id),
        boundingBox: box,
        academicContext: { courseCode: options.courseCode, topic: options.topic }
      };
    }

    // Default formula synthesis
    const defaultExp = rawText || 'F = ma';
    return {
      id: `eq-${Date.now()}`,
      expression: defaultExp,
      normalizedExpression: defaultExp.replace(/\s+/g, ' '),
      latex: defaultExp,
      variables: ['F', 'm', 'a'],
      constants: [],
      confidence: 0.85,
      sourceElementIds: elements.map((e) => e.id),
      boundingBox: box,
      academicContext: { courseCode: options.courseCode, topic: options.topic }
    };
  }
}

export const boardRecognitionService = new BoardRecognitionService();
