// Document Extraction, Normalization & Content Hashing Engine
import crypto from 'node:crypto';
import type { KnowledgeSourceType } from '../data/types.ts';
import type { DocumentExtractionResult } from './types.ts';

export class DocumentExtractor {
  /**
   * Generates a deterministic SHA-256 hash for raw or normalized text content.
   */
  static hashContent(content: string): string {
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  /**
   * Normalizes document text:
   * - Strips non-printable ASCII control characters (preserving \n and \t)
   * - Normalizes irregular unicode whitespace
   * - Reduces excessive blank lines (3+ consecutive \n to 2)
   * - Trims trailing whitespace on each line
   */
  static normalizeText(text: string): string {
    if (!text) return '';

    return text
      // Replace Windows / old Mac line endings with standard LF
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Strip control chars except newline, tab, carriage return
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Replace multiple horizontal spaces/tabs with single space within line
      .replace(/[^\S\n]+/g, ' ')
      // Trim line endings
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      // Collapse 3+ consecutive newlines to 2
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Approximates token count based on average word length and subword distribution.
   */
  static estimateTokenCount(text: string): number {
    if (!text) return 0;
    const words = text.split(/\s+/).filter(Boolean);
    return Math.max(1, Math.round(words.length * 1.3));
  }

  /**
   * Extracts text, sections, and metadata from plain text documents.
   */
  static extractPlainText(content: string, title: string = 'Text Document'): DocumentExtractionResult {
    const normalized = this.normalizeText(content);
    return {
      text: content,
      normalizedText: normalized,
      contentHash: this.hashContent(normalized),
      tokenCount: this.estimateTokenCount(normalized),
      metadata: {
        title,
        mimeType: 'text/plain',
        type: 'notes',
        sections: ['General Content']
      }
    };
  }

  /**
   * Extracts text, header hierarchy, and sections from Markdown documents.
   */
  static extractMarkdown(content: string, title: string = 'Markdown Document'): DocumentExtractionResult {
    const normalized = this.normalizeText(content);
    const sections: string[] = [];
    const lines = normalized.split('\n');

    for (const line of lines) {
      const headerMatch = line.match(/^#{1,4}\s+(.+)$/);
      if (headerMatch && headerMatch[1]) {
        sections.push(headerMatch[1].trim());
      }
    }

    if (sections.length === 0) {
      sections.push('Main Content');
    }

    return {
      text: content,
      normalizedText: normalized,
      contentHash: this.hashContent(normalized),
      tokenCount: this.estimateTokenCount(normalized),
      metadata: {
        title,
        mimeType: 'text/markdown',
        type: 'notes',
        sections
      }
    };
  }

  /**
   * Lightweight pure-TS PDF stream extractor.
   * Parses standard PDF text drawing blocks (BT ... ET, Tj, TJ, and text stream decodes)
   * or cleans text-based PDF representation without external native dependencies.
   */
  static extractPdfText(contentOrBuffer: string | Buffer, title: string = 'PDF Document'): DocumentExtractionResult {
    let rawText = '';
    let pageCount = 1;

    if (Buffer.isBuffer(contentOrBuffer)) {
      const str = contentOrBuffer.toString('latin1');
      // Count page objects
      const pageMatches = str.match(/\/Type\s*\/Page\b/g);
      if (pageMatches) {
        pageCount = Math.max(1, pageMatches.length);
      }

      // Extract text within BT (Begin Text) ... ET (End Text) blocks
      const textBlocks: string[] = [];
      const btRegex = /BT[\s\S]*?ET/g;
      let match: RegExpExecArray | null;

      while ((match = btRegex.exec(str)) !== null) {
        const block = match[0];
        // Match string literals (text in parenthesis)
        const literalRegex = /\((.*?)\)\s*(?:Tj|'|")/g;
        let litMatch: RegExpExecArray | null;
        while ((litMatch = literalRegex.exec(block)) !== null) {
          textBlocks.push(litMatch[1]);
        }

        // Match array strings (TJ operator)
        const arrayRegex = /\[(.*?)\]\s*TJ/g;
        let arrMatch: RegExpExecArray | null;
        while ((arrMatch = arrayRegex.exec(block)) !== null) {
          const inner = arrMatch[1];
          const parts = inner.match(/\((.*?)\)/g);
          if (parts) {
            textBlocks.push(parts.map((p) => p.slice(1, -1)).join(' '));
          }
        }
      }

      if (textBlocks.length > 0) {
        rawText = textBlocks.join(' ');
      } else {
        // Fallback: extract plain ascii readable stream
        rawText = str.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      }
    } else {
      // String input representing document contents or pre-extracted PDF text
      rawText = contentOrBuffer;
    }

    const normalized = this.normalizeText(rawText);
    return {
      text: typeof contentOrBuffer === 'string' ? contentOrBuffer : normalized,
      normalizedText: normalized,
      contentHash: this.hashContent(normalized),
      tokenCount: this.estimateTokenCount(normalized),
      metadata: {
        title,
        mimeType: 'application/pdf',
        type: 'pdf',
        pageCount,
        sections: [`Extracted Text (${pageCount} pages)`]
      }
    };
  }

  /**
   * Unified extraction router based on MIME type or file extension.
   */
  static extract(
    content: string | Buffer,
    options: { title?: string; mimeType?: string; filename?: string; type?: KnowledgeSourceType }
  ): DocumentExtractionResult {
    const title = options.title || options.filename || 'Untitled Knowledge Source';
    const mimeType = (options.mimeType || '').toLowerCase();
    const filename = (options.filename || '').toLowerCase();
    const type = options.type;

    if (mimeType.includes('pdf') || filename.endsWith('.pdf') || type === 'pdf') {
      return this.extractPdfText(content, title);
    }

    const textContent = Buffer.isBuffer(content) ? content.toString('utf8') : content;

    if (mimeType.includes('markdown') || filename.endsWith('.md') || type === 'markdown') {
      return this.extractMarkdown(textContent, title);
    }

    return this.extractPlainText(textContent, title);
  }
}
