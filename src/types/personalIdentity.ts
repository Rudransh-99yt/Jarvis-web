// ============================================================================
// J.A.R.V.I.S. OS — PERSONAL IDENTITY, CONTEXT & MEMORY ARCHITECTURE
// Domain Models, Provider Contracts, and Multi-Context Taxonomy
// ============================================================================

/**
 * Context types representing domains of user activity.
 * Identity is 1 person across multiple contexts.
 */
export type UserContextType =
  | 'PERSONAL'
  | 'EDUCATION'
  | 'TEACHER'
  | 'INSTITUTION'
  | 'WORK'
  | 'RESEARCH'
  | 'PROJECT';

/**
 * Structured memory provenance taxonomy.
 * Invariant: Never silently treat system inference as user-confirmed truth.
 */
export type MemorySourceType =
  | 'USER_STATED'       // User explicitly typed/spoke fact
  | 'USER_CONFIRMED'    // User confirmed a system proposal
  | 'SYSTEM_DERIVED'    // Inferred deterministically by Jarvis heuristics
  | 'EDUCATION_ACTIVITY'// Derived from verified educational checkpoints
  | 'INSTITUTION_DATA'; // Sourced from institutional records

/**
 * Memory visibility boundary ensuring strict personal vs institution isolation.
 */
export type MemoryVisibility =
  | 'PRIVATE_PERSONAL'   // Visible only to user's personal Jarvis
  | 'CONTEXT_BOUND'      // Visible only within specific context (e.g. Class 11)
  | 'INSTITUTION_SHARED';// Explicitly approved for institutional visibility

export type MemoryCategory =
  | 'UserPreference'
  | 'UserGoal'
  | 'UserInterest'
  | 'UserFact'
  | 'UserLearningState'
  | 'UserActivity'
  | 'UserContextState';

export interface MemoryProvenance {
  sourceEntityType: 'chat' | 'practice' | 'quiz' | 'document' | 'onboarding' | 'settings' | 'manual' | 'tool';
  sourceEntityId?: string;
  timestamp: string;
  notes?: string;
}

export interface PersonalMemoryItem {
  id: string;
  userId: string;
  category: MemoryCategory;
  key: string;
  value: any;
  source: MemorySourceType;
  confidence: number; // 0.0 to 1.0
  contextId: string;
  visibility: MemoryVisibility;
  provenance: MemoryProvenance;
  createdAt: string;
  updatedAt: string;
}

export interface UserContext {
  id: string;
  type: UserContextType;
  title: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
  metadata: {
    institutionId?: string;
    institutionName?: string;
    courseIds?: string[];
    gradeLevel?: string;
    curriculum?: string;
    targetExam?: string;
    workspaceId?: string;
    tags?: string[];
  };
  permissions: {
    canAccessInstitutionData: boolean;
    sharePersonalMemory: boolean;
  };
  createdAt: string;
}

export interface PersonalGoal {
  id: string;
  title: string;
  category: 'academic' | 'career' | 'personal' | 'mastery';
  targetDate?: string;
  progressPercent: number;
  status: 'active' | 'achieved' | 'paused';
}

export interface PersonalPreferences {
  explanationStyle: 'concise_tactical' | 'first_principles' | 'socratic' | 'intuitive_visual';
  tone: 'analytical_respectful' | 'mentor' | 'direct';
  communicationCadence: 'high_proactive' | 'balanced' | 'quiet';
  hudTheme: string;
  soundEnabled: boolean;
  bookOnlyModeDefault: boolean;
}

export interface PersonalProfile {
  displayName: string;
  preferredName: string;
  email: string;
  avatarUrl: string;
  timezone: string;
  locale: string;
  ageRange?: string;
  country?: string;
  bio?: string;
}

export interface PersonalKnowledgeConceptState {
  conceptId: string;
  conceptName: string;
  subject: string;
  masteryLevel: number; // 0.0 - 1.0
  status: 'not_started' | 'learning' | 'review_needed' | 'mastered';
  evidenceCount: number;
  lastPracticed?: string;
  provenanceSources: string[];
}

