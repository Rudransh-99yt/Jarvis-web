// RAG & Knowledge Space Tools for Jarvis Tool Execution Layer
import { Type } from '@google/genai';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from './types.ts';
import { ingestionPipeline } from '../rag/ingestionPipeline.ts';
import { retrievalService } from '../rag/retrievalService.ts';
import { groundingService } from '../rag/groundingService.ts';
import { jarvisData } from '../data/index.ts';
import type { KnowledgeSourceType } from '../data/types.ts';

// 1. Tool: knowledge.source.add
interface AddSourceArgs {
  spaceId: string;
  name: string;
  type?: KnowledgeSourceType;
  content: string;
  workspaceId?: string;
  author?: string;
}

export const addSourceTool: ToolDefinition<AddSourceArgs> = {
  name: 'knowledge.source.add',
  sector: 'knowledge',
  aliases: ['add_knowledge_source', 'knowledge_add_source'],
  description: 'Adds a new document or text knowledge source to a Knowledge Space and triggers the RAG ingestion pipeline.',
  declaration: {
    name: 'knowledge_source_add',
    description: 'Add a document (plain text, Markdown, PDF text extract) to a Knowledge Space and index it for grounded RAG search.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        spaceId: {
          type: Type.STRING,
          description: "Target Knowledge Space ID (e.g. 'ks-quantum' or 'ks-calculus')."
        },
        name: {
          type: Type.STRING,
          description: 'Document filename or title (e.g. "Lecture 05: Quantum Decoherence.md").'
        },
        type: {
          type: Type.STRING,
          description: "Source type: 'pdf', 'notes', 'lecture', 'dataset', 'web', 'code', 'transcript', or 'markdown'."
        },
        content: {
          type: Type.STRING,
          description: 'Full text or extracted document contents to ingest and index.'
        },
        workspaceId: {
          type: Type.STRING,
          description: "Optional workspace boundary (defaults to 'ws-stark-core')."
        },
        author: {
          type: Type.STRING,
          description: 'Optional document author or instructor name.'
        }
      },
      required: ['spaceId', 'name', 'content']
    }
  },
  validate(args: unknown): ValidationResult<AddSourceArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: false, error: 'Arguments must be an object with spaceId, name, and content.' };
    }
    const raw = args as Record<string, unknown>;
    if (typeof raw.spaceId !== 'string' || !raw.spaceId.trim()) {
      return { valid: false, error: "Parameter 'spaceId' is required." };
    }
    if (typeof raw.name !== 'string' || !raw.name.trim()) {
      return { valid: false, error: "Parameter 'name' is required." };
    }
    if (typeof raw.content !== 'string' || !raw.content.trim()) {
      return { valid: false, error: "Parameter 'content' is required and must not be empty." };
    }

    return {
      valid: true,
      data: {
        spaceId: (raw.spaceId as string).trim(),
        name: (raw.name as string).trim(),
        content: (raw.content as string).trim(),
        type: (raw.type as KnowledgeSourceType) || 'notes',
        workspaceId: typeof raw.workspaceId === 'string' ? raw.workspaceId.trim() : 'ws-stark-core',
        author: typeof raw.author === 'string' ? raw.author.trim() : 'User'
      }
    };
  },
  async execute(args: AddSourceArgs, _context: ToolExecutionContext): Promise<ToolResult> {
    const space = await jarvisData.knowledge.getSpaceById(args.spaceId, args.workspaceId);
    if (!space) {
      return {
        ok: false,
        error: { code: 'SPACE_NOT_FOUND', message: `Knowledge space '${args.spaceId}' not found or unauthorized.` }
      };
    }

    const ingestionResult = await ingestionPipeline.ingestSource({
      workspaceId: args.workspaceId || 'ws-stark-core',
      knowledgeSpaceId: args.spaceId,
      name: args.name,
      rawContent: args.content,
      type: args.type,
      author: args.author
    });

    return {
      ok: ingestionResult.status === 'ready',
      data: {
        sourceId: ingestionResult.sourceId,
        spaceId: args.spaceId,
        spaceTitle: space.name,
        name: args.name,
        status: ingestionResult.status,
        chunkCount: ingestionResult.chunkCount,
        tokenCount: ingestionResult.tokenCount,
        contentHash: ingestionResult.contentHash,
        isDuplicate: ingestionResult.isDuplicate,
        message: ingestionResult.isDuplicate
          ? `Source '${args.name}' was already ingested with identical content hash.`
          : `Source '${args.name}' successfully ingested into ${space.name} (${ingestionResult.chunkCount} vector chunks indexed).`
      }
    };
  }
};

