import { jarvisData, type IJarvisDataRepository } from '../../data/index.ts';
import type {
  PersonalStudyNote,
  PersonalFlashcard,
  PersonalStudySessionPlan
} from './types.ts';

/**
 * PersonalNotesStore
 * Authoritative service for user personal study notes, flashcards, and planned study sessions.
 * Enforces strict per-user boundary isolation and persistent storage via IJarvisDataRepository.
 */
export class PersonalNotesStore {
  private customRepo?: IJarvisDataRepository;
  private student1NotesCleared = false;

  constructor(repo?: IJarvisDataRepository) {
    this.customRepo = repo;
  }

  private get repo(): IJarvisDataRepository {
    return this.customRepo || jarvisData;
  }

  private async ensureSeedData(userId: string): Promise<void> {
    if (userId === 'student-1' && !this.student1NotesCleared) {
      const existing = await this.repo.personalStudy.listNotes('student-1');
      if (existing.length === 0) {
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
        for (const n of student1Notes) {
          await this.repo.personalStudy.createNote(n);
        }
      }

      const existingCards = await this.repo.personalStudy.listFlashcards('student-1');
      if (existingCards.length === 0) {
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
        for (const c of student1Flashcards) {
          await this.repo.personalStudy.createFlashcard(c);
        }
      }

      const existingPlans = await this.repo.personalStudy.listStudyPlans('student-1');
      if (existingPlans.length === 0) {
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
        for (const p of student1Plans) {
          await this.repo.personalStudy.createStudyPlan(p);
        }
      }
    }
  }

  // --- Notes API ---

  async getNotes(userId: string, filter?: { query?: string; subject?: string; tag?: string; contextId?: string }): Promise<PersonalStudyNote[]> {
    await this.ensureSeedData(userId);
    const list = await this.repo.personalStudy.listNotes(userId, {
      subject: filter?.subject,
      tag: filter?.tag,
      contextId: filter?.contextId
    });
    if (!filter?.query) return list;

    const q = filter.query.toLowerCase();
    return list.filter((n) => {
      const matchesTitle = n.title.toLowerCase().includes(q);
      const matchesContent = n.content.toLowerCase().includes(q);
      const matchesTag = n.tags && n.tags.some((t) => t.toLowerCase().includes(q));
      return matchesTitle || matchesContent || matchesTag;
    });
  }

  async getNoteById(userId: string, noteId: string): Promise<PersonalStudyNote | null> {
    await this.ensureSeedData(userId);
    return await this.repo.personalStudy.getNoteById(noteId, userId);
  }

  async createNote(userId: string, input: {
    title: string;
    content: string;
    subject?: string;
    tags?: string[];
    conceptId?: string;
    contextId?: string;
  }): Promise<PersonalStudyNote> {
    const note = await this.repo.personalStudy.createNote({
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: input.title.trim(),
      content: input.content.trim(),
      subject: input.subject?.trim() || 'General',
      tags: input.tags || [],
      conceptId: input.conceptId,
      contextId: input.contextId
    });
    return JSON.parse(JSON.stringify(note));
  }

  async deleteNote(userId: string, noteId: string): Promise<boolean> {
    return await this.repo.personalStudy.deleteNote(noteId, userId);
  }

  async deleteAllNotes(userId: string, subject?: string): Promise<number> {
    if (userId === 'student-1' && !subject) {
      this.student1NotesCleared = true;
    }
    return await this.repo.personalStudy.deleteAllNotes(userId, subject);
  }

  // --- Flashcards API ---

  async getFlashcards(userId: string, subject?: string): Promise<PersonalFlashcard[]> {
    await this.ensureSeedData(userId);
    return await this.repo.personalStudy.listFlashcards(userId, { subject });
  }

  async createFlashcard(userId: string, input: {
    front: string;
    back: string;
    conceptId?: string;
    subject?: string;
    tags?: string[];
  }): Promise<PersonalFlashcard> {
    const card = await this.repo.personalStudy.createFlashcard({
      id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      front: input.front.trim(),
      back: input.back.trim(),
      conceptId: input.conceptId,
      subject: input.subject || 'General',
      tags: input.tags || [],
      reviewCount: 0
    });
    return JSON.parse(JSON.stringify(card));
  }

  async deleteFlashcard(userId: string, cardId: string): Promise<boolean> {
    return await this.repo.personalStudy.deleteFlashcard(cardId, userId);
  }

  // --- Study Plans API ---

  async getStudyPlans(userId: string): Promise<PersonalStudySessionPlan[]> {
    await this.ensureSeedData(userId);
    return await this.repo.personalStudy.listStudyPlans(userId);
  }

  async createStudyPlan(userId: string, input: {
    title: string;
    subject?: string;
    durationMinutes?: number;
    scheduledFor?: string;
    goals?: string[];
  }): Promise<PersonalStudySessionPlan> {
    const plan = await this.repo.personalStudy.createStudyPlan({
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: input.title.trim(),
      subject: input.subject || 'Physics',
      durationMinutes: input.durationMinutes || 45,
      scheduledFor: input.scheduledFor || new Date(Date.now() + 3600000).toISOString(),
      goals: input.goals || ['Review lecture notes', 'Complete practice problems'],
      status: 'planned'
    });
    return JSON.parse(JSON.stringify(plan));
  }

  async deleteStudyPlan(userId: string, planId: string): Promise<boolean> {
    return await this.repo.personalStudy.deleteStudyPlan(planId, userId);
  }
}

export const personalNotesStore = new PersonalNotesStore();