export interface PersonalKnowledgeSignal {
  id: string;
  type: 'concept_mastered' | 'concept_review_needed' | 'document_ingested' | 'practice_completed';
  title: string;
  timestamp: string;
  metadata?: any;
}

export interface PersonalKnowledgeState {
  userId: string;
  concepts: Record<string, PersonalKnowledgeConceptState>;
  recentSignals: PersonalKnowledgeSignal[];
  updatedAt: string;
}

export interface NextBestAction {
  id: string;
  title: string;
  type: 'lesson_practice' | 'review_prerequisite' | 'assignment_due' | 'concept_reinforce' | 'quiz_prep';
  estimatedMinutes: number;
  priority: 'high' | 'medium' | 'low';
  targetContext: string;
  rationale: string;
  actionTarget: {
    courseId?: string;
    unitId?: string;
    lessonId?: string;
    assignmentId?: string;
    concept?: string;
  };
}

/**
 * Unified Personal Identity Domain Model
 */
export interface PersonalJarvisIdentity {
  userId: string;
  profile: PersonalProfile;
  preferences: PersonalPreferences;
  goals: PersonalGoal[];
  interests: string[];
  roles: string[];
  activeContextId: string;
  contexts: UserContext[];
  stats: {
    totalStudyMinutes: number;
    conceptsMastered: number;
    activeStreakDays: number;
    memoryEntriesCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// Continuous Conversation & Voice Architecture (State Contracts)
// ----------------------------------------------------------------------------

export type AssistantState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED';
export type WakeState = 'STANDBY' | 'ARMED' | 'TRIGGERED' | 'DISABLED';

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  source?: 'text' | 'voice' | 'system';
  relevantMemoryIds?: string[];
  relevantConceptIds?: string[];
  searchAttributions?: WebSearchResult[];
  metadata?: Record<string, any>;
}

export interface ConversationSession {
  sessionId: string;
  userId: string;
  activeContextId: string;
  messages: SessionMessage[];
  createdAt: string;
  updatedAt: string;
  assistantState: AssistantState;
  wakeState: WakeState;
  recentTurnsCount: number;
  lastInteractionTimestamp: string;
  relevantMemoryIds: string[];
  relevantKnowledgeConceptIds: string[];
  provenance: {
    inputType: 'text' | 'voice';
    channel: string;
    contextType: UserContextType;
    institutionId?: string;
  };
}

// ----------------------------------------------------------------------------
// Bounded Prompt & Provider Interfaces (Phase 4)
// ----------------------------------------------------------------------------

export interface BoundedConversationPrompt {
  identitySummary: {
    userId: string;
    displayName: string;
    preferredName: string;
    roles: string[];
  };
  activeContext: {
    id: string;
    type: UserContextType;
    title: string;
    description: string;
    metadata?: Record<string, any>;
  };
  preferences: {
    explanationStyle: string;
    tone: string;
    communicationCadence: string;
    bookOnlyModeDefault: boolean;
  };
  relevantMemories: Array<{
    id: string;
    category: MemoryCategory;
    key: string;
    value: any;
    source: MemorySourceType;
    confidence: number;
    visibility: MemoryVisibility;
  }>;
  relevantKnowledge: Array<{
    conceptId: string;
    conceptName: string;
    subject: string;
    masteryLevel: number;
    status: string;
    evidenceCount: number;
  }>;
  nextBestAction?: NextBestAction;
  recentMessages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  currentMessage: string;
  webSearchResults?: WebSearchResult[];
  explicitPermissions: {
    canAccessInstitutionData: boolean;
    sharePersonalMemory: boolean;
  };
  provenanceDirective: string;
}

export interface ConversationTurnResult {
  reply: string;
  suggestedNextActions?: string[];
  memoriesToWrite?: Array<{
    category: MemoryCategory;
    key: string;
    value: any;
    source: MemorySourceType;
    confidence?: number;
    visibility?: MemoryVisibility;
    notes?: string;
  }>;
  searchPerformed?: boolean;
  searchAttributions?: WebSearchResult[];
  toolCalls?: Array<{ name: string; args: Record<string, any> }>;
  providerId: string;
}

export interface ConversationGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  allowWebSearch?: boolean;
  modelOverride?: string;
  timeoutMs?: number;
}