// 2. Tool: knowledge.source.list
interface ListSourcesArgs {
  spaceId: string;
  workspaceId?: string;
}

export const listSourcesTool: ToolDefinition<ListSourcesArgs> = {
  name: 'knowledge.source.list',
  sector: 'knowledge',
  aliases: ['list_knowledge_sources', 'get_knowledge_sources'],
  description: 'Lists all indexed knowledge sources, status, token counts, and content hashes in a Knowledge Space.',
  declaration: {
    name: 'knowledge_source_list',
    description: 'List all document sources inside a Knowledge Space with status and chunk counts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        spaceId: {
          type: Type.STRING,
          description: "Target Knowledge Space ID (e.g. 'ks-quantum' or 'ks-calculus')."
        },
        workspaceId: {
          type: Type.STRING,
          description: "Optional workspace boundary filter."
        }
      },
      required: ['spaceId']
    }
  },
  validate(args: unknown): ValidationResult<ListSourcesArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: false, error: 'Arguments must be an object with spaceId.' };
    }
    const raw = args as Record<string, unknown>;
    if (typeof raw.spaceId !== 'string' || !raw.spaceId.trim()) {
      return { valid: false, error: "Parameter 'spaceId' is required." };
    }
    return {
      valid: true,
      data: {
        spaceId: (raw.spaceId as string).trim(),
        workspaceId: typeof raw.workspaceId === 'string' ? raw.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: ListSourcesArgs, _context: ToolExecutionContext): Promise<ToolResult> {
    const sources = await jarvisData.knowledge.listSourcesForSpace(args.spaceId, args.workspaceId);
    return {
      ok: true,
      data: {
        spaceId: args.spaceId,
        totalSources: sources.length,
        sources: sources.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          status: s.status,
          chunkCount: s.chunkCount || 0,
          tokenCount: s.tokenCount,
          contentHash: s.contentHash,
          author: s.author,
          summary: s.summary,
          createdAt: s.createdAt
        }))
      }
    };
  }
};

// 3. Tool: knowledge.source.ingest
interface IngestSourceArgs {
  sourceId: string;
  forceReindex?: boolean;
}

export const ingestSourceTool: ToolDefinition<IngestSourceArgs> = {
  name: 'knowledge.source.ingest',
  sector: 'knowledge',
  aliases: ['reindex_source', 'ingest_knowledge_source'],
  description: 'Triggers or re-runs the RAG ingestion pipeline for an existing source record.',
  declaration: {
    name: 'knowledge_source_ingest',
    description: 'Re-extract, re-chunk, and re-embed an existing knowledge source into the vector index.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sourceId: {
          type: Type.STRING,
          description: 'Knowledge Source ID to re-index.'
        },
        forceReindex: {
          type: Type.BOOLEAN,
          description: 'Force re-chunking and re-embedding even if content hash is unchanged.'
        }
      },
      required: ['sourceId']
    }
  },
  validate(args: unknown): ValidationResult<IngestSourceArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: false, error: 'Arguments must be an object with sourceId.' };
    }
    const raw = args as Record<string, unknown>;
    if (typeof raw.sourceId !== 'string' || !raw.sourceId.trim()) {
      return { valid: false, error: "Parameter 'sourceId' is required." };
    }
    return {
      valid: true,
      data: {
        sourceId: (raw.sourceId as string).trim(),
        forceReindex: raw.forceReindex === true
      }
    };
  },
  async execute(args: IngestSourceArgs, _context: ToolExecutionContext): Promise<ToolResult> {
    const source = await jarvisData.knowledge.getSourceById(args.sourceId);
    if (!source) {
      return {
        ok: false,
        error: { code: 'SOURCE_NOT_FOUND', message: `Knowledge source '${args.sourceId}' not found.` }
      };
    }

    const result = await ingestionPipeline.ingestSource(
      {
        id: source.id,
        workspaceId: source.workspaceId,
        knowledgeSpaceId: source.knowledgeSpaceId,
        name: source.name,
        rawContent: source.fullText,
        type: source.type,
        author: source.author
      },
      { forceReindex: args.forceReindex }
    );

    return {
      ok: result.status === 'ready',
      data: {
        sourceId: source.id,
        status: result.status,
        chunkCount: result.chunkCount,
        contentHash: result.contentHash,
        message: `Source '${source.name}' re-indexed successfully.`
      }
    };
  }
};

