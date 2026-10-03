// Milestone 13: Deterministic Smart Quiz Tools for Education Sector
import { Type } from '@google/genai';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from '../../tools/types.ts';
import { smartQuizService } from './quizService.ts';
import { jarvisData } from '../../data/index.ts';
import type { User } from '../../data/types.ts';

async function resolveUserFromContext(context: ToolExecutionContext): Promise<User> {
  const userId = context.userId;
  if (!userId) {
    throw new Error('Tool execution error: Unauthenticated tool context (missing userId).');
  }
  const existing = await jarvisData.users.getById(userId);
  if (!existing) {
    throw new Error(`Tool execution error: User '${userId}' is not a registered user.`);
  }
  return existing;
}

// 1. Tool: quiz.create
interface CreateQuizArgs {
  classId: string;
  classroomSessionId: string;
  title: string;
  description?: string;
  workspaceId?: string;
}

export const createQuizTool: ToolDefinition<CreateQuizArgs> = {
  name: 'quiz.create',
  sector: 'education',
  aliases: ['create_quiz', 'new_quiz'],
  description: 'Creates a new interactive Smart Quiz draft for an authorized classroom session.',
  declaration: {
    name: 'quiz_create',
    description: 'Create a new Smart Quiz draft.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'ID of the class (e.g. "class-phys-301")' },
        classroomSessionId: { type: Type.STRING, description: 'ID of the classroom session' },
        title: { type: Type.STRING, description: 'Title of the quiz' },
        description: { type: Type.STRING, description: 'Optional description of the quiz' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['classId', 'classroomSessionId', 'title']
    }
  },
  validate(args: unknown): ValidationResult<CreateQuizArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.classId || typeof a.classId !== 'string') return { valid: false, error: "Parameter 'classId' is required." };
    if (!a.classroomSessionId || typeof a.classroomSessionId !== 'string') return { valid: false, error: "Parameter 'classroomSessionId' is required." };
    if (!a.title || typeof a.title !== 'string') return { valid: false, error: "Parameter 'title' is required." };
    return {
      valid: true,
      data: {
        classId: a.classId.trim(),
        classroomSessionId: a.classroomSessionId.trim(),
        title: a.title.trim(),
        description: typeof a.description === 'string' ? a.description.trim() : undefined,
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: CreateQuizArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const quiz = await smartQuizService.createQuiz({
        classId: args.classId,
        classroomSessionId: args.classroomSessionId,
        title: args.title,
        description: args.description,
        workspaceId
      }, user);
      return { ok: true, data: { quiz } };
    } catch (err: any) {
      return { ok: false, error: { code: 'QUIZ_CREATE_FAILED', message: err.message || 'Failed to create quiz' } };
    }
  }
};

// 2. Tool: quiz.question.add
interface AddQuestionArgs {
  quizId: string;
  questionText: string;
  options: string[];
  correctOption: string;
  points?: number;
  timeLimitSeconds?: number;
  workspaceId?: string;
}

