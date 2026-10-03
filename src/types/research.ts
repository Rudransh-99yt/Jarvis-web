// Domain Types and Entities for Research & Labs Sector (Milestone 9)

export type ResearchProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface ResearchProject {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  description: string;
  status: ResearchProjectStatus;
  researchQuestion: string;
  knowledgeSpaceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type ResearchQuestionStatus = 'open' | 'investigating' | 'answered' | 'archived';
export type ResearchQuestionPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ResearchQuestion {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  question: string;
  status: ResearchQuestionStatus;
  priority: ResearchQuestionPriority;
  notes?: string;
  linkedEvidenceIds: string[];
  answer?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceCitation {
  sourceId: string;
  sourceTitle: string;
  chunkId?: string;
  spaceId?: string;
  page?: number;
  section?: string;
  excerpt: string;
  score?: number;
}

export interface EvidenceRecord {
  id: string;
  projectId: string;
  workspaceId: string;
  questionId?: string;
  knowledgeSourceId: string;
  knowledgeSpaceId: string;
  sourceTitle: string;
  chunkId: string;
  chunkText: string;
  citation: EvidenceCitation;
  relevance: number; // 0.0 to 1.0
  userNote?: string;
  tags?: string[];
  createdAt: string;
}

export interface ResearchNote {
  id: string;
  projectId: string;
  workspaceId: string;
  authorId?: string;
  title: string;
  content: string;
  linkedQuestionIds: string[];
  linkedEvidenceIds: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ResearchReport {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  researchQuestion: string;
  executiveSummary: string;
  findings: string[];
  evidenceReferences: string[]; // EvidenceRecord IDs
  sourceCitations: Array<{
    sourceId: string;
    sourceTitle: string;
    excerpt: string;
  }>;
  limitations: string[];
  generatedAt: string;
}

export type ResearchAssistantMode =
  | 'investigate'
  | 'summarize'
  | 'compare'
  | 'supporting_evidence'
  | 'conflicting_evidence'
  | 'outline'
  | 'report';

export interface ResearchInvestigationResult {
  query: string;
  mode: ResearchAssistantMode;
  answer: string;
  isGrounded: boolean;
  confidence: number;
  citations: EvidenceCitation[];
  extractedEvidence: Array<{
    knowledgeSourceId: string;
    knowledgeSpaceId: string;
    sourceTitle: string;
    chunkId: string;
    chunkText: string;
    citation: EvidenceCitation;
    relevance: number;
  }>;
  sourcesUsed: string[];
  timestamp: string;
  modelUsed: string;
}
