import type {
  PersonalStudyNote,
  PersonalFlashcard,
  PersonalStudySessionPlan
} from './types.ts';

/**
 * PersonalNotesStore
 * In-memory & deterministic repository for user personal study notes, flashcards, and planned study sessions.
 * Enforces strict per-user boundary isolation.
 */
export class PersonalNotesStore {
  private notes: Map<string, PersonalStudyNote[]> = new Map();
  private flashcards: Map<string, PersonalFlashcard[]> = new Map();
  private studyPlans: Map<string, PersonalStudySessionPlan[]> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData(): void {
    const student1Notes: PersonalStudyNote[] = [
      {
        id: 'note-phys-1',
        userId: 'student-1',
        title: "Newton's Second Law & Momentum Derivation",
        content: 'F_net is fundamentally defined as dp/dt = d(mv)/dt = m(dv/dt) = ma for constant mass. When applying to incline planes, decompose orthogonal components along the incline (mg sin θ) and normal to it (mg cos θ).',
        subject: 'Physics',
        tags: ['mechanics', "newton's laws", 'incline planes', 'forces'],
        conceptId: 'concept-newton-laws',
        contextId: 'ctx-student1-edu',
        createdAt: '2026-10-05T10:00:00Z',
        updatedAt: '2026-10-05T10:00:00Z'
      },
      {
        id: 'note-math-1',
        userId: 'student-1',
        title: 'Chain Rule and Composite Function Derivatives',
        content: 'If y = f(u) and u = g(x), then dy/dx = (dy/du) * (du/dx). In Leibniz notation, differentials chain seamlessly across intermediate coordinate variables.',
        subject: 'Mathematics',
        tags: ['calculus', 'derivatives', 'chain rule'],
        conceptId: 'concept-derivatives-chain',
        contextId: 'ctx-student1-edu',
        createdAt: '2026-10-04T15:30:00Z',
        updatedAt: '2026-10-04T15:30:00Z'
      },
      {
        id: 'note-pers-1',
        userId: 'student-1',
        title: 'Personal Study Strategy & High-Focus Routine',
        content: 'Allocate 45 minutes focused deep work blocks with 10-minute pauses. Prioritize first-principles proofs before doing calculation drills.',
        subject: 'Productivity',
        tags: ['strategy', 'focus', 'habits'],
        contextId: 'ctx-student1-personal',
        createdAt: '2026-10-03T19:00:00Z',
        updatedAt: '2026-10-03T19:00:00Z'
      }
    ];

    const student1Flashcards: PersonalFlashcard[] = [
      {
        id: 'card-1',
        userId: 'student-1',
        front: "What is Newton's Second Law in fundamental differential form?",
        back: 'F_net = dp/dt (rate of change of linear momentum)',
        conceptId: 'concept-newton-laws',
        subject: 'Physics',
        tags: ['mechanics', 'newton'],
        reviewCount: 3,
        lastReviewed: '2026-10-06T18:00:00Z',
        createdAt: '2026-10-05T10:30:00Z'
      },
      {
        id: 'card-2',
        userId: 'student-1',
        front: 'What is the component of gravitational force parallel to an incline of angle θ?',
        back: 'F_parallel = m * g * sin(θ)',
        conceptId: 'concept-vector-forces',
        subject: 'Physics',
        tags: ['vectors', 'inclines'],
        reviewCount: 2,
        lastReviewed: '2026-10-05T12:00:00Z',
        createdAt: '2026-10-05T10:30:00Z'
      }
    ];

    const student1Plans: PersonalStudySessionPlan[] = [
      {
        id: 'plan-1',
        userId: 'student-1',
        title: 'Evening Physics Mechanics Drill',
        subject: 'Physics',
        durationMinutes: 45,
        scheduledFor: '2026-10-07T18:30:00Z',
        goals: ["Complete 5 Newton's 2nd Law incline problems", 'Review vector decomposition notes'],
        status: 'planned',
        createdAt: '2026-10-06T20:00:00Z'
      }
    ];

    this.notes.set('student-1', student1Notes);
    this.flashcards.set('student-1', student1Flashcards);
    this.studyPlans.set('student-1', student1Plans);
  }