export const addQuestionTool: ToolDefinition<AddQuestionArgs> = {
  name: 'quiz.question.add',
  sector: 'education',
  aliases: ['add_quiz_question'],
  description: 'Adds a multiple-choice question to an existing Smart Quiz draft.',
  declaration: {
    name: 'quiz_question_add',
    description: 'Add a question to a quiz.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz' },
        questionText: { type: Type.STRING, description: 'Text of the question' },
        options: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of answer options (A, B, C, D)'
        },
        correctOption: { type: Type.STRING, description: 'The correct option letter or text (e.g. "B")' },
        points: { type: Type.NUMBER, description: 'Points awarded for correct response (default 10)' },
        timeLimitSeconds: { type: Type.NUMBER, description: 'Time limit in seconds (default 30)' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId', 'questionText', 'options', 'correctOption']
    }
  },
  validate(args: unknown): ValidationResult<AddQuestionArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    if (!a.questionText || typeof a.questionText !== 'string') return { valid: false, error: "Parameter 'questionText' is required." };
    if (!Array.isArray(a.options) || a.options.length < 2) return { valid: false, error: "Parameter 'options' must be an array with at least 2 items." };
    if (!a.correctOption || typeof a.correctOption !== 'string') return { valid: false, error: "Parameter 'correctOption' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        questionText: a.questionText.trim(),
        options: a.options.map((o: any) => String(o).trim()),
        correctOption: a.correctOption.trim(),
        points: typeof a.points === 'number' ? a.points : undefined,
        timeLimitSeconds: typeof a.timeLimitSeconds === 'number' ? a.timeLimitSeconds : undefined,
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: AddQuestionArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const question = await smartQuizService.addQuestion(
        args.quizId,
        {
          questionText: args.questionText,
          options: args.options,
          correctOption: args.correctOption,
          points: args.points,
          timeLimitSeconds: args.timeLimitSeconds
        },
        user,
        workspaceId
      );
      return { ok: true, data: { question } };
    } catch (err: any) {
      return { ok: false, error: { code: 'ADD_QUESTION_FAILED', message: err.message || 'Failed to add question' } };
    }
  }
};

// 3. Tool: quiz.question.update
interface UpdateQuestionArgs {
  quizId: string;
  questionId: string;
  questionText?: string;
  options?: string[];
  correctOption?: string;
  points?: number;
  timeLimitSeconds?: number;
  workspaceId?: string;
}

export const updateQuestionTool: ToolDefinition<UpdateQuestionArgs> = {
  name: 'quiz.question.update',
  sector: 'education',
  aliases: ['update_quiz_question'],
  description: 'Updates a question in a Smart Quiz.',
  declaration: {
    name: 'quiz_question_update',
    description: 'Update a quiz question.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz' },
        questionId: { type: Type.STRING, description: 'ID of the question' },
        questionText: { type: Type.STRING, description: 'Updated question text' },
        options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Updated options' },
        correctOption: { type: Type.STRING, description: 'Updated correct option' },
        points: { type: Type.NUMBER, description: 'Updated points' },
        timeLimitSeconds: { type: Type.NUMBER, description: 'Updated time limit' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId', 'questionId']
    }
  },
  validate(args: unknown): ValidationResult<UpdateQuestionArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    if (!a.questionId || typeof a.questionId !== 'string') return { valid: false, error: "Parameter 'questionId' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        questionId: a.questionId.trim(),
        questionText: typeof a.questionText === 'string' ? a.questionText.trim() : undefined,
        options: Array.isArray(a.options) ? a.options.map((o: any) => String(o).trim()) : undefined,
        correctOption: typeof a.correctOption === 'string' ? a.correctOption.trim() : undefined,
        points: typeof a.points === 'number' ? a.points : undefined,
        timeLimitSeconds: typeof a.timeLimitSeconds === 'number' ? a.timeLimitSeconds : undefined,
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: UpdateQuestionArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const updated = await smartQuizService.updateQuestion(
        args.quizId,
        args.questionId,
        {
          questionText: args.questionText,
          options: args.options,
          correctOption: args.correctOption,
          points: args.points,
          timeLimitSeconds: args.timeLimitSeconds
        },
        user,
        workspaceId
      );
      return { ok: true, data: { question: updated } };
    } catch (err: any) {
      return { ok: false, error: { code: 'UPDATE_QUESTION_FAILED', message: err.message || 'Failed to update question' } };
    }
  }
};

// 4. Tool: quiz.question.remove
interface RemoveQuestionArgs {
  quizId: string;
  questionId: string;
  workspaceId?: string;
}