export interface IConversationProvider {
  readonly id: string;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  generateConversationTurn(
    prompt: BoundedConversationPrompt,
    options?: ConversationGenerationOptions
  ): Promise<ConversationTurnResult>;
}

// ----------------------------------------------------------------------------
// Web Intelligence Provider Abstraction
// ----------------------------------------------------------------------------

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  sourceAttribution: string;
  publishedDate?: string;
  reliabilityScore: number; // 0.0 - 1.0
}

export interface WebSearchOptions {
  maxResults?: number;
  domainWhitelist?: string[];
  context?: string;
  includeCitations?: boolean;
}

export interface IWebSearchProvider {
  readonly id: string;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  search(query: string, options?: WebSearchOptions): Promise<WebSearchResult[]>;
}

// ----------------------------------------------------------------------------
// Progressive Onboarding Input
// ----------------------------------------------------------------------------

export interface ProgressiveOnboardingPayload {
  userId: string;
  name: string;
  preferredName?: string;
  ageRange?: string;
  country?: string;
  primaryRole: 'student' | 'teacher' | 'researcher' | 'professional' | 'lifelong_learner';
  educationInfo?: {
    gradeLevel?: string;
    curriculum?: string;
    targetExam?: string;
    institutionName?: string;
    subjects?: string[];
    academicGoals?: string[];
  };
  interests?: string[];
  preferences?: Partial<PersonalPreferences>;
}

// ----------------------------------------------------------------------------
// Phase 5: Personal Action & Tool Intelligence Contracts
// ----------------------------------------------------------------------------

export type ToolRiskLevel = 'READ_ONLY' | 'LOW_RISK_WRITE' | 'HIGH_RISK_WRITE' | 'EXTERNAL_ACTION';

export type ToolCategory = 'knowledge' | 'notes' | 'study' | 'practice' | 'system' | 'external';

export interface PersonalToolPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  enum?: string[];
  default?: any;
}

export type PersonalToolInputSchema = Record<string, PersonalToolPropertySchema>;

export interface PersonalToolExecutionContext {
  userId: string;
  contextId: string;
  contextType: UserContextType;
  permissions: Record<string, boolean>;
  sessionId?: string;
}

export interface PersonalToolExecutionResult {
  success: boolean;
  toolId: string;
  data?: any;
  userMessage: string;
  error?: {
    code: string;
    message: string;
  };
  metadata?: Record<string, any>;
  activityEvent?: {
    type: string;
    title: string;
    metadata?: any;
    provenance: string;
  };
}

export interface PersonalTool {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly riskLevel: ToolRiskLevel;
  readonly inputSchema: PersonalToolInputSchema;
  readonly requiredContextTypes?: UserContextType[];
  readonly requiredPermissions?: string[];
  execute(context: PersonalToolExecutionContext, args: Record<string, any>): Promise<PersonalToolExecutionResult>;
  preview?(context: PersonalToolExecutionContext, args: Record<string, any>): Promise<{ summary: string; details?: any }>;
}

export interface ToolIntent {
  toolId: string;
  arguments: Record<string, any>;
  confidence: number;
  reason: string;
  requestedByUser: boolean;
  requiresConfirmation: boolean;
  riskLevel: ToolRiskLevel;
}

export interface PendingConfirmationAction {
  id: string;
  toolId: string;
  userId: string;
  contextId: string;
  arguments: Record<string, any>;
  riskLevel: ToolRiskLevel;
  previewSummary: string;
  createdAt: string;
  expiresAt: string;
}

export interface PersonalStudyNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  subject?: string;
  tags: string[];
  conceptId?: string;
  contextId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalFlashcard {
  id: string;
  userId: string;
  front: string;
  back: string;
  conceptId?: string;
  subject?: string;
  tags: string[];
  reviewCount: number;
  lastReviewed?: string;
  createdAt: string;
}

export interface PersonalStudySessionPlan {
  id: string;
  userId: string;
  title: string;
  subject: string;
  durationMinutes: number;
  scheduledFor: string;
  goals: string[];
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: string;
}

