// Hybrid Retrieval Service: Semantic Vector Similarity + Lexical Keyword Matching
import type { EmbeddingProvider, ScoredChunk, VectorIndex } from './types.ts';
import { defaultEmbeddingProvider } from './embeddingProvider.ts';
import { localVectorIndex } from './vectorIndex.ts';
import { jarvisData } from '../data/index.ts';

export interface RetrievalOptions {
  topK?: number;
  alpha?: number; // Weight for vector similarity vs lexical score (0.0 to 1.0, default 0.65)
  minScoreThreshold?: number;
  workspaceId?: string;
  sourceIds?: string[];
}

export class RetrievalService {
  private embeddingProvider: EmbeddingProvider;
  private vectorIndex: VectorIndex;

  constructor(embeddingProvider?: EmbeddingProvider, vectorIndex?: VectorIndex) {
    this.embeddingProvider = embeddingProvider || defaultEmbeddingProvider;
    this.vectorIndex = vectorIndex || localVectorIndex;
  }

  /**
   * Computes a normalized lexical matching score based on term frequencies and title matches.
   */
  static computeLexicalScore(query: string, text: string, title: string): number {
    const STOP_WORDS = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'with', 'as', 'by', 'that', 'this', 'it', 'from', 'are', 'was', 'were', 'what', 'how', 'why', 'who', 'when', 'where', 'or', 'be', 'been'
    ]);
    const allTerms = query.toLowerCase().split(/[^a-z0-9_]+/i).filter((t) => t.length > 1);
    if (allTerms.length === 0) return 0;

    const meaningfulTerms = allTerms.filter((t) => !STOP_WORDS.has(t));
    const queryTerms = meaningfulTerms.length > 0 ? meaningfulTerms : allTerms;

    const lowerText = text.toLowerCase();
    const lowerTitle = title.toLowerCase();

    let matches = 0;
    let titleBonus = 0;

    for (const term of queryTerms) {
      // Check full word match in title
      if (lowerTitle.includes(term)) {
        titleBonus += 0.3;
      }
      // Check term occurrence in text
      if (lowerText.includes(term)) {
        matches++;
        // Additional frequency check
        const occurrences = (lowerText.match(new RegExp(term, 'gi')) || []).length;
        if (occurrences > 2) {
          matches += 0.5;
        }
      }
    }

    const termRatio = matches / queryTerms.length;
    const rawScore = termRatio * 0.7 + Math.min(0.3, titleBonus);
    return Math.min(1.0, Number(rawScore.toFixed(4)));
  }

  /**
   * Performs hybrid retrieval over the specified knowledge space.
   */
  async retrieve(
    spaceId: string,
    query: string,
    options: RetrievalOptions = {}
  ): Promise<ScoredChunk[]> {
    const topK = options.topK || 5;
    const alpha = options.alpha !== undefined ? options.alpha : 0.65; // 65% semantic, 35% lexical
    const minThreshold = options.minScoreThreshold !== undefined ? options.minScoreThreshold : 0.05;

    // 1. Generate query embedding
    const queryVector = await this.embeddingProvider.embedText(query);

    // 2. Fetch all candidate chunks for space
    const allChunks = await jarvisData.knowledge.getChunksForSpace(spaceId, options.workspaceId);
    if (allChunks.length === 0) {
      return [];
    }

    let filteredChunks = allChunks;
    if (options.sourceIds && options.sourceIds.length > 0) {
      const allowedSources = new Set(options.sourceIds);
      filteredChunks = allChunks.filter((c) => allowedSources.has(c.sourceId));
    }

    // 3. Compute hybrid scores
    const scoredList: ScoredChunk[] = [];

    for (const chunk of filteredChunks) {
      let vectorScore = 0;
      if (chunk.embedding && chunk.embedding.length > 0) {
        let dot = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < queryVector.length && i < chunk.embedding.length; i++) {
          dot += queryVector[i] * chunk.embedding[i];
          normA += queryVector[i] * queryVector[i];
          normB += chunk.embedding[i] * chunk.embedding[i];
        }
        if (normA > 0 && normB > 0) {
          vectorScore = Math.max(0, Math.min(1, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
        }
      }

      const lexicalScore = RetrievalService.computeLexicalScore(query, chunk.text, chunk.sourceTitle);
      const hybridScore = Number((alpha * vectorScore + (1 - alpha) * lexicalScore).toFixed(4));

      if (hybridScore >= minThreshold) {
        scoredList.push({
          chunkId: chunk.id,
          sourceId: chunk.sourceId,
          sourceTitle: chunk.sourceTitle,
          spaceId: chunk.knowledgeSpaceId,
          workspaceId: chunk.workspaceId,
          score: hybridScore,
          vectorScore: Number(vectorScore.toFixed(4)),
          lexicalScore: Number(lexicalScore.toFixed(4)),
          text: chunk.text,
          chunkIndex: chunk.chunkIndex,
          page: chunk.page,
          section: chunk.section,
          tokenCount: chunk.tokenCount
        });
      }
    }

    // 4. Sort deterministically descending by score
    scoredList.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.0001) {
        return b.score - a.score;
      }
      if (a.sourceId !== b.sourceId) {
        return a.sourceId.localeCompare(b.sourceId);
      }
      return a.chunkIndex - b.chunkIndex;
    });

    return scoredList.slice(0, topK);
  }

  /**
   * Performs multi-space hybrid retrieval across multiple authorized knowledge spaces.
   */
  async retrieveMultiSpace(
    spaceIds: string[],
    query: string,
    options: RetrievalOptions = {}
  ): Promise<ScoredChunk[]> {
    const topK = options.topK || 5;
    const combined: ScoredChunk[] = [];

    for (const spaceId of spaceIds) {
      const spaceChunks = await this.retrieve(spaceId, query, {
        ...options,
        topK: topK * 2
      });
      combined.push(...spaceChunks);
    }

    // Sort deterministically descending by score
    combined.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.0001) {
        return b.score - a.score;
      }
      if (a.sourceId !== b.sourceId) {
        return a.sourceId.localeCompare(b.sourceId);
      }
      return a.chunkIndex - b.chunkIndex;
    });

    return combined.slice(0, topK);
  }
}

export const retrievalService = new RetrievalService();