export const removeQuestionTool: ToolDefinition<RemoveQuestionArgs> = {
  name: 'quiz.question.remove',
  sector: 'education',
  aliases: ['remove_quiz_question', 'delete_quiz_question'],
  description: 'Removes a question from a Smart Quiz draft.',
  declaration: {
    name: 'quiz_question_remove',
    description: 'Remove a question from a quiz.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz' },
        questionId: { type: Type.STRING, description: 'ID of the question' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId', 'questionId']
    }
  },
  validate(args: unknown): ValidationResult<RemoveQuestionArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    if (!a.questionId || typeof a.questionId !== 'string') return { valid: false, error: "Parameter 'questionId' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        questionId: a.questionId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: RemoveQuestionArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const ok = await smartQuizService.removeQuestion(args.quizId, args.questionId, user, workspaceId);
      return { ok, data: { ok } };
    } catch (err: any) {
      return { ok: false, error: { code: 'REMOVE_QUESTION_FAILED', message: err.message || 'Failed to remove question' } };
    }
  }
};

// 5. Tool: quiz.start
interface StartQuizArgs {
  quizId: string;
  workspaceId?: string;
}

export const startQuizTool: ToolDefinition<StartQuizArgs> = {
  name: 'quiz.start',
  sector: 'education',
  aliases: ['start_quiz', 'launch_quiz'],
  description: 'Starts a live Smart Quiz session, broadcasting Question 1 to the Smart Board and student remotes.',
  declaration: {
    name: 'quiz_start',
    description: 'Start a live quiz.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz to start' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId']
    }
  },
  validate(args: unknown): ValidationResult<StartQuizArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: StartQuizArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const result = await smartQuizService.startQuiz(args.quizId, user, workspaceId);
      return { ok: true, data: result };
    } catch (err: any) {
      return { ok: false, error: { code: 'START_QUIZ_FAILED', message: err.message || 'Failed to start quiz' } };
    }
  }
};

// 6. Tool: quiz.pause
interface PauseQuizArgs {
  quizId: string;
  workspaceId?: string;
}

export const pauseQuizTool: ToolDefinition<PauseQuizArgs> = {
  name: 'quiz.pause',
  sector: 'education',
  aliases: ['pause_quiz'],
  description: 'Pauses an active live quiz session.',
  declaration: {
    name: 'quiz_pause',
    description: 'Pause a live quiz.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId']
    }
  },
  validate(args: unknown): ValidationResult<PauseQuizArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: PauseQuizArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const quiz = await smartQuizService.pauseQuiz(args.quizId, user, workspaceId);
      return { ok: true, data: { quiz } };
    } catch (err: any) {
      return { ok: false, error: { code: 'PAUSE_QUIZ_FAILED', message: err.message || 'Failed to pause quiz' } };
    }
  }
};

// 7. Tool: quiz.resume
interface ResumeQuizArgs {
  quizId: string;
  workspaceId?: string;
}

export const resumeQuizTool: ToolDefinition<ResumeQuizArgs> = {
  name: 'quiz.resume',
  sector: 'education',
  aliases: ['resume_quiz'],
  description: 'Resumes a paused live quiz session.',
  declaration: {
    name: 'quiz_resume',
    description: 'Resume a paused quiz.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId']
    }
  },
  validate(args: unknown): ValidationResult<ResumeQuizArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: ResumeQuizArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const quiz = await smartQuizService.resumeQuiz(args.quizId, user, workspaceId);
      return { ok: true, data: { quiz } };
    } catch (err: any) {
      return { ok: false, error: { code: 'RESUME_QUIZ_FAILED', message: err.message || 'Failed to resume quiz' } };
    }
  }
};

// 8. Tool: quiz.question.start
interface StartQuestionArgs {
  quizId: string;
  questionId: string;
  workspaceId?: string;
}

export const startQuestionTool: ToolDefinition<StartQuestionArgs> = {
  name: 'quiz.question.start',
  sector: 'education',
  aliases: ['start_quiz_question'],
  description: 'Starts accepting responses for a specific question in a live quiz.',
  declaration: {
    name: 'quiz_question_start',
    description: 'Start a specific question in a live quiz.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz' },
        questionId: { type: Type.STRING, description: 'ID of the question' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId', 'questionId']
    }
  },
  validate(args: unknown): ValidationResult<StartQuestionArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    if (!a.questionId || typeof a.questionId !== 'string') return { valid: false, error: "Parameter 'questionId' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        questionId: a.questionId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: StartQuestionArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const result = await smartQuizService.startQuestion(args.quizId, args.questionId, user, workspaceId);
      return { ok: true, data: result };
    } catch (err: any) {
      return { ok: false, error: { code: 'START_QUESTION_FAILED', message: err.message || 'Failed to start question' } };
    }
  }
};

