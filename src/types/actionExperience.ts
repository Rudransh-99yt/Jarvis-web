import type { ToolRiskLevel, UserContextType } from './personalIdentity.ts';

export type ActionSourceType =
  | 'EXISTING_VERIFIED'
  | 'ADAPTED'
  | 'NEWLY_GENERATED'
  | 'EXTERNAL_DERIVED';

export type ActionExecutionState =
  | 'PREVIEW'
  | 'CONFIRMATION_REQUIRED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface ActionPlanBreakdown {
  totalItems: number;
  reusedItems: number;
  adaptedItems?: number;
  generatedItems: number;
  summary: string;
  sourceNote?: string;
  unseenAvailable?: number;
  previouslySeen?: number;
  reviewItems?: number;
  novelItems?: number;
  noveltyMode?: string;
}


export interface ActionSourceInfo {
  type: ActionSourceType;
  title: string;
  assetId?: string;
  details?: string;
  verified?: boolean;
}

export interface ActionPreviewData {
  id: string;
  actionType: string;
  title: string;
  description?: string;
  rationale: string;
  source: ActionSourceInfo;
  plan: ActionPlanBreakdown;
  riskLevel: ToolRiskLevel;
  requiresConfirmation: boolean;
  pendingActionId?: string;
  payload: Record<string, any>;
  canUndo?: boolean;
  undoLabel?: string;
}

export interface ActionResultData {
  title: string;
  subtitle?: string;
  status: 'success' | 'failed' | 'cancelled';
  totalCount?: number;
  reusedCount?: number;
  generatedCount?: number;
  assetId?: string;
  assetTitle?: string;
  downloadUrl?: string;
  pdfFileName?: string;
  nextBestAction?: {
    id: string;
    title: string;
    rationale: string;
    actionType: string;
    targetId?: string;
  };
  canUndo?: boolean;
  undoToken?: string;
  undoLabel?: string;
  isUndone?: boolean;
  errorMessage?: string;
  canRetry?: boolean;
}

export interface ActionActivityItem {
  id: string;
  userId: string;
  contextId: string;
  contextType: UserContextType;
  title: string;
  category: 'practice' | 'knowledge' | 'notes' | 'study' | 'system' | 'external';
  timestamp: string;
  reusedCount?: number;
  generatedCount?: number;
  totalCount?: number;
  sourceTitle?: string;
  assetId?: string;
  canUndo?: boolean;
  undone?: boolean;
  reversibleAction?: {
    type: 'note_create' | 'study_plan_create' | 'practice_draft';
    targetId: string;
  };
}
