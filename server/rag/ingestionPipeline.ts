// Ingestion Pipeline for Jarvis Knowledge Engine
import type { KnowledgeSourceRecord } from '../data/types.ts';
import type { DocumentExtractionResult, EmbeddingProvider, VectorIndex } from './types.ts';
import { DocumentExtractor } from './extractor.ts';
import { DocumentChunker } from './chunker.ts';
import { defaultEmbeddingProvider } from './embeddingProvider.ts';
import { localVectorIndex } from './vectorIndex.ts';
import { jarvisData } from '../data/index.ts';

export interface IngestionResult {
  sourceId: string;
  knowledgeSpaceId: string;
  workspaceId: string;
  status: 'ready' | 'failed';
  contentHash: string;
  chunkCount: number;
  tokenCount: number;
  isDuplicate: boolean;
  errorMessage?: string;
}

export class IngestionPipeline {
  private embeddingProvider: EmbeddingProvider;
  private vectorIndex: VectorIndex;

  constructor(embeddingProvider?: EmbeddingProvider, vectorIndex?: VectorIndex) {
    this.embeddingProvider = embeddingProvider || defaultEmbeddingProvider;
    this.vectorIndex = vectorIndex || localVectorIndex;
  }

  /**
   * Processes a knowledge source record through all 7 stages of the ingestion pipeline.
   */
  async ingestSource(
    sourceInput: {
      id?: string;
      workspaceId: string;
      knowledgeSpaceId: string;
      name: string;
      rawContent: string | Buffer;
      type?: KnowledgeSourceRecord['type'];
      mimeType?: string;
      author?: string;
    },
    options: { forceReindex?: boolean; chunkSize?: number; chunkOverlap?: number } = {}
  ): Promise<IngestionResult> {
    const sourceId = sourceInput.id || `src-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const workspaceId = sourceInput.workspaceId;
    const knowledgeSpaceId = sourceInput.knowledgeSpaceId;
    const author = sourceInput.author || 'User';

    try {
      // Stage 1: Extraction & Normalization
      const extraction: DocumentExtractionResult = DocumentExtractor.extract(sourceInput.rawContent, {
        title: sourceInput.name,
        mimeType: sourceInput.mimeType,
        type: sourceInput.type
      });

      const contentHash = extraction.contentHash;
      const normalizedText = extraction.normalizedText;
      const tokenCount = extraction.tokenCount;

      // Stage 2: Deduplication Check
      const existingSource = sourceInput.id
        ? await jarvisData.knowledge.getSourceById(sourceInput.id)
        : await jarvisData.knowledge.getSourceByHash(contentHash, knowledgeSpaceId);
      
      const finalSourceId = existingSource?.id || sourceId;
      const existingChunks = await jarvisData.knowledge.getChunksForSource(finalSourceId);

      if (
        !options.forceReindex &&
        existingSource &&
        existingSource.contentHash === contentHash &&
        existingChunks.length > 0 &&
        existingSource.status === 'ready'
      ) {
        // Content hash matches identical document already ingested in space
        return {
          sourceId: finalSourceId,
          knowledgeSpaceId,
          workspaceId,
          status: 'ready',
          contentHash,
          chunkCount: existingChunks.length,
          tokenCount,
          isDuplicate: true
        };
      }

      // Stage 3: Summary Generation (first 200 chars or first paragraph)
      const firstPara = normalizedText.split('\n\n')[0] || normalizedText.slice(0, 200);
      const summary = firstPara.length > 250 ? firstPara.slice(0, 247) + '...' : firstPara;

      // Stage 4: Create/Update Knowledge Source in Persistent Store
      const sourceRecord: KnowledgeSourceRecord = {
        id: finalSourceId,
        workspaceId,
        knowledgeSpaceId,
        name: sourceInput.name,
        type: extraction.metadata.type,
        mimeType: extraction.metadata.mimeType,
        size: `${(normalizedText.length / 1024).toFixed(1)} KB`,
        sizeBytes: normalizedText.length,
        status: 'processing',
        ingestionStatus: 'processing',
        embeddingStatus: 'pending',
        contentHash,
        author,
        summary,
        fullText: normalizedText,
        tokenCount,
        createdAt: existingSource?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!existingSource) {
        await jarvisData.knowledge.createSource(sourceRecord);
      } else {
        await jarvisData.knowledge.updateSource(finalSourceId, {
          status: 'processing',
          ingestionStatus: 'processing',
          embeddingStatus: 'pending',
          contentHash,
          fullText: normalizedText,
          summary,
          tokenCount
        });
      }

      // Stage 5: Deterministic Chunking
      const chunks = DocumentChunker.chunk(
        {
          sourceId: finalSourceId,
          knowledgeSpaceId,
          workspaceId,
          sourceTitle: sourceInput.name,
          text: normalizedText,
          section: extraction.metadata.sections?.[0] || 'General'
        },
        {
          chunkSize: options.chunkSize || 600,
          chunkOverlap: options.chunkOverlap !== undefined ? options.chunkOverlap : 100
        }
      );

      // Stage 6: Embedding Generation
      const chunkTexts = chunks.map((c) => `${c.sourceTitle}\n${c.text}`);
      const embeddings = await this.embeddingProvider.embedTexts(chunkTexts);

      for (let i = 0; i < chunks.length; i++) {
        chunks[i].embedding = embeddings[i];
      }

      // Stage 7: Local Vector Index Upsert
      // Clear prior chunks for this source if re-indexing
      await this.vectorIndex.deleteBySourceId(finalSourceId);
      await this.vectorIndex.upsert(chunks);

      // Finalize Source Status
      await jarvisData.knowledge.updateSource(finalSourceId, {
        status: 'ready',
        ingestionStatus: 'ready',
        embeddingStatus: 'ready',
        chunkCount: chunks.length,
        errorMessage: undefined
      });

      return {
        sourceId: finalSourceId,
        knowledgeSpaceId,
        workspaceId,
        status: 'ready',
        contentHash,
        chunkCount: chunks.length,
        tokenCount,
        isDuplicate: false
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown ingestion pipeline error';
      await jarvisData.knowledge.updateSourceStatus(sourceId, 'failed', errorMsg);

      return {
        sourceId,
        knowledgeSpaceId,
        workspaceId,
        status: 'failed',
        contentHash: '',
        chunkCount: 0,
        tokenCount: 0,
        isDuplicate: false,
        errorMessage: errorMsg
      };
    }
  }
}

export const ingestionPipeline = new IngestionPipeline();
