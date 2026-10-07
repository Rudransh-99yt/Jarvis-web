import type {
  PersonalMemoryItem,
  MemoryCategory,
  MemorySourceType,
  MemoryVisibility,
  MemoryProvenance
} from './types.ts';

/**
 * PersonalMemoryStore
 * Deterministic structured personal memory store with explicit provenance tracking and security boundaries.
 * Invariant: Never silently treat system inference as user-confirmed truth; never leak private memory to institutions.
 */
export class PersonalMemoryStore {
  private memories: Map<string, PersonalMemoryItem> = new Map();

  constructor() {
    this.seedDefaultMemories();
  }

  private seedDefaultMemories(): void {
    const student1Memories: PersonalMemoryItem[] = [
      {
        id: 'mem-1',
        userId: 'student-1',
        category: 'UserPreference',
        key: 'explanation_style',
        value: 'Prefers step-by-step mathematical derivations from first principles before heuristic shortcuts.',
        source: 'USER_STATED',
        confidence: 1.0,
        contextId: 'ctx-student1-edu',
        visibility: 'PRIVATE_PERSONAL',
        provenance: {
          sourceEntityType: 'settings',
          timestamp: '2026-09-01T00:00:00Z',
          notes: 'User explicitly selected First Principles explanation preference in Jarvis OS.'
        },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z'
      },
      {
        id: 'mem-2',
        userId: 'student-1',
        category: 'UserLearningState',
        key: 'vector_decomposition_gap',
        value: 'Needs occasional reinforcement on incline coordinate rotation and trigonometric force decomposition.',
        source: 'EDUCATION_ACTIVITY',
        confidence: 0.88,
        contextId: 'ctx-student1-edu',
        visibility: 'CONTEXT_BOUND',
        provenance: {
          sourceEntityType: 'practice',
          sourceEntityId: 'les-phys-202-practice',
          timestamp: '2026-09-20T14:30:00Z',
          notes: 'Derived from prerequisite diagnostic item on normal force incline components.'
        },
        createdAt: '2026-09-20T14:30:00Z',
        updatedAt: '2026-09-20T14:30:00Z'
      },
      {
        id: 'mem-3',
        userId: 'student-1',
        category: 'UserGoal',
        key: 'target_exam_goal',
        value: 'Preparing for JEE Advanced Physics with focus on rotational mechanics and electrodynamics.',
        source: 'USER_CONFIRMED',
        confidence: 0.95,
        contextId: 'ctx-student1-edu',
        visibility: 'CONTEXT_BOUND',
        provenance: {
          sourceEntityType: 'onboarding',
          timestamp: '2026-09-01T00:00:00Z',
          notes: 'Confirmed during progressive onboarding.'
        },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z'
      }
    ];

    for (const m of student1Memories) {
      this.memories.set(m.id, m);
    }
  }

  async addMemory(params: {
    userId: string;
    category: MemoryCategory;
    key: string;
    value: any;
    source: MemorySourceType;
    confidence?: number;
    contextId: string;
    visibility?: MemoryVisibility;
    provenance: MemoryProvenance;
  }): Promise<PersonalMemoryItem> {
    const item: PersonalMemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: params.userId,
      category: params.category,
      key: params.key,
      value: params.value,
      source: params.source,
      confidence: typeof params.confidence === 'number' ? params.confidence : (params.source === 'USER_STATED' ? 1.0 : 0.8),
      contextId: params.contextId,
      visibility: params.visibility || 'PRIVATE_PERSONAL',
      provenance: params.provenance,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.memories.set(item.id, item);
    return item;
  }

  async getMemories(
    userId: string,
    filter?: {
      category?: MemoryCategory;
      contextId?: string;
      source?: MemorySourceType;
      visibility?: MemoryVisibility;
    }
  ): Promise<PersonalMemoryItem[]> {
    const list: PersonalMemoryItem[] = [];

    for (const item of this.memories.values()) {
      if (item.userId !== userId) continue;
      if (filter?.category && item.category !== filter.category) continue;
      if (filter?.contextId && item.contextId !== filter.contextId) continue;
      if (filter?.source && item.source !== filter.source) continue;
      if (filter?.visibility && item.visibility !== filter.visibility) continue;
      list.push(item);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getMemoryById(id: string): Promise<PersonalMemoryItem | null> {
    return this.memories.get(id) || null;
  }

  async confirmSystemMemory(id: string, userId: string): Promise<PersonalMemoryItem | null> {
    const mem = this.memories.get(id);
    if (!mem || mem.userId !== userId) return null;

    const updated: PersonalMemoryItem = {
      ...mem,
      source: 'USER_CONFIRMED',
      confidence: 1.0,
      updatedAt: new Date().toISOString()
    };
    this.memories.set(id, updated);
    return updated;
  }

  async deleteMemory(id: string, userId: string): Promise<boolean> {
    const mem = this.memories.get(id);
    if (!mem || mem.userId !== userId) return false;
    return this.memories.delete(id);
  }
}

export const personalMemoryStore = new PersonalMemoryStore();