// 4. Tool: knowledge.source.delete
interface DeleteSourceArgs {
  sourceId: string;
}

export const deleteSourceTool: ToolDefinition<DeleteSourceArgs> = {
  name: 'knowledge.source.delete',
  sector: 'knowledge',
  aliases: ['remove_source', 'delete_knowledge_source'],
  description: 'Deletes a knowledge source and purges its vector chunks from the index.',
  declaration: {
    name: 'knowledge_source_delete',
    description: 'Delete a knowledge source document and remove all associated vector chunks from storage.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sourceId: {
          type: Type.STRING,
          description: 'Knowledge Source ID to remove.'
        }
      },
      required: ['sourceId']
    }
  },
  validate(args: unknown): ValidationResult<DeleteSourceArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: false, error: 'Arguments must be an object with sourceId.' };
    }
    const raw = args as Record<string, unknown>;
    if (typeof raw.sourceId !== 'string' || !raw.sourceId.trim()) {
      return { valid: false, error: "Parameter 'sourceId' is required." };
    }
    return {
      valid: true,
      data: { sourceId: (raw.sourceId as string).trim() }
    };
  },
  async execute(args: DeleteSourceArgs, _context: ToolExecutionContext): Promise<ToolResult> {
    const deleted = await jarvisData.knowledge.deleteSource(args.sourceId);
    return {
      ok: deleted,
      data: {
        sourceId: args.sourceId,
        deleted,
        message: deleted
          ? `Source '${args.sourceId}' and its vector chunks were purged from the index.`
          : `Source '${args.sourceId}' was not found.`
      }
    };
  }
};

// 5. Tool: knowledge.retrieve
interface RetrieveArgs {
  spaceId: string;
  query: string;
  topK?: number;
  workspaceId?: string;
}

export const retrieveKnowledgeTool: ToolDefinition<RetrieveArgs> = {
  name: 'knowledge.retrieve',
  sector: 'knowledge',
  aliases: ['hybrid_search', 'retrieve_chunks'],
  description: 'Performs hybrid semantic and lexical retrieval across indexed document chunks returning ranked matches.',
  declaration: {
    name: 'knowledge_retrieve',
    description: 'Retrieve relevant document chunks using hybrid vector similarity and keyword search.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        spaceId: {
          type: Type.STRING,
          description: "Target Knowledge Space ID (e.g. 'ks-quantum')."
        },
        query: {
          type: Type.STRING,
          description: 'Natural language search query.'
        },
        topK: {
          type: Type.NUMBER,
          description: 'Number of top chunks to return (default 5).'
        },
        workspaceId: {
          type: Type.STRING,
          description: 'Optional workspace boundary.'
        }
      },
      required: ['spaceId', 'query']
    }
  },
  validate(args: unknown): ValidationResult<RetrieveArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: false, error: 'Arguments must be an object with spaceId and query.' };
    }
    const raw = args as Record<string, unknown>;
    if (typeof raw.spaceId !== 'string' || !raw.spaceId.trim()) {
      return { valid: false, error: "Parameter 'spaceId' is required." };
    }
    if (typeof raw.query !== 'string' || !raw.query.trim()) {
      return { valid: false, error: "Parameter 'query' is required." };
    }
    return {
      valid: true,
      data: {
        spaceId: (raw.spaceId as string).trim(),
        query: (raw.query as string).trim(),
        topK: typeof raw.topK === 'number' ? raw.topK : 5,
        workspaceId: typeof raw.workspaceId === 'string' ? raw.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: RetrieveArgs, _context: ToolExecutionContext): Promise<ToolResult> {
    const chunks = await retrievalService.retrieve(args.spaceId, args.query, {
      topK: args.topK,
      workspaceId: args.workspaceId
    });

    return {
      ok: true,
      data: {
        spaceId: args.spaceId,
        query: args.query,
        count: chunks.length,
        chunks: chunks.map((c) => ({
          chunkId: c.chunkId,
          sourceId: c.sourceId,
          sourceTitle: c.sourceTitle,
          score: c.score,
          vectorScore: c.vectorScore,
          lexicalScore: c.lexicalScore,
          text: c.text,
          section: c.section,
          page: c.page
        }))
      }
    };
  }
};

