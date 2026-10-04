// JARVIS EDUCATION OS — PHASE D: ACADEMIC INTEGRATION SERVICE
// Establishes unified domain links, lightweight event foundation, bounded AI context, and connected workflows.

import { EventEmitter } from 'node:events';
import type {
  AcademicContext,
  LearningLink,
  LearningObjectType,
  LearningLinkRelation,
  AcademicEvent,
  AcademicEventType,
  AcademicNotification,
  QuizResult,
  CalendarFeedItem,
  BoundedAiContext
} from '../../../src/types/academicContext.ts';
import type { User } from '../../data/types.ts';
import { jarvisData } from '../../data/index.ts';
import { educationStore } from './educationStore.ts';
import { classSessionStore } from './classSessions/classSessionStore.ts';
import { communityStore } from './community/communityStore.ts';
import { focusStore } from './focus/focusStore.ts';
import type { ClassSession, SourceMaterialRef } from '../../../src/types/classSession.ts';
import type { WorkspacePage } from '../../../src/types/workspace.ts';
import type { Assignment } from '../../../src/types/education.ts';
import type { Quiz } from '../../../src/types/quiz.ts';

class AcademicIntegrationService extends EventEmitter {
  private inMemoryLinks: LearningLink[] = [];
  private inMemoryEvents: AcademicEvent[] = [];
  private inMemoryNotifications: AcademicNotification[] = [];
  private inMemoryQuizResults: QuizResult[] = [];
  private initialized = false;

  constructor() {
    super();
    this.initDefaultLinks();
  }

