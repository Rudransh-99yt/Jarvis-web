// Milestone 14 & 15: Video Library, Media Knowledge, AI Discovery & Grounded Q&A Types

export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted';
export type VideoVisibility = 'class' | 'workspace' | 'public';

export interface CaptionTrack {
  id: string;
  label: string;
  language: string;
  src: string;
}

export interface TranscriptSegment {
  id: string;
  startSeconds: number;
  endSeconds: number;
  timestampLabel: string; // e.g. "00:00" or "02:15"
  text: string;
  speaker?: string;
}

export interface VideoRecord {
  id: string;
  videoId: string;
  workspaceId: string;
  classId: string;
  uploaderId: string; // Teacher or instructor user ID
  fileId: string; // Reference to underlying FileRecord in storage
  title: string;
  description: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  status: VideoStatus;
  visibility: VideoVisibility;
  transcript?: string;
  segments?: TranscriptSegment[];
  captionTracks?: CaptionTrack[];
  knowledgeSpaceId?: string;
  knowledgeSourceId?: string; // If ingested into RAG knowledge space
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateVideoInput {
  id?: string;
  workspaceId: string;
  classId: string;
  uploaderId: string;
  fileId: string;
  title: string;
  description?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  status?: VideoStatus;
  visibility?: VideoVisibility;
  transcript?: string;
  segments?: TranscriptSegment[];
  captionTracks?: CaptionTrack[];
  knowledgeSpaceId?: string;
  tags?: string[];
}

export interface UpdateVideoInput {
  title?: string;
  description?: string;
  status?: VideoStatus;
  visibility?: VideoVisibility;
  transcript?: string;
  segments?: TranscriptSegment[];
  durationSeconds?: number;
  thumbnailUrl?: string;
  knowledgeSpaceId?: string;
  knowledgeSourceId?: string;
  tags?: string[];
}

export interface VideoListFilter {
  classId?: string;
  workspaceId?: string;
  uploaderId?: string;
  status?: VideoStatus;
  knowledgeSpaceId?: string;
  search?: string;
}

export interface VideoPlaybackMetadata {
  video: VideoRecord;
  streamUrl: string;
  hasTranscript: boolean;
  transcriptExcerpt?: string;
  associatedMaterials?: Array<{
    id: string;
    title: string;
    type: string;
  }>;
}

export interface VideoSearchResult {
  videoId: string;
  videoTitle: string;
  classId: string;
  className?: string;
  chunkId: string;
  text: string;
  startSeconds?: number;
  endSeconds?: number;
  timestampLabel?: string;
  score: number;
  knowledgeSpaceId?: string;
}

export interface VideoCitation {
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

export interface VideoQAResult {
  query: string;
  videoId?: string;
  videoTitle?: string;
  classId?: string;
  answer: string;
  citations: VideoCitation[];
  confidence: number;
  isGrounded: boolean;
  sourcesUsed: string[];
  timestamp: string;
  modelUsed: string;
}
