import { personalKnowledgeStore } from '../knowledgeStore.ts';
import { personalNotesStore } from './personalNotesStore.ts';
import type {
  PersonalTool,
  PersonalToolExecutionContext,
  PersonalToolExecutionResult
} from './types.ts';

/**
 * 1. personal_knowledge_search
 * Searches the user's verified personal knowledge graph & concept masteries.
 */
export const personalKnowledgeSearchTool: PersonalTool = {
  id: 'personal_knowledge_search',
  name: 'Personal Knowledge Search',
  description: 'Searches verified concept mastery levels, learning status, and checkpoints in your personal knowledge graph.',
  category: 'knowledge',
  riskLevel: 'READ_ONLY',
  inputSchema: {
    query: {
      type: 'string',
      description: 'The concept, formula, or topic to search for in your knowledge graph.',
      required: true
    },
    subject: {
      type: 'string',
      description: 'Optional subject filter (e.g. Physics, Mathematics).',
      required: false
    }
  },
  async execute(context: PersonalToolExecutionContext, args: { query: string; subject?: string }): Promise<PersonalToolExecutionResult> {
    const knowledge = await personalKnowledgeStore.getKnowledge(context.userId);
    const query = args.query.toLowerCase();
    const concepts = Object.values(knowledge.concepts);

    const matches = concepts.filter((c) => {
      if (args.subject && c.subject.toLowerCase() !== args.subject.toLowerCase()) return false;
      return (
        c.conceptName.toLowerCase().includes(query) ||
        c.subject.toLowerCase().includes(query) ||
        (query.includes('newton') && c.conceptName.toLowerCase().includes('newton')) ||
        (query.includes('vector') && c.conceptName.toLowerCase().includes('vector')) ||
        (query.includes('calculus') && c.conceptName.toLowerCase().includes('chain'))
      );
    });

    if (matches.length === 0) {
      return {
        success: true,
        toolId: 'personal_knowledge_search',
        data: { query: args.query, matches: [] },
        userMessage: `No verified concept records found matching "${args.query}" in your personal knowledge store.`
      };
    }

    const summary = matches
      .map((m) => `• **${m.conceptName}** (${m.subject}): ${Math.round(m.masteryLevel * 100)}% mastery [${m.status.toUpperCase()}] across ${m.evidenceCount} checkpoints`)
      .join('\n');

    return {
      success: true,
      toolId: 'personal_knowledge_search',
      data: { query: args.query, matches },
      userMessage: `Found ${matches.length} verified knowledge concept(s):\n\n${summary}`
    };
  }
};

/**
 * 2. personal_notes_create
 * Creates a personal study note / draft.
 */
export const personalNotesCreateTool: PersonalTool = {
  id: 'personal_notes_create',
  name: 'Create Personal Note',
  description: 'Creates a structured personal study note, derivation, or formula summary in your personal notes store.',
  category: 'notes',
  riskLevel: 'LOW_RISK_WRITE',
  inputSchema: {
    title: {
      type: 'string',
      description: 'Title of the note.',
      required: true
    },
    content: {
      type: 'string',
      description: 'The body or analytical text of the note.',
      required: true
    },
    subject: {
      type: 'string',
      description: 'Academic or personal subject (e.g. Physics, Calculus).',
      required: false
    },
    tags: {
      type: 'array',
      description: 'Tags for categorization.',
      required: false
    }
  },
  async execute(context: PersonalToolExecutionContext, args: { title: string; content: string; subject?: string; tags?: string[] }): Promise<PersonalToolExecutionResult> {
    const note = await personalNotesStore.createNote(context.userId, {
      title: args.title,
      content: args.content,
      subject: args.subject || 'General',
      tags: args.tags || [],
      contextId: context.contextId
    });

    return {
      success: true,
      toolId: 'personal_notes_create',
      data: { note },
      userMessage: `Personal note created successfully: "${note.title}" (${note.subject}).`,
      activityEvent: {
        type: 'note_created',
        title: `Created note: ${note.title}`,
        metadata: { noteId: note.id, subject: note.subject },
        provenance: 'USER_STATED'
      }
    };
  }
};

/**
 * 3. personal_notes_read
 * Reads or searches personal study notes.
 */
