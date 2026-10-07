import { personalToolRegistry } from './toolRegistry.ts';
import { confirmationPolicy } from './confirmationPolicy.ts';
import type {
  ToolIntent,
  PersonalToolExecutionContext,
  PersonalToolExecutionResult
} from './types.ts';

/**
 * IntentDetector & Action Router
 * Understands actionable vs conversational requests and parses structured tool intents deterministically.
 */
export class IntentDetector {
  /**
   * Analyzes user message to determine if an action intent is present
   */
  detectIntent(message: string, context: PersonalToolExecutionContext): ToolIntent | null {
    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();

    // 1. Check for Pending Confirmation Action (User says "Yes proceed", "Confirm", "Yes delete")
    const pending = confirmationPolicy.findPendingActionForUser(context.userId);
    if (pending) {
      if (
        lower === 'yes' ||
        lower === 'confirm' ||
        lower.includes('yes proceed') ||
        lower.includes('yes, proceed') ||
        lower.includes('yes delete') ||
        lower.includes('yes, delete') ||
        lower.includes('confirm deletion') ||
        lower.includes('confirm action') ||
        lower.includes('please proceed')
      ) {
        return {
          toolId: pending.toolId,
          arguments: { ...pending.arguments, __pendingActionId: pending.id },
          confidence: 1.0,
          reason: `User confirmed pending high-risk action: ${pending.previewSummary}`,
          requestedByUser: true,
          requiresConfirmation: false, // Already confirmed by user!
          riskLevel: pending.riskLevel
        };
      }
    }

    // 2. High Risk Deletion Requests
    if (
      (lower.includes('delete') || lower.includes('purge') || lower.includes('remove') || lower.includes('clear')) &&
      (lower.includes('note') || lower.includes('history') || lower.includes('all'))
    ) {
      const isDeleteAll = lower.includes('all my') || lower.includes('all notes') || lower.includes('everything') || lower.includes('all');
      let subject: string | undefined;
      if (lower.includes('physics')) subject = 'Physics';
      else if (lower.includes('calculus') || lower.includes('math')) subject = 'Mathematics';

      const matchId = trimmed.match(/note-[a-zA-Z0-9-]+/);
      const noteId = matchId ? matchId[0] : undefined;

      return {
        toolId: 'personal_notes_delete',
        arguments: { noteId, subject, deleteAll: isDeleteAll },
        confidence: 0.95,
        reason: 'User requested deletion of personal notes.',
        requestedByUser: true,
        requiresConfirmation: true,
        riskLevel: 'HIGH_RISK_WRITE'
      };
    }

    // 3. External Transmissions / Notifications
    if (
      lower.startsWith('send email') ||
      lower.startsWith('send message to') ||
      lower.startsWith('notify ') ||
      lower.includes('send this to my teacher')
    ) {
      const recipientMatch = trimmed.match(/to ([^,.]+)/i);
      const recipient = recipientMatch ? recipientMatch[1].trim() : 'Teacher';
      return {
        toolId: 'personal_external_notify',
        arguments: {
          recipient,
          subject: 'Academic Update',
          message: trimmed
        },
        confidence: 0.9,
        reason: 'User requested external transmission.',
        requestedByUser: true,
        requiresConfirmation: true,
        riskLevel: 'EXTERNAL_ACTION'
      };
    }

    // 4. Note Creation
    if (
      lower.startsWith('create note') ||
      lower.startsWith('take note') ||
      lower.startsWith('write a note') ||
      lower.startsWith('save note') ||
      lower.startsWith('note this:') ||
      lower.includes('create a note on') ||
      lower.includes('create a note titled')
    ) {
      let title = 'Study Note';
      let content = trimmed;
      let subject = 'General';

      if (lower.includes('physics') || lower.includes('mechanics') || lower.includes('newton')) subject = 'Physics';
      if (lower.includes('math') || lower.includes('calculus') || lower.includes('derivative')) subject = 'Mathematics';

      const titleMatch = trimmed.match(/titled ["']?([^"'\n]+)["']?/i) || trimmed.match(/on ["']?([^"'\n]+)["']?/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      } else {
        const colonSplit = trimmed.split(':');
        if (colonSplit.length > 1) {
          title = colonSplit[0].replace(/create note|take note|save note/i, '').trim() || 'Study Note';
          content = colonSplit.slice(1).join(':').trim();
        }
      }

      return {
        toolId: 'personal_notes_create',
        arguments: {
          title: title || 'Personal Note',
          content: content || trimmed,
          subject,
          tags: [subject.toLowerCase()]
        },
        confidence: 0.95,
        reason: 'User requested personal note creation.',
        requestedByUser: true,
        requiresConfirmation: false,
        riskLevel: 'LOW_RISK_WRITE'
      };
    }

    // 5. Note Reading / Searching
    if (
      lower.includes('show my notes') ||
      lower.includes('show me my notes') ||
      lower.includes('show notes') ||
      lower.includes('read notes') ||
      lower.includes('read my notes') ||
      lower.includes('find notes') ||
      lower.includes('search notes') ||
      (lower.includes('show') && lower.includes('note')) ||
      (lower.includes('read') && lower.includes('note'))
    ) {
      let subject: string | undefined;
      if (lower.includes('physics')) subject = 'Physics';
      if (lower.includes('math') || lower.includes('calculus')) subject = 'Mathematics';

      return {
        toolId: 'personal_notes_read',
        arguments: { subject },
        confidence: 0.95,
        reason: 'User requested reading personal notes.',
        requestedByUser: true,
        requiresConfirmation: false,
        riskLevel: 'READ_ONLY'
      };
    }

    // 6. Study Session Planning
    if (
      lower.startsWith('plan a study session') ||
      lower.startsWith('schedule a study session') ||
      lower.startsWith('schedule revision') ||
      lower.includes('create a revision session for') ||
      lower.includes('plan study session')
    ) {
      let subject = 'Physics';
      if (lower.includes('math') || lower.includes('calculus')) subject = 'Mathematics';

      let title = 'Revision Session';
      if (lower.includes('newton')) title = "Newton's Laws Revision Session";
      else if (lower.includes('vector')) title = 'Vector Decomposition Revision';
      else if (lower.includes('calculus')) title = 'Calculus Review';

      return {
        toolId: 'personal_study_session_create',
        arguments: {
          title,
          subject,
          durationMinutes: 45,
          goals: [`Review ${subject} concepts`, 'Complete practice set']
        },
        confidence: 0.95,
        reason: 'User requested study session scheduling.',
        requestedByUser: true,
        requiresConfirmation: false,
        riskLevel: 'LOW_RISK_WRITE'
      };
    }

    // 7. Practice Session Starting
    if (
      lower.startsWith('start practice') ||
      lower.startsWith('start a practice') ||
      lower.startsWith("let's practice") ||
      lower.includes('practice questions on') ||
      lower.includes('start practice session for')
    ) {
      let conceptName = "Newton's Laws of Motion";
      let subject = 'Physics';

      if (lower.includes('vector')) conceptName = 'Vector Force Decomposition';
      else if (lower.includes('quantum') || lower.includes('wave')) conceptName = 'Quantum Wave Functions & Born Interpretation';
      else if (lower.includes('calculus') || lower.includes('chain')) { conceptName = 'Chain Rule & Differential Calculus'; subject = 'Mathematics'; }

      return {
        toolId: 'personal_practice_session_start',
        arguments: {
          conceptName,
          subject,
          itemCount: 3
        },
        confidence: 0.95,
        reason: 'User requested interactive practice session.',
        requestedByUser: true,
        requiresConfirmation: false,
        riskLevel: 'LOW_RISK_WRITE'
      };
    }

    // 8. Flashcard Creation
    if (
      lower.startsWith('create flashcard') ||
      lower.startsWith('make a flashcard') ||
      lower.startsWith('add flashcard') ||
      lower.includes('create a flashcard for')
    ) {
      let front = 'Concept Query';
      let back = 'Concept Answer';
      let subject = 'Physics';

      if (lower.includes('newton')) {
        front = "What is Newton's Second Law?";
        back = 'F_net = m*a (or dp/dt in differential form)';
      } else {
        const parts = trimmed.split(/[:\-\?]/);
        if (parts.length >= 2) {
          front = parts[0].replace(/create flashcard|make a flashcard|add flashcard/i, '').trim();
          back = parts.slice(1).join(' ').trim();
        }
      }

      return {
        toolId: 'personal_flashcard_create',
        arguments: {
          front: front || 'Concept Question',
          back: back || 'Concept Answer',
          subject
        },
        confidence: 0.95,
        reason: 'User requested flashcard creation.',
        requestedByUser: true,
        requiresConfirmation: false,
        riskLevel: 'LOW_RISK_WRITE'
      };
    }

    // 9. Learning Progress Reading
    if (
      lower.includes('learning progress') ||
      lower.includes('learning summary') ||
      lower.includes('progress summary') ||
      lower.includes('weak at') ||
      lower.includes('mastery summary') ||
      lower === 'show my learning progress' ||
      lower === 'what is my learning progress'
    ) {
      return {
        toolId: 'personal_learning_progress_read',
        arguments: {},
        confidence: 0.95,
        reason: 'User requested learning progress overview.',
        requestedByUser: true,
        requiresConfirmation: false,
        riskLevel: 'READ_ONLY'
      };
    }

    // 10. Personal Knowledge Search
    if (
      lower.startsWith('search knowledge for') ||
      lower.startsWith('search my knowledge for') ||
      lower.startsWith('lookup knowledge') ||
      lower.includes('check my knowledge state on')
    ) {
      const query = trimmed.replace(/search knowledge for|search my knowledge for|lookup knowledge|check my knowledge state on/i, '').trim();
      return {
        toolId: 'personal_knowledge_search',
        arguments: { query: query || 'physics' },
        confidence: 0.95,
        reason: 'User requested knowledge search.',
        requestedByUser: true,
        requiresConfirmation: false,
        riskLevel: 'READ_ONLY'
      };
    }

    return null;
  }

  /**
   * Generates natural Jarvis phrasing for a tool execution result
   */
  generateNaturalResponse(
    toolId: string,
    result: PersonalToolExecutionResult,
    preferredName: string = 'Sir'
  ): string {
    if (!result.success) {
      return `I encountered an issue executing ${toolId}, ${preferredName}: ${result.userMessage}`;
    }

    return `${result.userMessage}`;
  }
}

export const intentDetector = new IntentDetector();
