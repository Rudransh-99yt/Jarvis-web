// RAG Subsystem Interfaces and Types for Jarvis Web
import type { KnowledgeChunkRecord, KnowledgeSourceRecord } from '../data/types.ts';

export interface DocumentExtractionResult {
  text: string;
  normalizedText: string;
  contentHash: string;
  tokenCount: number;
  metadata: {
    title?: string;
    mimeType: string;
    type: KnowledgeSourceRecord['type'];
    pageCount?: number;
    sections?: string[];
  };
}

export interface ChunkOptions {
  chunkSize?: number; // Characters per chunk (default 600)
  chunkOverlap?: number; // Characters overlap (default 100)
  preserveSections?: boolean;
}

export interface EmbeddingProvider {
  readonly id: string;
  readonly name: string;
  readonly dimensions: number;
  embedText(text: string): Promise<number[]>;
  embedTexts(texts: string[]): Promise<number[][]>;
  isConfigured(): boolean;
}

export interface VectorIndex {
  upsert(chunks: KnowledgeChunkRecord[]): Promise<void>;
  deleteBySourceId(sourceId: string): Promise<number>;
  deleteBySpaceId(spaceId: string): Promise<number>;
  search(
    queryVector: number[],
    filter: { workspaceId?: string; spaceId?: string; sourceIds?: string[] },
    topK: number
  ): Promise<Array<{ chunk: KnowledgeChunkRecord; score: number }>>;
  count(filter?: { spaceId?: string; workspaceId?: string }): Promise<number>;
}

export interface ScoredChunk {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  spaceId: string;
  workspaceId: string;
  score: number;
  vectorScore: number;
  lexicalScore: number;
  text: string;
  chunkIndex: number;
  page?: number;
  section?: string;
  tokenCount: number;
}

export interface Citation {
  sourceId: string;
  sourceTitle: string;
  chunkId?: string;
  spaceId?: string;
  page?: number;
  section?: string;
  excerpt: string;
  location?: string;
  score?: number;
  videoId?: string;
  startSeconds?: number;
  endSeconds?: number;
  timestampLabel?: string;
}

export interface GroundedQueryOptions {
  topK?: number;
  minConfidenceScore?: number;
  workspaceId?: string;
  userId?: string;
  userRole?: string;
  allowedSpaceIds?: string[];
  allowedSourceIds?: string[];
  systemInstruction?: string;
}

export interface GroundedAnswerResult {
  query: string;
  spaceId: string;
  spaceTitle: string;
  answer: string;
  citations: Citation[];
  confidence: number;
  isGrounded: boolean;
  retrievedChunksCount: number;
  sourcesUsed: string[];
  timestamp: string;
  modelUsed: string;
}
