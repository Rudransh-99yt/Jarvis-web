// Grounded RAG & Multi-Source Synthesis Engine
import type { GroundedAnswerResult, GroundedQueryOptions, Citation } from './types.ts';
import { retrievalService } from './retrievalService.ts';
import { jarvisData } from '../data/index.ts';
import { providerManager } from '../providers/providerManager.ts';

const GROUNDING_SYSTEM_PROMPT = `You are J.A.R.V.I.S. Grounded Research & Synthesis Engine, a cybernetic tactical intelligence operating for Stark Industries.
Your task is to synthesize accurate, precise, source-grounded answers based strictly on the provided verified source excerpts.

Rules:
1. Use ONLY the provided document excerpts as your factual source of truth.
2. If the excerpts do not contain enough information to answer the question, state clearly and concisely: "Based on the verified documents in this Knowledge Space, there is insufficient evidence to answer your inquiry." Do NOT guess, hallucinate, or fabricate facts.
3. For multi-source questions (e.g. comparing documents or finding common themes), systematically integrate perspectives from all relevant sources.
4. When stating facts, refer naturally to the source title (e.g., "According to [Document Title], ...").
5. Deliver concise, high-density, analytical responses with zero boilerplate filler.`;

export class GroundingService {
  /**
   * Executes a grounded retrieval query with multi-source synthesis, strict authorization, and verifiable citations.
   */
  async answerQuery(
    spaceId: string,
    query: string,
    options: GroundedQueryOptions = {}
  ): Promise<GroundedAnswerResult> {
    const timestamp = new Date().toISOString();
    const cleanQuery = query.trim();

    // 1. Authorization & Existence Check
    const space = await jarvisData.knowledge.getSpaceById(spaceId, options.workspaceId);
    if (!space) {
      throw new Error(`Knowledge space '${spaceId}' not found or unauthorized for workspace '${options.workspaceId || 'default'}'.`);
    }

    // Check class-level student authorization if classId is bound
    if (space.classId && options.userRole === 'student' && options.userId) {
      const cls = await jarvisData.education.getClassById(space.classId);
      if (cls && !cls.studentIds.includes(options.userId)) {
        throw new Error(`Access denied: Student '${options.userId}' is not enrolled in class '${cls.code}' linked to this knowledge space.`);
      }
    }

    // 2. Hybrid Retrieval of Top Relevant Chunks
    const topK = options.topK || 5;
    const retrievedChunks = await retrievalService.retrieve(spaceId, cleanQuery, {
      topK,
      workspaceId: options.workspaceId || space.workspaceId,
      sourceIds: options.allowedSourceIds
    });

    const spaceTitle = space.name || 'Knowledge Space';

    // 3. Insufficient Evidence Detection
    // If no chunks retrieved, or the top chunk score is below minimum threshold
    const topScore = retrievedChunks[0]?.score || 0;
    const minThreshold = options.minConfidenceScore !== undefined ? options.minConfidenceScore : 0.15;

    if (retrievedChunks.length === 0 || topScore < minThreshold) {
      return {
        query: cleanQuery,
        spaceId,
        spaceTitle,
        answer: `Based on the verified documents in "${spaceTitle}", there is insufficient evidence to address your inquiry regarding "${cleanQuery}". No indexed source records contain relevant factual context for this query.`,
        citations: [],
        confidence: Number(topScore.toFixed(3)),
        isGrounded: false,
        retrievedChunksCount: 0,
        sourcesUsed: [],
        timestamp,
        modelUsed: 'rule-based-guard'
      };
    }

    // 4. Extract Structured Citations from Top Matches
    const uniqueSourcesMap = new Map<string, string>();
    const citations: Citation[] = [];

    for (const sc of retrievedChunks) {
      uniqueSourcesMap.set(sc.sourceId, sc.sourceTitle);

      const excerptText = sc.text.length > 200 ? sc.text.slice(0, 197) + '...' : sc.text;
      citations.push({
        sourceId: sc.sourceId,
        sourceTitle: sc.sourceTitle,
        chunkId: sc.chunkId,
        spaceId: sc.spaceId,
        page: sc.page,
        section: sc.section,
        excerpt: excerptText,
        location: sc.section ? `Section: ${sc.section}` : sc.page ? `Page ${sc.page}` : undefined,
        score: sc.score
      });
    }

    const sourcesUsed = Array.from(uniqueSourcesMap.values());

    // 5. Synthesis Prompt Construction
    const contextExcerpts = retrievedChunks
      .map((c, i) => `--- [Source ${i + 1}: ${c.sourceTitle} | Section: ${c.section || 'General'} | Page: ${c.page || 1}] ---\n${c.text}`)
      .join('\n\n');

    const promptMessage = `User Query: "${cleanQuery}"\n\nVerified Document Context:\n${contextExcerpts}\n\nPlease synthesize a clear, grounded answer to the user query using strictly the context above.`;

    // 6. Model Synthesis Execution
    const { provider, isFallback } = providerManager.getActiveProvider();

    if (!isFallback && provider.id === 'gemini') {
      try {
        const result = await provider.generateResponse([
          { id: `msg-${Date.now()}`, role: 'user', content: promptMessage, timestamp: new Date().toISOString() }
        ], {
          temperature: 0.2 // Low temperature for high factual grounding
        });

        const answerText = result.reply || '';
        return {
          query: cleanQuery,
          spaceId,
          spaceTitle,
          answer: answerText,
          citations,
          confidence: Math.min(0.98, Number((0.6 + topScore * 0.38).toFixed(3))),
          isGrounded: true,
          retrievedChunksCount: retrievedChunks.length,
          sourcesUsed,
          timestamp,
          modelUsed: 'gemini-3.7-flash'
        };
      } catch (err) {
        console.warn('[GroundingService] Gemini synthesis error, falling back to local synthesizer:', err);
      }
    }

    // 7. Deterministic Local Multi-Source Synthesizer (for ₹0/offline/tests)
    const synthesizedAnswer = this.deterministicLocalSynthesis(cleanQuery, spaceTitle, retrievedChunks);

    return {
      query: cleanQuery,
      spaceId,
      spaceTitle,
      answer: synthesizedAnswer,
      citations,
      confidence: Math.min(0.96, Number((0.55 + topScore * 0.4).toFixed(3))),
      isGrounded: true,
      retrievedChunksCount: retrievedChunks.length,
      sourcesUsed,
      timestamp,
      modelUsed: 'stark-grounded-local'
    };
  }