  private initDefaultLinks(): void {
    if (this.initialized) return;

    // Seed realistic foundational links connecting Class 12 Physics objects
    const defaultLinks: LearningLink[] = [
      {
        id: 'link-init-session-lesson',
        workspaceId: 'ws-stark-core',
        sourceType: 'classSession',
        sourceId: 'session-phys-101',
        targetType: 'lesson',
        targetId: 'les-phys-101',
        relation: 'curriculum',
        title: "Coulomb's Law, Electric Fields & Gauss Surface Flux",
        createdBy: 'teacher-1',
        createdAt: '2026-10-01T09:00:00.000Z',
        context: {
          institutionId: 'inst-stark-academy',
          workspaceId: 'ws-stark-core',
          classId: 'class-phys-301',
          className: 'Advanced Quantum & Classical Electrodynamics',
          courseId: 'class-phys-301',
          courseCode: 'PHYS-301',
          subjectName: 'Physics',
          unitId: 'unit-phys-1',
          unitTitle: 'Foundations of Wave Mechanics & Schrödinger Dynamics',
          lessonId: 'les-phys-101',
          lessonTitle: "Schrödinger Wave Equation & Postulates",
          classSessionId: 'session-phys-101'
        }
      },
      {
        id: 'link-init-session-workspace',
        workspaceId: 'ws-stark-core',
        sourceType: 'classSession',
        sourceId: 'session-phys-101',
        targetType: 'workspacePage',
        targetId: 'wp-quantum-notes',
        relation: 'notes',
        title: 'Quantum Wave Mechanics Lecture Blueprint & Notes',
        createdBy: 'teacher-1',
        createdAt: '2026-10-01T09:05:00.000Z'
      },
      {
        id: 'link-init-session-community',
        workspaceId: 'ws-stark-core',
        sourceType: 'classSession',
        sourceId: 'session-phys-101',
        targetType: 'communityChannel',
        targetId: 'chan-phys301-theory',
        relation: 'discussion',
        title: 'Physics 301 Electrostatics & Wave Discussion',
        createdBy: 'teacher-1',
        createdAt: '2026-10-01T09:10:00.000Z'
      },
      {
        id: 'link-init-session-assignment',
        workspaceId: 'ws-stark-core',
        sourceType: 'classSession',
        sourceId: 'session-phys-101',
        targetType: 'assignment',
        targetId: 'asg-101',
        relation: 'homework',
        title: 'Problem Set 1: Wave Function Derivations',
        createdBy: 'teacher-1',
        createdAt: '2026-10-01T09:15:00.000Z'
      },
      {
        id: 'link-init-asgn-lesson',
        workspaceId: 'ws-stark-core',
        sourceType: 'assignment',
        sourceId: 'asg-101',
        targetType: 'lesson',
        targetId: 'les-phys-101',
        relation: 'curriculum',
        title: 'Schrödinger Wave Equation & Postulates',
        createdBy: 'teacher-1',
        createdAt: '2026-10-01T09:15:00.000Z'
      },
      {
        id: 'link-init-lesson-knowledge',
        workspaceId: 'ws-stark-core',
        sourceType: 'lesson',
        sourceId: 'les-phys-101',
        targetType: 'knowledgeSpace',
        targetId: 'ks-quantum',
        relation: 'material',
        title: 'Quantum Mechanics Knowledge Space',
        createdBy: 'teacher-1',
        createdAt: '2026-10-01T09:20:00.000Z'
      }
    ];

    this.inMemoryLinks = defaultLinks;

    // Seed initial notifications
    this.inMemoryNotifications = [
      {
        id: 'notif-1',
        type: 'CLASS_SESSION_SCHEDULED',
        actorId: 'teacher-1',
        recipientId: 'all',
        targetType: 'classSession',
        targetId: 'session-phys-101',
        title: 'New Class Session Scheduled: PHYS-301',
        message: 'Dr. Helen Cho scheduled "Electrostatics & Electric Field Formulations" for tomorrow.',
        context: defaultLinks[0].context,
        readState: false,
        createdAt: '2026-10-01T10:00:00.000Z'
      },
      {
        id: 'notif-2',
        type: 'ASSIGNMENT_CREATED',
        actorId: 'teacher-1',
        recipientId: 'all',
        targetType: 'assignment',
        targetId: 'asg-101',
        title: 'Assignment Assigned: Problem Set 1',
        message: 'Wave Function Derivations homework is now available in your academic calendar.',
        readState: false,
        createdAt: '2026-10-01T10:30:00.000Z'
      }
    ];

    // Seed initial events
    this.inMemoryEvents = [
      {
        id: 'evt-init-1',
        type: 'classSession.scheduled',
        actorId: 'teacher-1',
        workspaceId: 'ws-stark-core',
        context: defaultLinks[0].context || { institutionId: 'inst-stark-academy' },
        entityType: 'classSession',
        entityId: 'session-phys-101',
        createdAt: '2026-10-01T10:00:00.000Z'
      }
    ];

    // Seed initial quiz result
    this.inMemoryQuizResults = [
      {
        id: 'qr-seed-1',
        studentId: 'student-1',
        studentName: 'Alex Mercer',
        quizId: 'quiz-phys-301-1',
        quizTitle: 'Schrödinger Postulates & Wave Packet Formulations',
        classSessionId: 'session-phys-101',
        lessonId: 'les-phys-101',
        concepts: ['Hermitian Operators', 'Born Rule', 'Probability Density'],
        score: 4,
        totalQuestions: 5,
        percentage: 80,
        completed: true,
        timestamp: '2026-10-02T14:30:00.000Z'
      }
    ];

    this.initialized = true;
  }

  // --- ACADEMIC CONTEXT RESOLVER ---