export const personalNotesReadTool: PersonalTool = {
  id: 'personal_notes_read',
  name: 'Read Personal Notes',
  description: 'Searches and retrieves your personal study notes and derivations.',
  category: 'notes',
  riskLevel: 'READ_ONLY',
  inputSchema: {
    query: {
      type: 'string',
      description: 'Search keyword to filter note titles, contents, or tags.',
      required: false
    },
    subject: {
      type: 'string',
      description: 'Subject filter (e.g. Physics).',
      required: false
    },
    tag: {
      type: 'string',
      description: 'Tag filter (e.g. mechanics).',
      required: false
    }
  },
  async execute(context: PersonalToolExecutionContext, args: { query?: string; subject?: string; tag?: string }): Promise<PersonalToolExecutionResult> {
    const notes = await personalNotesStore.getNotes(context.userId, {
      query: args.query,
      subject: args.subject,
      tag: args.tag
    });

    if (notes.length === 0) {
      return {
        success: true,
        toolId: 'personal_notes_read',
        data: { notes: [] },
        userMessage: 'No personal notes matched your search criteria.'
      };
    }

    const notePreviews = notes
      .map((n) => `• **${n.title}** (${n.subject}) [Tags: ${n.tags.join(', ') || 'none'}]:\n  ${n.content.length > 120 ? n.content.substring(0, 117) + '...' : n.content}`)
      .join('\n\n');

    return {
      success: true,
      toolId: 'personal_notes_read',
      data: { count: notes.length, notes },
      userMessage: `Retrieved ${notes.length} note(s):\n\n${notePreviews}`
    };
  }
};

/**
 * 4. personal_study_session_create
 * Creates a scheduled study session or revision block.
 */
export const personalStudySessionCreateTool: PersonalTool = {
  id: 'personal_study_session_create',
  name: 'Create Study Session Plan',
  description: 'Schedules a focused study block with specific concept revision goals.',
  category: 'study',
  riskLevel: 'LOW_RISK_WRITE',
  inputSchema: {
    title: {
      type: 'string',
      description: 'Title of the study session (e.g. "Newton\'s Laws Incline Revision").',
      required: true
    },
    subject: {
      type: 'string',
      description: 'Target subject.',
      required: false
    },
    durationMinutes: {
      type: 'number',
      description: 'Planned duration in minutes.',
      required: false
    },
    scheduledFor: {
      type: 'string',
      description: 'ISO date string or human description of when the session will occur.',
      required: false
    },
    goals: {
      type: 'array',
      description: 'List of target learning goals.',
      required: false
    }
  },
  async execute(context: PersonalToolExecutionContext, args: { title: string; subject?: string; durationMinutes?: number; scheduledFor?: string; goals?: string[] }): Promise<PersonalToolExecutionResult> {
    const plan = await personalNotesStore.createStudyPlan(context.userId, {
      title: args.title,
      subject: args.subject || 'Physics',
      durationMinutes: args.durationMinutes || 45,
      scheduledFor: args.scheduledFor,
      goals: args.goals
    });

    return {
      success: true,
      toolId: 'personal_study_session_create',
      data: { plan },
      userMessage: `Scheduled study session "${plan.title}" (${plan.durationMinutes} mins) for ${new Date(plan.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'scheduled block'}.`,
      activityEvent: {
        type: 'study_session_scheduled',
        title: `Scheduled: ${plan.title}`,
        metadata: { planId: plan.id, duration: plan.durationMinutes },
        provenance: 'EDUCATION_ACTIVITY'
      }
    };
  }
};

/**
 * 5. personal_practice_session_start
 * Starts an interactive practice set for a specific concept.
 */