// 9. Tool: quiz.question.lock
interface LockQuestionArgs {
  quizId: string;
  questionId: string;
  workspaceId?: string;
}

export const lockQuestionTool: ToolDefinition<LockQuestionArgs> = {
  name: 'quiz.question.lock',
  sector: 'education',
  aliases: ['lock_quiz_question', 'close_quiz_question'],
  description: 'Locks a question, stops accepting responses, and displays results/aggregates on the Smart Board.',
  declaration: {
    name: 'quiz_question_lock',
    description: 'Lock a question and calculate results.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz' },
        questionId: { type: Type.STRING, description: 'ID of the question' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId', 'questionId']
    }
  },
  validate(args: unknown): ValidationResult<LockQuestionArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    if (!a.questionId || typeof a.questionId !== 'string') return { valid: false, error: "Parameter 'questionId' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        questionId: a.questionId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: LockQuestionArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const aggregate = await smartQuizService.lockQuestion(args.quizId, args.questionId, user, workspaceId);
      return { ok: true, data: { aggregate } };
    } catch (err: any) {
      return { ok: false, error: { code: 'LOCK_QUESTION_FAILED', message: err.message || 'Failed to lock question' } };
    }
  }
};

// 10. Tool: quiz.question.advance
interface AdvanceQuestionArgs {
  quizId: string;
  workspaceId?: string;
}

export const advanceQuestionTool: ToolDefinition<AdvanceQuestionArgs> = {
  name: 'quiz.question.advance',
  sector: 'education',
  aliases: ['advance_quiz', 'next_quiz_question'],
  description: 'Advances the live quiz to the next question, or completes the quiz if on the last question.',
  declaration: {
    name: 'quiz_question_advance',
    description: 'Advance to the next question in a quiz.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId']
    }
  },
  validate(args: unknown): ValidationResult<AdvanceQuestionArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: AdvanceQuestionArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const result = await smartQuizService.advanceQuestion(args.quizId, user, workspaceId);
      return { ok: true, data: result };
    } catch (err: any) {
      return { ok: false, error: { code: 'ADVANCE_QUESTION_FAILED', message: err.message || 'Failed to advance question' } };
    }
  }
};

// 11. Tool: quiz.response.submit
interface SubmitResponseArgs {
  quizId: string;
  questionId: string;
  selectedOption: string;
  workspaceId?: string;
}

export const submitResponseTool: ToolDefinition<SubmitResponseArgs> = {
  name: 'quiz.response.submit',
  sector: 'education',
  aliases: ['submit_quiz_answer', 'answer_quiz'],
  description: 'Submits a student remote answer for the active quiz question.',
  declaration: {
    name: 'quiz_response_submit',
    description: 'Submit an answer to a quiz question.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz' },
        questionId: { type: Type.STRING, description: 'ID of the question' },
        selectedOption: { type: Type.STRING, description: 'Selected option (e.g. "A", "B", "C", "D")' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId', 'questionId', 'selectedOption']
    }
  },
  validate(args: unknown): ValidationResult<SubmitResponseArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    if (!a.questionId || typeof a.questionId !== 'string') return { valid: false, error: "Parameter 'questionId' is required." };
    if (!a.selectedOption || typeof a.selectedOption !== 'string') return { valid: false, error: "Parameter 'selectedOption' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        questionId: a.questionId.trim(),
        selectedOption: a.selectedOption.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: SubmitResponseArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const result = await smartQuizService.submitResponse(
        args.quizId,
        {
          questionId: args.questionId,
          selectedOption: args.selectedOption,
          workspaceId
        },
        user
      );
      return { ok: true, data: result };
    } catch (err: any) {
      return { ok: false, error: { code: 'SUBMIT_RESPONSE_FAILED', message: err.message || 'Failed to submit response' } };
    }
  }
};