  resolveContext(entityType: LearningObjectType, entityId: string): AcademicContext {
    const institutionId = 'inst-stark-academy';
    const workspaceId = 'ws-stark-core';

    // 1. If ClassSession
    if (entityType === 'classSession') {
      const session = classSessionStore.getSessionSync
        ? classSessionStore.getSessionSync(entityId)
        : ((classSessionStore as any).sessions?.get?.(entityId) ?? null);
      if (session) {
        return {
          institutionId: session.schoolId || institutionId,
          workspaceId: session.workspaceId || workspaceId,
          classId: session.classId,
          className: session.courseName,
          courseId: session.classId,
          courseCode: session.courseCode,
          courseName: session.courseName,
          subjectName: session.subject,
          unitId: session.unitId || 'unit-phys-1',
          unitTitle: session.unitTitle,
          lessonId: session.lessonId || 'les-phys-101',
          lessonTitle: session.lessonTitle || session.topic,
          classSessionId: session.id,
          knowledgeSpaceIds: session.sourceMaterials
            ?.map((sm: SourceMaterialRef) => sm.knowledgeSpaceId)
            .filter((x: string | undefined): x is string => !!x) || ['ks-quantum']
        };
      }
    }

    // 2. If Lesson
    if (entityType === 'lesson') {
      const classes = educationStore.getClasses();
      for (const cls of classes) {
        const units = cls.units || [];
        for (const u of units) {
          const l = u.lessons?.find((les) => les.id === entityId);
          if (l) {
            return {
              institutionId,
              workspaceId,
              classId: cls.id,
              className: cls.name,
              courseId: cls.id,
              courseCode: cls.code,
              courseName: cls.name,
              subjectName: cls.name.includes('Physics') ? 'Physics' : cls.name.includes('Computer') ? 'Computer Science' : 'Mathematics',
              unitId: u.id,
              unitTitle: u.title,
              chapterId: u.id,
              chapterTitle: u.title,
              lessonId: l.id,
              lessonTitle: l.title,
              knowledgeSpaceIds: l.knowledgeSpaceId ? [l.knowledgeSpaceId] : ['ks-quantum']
            };
          }
        }
      }
    }

    // 3. If Assignment
    if (entityType === 'assignment') {
      const asg = educationStore.getAssignment(entityId);
      if (asg) {
        const cls = educationStore.getClass(asg.classId);
        return {
          institutionId,
          workspaceId,
          classId: asg.classId,
          className: asg.className || cls?.name,
          courseId: asg.classId,
          courseCode: cls?.code || 'PHYS-301',
          courseName: asg.className || cls?.name,
          subjectName: cls?.name?.includes('Physics') ? 'Physics' : 'General Science',
          unitId: (asg as any).unitId || 'unit-phys-1',
          lessonId: (asg as any).lessonId || 'les-phys-101',
          assignmentId: asg.id,
          classSessionId: (asg as any).classSessionId
        };
      }
    }

    // 4. If Workspace Page
    if (entityType === 'workspacePage') {
      const pages = educationStore.getWorkspacePages();
      const page = pages.find((p) => p.id === entityId);
      if (page?.academicLink) {
        const al = page.academicLink;
        return {
          institutionId,
          workspaceId,
          classId: al.classId || al.courseId,
          courseId: al.courseId,
          courseCode: al.courseCode,
          unitId: al.unitId,
          unitTitle: al.unitTitle,
          lessonId: al.lessonId,
          lessonTitle: al.lessonTitle,
          classSessionId: al.classSessionId,
          assignmentId: al.assignmentId,
          workspacePageId: page.id,
          knowledgeSpaceIds: al.knowledgeSpaceId ? [al.knowledgeSpaceId] : undefined
        };
      }
    }

    // Fallback baseline Stark Academy context
    return {
      institutionId,
      workspaceId,
      classId: 'class-phys-301',
      courseCode: 'PHYS-301',
      courseName: 'Advanced Quantum & Classical Electrodynamics',
      subjectName: 'Physics',
      ...(entityType === 'assignment' ? { assignmentId: entityId } : {}),
      ...(entityType === 'lesson' ? { lessonId: entityId } : {}),
      ...(entityType === 'classSession' ? { classSessionId: entityId } : {})
    };
  }

  // --- LEARNING LINKS MANAGEMENT ---