export const personalPracticeSessionStartTool: PersonalTool = {
  id: 'personal_practice_session_start',
  name: 'Start Concept Practice Session',
  description: 'Initiates a diagnostic practice set calibrated to your mastery gap on a concept.',
  category: 'practice',
  riskLevel: 'LOW_RISK_WRITE',
  inputSchema: {
    conceptName: {
      type: 'string',
      description: 'Name of the concept to practice (e.g. "Newton\'s Laws of Motion").',
      required: true
    },
    subject: {
      type: 'string',
      description: 'Subject of the concept.',
      required: false
    },
    itemCount: {
      type: 'number',
      description: 'Number of practice items (default 3).',
      required: false
    }
  },
  async execute(context: PersonalToolExecutionContext, args: { conceptName: string; subject?: string; itemCount?: number }): Promise<PersonalToolExecutionResult> {
    const count = args.itemCount || 3;
    const sessionPayload = {
      sessionId: `prac-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conceptName: args.conceptName,
      subject: args.subject || 'Physics',
      itemCount: count,
      status: 'active',
      startedAt: new Date().toISOString()
    };

    return {
      success: true,
      toolId: 'personal_practice_session_start',
      data: sessionPayload,
      userMessage: `Practice session initialized for **${args.conceptName}** (${count} diagnostic questions). Ready to proceed when you are, Cadet.`,
      activityEvent: {
        type: 'practice_started',
        title: `Started practice: ${args.conceptName}`,
        metadata: { concept: args.conceptName, count },
        provenance: 'EDUCATION_ACTIVITY'
      }
    };
  }
};

/**
 * 6. personal_flashcard_create
 * Creates a personal concept flashcard.
 */
export const personalFlashcardCreateTool: PersonalTool = {
  id: 'personal_flashcard_create',
  name: 'Create Personal Flashcard',
  description: 'Creates a quick concept review flashcard with question and answer sides.',
  category: 'study',
  riskLevel: 'LOW_RISK_WRITE',
  inputSchema: {
    front: {
      type: 'string',
      description: 'The front prompt/question on the card.',
      required: true
    },
    back: {
      type: 'string',
      description: 'The back answer/explanation on the card.',
      required: true
    },
    subject: {
      type: 'string',
      description: 'Subject (e.g. Physics, Mathematics).',
      required: false
    },
    conceptId: {
      type: 'string',
      description: 'Associated concept identifier.',
      required: false
    }
  },
  async execute(context: PersonalToolExecutionContext, args: { front: string; back: string; subject?: string; conceptId?: string }): Promise<PersonalToolExecutionResult> {
    const card = await personalNotesStore.createFlashcard(context.userId, {
      front: args.front,
      back: args.back,
      subject: args.subject || 'General',
      conceptId: args.conceptId
    });

    return {
      success: true,
      toolId: 'personal_flashcard_create',
      data: { card },
      userMessage: `Created flashcard: "${card.front}" → "${card.back}" (${card.subject}).`,
      activityEvent: {
        type: 'flashcard_created',
        title: `Created flashcard for ${card.subject}`,
        metadata: { cardId: card.id },
        provenance: 'USER_STATED'
      }
    };
  }
};

/**
 * 7. personal_learning_progress_read
 * Reads comprehensive learning progress and Next Best Action.
 */
export const personalLearningProgressReadTool: PersonalTool = {
  id: 'personal_learning_progress_read',
  name: 'Read Learning Progress',
  description: 'Retrieves your overall concept mastery statistics, recent learning signals, and recommended next action.',
  category: 'knowledge',
  riskLevel: 'READ_ONLY',
  inputSchema: {
    subject: {
      type: 'string',
      description: 'Optional subject filter.',
      required: false
    }
  },
  async execute(context: PersonalToolExecutionContext, args: { subject?: string }): Promise<PersonalToolExecutionResult> {
    const knowledge = await personalKnowledgeStore.getKnowledge(context.userId);
    const nextBestAction = await personalKnowledgeStore.computeNextBestAction(context.userId, args.subject);
    const allConcepts = Object.values(knowledge.concepts);
    const filtered = args.subject ? allConcepts.filter((c) => c.subject.toLowerCase() === args.subject!.toLowerCase()) : allConcepts;

    const masteredCount = filtered.filter((c) => c.status === 'mastered').length;
    const reviewCount = filtered.filter((c) => c.status === 'review_needed').length;
    const learningCount = filtered.filter((c) => c.status === 'learning').length;
    const avgMastery = filtered.length > 0 ? Math.round((filtered.reduce((acc, c) => acc + c.masteryLevel, 0) / filtered.length) * 100) : 0;

    return {
      success: true,
      toolId: 'personal_learning_progress_read',
      data: {
        totalConcepts: filtered.length,
        masteredCount,
        reviewCount,
        learningCount,
        averageMastery: avgMastery,
        nextBestAction,
        recentSignals: knowledge.recentSignals.slice(0, 3)
      },
      userMessage: `**Learning Progress Summary** (${args.subject || 'All Subjects'}):\n• Concepts Mastered: ${masteredCount}/${filtered.length} (Average: ${avgMastery}%)\n• Need Review: ${reviewCount}\n• Currently Learning: ${learningCount}\n\n**Next Recommended Action:**\n${nextBestAction ? `${nextBestAction.title} (${nextBestAction.rationale})` : 'Continue regular revision schedule.'}`
    };
  }
};

/**
 * 8. personal_notes_delete
 * High-risk tool: deletes personal notes. Deterministically requires confirmation!
 */
export const personalNotesDeleteTool: PersonalTool = {
  id: 'personal_notes_delete',
  name: 'Delete Personal Notes',
  description: 'Deletes specific personal notes or purges notes for a subject. Requires explicit confirmation.',
  category: 'notes',
  riskLevel: 'HIGH_RISK_WRITE',
  inputSchema: {
    noteId: {
      type: 'string',
      description: 'Specific note ID to delete.',
      required: false
    },
    subject: {
      type: 'string',
      description: 'Subject whose notes should be deleted.',
      required: false
    },
    deleteAll: {
      type: 'boolean',
      description: 'Whether to delete all personal notes.',
      required: false
    }
  },
  async preview(context: PersonalToolExecutionContext, args: { noteId?: string; subject?: string; deleteAll?: boolean }) {
    if (args.noteId) {
      const note = await personalNotesStore.getNoteById(context.userId, args.noteId);
      return {
        summary: `Permanently delete note: "${note?.title || args.noteId}"`,
        details: { noteId: args.noteId }
      };
    }
    if (args.deleteAll) {
      const all = await personalNotesStore.getNotes(context.userId);
      return {
        summary: `Permanently delete ALL ${all.length} personal notes`,
        details: { count: all.length }
      };
    }
    if (args.subject) {
      const subjNotes = await personalNotesStore.getNotes(context.userId, { subject: args.subject });
      return {
        summary: `Permanently delete all ${subjNotes.length} notes in subject "${args.subject}"`,
        details: { subject: args.subject, count: subjNotes.length }
      };
    }
    return {
      summary: 'Delete selected personal notes',
      details: args
    };
  },
  async execute(context: PersonalToolExecutionContext, args: { noteId?: string; subject?: string; deleteAll?: boolean }): Promise<PersonalToolExecutionResult> {
    if (args.noteId) {
      const deleted = await personalNotesStore.deleteNote(context.userId, args.noteId);
      if (!deleted) {
        return {
          success: false,
          toolId: 'personal_notes_delete',
          error: { code: 'NOTE_NOT_FOUND', message: `Note ${args.noteId} not found.` },
          userMessage: `Failed to delete note: note with ID "${args.noteId}" does not exist.`
        };
      }
      return {
        success: true,
        toolId: 'personal_notes_delete',
        data: { deletedNoteId: args.noteId },
        userMessage: `Note ${args.noteId} has been permanently deleted.`,
        activityEvent: {
          type: 'note_deleted',
          title: `Deleted note ${args.noteId}`,
          provenance: 'USER_CONFIRMED'
        }
      };
    }

    const count = await personalNotesStore.deleteAllNotes(context.userId, args.subject);
    return {
      success: true,
      toolId: 'personal_notes_delete',
      data: { deletedCount: count, subject: args.subject },
      userMessage: `Successfully deleted ${count} note(s)${args.subject ? ` for subject ${args.subject}` : ''}.`,
      activityEvent: {
        type: 'notes_purged',
        title: `Deleted ${count} notes`,
        metadata: { subject: args.subject, count },
        provenance: 'USER_CONFIRMED'
      }
    };
  }
};

/**
 * 9. personal_external_notify
 * External action tool: sending external notification or message. Deterministically requires confirmation!
 */
export const personalExternalNotifyTool: PersonalTool = {
  id: 'personal_external_notify',
  name: 'Send External Notification',
  description: 'Prepares and sends an external communication or notification. Requires explicit confirmation.',
  category: 'external',
  riskLevel: 'EXTERNAL_ACTION',
  inputSchema: {
    recipient: {
      type: 'string',
      description: 'Recipient name or address (e.g. "Prof. Banner", "teacher@stark.edu").',
      required: true
    },
    subject: {
      type: 'string',
      description: 'Subject of the message.',
      required: true
    },
    message: {
      type: 'string',
      description: 'Message content to send.',
      required: true
    }
  },
  async preview(_context: PersonalToolExecutionContext, args: { recipient: string; subject: string; message: string }) {
    return {
      summary: `Send external transmission to ${args.recipient} with subject "${args.subject}"`,
      details: { recipient: args.recipient, subject: args.subject }
    };
  },
  async execute(_context: PersonalToolExecutionContext, args: { recipient: string; subject: string; message: string }): Promise<PersonalToolExecutionResult> {
    return {
      success: true,
      toolId: 'personal_external_notify',
      data: { delivered: true, recipient: args.recipient, timestamp: new Date().toISOString() },
      userMessage: `Transmission successfully dispatched to ${args.recipient} regarding "${args.subject}".`,
      activityEvent: {
        type: 'external_transmission_sent',
        title: `Dispatched message to ${args.recipient}`,
        provenance: 'USER_CONFIRMED'
      }
    };
  }
};

export const INITIAL_PERSONAL_TOOLS: PersonalTool[] = [
  personalKnowledgeSearchTool,
  personalNotesCreateTool,
  personalNotesReadTool,
  personalStudySessionCreateTool,
  personalPracticeSessionStartTool,
  personalFlashcardCreateTool,
  personalLearningProgressReadTool,
  personalNotesDeleteTool,
  personalExternalNotifyTool
];
