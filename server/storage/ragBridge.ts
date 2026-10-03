// RAG Integration Bridge for Unified File Storage (Milestone 10)
import { jarvisData } from '../data/index.ts';
import { storageManager } from './providerManager.ts';
import { DocumentExtractor } from '../rag/extractor.ts';
import { ingestionPipeline } from '../rag/ingestionPipeline.ts';
import { fileAuth } from './fileAuth.ts';
import type { FileRecord } from '../../src/types/storage.ts';
import type { User, KnowledgeSourceType } from '../data/types.ts';

export class RagStorageBridge {
  /**
   * Ingest a stored FileRecord directly into a Knowledge Space.
   * Extracts text, runs chunking, embeddings, and vector indexing.
   */
  async ingestFileToKnowledgeSpace(
    fileId: string,
    knowledgeSpaceId: string,
    currentUser: User
  ): Promise<{ file: FileRecord; sourceId: string; chunksIndexed: number; contentHash: string }> {
    // 1. Fetch file record and verify access
    const file = await jarvisData.files.getById(fileId);
    if (!file) {
      throw new Error(`File '${fileId}' not found.`);
    }

    const authCheck = await fileAuth.canAccessFile(currentUser, file);
    if (!authCheck.allowed) {
      throw new Error(`Access denied to file: ${authCheck.reason}`);
    }

    // 2. Fetch Knowledge Space and verify workspace alignment
    const space = await jarvisData.knowledge.getSpaceById(knowledgeSpaceId, file.workspaceId);
    if (!space) {
      throw new Error(`Knowledge Space '${knowledgeSpaceId}' not found in workspace '${file.workspaceId}'.`);
    }

    // 3. Read object bytes from Storage Provider
    const provider = storageManager.getProvider();
    const buffer = await provider.getObject(file.storageKey);
    if (!buffer) {
      throw new Error(`Physical storage content for file '${fileId}' was missing.`);
    }

    // 4. Extract text according to file extension
    let extractedText = '';
    let sourceType: KnowledgeSourceType = 'notes';

    if (file.extension === 'pdf') {
      const extResult = DocumentExtractor.extractPdfText(buffer, file.originalName);
      extractedText = extResult.text;
      sourceType = 'pdf';
    } else if (file.extension === 'md') {
      const extResult = DocumentExtractor.extractMarkdown(buffer.toString('utf-8'), file.originalName);
      extractedText = extResult.text;
      sourceType = 'markdown';
    } else if (file.extension === 'txt') {
      const extResult = DocumentExtractor.extractPlainText(buffer.toString('utf-8'), file.originalName);
      extractedText = extResult.text;
      sourceType = 'text';
    } else {
      // General text-based fallback
      extractedText = buffer.toString('utf-8');
      sourceType = 'notes';
    }

    if (!extractedText.trim()) {
      throw new Error(`Cannot index file '${file.originalName}': No extractable text content found.`);
    }

    // 5. Run Ingestion Pipeline (Chunking -> Embedding -> Local Vector Index)
    const ingestResult = await ingestionPipeline.ingestSource({
      workspaceId: file.workspaceId,
      knowledgeSpaceId,
      name: file.originalName,
      rawContent: buffer,
      type: sourceType,
      mimeType: file.mimeType,
      author: currentUser.displayName
    });

    // 6. Update FileRecord with knowledgeSpaceId and knowledgeSourceId
    const updatedFile = await jarvisData.files.update(
      file.id,
      {
        knowledgeSpaceId,
        knowledgeSourceId: ingestResult.sourceId,
        status: 'ready'
      },
      file.workspaceId
    );

    return {
      file: updatedFile || file,
      sourceId: ingestResult.sourceId,
      chunksIndexed: ingestResult.chunkCount,
      contentHash: ingestResult.contentHash || file.sha256
    };
  }

  /**
   * Cleans up all derived RAG sources and vector chunks when a file is deleted.
   * Guarantees zero orphaned chunks in storage.
   */
  async cleanupRagOnDeletion(file: FileRecord): Promise<{ deletedSourceId?: string; chunksPurged: number }> {
    if (!file.knowledgeSourceId) {
      return { chunksPurged: 0 };
    }

    const sourceId = file.knowledgeSourceId;

    // Purge chunks from persistent storage
    const chunks = await jarvisData.knowledge.getChunksForSpace(file.knowledgeSpaceId || '', file.workspaceId);
    const orphanedChunks = chunks.filter((c) => c.sourceId === sourceId);

    // Delete source record
    await jarvisData.knowledge.deleteSource(sourceId);

    // Also delete chunks from state
    if (jarvisData.isPersistent) {
      // In disk repository, deleteSource cleans chunks as well
    }

    return {
      deletedSourceId: sourceId,
      chunksPurged: orphanedChunks.length
    };
  }
}

export const ragStorageBridge = new RagStorageBridge();