  createLink(linkInput: Omit<LearningLink, 'id' | 'createdAt'>): LearningLink {
    const id = `link-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newLink: LearningLink = {
      ...linkInput,
      id,
      createdAt: new Date().toISOString()
    };
    this.inMemoryLinks.push(newLink);

    // Also persist into repository state if available
    try {
      const state = (jarvisData as any)['store'] ? (jarvisData as any)['store'].getState() : null;
      if (state) {
        if (!state.learningLinks) state.learningLinks = [];
        state.learningLinks.push(newLink);
      }
    } catch {
      // Memory store is already updated
    }

    return newLink;
  }

  getLinks(filter: {
    sourceType?: LearningObjectType;
    sourceId?: string;
    targetType?: LearningObjectType;
    targetId?: string;
    entityType?: LearningObjectType;
    entityId?: string;
  }): LearningLink[] {
    return this.inMemoryLinks.filter((link) => {
      if (filter.entityId && filter.entityType) {
        const matchesSource = link.sourceType === filter.entityType && link.sourceId === filter.entityId;
        const matchesTarget = link.targetType === filter.entityType && link.targetId === filter.entityId;
        return matchesSource || matchesTarget;
      }
      if (filter.sourceType && link.sourceType !== filter.sourceType) return false;
      if (filter.sourceId && link.sourceId !== filter.sourceId) return false;
      if (filter.targetType && link.targetType !== filter.targetType) return false;
      if (filter.targetId && link.targetId !== filter.targetId) return false;
      return true;
    });
  }

  deleteLink(linkId: string): boolean {
    const idx = this.inMemoryLinks.findIndex((l) => l.id === linkId);
    if (idx !== -1) {
      this.inMemoryLinks.splice(idx, 1);
      return true;
    }
    return false;
  }

  // --- DOMAIN EVENTS ---

  publishEvent(eventInput: Omit<AcademicEvent, 'id' | 'createdAt'>): AcademicEvent {
    const id = `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const event: AcademicEvent = {
      ...eventInput,
      id,
      createdAt: new Date().toISOString()
    };
    this.inMemoryEvents.unshift(event);
    if (this.inMemoryEvents.length > 500) {
      this.inMemoryEvents.pop();
    }

    this.emit('academicEvent', event);
    this.emit(event.type, event);

    return event;
  }

  getEvents(filter?: {
    workspaceId?: string;
    actorId?: string;
    entityId?: string;
    type?: AcademicEventType;
    limit?: number;
  }): AcademicEvent[] {
    let result = this.inMemoryEvents;
    if (filter) {
      if (filter.workspaceId) result = result.filter((e) => e.workspaceId === filter.workspaceId);
      if (filter.actorId) result = result.filter((e) => e.actorId === filter.actorId);
      if (filter.entityId) result = result.filter((e) => e.entityId === filter.entityId);
      if (filter.type) result = result.filter((e) => e.type === filter.type);
    }
    const limit = filter?.limit || 50;
    return result.slice(0, limit);
  }

  // --- NOTIFICATIONS ---

  createNotification(notifInput: Omit<AcademicNotification, 'id' | 'createdAt' | 'readState'>): AcademicNotification {
    const id = `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const notif: AcademicNotification = {
      ...notifInput,
      id,
      readState: false,
      createdAt: new Date().toISOString()
    };
    this.inMemoryNotifications.unshift(notif);
    this.emit('notification', notif);
    return notif;
  }

  getNotifications(userId: string): AcademicNotification[] {
    return this.inMemoryNotifications.filter(
      (n) => n.recipientId === 'all' || n.recipientId === userId
    );
  }

  markNotificationRead(notificationId: string, _userId: string): boolean {
    const notif = this.inMemoryNotifications.find((n) => n.id === notificationId);
    if (notif) {
      notif.readState = true;
      return true;
    }
    return false;
  }

  // --- QUIZ RESULTS ---

  recordQuizResult(resultInput: Omit<QuizResult, 'id' | 'timestamp'>): QuizResult {
    const id = `qr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const result: QuizResult = {
      ...resultInput,
      id,
      timestamp: new Date().toISOString()
    };
    this.inMemoryQuizResults.unshift(result);

    // Also link result to lesson and quiz
    this.createLink({
      workspaceId: 'ws-stark-core',
      sourceType: 'quizResult',
      sourceId: id,
      targetType: 'quiz',
      targetId: result.quizId,
      relation: 'assessment',
      createdBy: result.studentId
    });

    if (result.lessonId) {
      this.createLink({
        workspaceId: 'ws-stark-core',
        sourceType: 'quizResult',
        sourceId: id,
        targetType: 'lesson',
        targetId: result.lessonId,
        relation: 'assessment',
        createdBy: result.studentId
      });
    }

    this.publishEvent({
      type: 'quiz.completed',
      actorId: result.studentId,
      workspaceId: 'ws-stark-core',
      context: {
        institutionId: 'inst-stark-academy',
        lessonId: result.lessonId,
        quizId: result.quizId,
        classSessionId: result.classSessionId
      },
      entityType: 'quizResult',
      entityId: id,
      metadata: {
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: result.percentage,
        concepts: result.concepts
      }
    });

    return result;
  }

