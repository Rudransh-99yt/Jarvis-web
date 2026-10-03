// Domain Models for Jarvis Notion-Style "My Workspace" System
// Block-based document editor, hierarchical pages, database collections, and academic linking

export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bullet_list'
  | 'numbered_list'
  | 'checklist'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'code_block'
  | 'math_block'
  | 'table'
  | 'page_link'
  | 'embedded_resource'
  | 'image_attachment';

export interface PageBlock {
  id: string;
  type: BlockType;
  content: string;
  properties?: {
    checked?: boolean; // for checklist
    level?: number;
    language?: string; // for code block (ts, python, latex, etc.)
    calloutType?: 'info' | 'warning' | 'tip' | 'formula' | 'quote';
    calloutIcon?: string;
    tableData?: {
      headers: string[];
      rows: string[][];
    };
    academicLink?: {
      type: 'course' | 'unit' | 'lesson' | 'assignment' | 'video' | 'space';
      targetId: string;
      title: string;
      subtitle?: string;
      url?: string;
    };
    targetPageId?: string;
    targetPageTitle?: string;
    fileUrl?: string;
    caption?: string;
  };
}

export type WorkspacePageType = 'doc' | 'notes' | 'study_sheet' | 'formula' | 'database';

export interface AcademicAssociation {
  courseId?: string;
  courseCode?: string;
  unitId?: string;
  unitTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  videoId?: string;
  assignmentId?: string;
  knowledgeSpaceId?: string;
}

export interface WorkspacePage {
  id: string;
  title: string;
  icon?: string;
  coverImage?: string;
  parentId: string | null; // null for top-level pages
  type: WorkspacePageType;
  ownerId: string;
  ownerName: string;
  ownerRole: 'student' | 'teacher' | 'principal';
  visibility: 'personal' | 'class_shared' | 'course';
  tags: string[];
  blocks: PageBlock[];
  academicLink?: AcademicAssociation;
  isFavorite?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseProperty {
  id: string;
  name: string;
  type: 'title' | 'text' | 'select' | 'multi_select' | 'status' | 'date' | 'relation';
  options?: Array<{ id: string; label: string; color?: string }>;
}

export interface DatabaseItem {
  id: string;
  databaseId: string;
  pageId?: string;
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDatabase {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  pageId?: string;
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  defaultView: 'table' | 'list';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'Study' | 'Engineering' | 'Planning' | 'Research' | 'Notes';
  type: WorkspacePageType;
  defaultTitle: string;
  blocks: PageBlock[];
  sampleTags: string[];
}