  /**
   * Deterministic local multi-source synthesizer for tests and offline operations.
   */
  private deterministicLocalSynthesis(
    query: string,
    spaceTitle: string,
    chunks: Array<{ sourceTitle: string; text: string; section?: string; score: number }>
  ): string {
    const isComparison = /compare|difference|versus|vs|contrast|relation/i.test(query);
    const isMultiSource = chunks.length > 1;

    const sourcesByTitle = new Map<string, string[]>();
    for (const c of chunks) {
      if (!sourcesByTitle.has(c.sourceTitle)) {
        sourcesByTitle.set(c.sourceTitle, []);
      }
      sourcesByTitle.get(c.sourceTitle)!.push(c.text);
    }

    if (isComparison && isMultiSource) {
      const parts: string[] = [`Comparative analysis based on verified materials in "${spaceTitle}":`];
      sourcesByTitle.forEach((texts, title) => {
        const summary = texts[0].split('\n\n')[0];
        parts.push(`• **${title}**: ${summary}`);
      });
      parts.push(`Synthesis: The retrieved sources provide complementary theoretical frameworks for "${query}".`);
      return parts.join('\n\n');
    }

    if (sourcesByTitle.size > 1) {
      const parts: string[] = [`Grounded multi-source synthesis for "${query}" from "${spaceTitle}":`];
      sourcesByTitle.forEach((texts, title) => {
        const firstSentence = texts[0].split('. ')[0] + '.';
        parts.push(`• **${title}**: ${firstSentence}`);
      });
      return parts.join('\n\n');
    }

    // Single source synthesis
    const primaryChunk = chunks[0];
    return `According to "${primaryChunk.sourceTitle}" in "${spaceTitle}":\n\n${primaryChunk.text}`;
  }
}

export const groundingService = new GroundingService();