  getQuizResults(filter?: { studentId?: string; lessonId?: string; quizId?: string }): QuizResult[] {
    return this.inMemoryQuizResults.filter((qr) => {
      if (filter?.studentId && qr.studentId !== filter.studentId) return false;
      if (filter?.lessonId && qr.lessonId !== filter.lessonId) return false;
      if (filter?.quizId && qr.quizId !== filter.quizId) return false;
      return true;
    });
  }

  // --- UNIFIED CALENDAR FEED ---

  async getCalendarFeed(_workspaceId: string, classId?: string): Promise<CalendarFeedItem[]> {
    const feed: CalendarFeedItem[] = [];

    // 1. Add Scheduled ClassSessions
    try {
      const sessions = await classSessionStore.listSessions();
      for (const s of sessions) {
        if (classId && s.classId !== classId) continue;
        const dateStr = s.scheduledAt ? s.scheduledAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
        const timeStr = s.scheduledAt
          ? new Date(s.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '10:00 AM';

        feed.push({
          id: `cal-session-${s.id}`,
          title: `${s.courseCode}: ${s.topic} (Lecture & Lab)`,
          type: 'class_session',
          date: dateStr,
          time: `${timeStr} (${s.durationMinutes} min)`,
          courseCode: s.courseCode,
          courseName: s.courseName,
          location: 'Quantum Hall 4B · SmartBoard Ready',
          classId: s.classId,
          courseId: s.classId,
          unitId: s.unitId,
          lessonId: s.lessonId,
          classSessionId: s.id,
          context: {
            institutionId: s.schoolId || 'inst-stark-academy',
            classId: s.classId,
            courseCode: s.courseCode,
            courseName: s.courseName,
            topic: s.topic,
            classSessionId: s.id,
            lessonId: s.lessonId
          } as any
        });
      }
    } catch (err) {
      console.warn('Could not load sessions for calendar:', err);
    }

    // 2. Add Assignments with Due Dates
    try {
      const assignments = educationStore.getAssignments();
      for (const a of assignments) {
        if (classId && a.classId !== classId) continue;
        const dateStr = a.dueDate ? a.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10);

        feed.push({
          id: `cal-asg-${a.id}`,
          title: `[Due] ${a.title}`,
          type: 'assignment_due',
          date: dateStr,
          time: '11:59 PM Deadline',
          courseCode: a.className ? a.className.split(' ')[0] : 'PHYS-301',
          courseName: a.className,
          classId: a.classId,
          courseId: a.classId,
          unitId: (a as any).unitId,
          lessonId: (a as any).lessonId,
          assignmentId: a.id,
          context: {
            institutionId: 'inst-stark-academy',
            classId: a.classId,
            assignmentId: a.id,
            lessonId: (a as any).lessonId
          } as any
        });
      }
    } catch (err) {
      console.warn('Could not load assignments for calendar:', err);
    }

    // 3. Add Study Blocks / Study Groups
    try {
      const channels = await communityStore.listChannels();
      const studyGroups = channels.filter((c) => c.type === 'STUDY_GROUP');
      for (const sg of studyGroups) {
        feed.push({
          id: `cal-sg-${sg.id}`,
          title: `Peer Study Group: #${sg.name}`,
          type: 'study_block',
          date: new Date().toISOString().slice(0, 10),
          time: '04:00 PM - 05:30 PM',
          courseCode: sg.classId === 'class-cs-501' ? 'CS-501' : 'PHYS-301',
          courseName: 'Academic Community Hub',
          location: 'Study Hub 2 · Discord Channel',
          classId: sg.classId,
          context: {
            institutionId: sg.schoolId,
            communityChannelId: sg.id
          } as any
        });
      }
    } catch {
      // Fallback
    }

    // Sort chronologically by date
    feed.sort((a, b) => a.date.localeCompare(b.date));
    return feed;
  }

  // --- CONNECTED TEACHER WORKFLOW: LINK ALL FOR SESSION ---

