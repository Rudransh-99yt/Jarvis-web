// Authorization & Security Boundary Policy for ClassSession Operations
import type { User, WorkspaceMembership } from '../../../data/types.ts';
import type { IJarvisDataRepository } from '../../../data/repository.ts';
import { jarvisData } from '../../../data/index.ts';
import type { ClassSession, PresentationSlide, SessionQuizQuestion } from '../../../../src/types/classSession.ts';
import type { EducationClass } from '../../../../src/types/education.ts';

export interface SessionAuthResult {
  allowed: boolean;
  statusCode?: number;
  reason?: string;
  cls?: EducationClass;
  session?: ClassSession;
}

export class ClassSessionPolicy {
  private repo: IJarvisDataRepository;

  constructor(repo: IJarvisDataRepository = jarvisData) {
    this.repo = repo;
  }

  /**
   * 1. Verifies workspace membership & school boundary
   */
  async verifyWorkspaceMembership(user: User, workspaceId: string): Promise<{ isMember: boolean; role?: string }> {
    if (!workspaceId) return { isMember: false };
    const members = await this.repo.workspaces.getMembers(workspaceId);
    const membership = members.find((m: WorkspaceMembership) => m.userId === user.id);
    if (membership) {
      return { isMember: true, role: membership.role };
    }
    // High-privilege system commanders/admins have default access within system workspaces
    if (user.role === 'commander' || user.role === 'admin') {
      const ws = await this.repo.workspaces.getById(workspaceId);
      if (ws) return { isMember: true, role: 'admin' };
    }
    return { isMember: false };
  }

  /**
   * 2. Authorizes creating a new ClassSession
   */
  async canCreateSession(user: User, classId: string, workspaceId: string): Promise<SessionAuthResult> {
    const wsCheck = await this.verifyWorkspaceMembership(user, workspaceId);
    if (!wsCheck.isMember) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Cross-workspace access denied: User '${user.id}' is not a member of workspace '${workspaceId}'.`
      };
    }

    const cls = await this.repo.education.getClassById(classId);
    if (!cls) {
      return {
        allowed: false,
        statusCode: 404,
        reason: `Class '${classId}' not found.`
      };
    }

    // Role check: Only assigned instructor or system admin/commander can create/prepare sessions
    const isInstructor = cls.instructorId === user.id || cls.instructorName === user.displayName || (cls as any).teacherId === user.id;
    const isSystemAdmin = user.role === 'commander' || user.role === 'admin';

    if (!isInstructor && !isSystemAdmin) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Unauthorized: User '${user.displayName || user.id}' is not the assigned instructor for ${cls.code}.`
      };
    }

    return { allowed: true, cls };
  }

  /**
   * 3. Authorizes modifying, generating, or approving a session
   */
  async canManageSession(user: User, session: ClassSession, workspaceId: string): Promise<SessionAuthResult> {
    const wsCheck = await this.verifyWorkspaceMembership(user, workspaceId);
    if (!wsCheck.isMember) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Cross-workspace access denied for session '${session.id}'.`
      };
    }

    const isOwner = session.teacherId === user.id || (session as any).teacher?.id === user.id;
    const isSystemAdmin = user.role === 'commander' || user.role === 'admin';

    if (!isOwner && !isSystemAdmin) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Unauthorized: Only the session instructor can modify or approve this class session.`
      };
    }

    return { allowed: true, session };
  }

  /**
   * 4. Sanitizes a ClassSession for student delivery (NEVER expose answer keys to students!)
   */
  sanitizeForStudent(session: ClassSession): Partial<ClassSession> {
    const sanitized: any = {
      id: session.id,
      workspaceId: session.workspaceId,
      schoolId: session.schoolId,
      classId: session.classId,
      courseCode: session.courseCode,
      courseName: session.courseName,
      subject: session.subject,
      unitId: session.unitId,
      unitTitle: session.unitTitle,
      lessonId: session.lessonId,
      lessonTitle: session.lessonTitle,
      topic: session.topic,
      teacherName: session.teacherName,
      scheduledAt: session.scheduledAt,
      durationMinutes: session.durationMinutes,
      status: session.status,
      releaseControls: session.releaseControls,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };

    // Release-controlled student exposure
    if (session.releaseControls?.presentationReleased && session.presentation?.isApproved) {
      // Expose presentation without teacherNotes
      sanitized.presentation = {
        ...session.presentation,
        slides: session.presentation.slides.map((s: PresentationSlide) => ({
          id: s.id,
          slideNumber: s.slideNumber,
          title: s.title,
          bulletPoints: s.bulletPoints,
          latexFormula: s.latexFormula,
          visualInstruction: s.visualInstruction
        }))
      };
    }

    if (session.releaseControls?.studentNotesReleased && session.studentMaterials?.isApproved) {
      sanitized.studentMaterials = session.studentMaterials;
    }

    if (session.releaseControls?.flashcardsReleased && session.flashcards?.isApproved) {
      sanitized.flashcards = session.flashcards;
    }

    if (session.releaseControls?.homeworkReleased && session.homework?.isApproved) {
      sanitized.homework = session.homework;
    }

    if (session.releaseControls?.quizReleased && session.quiz?.isApproved) {
      // Expose quiz questions WITHOUT answers for test taking
      sanitized.quiz = {
        id: session.quiz.id,
        title: session.quiz.title,
        targetMinutes: session.quiz.targetMinutes,
        isApproved: true,
        updatedAt: session.quiz.updatedAt,
        questions: session.quiz.questions.map((q: SessionQuizQuestion) => ({
          id: q.id,
          questionNumber: q.questionNumber,
          type: q.type,
          question: q.question,
          options: q.options,
          difficulty: q.difficulty,
          points: q.points
          // correctAnswer, explanation, and sourceReference stripped
        }))
      };
    }

    // STRICT SECURITY: answerKey and teacherNotes are NEVER attached in student view
    return sanitized;
  }
}

export const classSessionPolicy = new ClassSessionPolicy();
