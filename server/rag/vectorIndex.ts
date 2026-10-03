// Local Persistent Vector Index Implementation
import type { KnowledgeChunkRecord } from '../data/types.ts';
import type { VectorIndex } from './types.ts';
import { jarvisData } from '../data/index.ts';

export class LocalVectorIndex implements VectorIndex {
  /**
   * Computes cosine similarity between two float vectors.
   * Assumes vectors may or may not already be L2-normalized.
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
      return 0;
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const valA = a[i];
      const valB = b[i];
      dot += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;
    const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1, sim));
  }

  /**
   * Upserts chunk records with embeddings into the persistent repository.
   */
  async upsert(chunks: KnowledgeChunkRecord[]): Promise<void> {
    if (!chunks || chunks.length === 0) return;
    await jarvisData.knowledge.upsertChunks(chunks);
  }

  /**
   * Deletes all indexed chunks associated with a specific knowledge source ID.
   */
  async deleteBySourceId(sourceId: string): Promise<number> {
    return jarvisData.knowledge.deleteChunksBySourceId(sourceId);
  }

  /**
   * Deletes all indexed chunks associated with a specific knowledge space ID.
   */
  async deleteBySpaceId(spaceId: string): Promise<number> {
    return jarvisData.knowledge.deleteChunksBySpaceId(spaceId);
  }

  /**
   * Performs vector similarity search across all authorized chunks.
   */
  async search(
    queryVector: number[],
    filter: { workspaceId?: string; spaceId?: string; sourceIds?: string[] },
    topK: number = 5
  ): Promise<Array<{ chunk: KnowledgeChunkRecord; score: number }>> {
    if (!queryVector || queryVector.length === 0) {
      return [];
    }

    let chunks: KnowledgeChunkRecord[] = [];
    if (filter.spaceId) {
      chunks = await jarvisData.knowledge.getChunksForSpace(filter.spaceId, filter.workspaceId);
    } else {
      // Get all chunks for workspace
      chunks = await jarvisData.knowledge.getChunksForSpace('', filter.workspaceId);
    }

    if (filter.sourceIds && filter.sourceIds.length > 0) {
      const sourceSet = new Set(filter.sourceIds);
      chunks = chunks.filter((c) => sourceSet.has(c.sourceId));
    }

    const scored: Array<{ chunk: KnowledgeChunkRecord; score: number }> = [];

    for (const chunk of chunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) continue;
      const score = LocalVectorIndex.cosineSimilarity(queryVector, chunk.embedding);
      scored.push({ chunk, score });
    }

    // Sort descending by score, and break ties with chunkIndex & sourceId for deterministic ordering
    scored.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.0001) {
        return b.score - a.score;
      }
      if (a.chunk.sourceId !== b.chunk.sourceId) {
        return a.chunk.sourceId.localeCompare(b.chunk.sourceId);
      }
      return a.chunk.chunkIndex - b.chunk.chunkIndex;
    });

    return scored.slice(0, topK);
  }

  /**
   * Returns count of indexed chunks.
   */
  async count(filter?: { spaceId?: string; workspaceId?: string }): Promise<number> {
    const chunks = await jarvisData.knowledge.getChunksForSpace(filter?.spaceId || '', filter?.workspaceId);
    return chunks.length;
  }
}

export const localVectorIndex = new LocalVectorIndex();