  async linkAllForClassSession(
    sessionId: string,
    teacher: User
  ): Promise<{
    session: ClassSession;
    linkedWorkspacePage?: WorkspacePage;
    linkedQuiz?: Quiz;
    linkedAssignment?: Assignment;
    linksCreated: LearningLink[];
  }> {
    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      throw new Error(`ClassSession '${sessionId}' not found.`);
    }

    const createdLinks: LearningLink[] = [];
    const context = this.resolveContext('classSession', sessionId);

    // 1. Link to Curriculum (Course, Unit, Lesson)
    if (session.lessonId) {
      const lessonLink = this.createLink({
        workspaceId: session.workspaceId || 'ws-stark-core',
        sourceType: 'classSession',
        sourceId: session.id,
        targetType: 'lesson',
        targetId: session.lessonId,
        relation: 'curriculum',
        title: session.lessonTitle || session.topic,
        context,
        createdBy: teacher.id
      });
      createdLinks.push(lessonLink);
    }

    // 2. Create Notion-Style Workspace Page for Session Notes & Lesson Plan
    let linkedWorkspacePage: WorkspacePage | undefined;
    try {
      const pageTitle = `${session.courseCode}: ${session.topic} — Lesson Blueprint & Notes`;
      const blocks: any[] = [
        {
          id: `blk-${Date.now()}-1`,
          type: 'heading_1',
          content: session.topic
        },
        {
          id: `blk-${Date.now()}-2`,
          type: 'callout',
          content: `Approved Session for ${session.courseName} (${session.courseCode}). Target Duration: ${session.durationMinutes} min. Scheduled: ${session.scheduledAt || 'Tomorrow'}.`,
          properties: { calloutType: 'info' }
        }
      ];

      if (session.lessonPlan) {
        blocks.push({
          id: `blk-${Date.now()}-3`,
          type: 'heading_2',
          content: 'Learning Objectives'
        });
        session.lessonPlan.learningObjectives.forEach((obj, idx) => {
          blocks.push({
            id: `blk-${Date.now()}-obj-${idx}`,
            type: 'bullet_list',
            content: obj
          });
        });

        if (session.lessonPlan.workedExamples?.length > 0) {
          blocks.push({
            id: `blk-${Date.now()}-we-hdr`,
            type: 'heading_2',
            content: 'Key Worked Problem'
          });
          const ex = session.lessonPlan.workedExamples[0];
          blocks.push({
            id: `blk-${Date.now()}-we-content`,
            type: 'quote',
            content: `Problem: ${ex.problem}\n\nSolution: ${ex.solution}\n\nKey Intuition: ${ex.keyIntuition}`
          });
        }
      }

      if (session.teacherNotes) {
        blocks.push({
          id: `blk-${Date.now()}-tn-hdr`,
          type: 'heading_2',
          content: 'Teacher Classroom Pacing & Blackboard Plan'
        });
        session.teacherNotes.blackboardLayouts.forEach((bb, idx) => {
          blocks.push({
            id: `blk-${Date.now()}-bb-${idx}`,
            type: 'bullet_list',
            content: `Panel ${idx + 1}: ${bb}`
          });
        });
      }

      linkedWorkspacePage = educationStore.createWorkspacePage({
        title: pageTitle,
        type: 'notes',
        ownerId: teacher.id,
        ownerName: teacher.displayName,
        ownerRole: 'teacher',
        visibility: 'class_shared',
        parentId: null,
        tags: [session.courseCode, 'SessionNotes', session.subject],
        blocks,
        academicLink: {
          classId: session.classId,
          courseId: session.classId,
          courseCode: session.courseCode,
          unitId: session.unitId,
          unitTitle: session.unitTitle,
          lessonId: session.lessonId,
          lessonTitle: session.lessonTitle,
          classSessionId: session.id,
          academicContext: context
        }
      });

      const wpLink = this.createLink({
        workspaceId: session.workspaceId || 'ws-stark-core',
        sourceType: 'classSession',
        sourceId: session.id,
        targetType: 'workspacePage',
        targetId: linkedWorkspacePage.id,
        relation: 'notes',
        title: pageTitle,
        context,
        createdBy: teacher.id
      });
      createdLinks.push(wpLink);
    } catch (err) {
      console.warn('Could not auto-generate workspace page:', err);
    }