// 12. Tool: quiz.status
interface QuizStatusArgs {
  quizId: string;
  workspaceId?: string;
}

export const quizStatusTool: ToolDefinition<QuizStatusArgs> = {
  name: 'quiz.status',
  sector: 'education',
  aliases: ['get_quiz_status', 'quiz_state'],
  description: 'Queries the current authoritative status, active question, and live aggregate for a Smart Quiz.',
  declaration: {
    name: 'quiz_status',
    description: 'Get current quiz status and active question.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId']
    }
  },
  validate(args: unknown): ValidationResult<QuizStatusArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: QuizStatusArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const state = await smartQuizService.getActiveQuestionState(args.quizId, user, workspaceId);
      return { ok: true, data: { state } };
    } catch (err: any) {
      return { ok: false, error: { code: 'GET_STATUS_FAILED', message: err.message || 'Failed to get quiz status' } };
    }
  }
};

// 13. Tool: quiz.results
interface QuizResultsArgs {
  quizId: string;
  workspaceId?: string;
}

export const quizResultsTool: ToolDefinition<QuizResultsArgs> = {
  name: 'quiz.results',
  sector: 'education',
  aliases: ['get_quiz_results', 'quiz_leaderboard'],
  description: 'Retrieves comprehensive results, class averages, question breakdown, and student standings for a quiz.',
  declaration: {
    name: 'quiz_results',
    description: 'Get quiz results and analytics.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId']
    }
  },
  validate(args: unknown): ValidationResult<QuizResultsArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: QuizResultsArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const quiz = await jarvisData.quizzes.getQuizById(args.quizId, workspaceId);
      if (!quiz) throw new Error(`Quiz '${args.quizId}' not found.`);
      const results = await smartQuizService.computeResults(quiz);
      return { ok: true, data: { results } };
    } catch (err: any) {
      return { ok: false, error: { code: 'GET_RESULTS_FAILED', message: err.message || 'Failed to get quiz results' } };
    }
  }
};

// 14. Tool: quiz.complete
interface CompleteQuizArgs {
  quizId: string;
  workspaceId?: string;
}

export const completeQuizTool: ToolDefinition<CompleteQuizArgs> = {
  name: 'quiz.complete',
  sector: 'education',
  aliases: ['end_quiz', 'finish_quiz'],
  description: 'Concludes an active Smart Quiz session, locks all questions, and finalizes class performance scores.',
  declaration: {
    name: 'quiz_complete',
    description: 'Conclude and finalize a quiz.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quizId: { type: Type.STRING, description: 'ID of the quiz' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['quizId']
    }
  },
  validate(args: unknown): ValidationResult<CompleteQuizArgs> {
    if (typeof args !== 'object' || args === null) return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.quizId || typeof a.quizId !== 'string') return { valid: false, error: "Parameter 'quizId' is required." };
    return {
      valid: true,
      data: {
        quizId: a.quizId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: CompleteQuizArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';
      const results = await smartQuizService.completeQuiz(args.quizId, user, workspaceId);
      return { ok: true, data: { results } };
    } catch (err: any) {
      return { ok: false, error: { code: 'COMPLETE_QUIZ_FAILED', message: err.message || 'Failed to complete quiz' } };
    }
  }
};

export const quizTools: ToolDefinition<any>[] = [
  createQuizTool,
  addQuestionTool,
  updateQuestionTool,
  removeQuestionTool,
  startQuizTool,
  pauseQuizTool,
  resumeQuizTool,
  startQuestionTool,
  lockQuestionTool,
  advanceQuestionTool,
  submitResponseTool,
  quizStatusTool,
  quizResultsTool,
  completeQuizTool
];