  // --- Notes API ---

  async getNotes(userId: string, filter?: { query?: string; subject?: string; tag?: string }): Promise<PersonalStudyNote[]> {
    const list = this.notes.get(userId) || [];
    if (!filter) return [...list];

    return list.filter((n) => {
      if (filter.subject && n.subject?.toLowerCase() !== filter.subject.toLowerCase()) {
        return false;
      }
      if (filter.tag && !n.tags.some((t) => t.toLowerCase() === filter.tag!.toLowerCase())) {
        return false;
      }
      if (filter.query) {
        const q = filter.query.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesContent = n.content.toLowerCase().includes(q);
        const matchesTag = n.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesTag) return false;
      }
      return true;
    });
  }

  async getNoteById(userId: string, noteId: string): Promise<PersonalStudyNote | null> {
    const list = this.notes.get(userId) || [];
    return list.find((n) => n.id === noteId) || null;
  }

  async createNote(userId: string, input: {
    title: string;
    content: string;
    subject?: string;
    tags?: string[];
    conceptId?: string;
    contextId?: string;
  }): Promise<PersonalStudyNote> {
    const list = this.notes.get(userId) || [];
    const newNote: PersonalStudyNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: input.title.trim(),
      content: input.content.trim(),
      subject: input.subject?.trim() || 'General',
      tags: input.tags || [],
      conceptId: input.conceptId,
      contextId: input.contextId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    list.unshift(newNote);
    this.notes.set(userId, list);
    return newNote;
  }

  async deleteNote(userId: string, noteId: string): Promise<boolean> {
    const list = this.notes.get(userId) || [];
    const idx = list.findIndex((n) => n.id === noteId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this.notes.set(userId, list);
    return true;
  }

  async deleteAllNotes(userId: string, subject?: string): Promise<number> {
    const list = this.notes.get(userId) || [];
    if (!subject) {
      const count = list.length;
      this.notes.set(userId, []);
      return count;
    }
    const remaining = list.filter((n) => n.subject?.toLowerCase() !== subject.toLowerCase());
    const deletedCount = list.length - remaining.length;
    this.notes.set(userId, remaining);
    return deletedCount;
  }

  // --- Flashcards API ---

  async getFlashcards(userId: string, subject?: string): Promise<PersonalFlashcard[]> {
    const list = this.flashcards.get(userId) || [];
    if (!subject) return [...list];
    return list.filter((c) => c.subject?.toLowerCase() === subject.toLowerCase());
  }

  async createFlashcard(userId: string, input: {
    front: string;
    back: string;
    conceptId?: string;
    subject?: string;
    tags?: string[];
  }): Promise<PersonalFlashcard> {
    const list = this.flashcards.get(userId) || [];
    const card: PersonalFlashcard = {
      id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      front: input.front.trim(),
      back: input.back.trim(),
      conceptId: input.conceptId,
      subject: input.subject || 'General',
      tags: input.tags || [],
      reviewCount: 0,
      createdAt: new Date().toISOString()
    };

    list.unshift(card);
    this.flashcards.set(userId, list);
    return card;
  }

  // --- Study Plans API ---

  async getStudyPlans(userId: string): Promise<PersonalStudySessionPlan[]> {
    return [...(this.studyPlans.get(userId) || [])];
  }

  async createStudyPlan(userId: string, input: {
    title: string;
    subject?: string;
    durationMinutes?: number;
    scheduledFor?: string;
    goals?: string[];
  }): Promise<PersonalStudySessionPlan> {
    const list = this.studyPlans.get(userId) || [];
    const plan: PersonalStudySessionPlan = {
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: input.title.trim(),
      subject: input.subject || 'Physics',
      durationMinutes: input.durationMinutes || 45,
      scheduledFor: input.scheduledFor || new Date(Date.now() + 3600000).toISOString(),
      goals: input.goals || ['Review lecture notes', 'Complete practice problems'],
      status: 'planned',
      createdAt: new Date().toISOString()
    };

    list.unshift(plan);
    this.studyPlans.set(userId, list);
    return plan;
  }
}

export const personalNotesStore = new PersonalNotesStore();