    // 3. Create Homework Assignment in Assignments & Calendar
    let linkedAssignment: Assignment | undefined;
    if (session.homework && session.homework.questions.length > 0) {
      try {
        const dueDate = new Date(Date.now() + 3 * 86400000).toISOString(); // 3 days after session
        const instructions = session.homework.instructions || 'Complete all numerical and conceptual problems.';
        const hwDescription = session.homework.questions
          .map((q) => `Q${q.questionNumber} (${q.marks}M): ${q.prompt}`)
          .join('\n\n');

        linkedAssignment = educationStore.createAssignment({
          classId: session.classId,
          title: `${session.topic} — Homework Assignment`,
          description: hwDescription,
          instructions,
          dueDate,
          maxScore: session.homework.totalMarks || 20,
          category: 'Worksheet',
          teacherId: teacher.id
        });

        // Set relational academic context on the created assignment
        (linkedAssignment as any).courseId = session.classId;
        (linkedAssignment as any).unitId = session.unitId;
        (linkedAssignment as any).lessonId = session.lessonId;
        (linkedAssignment as any).classSessionId = session.id;
        (linkedAssignment as any).academicContext = context;

        const asgLink = this.createLink({
          workspaceId: session.workspaceId || 'ws-stark-core',
          sourceType: 'classSession',
          sourceId: session.id,
          targetType: 'assignment',
          targetId: linkedAssignment.id,
          relation: 'homework',
          title: linkedAssignment.title,
          context,
          createdBy: teacher.id
        });
        createdLinks.push(asgLink);

        // Also link assignment to lesson
        if (session.lessonId) {
          createdLinks.push(
            this.createLink({
              workspaceId: session.workspaceId || 'ws-stark-core',
              sourceType: 'assignment',
              sourceId: linkedAssignment.id,
              targetType: 'lesson',
              targetId: session.lessonId,
              relation: 'curriculum',
              title: session.lessonTitle,
              context,
              createdBy: teacher.id
            })
          );
        }
      } catch (err) {
        console.warn('Could not auto-create assignment for session:', err);
      }
    }

    // 4. Create Linked Formative Quiz
    let linkedQuiz: Quiz | undefined;
    if (session.quiz && session.quiz.questions.length > 0) {
      try {
        const quizId = `quiz-session-${session.id}`;
        linkedQuiz = {
          id: quizId,
          quizId,
          workspaceId: session.workspaceId || 'ws-stark-core',
          classId: session.classId,
          classroomSessionId: session.id,
          teacherId: teacher.id,
          title: `${session.topic} — Formative In-Class Quiz`,
          description: `Interactive check for understanding with ${session.quiz.questions.length} questions.`,
          classSessionId: session.id,
          lessonId: session.lessonId,
          unitId: session.unitId,
          courseId: session.classId,
          academicContext: context,
          status: 'ready',
          currentQuestionIndex: 0,
          totalQuestions: session.quiz.questions.length,
          createdAt: new Date().toISOString()
        };

        const quizLink = this.createLink({
          workspaceId: session.workspaceId || 'ws-stark-core',
          sourceType: 'classSession',
          sourceId: session.id,
          targetType: 'quiz',
          targetId: quizId,
          relation: 'assessment',
          title: linkedQuiz.title,
          context,
          createdBy: teacher.id
        });
        createdLinks.push(quizLink);
      } catch (err) {
        console.warn('Could not auto-create quiz for session:', err);
      }
    }

    // 5. Connect to Community Channel / Discussion
    try {
      const channels = await communityStore.listChannels({ classId: session.classId });
      const targetChannel = channels.find((c) => c.name.includes('theory') || c.type === 'CLASS') || channels[0];
      if (targetChannel) {
        const commLink = this.createLink({
          workspaceId: session.workspaceId || 'ws-stark-core',
          sourceType: 'classSession',
          sourceId: session.id,
          targetType: 'communityChannel',
          targetId: targetChannel.id,
          relation: 'discussion',
          title: `#${targetChannel.name} Discussion Hub`,
          context,
          createdBy: teacher.id
        });
        createdLinks.push(commLink);
      }
    } catch {
      // Community channel linking optional
    }

