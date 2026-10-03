// Deterministic Document Chunker for RAG Layer
import crypto from 'node:crypto';
import type { KnowledgeChunkRecord } from '../data/types.ts';
import type { ChunkOptions } from './types.ts';

export interface ChunkInput {
  sourceId: string;
  knowledgeSpaceId: string;
  workspaceId: string;
  sourceTitle: string;
  text: string;
  page?: number;
  section?: string;
}

export class DocumentChunker {
  /**
   * Deterministically splits normalized text into structured overlapping chunks.
   */
  static chunk(
    input: ChunkInput,
    options: ChunkOptions = {}
  ): KnowledgeChunkRecord[] {
    const chunkSize = options.chunkSize || 600;
    const chunkOverlap = options.chunkOverlap !== undefined ? options.chunkOverlap : 100;
    const cleanText = input.text.trim();

    if (!cleanText) {
      return [];
    }

    // If text is smaller than or equal to chunkSize, return single chunk
    if (cleanText.length <= chunkSize) {
      const chunkHash = crypto.createHash('sha256').update(cleanText).digest('hex');
      const tokenCount = Math.max(1, Math.round(cleanText.split(/\s+/).length * 1.3));

      return [
        {
          id: `chunk-${input.sourceId}-0`,
          sourceId: input.sourceId,
          knowledgeSpaceId: input.knowledgeSpaceId,
          workspaceId: input.workspaceId,
          sourceTitle: input.sourceTitle,
          chunkIndex: 0,
          text: cleanText,
          tokenCount,
          page: input.page || 1,
          section: input.section || 'General',
          contentHash: chunkHash,
          createdAt: new Date().toISOString()
        }
      ];
    }

    // Split text by paragraphs first, then sentences/words
    const paragraphs = cleanText.split(/\n\s*\n/);
    const textSegments: string[] = [];

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if (trimmedPara.length <= chunkSize) {
        textSegments.push(trimmedPara);
      } else {
        // Split large paragraph by sentence boundaries (. ! ?)
        const sentences = trimmedPara.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [trimmedPara];
        let currentSentenceBuffer = '';

        for (const sent of sentences) {
          if ((currentSentenceBuffer + sent).length <= chunkSize) {
            currentSentenceBuffer += sent;
          } else {
            if (currentSentenceBuffer.trim()) {
              textSegments.push(currentSentenceBuffer.trim());
            }
            // If single sentence is itself longer than chunkSize, split by words
            if (sent.length > chunkSize) {
              const words = sent.split(/\s+/);
              let wordBuffer = '';
              for (const w of words) {
                if ((wordBuffer + ' ' + w).length <= chunkSize) {
                  wordBuffer = wordBuffer ? wordBuffer + ' ' + w : w;
                } else {
                  if (wordBuffer) textSegments.push(wordBuffer);
                  wordBuffer = w;
                }
              }
              if (wordBuffer) currentSentenceBuffer = wordBuffer;
              else currentSentenceBuffer = '';
            } else {
              currentSentenceBuffer = sent;
            }
          }
        }

        if (currentSentenceBuffer.trim()) {
          textSegments.push(currentSentenceBuffer.trim());
        }
      }
    }

    // Combine text segments into chunks with overlap
    const chunks: KnowledgeChunkRecord[] = [];
    let currentChunkText = '';
    let chunkIndex = 0;
    let currentSection = input.section || 'General';

    for (let i = 0; i < textSegments.length; i++) {
      const segment = textSegments[i];

      // Check if segment is a markdown heading
      const headerMatch = segment.match(/^#{1,4}\s+(.+)$/m);
      if (headerMatch && headerMatch[1]) {
        currentSection = headerMatch[1].trim();
      }

      if (!currentChunkText) {
        currentChunkText = segment;
      } else if ((currentChunkText + '\n\n' + segment).length <= chunkSize) {
        currentChunkText += '\n\n' + segment;
      } else {
        // Finalize current chunk
        const chunkHash = crypto.createHash('sha256').update(currentChunkText).digest('hex');
        const tokenCount = Math.max(1, Math.round(currentChunkText.split(/\s+/).length * 1.3));

        chunks.push({
          id: `chunk-${input.sourceId}-${chunkIndex}`,
          sourceId: input.sourceId,
          knowledgeSpaceId: input.knowledgeSpaceId,
          workspaceId: input.workspaceId,
          sourceTitle: input.sourceTitle,
          chunkIndex,
          text: currentChunkText,
          tokenCount,
          page: input.page || Math.floor(chunkIndex / 3) + 1,
          section: currentSection,
          contentHash: chunkHash,
          createdAt: new Date().toISOString()
        });

        chunkIndex++;

        // Compute overlap for the next chunk
        if (chunkOverlap > 0) {
          const words = currentChunkText.split(/\s+/);
          const overlapWords = words.slice(-Math.min(words.length, Math.round(chunkOverlap / 6))).join(' ');
          currentChunkText = overlapWords + '\n\n' + segment;
        } else {
          currentChunkText = segment;
        }
      }
    }

    if (currentChunkText.trim()) {
      const chunkHash = crypto.createHash('sha256').update(currentChunkText).digest('hex');
      const tokenCount = Math.max(1, Math.round(currentChunkText.split(/\s+/).length * 1.3));

      chunks.push({
        id: `chunk-${input.sourceId}-${chunkIndex}`,
        sourceId: input.sourceId,
        knowledgeSpaceId: input.knowledgeSpaceId,
        workspaceId: input.workspaceId,
        sourceTitle: input.sourceTitle,
        chunkIndex,
        text: currentChunkText,
        tokenCount,
        page: input.page || Math.floor(chunkIndex / 3) + 1,
        section: currentSection,
        contentHash: chunkHash,
        createdAt: new Date().toISOString()
      });
    }

    return chunks;
  }
}