// 6. Tool: knowledge.query (Upgraded to GroundingService)
interface QueryKnowledgeArgs {
  spaceId: string;
  query: string;
  workspaceId?: string;
  userId?: string;
  userRole?: string;
}

export const queryKnowledgeTool: ToolDefinition<QueryKnowledgeArgs> = {
  name: 'knowledge.query',
  sector: 'knowledge',
  aliases: ['query_knowledge', 'grounded_query', 'knowledge_search'],
  description: 'Performs a grounded answer synthesis against indexed source documents inside a Knowledge Space with verifiable citations.',
  declaration: {
    name: 'knowledge_query',
    description: 'Query indexed knowledge space documents with source citations and references.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        spaceId: {
          type: Type.STRING,
          description: "Target Knowledge Space ID (e.g. 'ks-quantum' or 'ks-calculus')."
        },
        query: {
          type: Type.STRING,
          description: 'The natural language question or study inquiry to answer from the sources.'
        },
        workspaceId: {
          type: Type.STRING,
          description: 'Optional workspace boundary.'
        },
        userId: {
          type: Type.STRING,
          description: 'Optional user ID for authorization checks.'
        },
        userRole: {
          type: Type.STRING,
          description: 'Optional user role (student or teacher).'
        }
      },
      required: ['spaceId', 'query']
    }
  },
  validate(args: unknown): ValidationResult<QueryKnowledgeArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: false, error: 'Arguments must be an object with spaceId and query.' };
    }
    const raw = args as Record<string, unknown>;
    if (typeof raw.spaceId !== 'string' || !raw.spaceId.trim()) {
      return { valid: false, error: "Parameter 'spaceId' must be a non-empty string." };
    }
    if (typeof raw.query !== 'string' || !raw.query.trim()) {
      return { valid: false, error: "Parameter 'query' must be a non-empty string." };
    }
    return {
      valid: true,
      data: {
        spaceId: (raw.spaceId as string).trim(),
        query: (raw.query as string).trim(),
        workspaceId: typeof raw.workspaceId === 'string' ? raw.workspaceId.trim() : undefined,
        userId: typeof raw.userId === 'string' ? raw.userId.trim() : undefined,
        userRole: typeof raw.userRole === 'string' ? raw.userRole.trim() : undefined
      }
    };
  },
  async execute(args: QueryKnowledgeArgs, _context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const groundedResult = await groundingService.answerQuery(args.spaceId, args.query, {
        workspaceId: args.workspaceId,
        userId: args.userId,
        userRole: args.userRole
      });

      return {
        ok: true,
        data: {
          spaceId: groundedResult.spaceId,
          spaceTitle: groundedResult.spaceTitle,
          query: groundedResult.query,
          answer: groundedResult.answer,
          citations: groundedResult.citations,
          confidence: groundedResult.confidence,
          isGrounded: groundedResult.isGrounded,
          retrievedChunksCount: groundedResult.retrievedChunksCount,
          sourcesUsed: groundedResult.sourcesUsed,
          timestamp: groundedResult.timestamp
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: {
          code: 'GROUNDING_ERROR',
          message: err.message || 'Grounded query execution failed.'
        }
      };
    }
  }
};