    // 6. Update session with relational fields
    const updatedSession = await classSessionStore.updateSession(session.id, {
      linkedWorkspacePageId: linkedWorkspacePage?.id,
      linkedQuizId: linkedQuiz?.id,
      linkedAssignmentId: linkedAssignment?.id,
      academicContext: context
    });

    // 7. Publish Domain Event
    this.publishEvent({
      type: 'classSession.approved',
      actorId: teacher.id,
      workspaceId: session.workspaceId || 'ws-stark-core',
      context,
      entityType: 'classSession',
      entityId: session.id,
      metadata: {
        topic: session.topic,
        courseCode: session.courseCode,
        linkedWorkspacePageId: linkedWorkspacePage?.id,
        linkedQuizId: linkedQuiz?.id,
        linkedAssignmentId: linkedAssignment?.id
      }
    });

    // 8. Generate notification
    this.createNotification({
      type: 'CLASS_SESSION_APPROVED',
      actorId: teacher.id,
      recipientId: 'all',
      targetType: 'classSession',
      targetId: session.id,
      title: `Prepared: ${session.courseCode} ${session.topic}`,
      message: `Complete academic package generated: Workspace notes, Quiz, and Assignment are ready.`,
      context
    });

    return {
      session: updatedSession,
      linkedWorkspacePage,
      linkedQuiz,
      linkedAssignment,
      linksCreated: createdLinks
    };
  }

  // --- BOUNDED CONTEXT-AWARE AI BUILDER ---

  buildAiContext(
    user: { id: string; role: string; displayName: string },
    contextInput?: AcademicContext,
    activeTask?: string
  ): BoundedAiContext {
    const institutionId = contextInput?.institutionId || 'inst-stark-academy';
    const classId = contextInput?.classId || 'class-phys-301';
    const resolved = contextInput?.lessonId
      ? this.resolveContext('lesson', contextInput.lessonId)
      : this.resolveContext('classSession', contextInput?.classSessionId || 'session-phys-101');

    const mergedContext: AcademicContext = {
      ...resolved,
      ...contextInput,
      institutionId
    };

    // Safely look up relevant lesson details
    let relevantLesson: BoundedAiContext['relevantLesson'];
    if (mergedContext.lessonId && mergedContext.unitId) {
      const lesson = educationStore.getLesson(classId, mergedContext.unitId, mergedContext.lessonId);
      if (lesson) {
        relevantLesson = {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          keyTakeaways: lesson.keyTakeaways
        };
      }
    }

    // Safely look up relevant session details
    let relevantSession: BoundedAiContext['relevantSession'];
    if (mergedContext.classSessionId) {
      const sess = classSessionStore.getSessionSync
        ? classSessionStore.getSessionSync(mergedContext.classSessionId)
        : ((classSessionStore as any).sessions?.get?.(mergedContext.classSessionId) ?? null);
      if (sess) {
        relevantSession = {
          id: sess.id,
          topic: sess.topic,
          status: sess.status,
          lessonPlanTitle: sess.lessonPlan?.title,
          learningObjectives: sess.lessonPlan?.learningObjectives
        };
      }
    }

    // Authorized Knowledge Spaces for this user & course
    const allowedKnowledgeSpaces = ['ks-quantum'];
    if (classId === 'class-cs-501') allowedKnowledgeSpaces.push('ks-cs');

    return {
      user,
      role: (user.role as any) || 'student',
      academicContext: mergedContext,
      relevantLesson,
      relevantSession,
      relevantResources: [
        { id: 'ncert-ch1', title: 'NCERT Physics Class 12: Electric Charges and Fields', type: 'textbook_pdf' },
        { id: 'board-pyq', title: 'National Board Exam Past Year Questions', type: 'exam_paper' }
      ],
      allowedKnowledgeSpaces,
      activeTask: activeTask || 'study_tutoring',
      generatedAt: new Date().toISOString()
    };
  }
}

export const academicIntegrationService = new AcademicIntegrationService();
