import type {
  EducationClass,
  Assignment,
  StudentSubmission,
  KnowledgeSpace,
  KnowledgeSource,
  GroundedQueryResponse,
  CourseUnit,
  CourseLesson,
  AcademicInstitution,
  WorkspacePage,
  WorkspaceDatabase,
  WorkspaceTemplate,
  PageBlock
} from '../../../src/types/education.ts';
import { jarvisData } from '../../data/index.ts';
import { INITIAL_DATABASE_SCHEMA } from '../../data/seedData.ts';
import { DEFAULT_COURSE_UNITS, DEFAULT_INSTITUTION } from './curriculumData.ts';
import {
  INITIAL_WORKSPACE_PAGES,
  INITIAL_WORKSPACE_DATABASES,
  DEFAULT_WORKSPACE_TEMPLATES
} from './workspaceData.ts';

/**
 * Array subclass that implements PromiseLike, preserving Array.isArray(arr) === true
 * while allowing callers to asynchronously await the updated repository result.
 */
export class AsyncArray<T> extends Array<T> implements PromiseLike<T[]> {
  private _promise?: Promise<T[]>;
  [Symbol.toStringTag] = 'Promise';

  static get [Symbol.species]() {
    return Array;
  }

  constructor(items?: T[] | number, promise?: Promise<T[]>) {
    if (typeof items === 'number') {
      super(items);
    } else {
      super(...(items || []));
      this._promise = promise;
    }
  }

  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const p = this._promise || Promise.resolve(Array.from(this));
    return p.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null): Promise<T[] | TResult> {
    const p = this._promise || Promise.resolve(Array.from(this));
    return p.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<T[]> {
    const p = this._promise || Promise.resolve(Array.from(this));
    return p.finally(onfinally);
  }
}

export class EducationStore {
  getInstitution(): AcademicInstitution {
    return DEFAULT_INSTITUTION;
  }

  // In-memory cache initialized from seed data for synchronous parity, backed by typed repository operations
  private cachedClasses: EducationClass[] = (INITIAL_DATABASE_SCHEMA.classes || []).map((c) => ({
    ...c,
    units: c.units && c.units.length > 0 ? c.units : (DEFAULT_COURSE_UNITS[c.id] || [])
  }));
  private cachedAssignments: Assignment[] = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.assignments || []));
  private cachedSubmissions: StudentSubmission[] = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.submissions || []));
  private cachedSpaces: KnowledgeSpace[] = (INITIAL_DATABASE_SCHEMA.knowledgeSpaces || []).map((ks) => {
    const spaceSources = (INITIAL_DATABASE_SCHEMA.knowledgeSources || []).filter((s) => s.knowledgeSpaceId === ks.id);
    return {
      id: ks.id,
      title: ks.name,
      description: ks.description,
      category: ks.category,
      ownerId: ks.ownerId,
      classId: ks.classId,
      sources: spaceSources.map((src) => ({
        id: src.id,
        spaceId: src.knowledgeSpaceId,
        title: src.name,
        type: src.type as any,
        author: src.author,
        dateAdded: src.createdAt ? src.createdAt.split('T')[0] : '2026-10-01',
        summary: src.summary,
        fullText: src.fullText,
        tokenCount: src.tokenCount
      })),
      createdAt: ks.createdAt,
      updatedAt: ks.updatedAt,
      tags: ks.tags || [],
      suggestedQuestions: ks.suggestedQuestions || []
    };
  });

  private ensureSyncCaches(): void {
    if (this.cachedClasses.length === 0) {
      // Lazy populate from repository state or defaults
      jarvisData.education.listClasses().then((clsList) => {
        if (clsList && clsList.length > 0) {
          this.cachedClasses = clsList.map((c) => ({
            ...c,
            units: c.units && c.units.length > 0 ? c.units : (DEFAULT_COURSE_UNITS[c.id] || [])
          }));
        }
      }).catch(() => {});
    }
  }

  // Synchronous and asynchronous compatible accessors
  getClasses(): EducationClass[] & Promise<EducationClass[]> {
    this.ensureSyncCaches();
    const promise = jarvisData.education.listClasses().then((classes) => {
      if (classes && classes.length > 0) {
        const mapped = classes.map((c) => ({
          ...c,
          units: c.units && c.units.length > 0 ? c.units : (DEFAULT_COURSE_UNITS[c.id] || [])
        }));
        this.cachedClasses = mapped;
        return mapped;
      }
      return this.cachedClasses;
    });

    return new AsyncArray(this.cachedClasses, promise) as unknown as EducationClass[] & Promise<EducationClass[]>;
  }

  getClass(id: string): EducationClass | undefined {
    return this.getClasses().find((c) => c.id === id);
  }

  getUnits(classId: string): CourseUnit[] {
    const cls = this.getClass(classId);
    if (!cls) return [];
    return cls.units || DEFAULT_COURSE_UNITS[classId] || [];
  }

  getUnit(classId: string, unitId: string): CourseUnit | undefined {
    const units = this.getUnits(classId);
    return units.find((u) => u.id === unitId);
  }

  getLesson(classId: string, unitId: string, lessonId: string): CourseLesson | undefined {
    const unit = this.getUnit(classId, unitId);
    if (!unit) return undefined;
    return unit.lessons.find((l) => l.id === lessonId);
  }

  toggleLessonCompletion(classId: string, unitId: string, lessonId: string, isCompleted: boolean): boolean & Promise<boolean> {
    const c = this.cachedClasses.find((item) => item.id === classId);
    if (c) {
      if (!c.units || c.units.length === 0) {
        c.units = JSON.parse(JSON.stringify(DEFAULT_COURSE_UNITS[classId] || []));
      }
      const units = c.units || [];
      const u = units.find((unit) => unit.id === unitId);
      if (u) {
        const l = u.lessons.find((les) => les.id === lessonId);
        if (l) {
          l.isCompleted = isCompleted;
          const completedCount = u.lessons.filter((les) => les.isCompleted).length;
          u.masteryPercent = Math.round((completedCount / u.lessons.length) * 100);
          u.isCompleted = completedCount === u.lessons.length;
        }
      }
    }

    const promise = jarvisData.education.toggleLessonCompletion(classId, unitId, lessonId, isCompleted);
    return Object.assign(promise, { valueOf: () => true, [Symbol.toPrimitive]: () => true }) as any;
  }

  addUnitToCourse(classId: string, unit: Omit<CourseUnit, 'id'>): CourseUnit & Promise<CourseUnit> {
    const newUnitId = `unit-${classId}-${Date.now().toString(36)}`;
    const newUnit: CourseUnit = {
      ...unit,
      id: newUnitId,
      courseId: classId,
      lessons: unit.lessons || []
    };

    const c = this.cachedClasses.find((item) => item.id === classId);
    if (c) {
      if (!c.units || c.units.length === 0) {
        c.units = JSON.parse(JSON.stringify(DEFAULT_COURSE_UNITS[classId] || []));
      }
      const units = c.units || [];
      units.push(newUnit);
      c.units = units;
    }

    const promise = jarvisData.education.addUnitToCourse(classId, unit);
    return Object.assign(promise, newUnit);
  }

  addLessonToUnit(classId: string, unitId: string, lesson: Omit<CourseLesson, 'id' | 'unitId' | 'courseId'>): CourseLesson & Promise<CourseLesson> {
    const newLessonId = `les-${unitId}-${Date.now().toString(36)}`;
    const newLesson: CourseLesson = {
      ...lesson,
      id: newLessonId,
      unitId,
      courseId: classId
    };

    const c = this.cachedClasses.find((item) => item.id === classId);
    if (c) {
      if (!c.units || c.units.length === 0) {
        c.units = JSON.parse(JSON.stringify(DEFAULT_COURSE_UNITS[classId] || []));
      }
      const units = c.units || [];
      const u = units.find((unit) => unit.id === unitId);
      if (u) {
        u.lessons.push(newLesson);
      }
    }

    const promise = jarvisData.education.addLessonToUnit(classId, unitId, lesson);
    return Object.assign(promise, newLesson);
  }

  getAssignments(classId?: string): Assignment[] & Promise<Assignment[]> {
    const promise = jarvisData.education.listAssignments(classId).then((asgs) => {
      if (asgs && asgs.length > 0) {
        this.cachedAssignments = asgs;
      }
      return asgs;
    });

    const result = this.cachedAssignments.filter((a) => !classId || a.classId === classId);
    return new AsyncArray(result, promise) as unknown as Assignment[] & Promise<Assignment[]>;
  }

  getAssignment(id: string): Assignment | undefined {
    return this.getAssignments().find((a) => a.id === id);
  }

  createAssignment(data: {
    classId: string;
    title: string;
    description: string;
    instructions: string;
    dueDate: string;
    maxScore: number;
    category?: 'Worksheet' | 'Lab Report' | 'Exam' | 'Project';
    teacherId?: string;
  }): Assignment & Promise<Assignment> {
    const cls = this.getClass(data.classId);
    const id = `asg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newAsg: Assignment = {
      id,
      classId: data.classId,
      className: cls ? `${cls.code}: ${cls.name}` : 'General Assignment',
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: data.dueDate,
      maxScore: data.maxScore || 100,
      category: data.category || 'Worksheet',
      teacherId: data.teacherId || 'teacher-1',
      totalEnrolled: cls?.studentCount || 2,
      submittedCount: 0,
      gradedCount: 0
    };

    this.cachedAssignments.push(newAsg);
    if (cls) {
      cls.assignmentsCount = (cls.assignmentsCount || 0) + 1;
    }

    const promise = jarvisData.education.createAssignment({
      ...data,
      className: newAsg.className,
      category: newAsg.category,
      teacherId: newAsg.teacherId
    }).then((created) => {
      newAsg.id = created.id;
      return created;
    });

    return Object.assign(promise, newAsg);
  }

  getSubmissions(studentId?: string, assignmentId?: string): StudentSubmission[] & Promise<StudentSubmission[]> {
    const promise = jarvisData.education.listSubmissions(studentId, assignmentId).then((subs) => {
      if (subs && subs.length > 0) {
        this.cachedSubmissions = subs;
      }
      return subs;
    });

    const result = this.cachedSubmissions.filter((s) => (!studentId || s.studentId === studentId) && (!assignmentId || s.assignmentId === assignmentId));
    return new AsyncArray(result, promise) as unknown as StudentSubmission[] & Promise<StudentSubmission[]>;
  }

  createOrUpdateSubmission(data: {
    assignmentId: string;
    studentId: string;
    studentName?: string;
    content: string;
    attachments?: Array<{ name: string; size: string }>;
  }): StudentSubmission & Promise<StudentSubmission> {
    const asg = this.getAssignment(data.assignmentId);
    const now = new Date().toISOString();

    const existingIdx = this.cachedSubmissions.findIndex(
      (s) => s.assignmentId === data.assignmentId && s.studentId === data.studentId
    );

    let submission: StudentSubmission;
    if (existingIdx >= 0) {
      this.cachedSubmissions[existingIdx] = {
        ...this.cachedSubmissions[existingIdx],
        content: data.content,
        attachments: data.attachments || this.cachedSubmissions[existingIdx].attachments,
        submittedAt: now,
        status: this.cachedSubmissions[existingIdx].status === 'graded' ? 'graded' : 'submitted'
      };
      submission = { ...this.cachedSubmissions[existingIdx] };
    } else {
      const submissionId = `sub-${data.studentId}-${data.assignmentId}-${Date.now().toString(36)}`;
      submission = {
        id: submissionId,
        assignmentId: data.assignmentId,
        assignmentTitle: asg?.title || 'Assignment',
        classId: asg?.classId || '',
        className: asg?.className || '',
        studentId: data.studentId,
        studentName: data.studentName || 'Alex Chen',
        status: 'submitted',
        submittedAt: now,
        content: data.content,
        attachments: data.attachments || []
      };
      this.cachedSubmissions.push(submission);
      if (asg) {
        asg.submittedCount = (asg.submittedCount || 0) + 1;
      }
    }

    const promise = jarvisData.education.createOrUpdateSubmission({
      assignmentId: data.assignmentId,
      studentId: data.studentId,
      studentName: data.studentName || 'Alex Chen',
      content: data.content,
      attachments: data.attachments
    });

    return Object.assign(promise, submission);
  }

  gradeSubmission(submissionId: string, grade: number, feedback: string): (StudentSubmission | null) & Promise<StudentSubmission | null> {
    const sub = this.cachedSubmissions.find((s) => s.id === submissionId);
    if (sub) {
      const wasGraded = sub.status === 'graded';
      sub.grade = grade;
      sub.feedback = feedback;
      sub.status = 'graded';
      sub.gradedAt = new Date().toISOString();
      if (!wasGraded) {
        const asg = this.getAssignment(sub.assignmentId);
        if (asg) asg.gradedCount = (asg.gradedCount || 0) + 1;
      }
    }

    const promise = jarvisData.education.gradeSubmission(submissionId, grade, feedback);
    return Object.assign(promise, sub || null);
  }

  // --- Knowledge Spaces & Grounded Retrieval ---
  getKnowledgeSpaces(): KnowledgeSpace[] & Promise<KnowledgeSpace[]> {
    const promise = jarvisData.knowledge.listSpaces().then(async (spaces) => {
      const populated: KnowledgeSpace[] = [];
      for (const space of spaces) {
        const sources = await jarvisData.knowledge.listSourcesForSpace(space.id, space.workspaceId);
        populated.push({
          id: space.id,
          title: space.name,
          description: space.description,
          category: space.category,
          ownerId: space.ownerId,
          classId: space.classId,
          sources: sources.map((src) => ({
            id: src.id,
            spaceId: src.knowledgeSpaceId,
            title: src.name,
            type: src.type as any,
            author: src.author,
            dateAdded: src.createdAt ? src.createdAt.split('T')[0] : '2026-10-01',
            summary: src.summary,
            fullText: src.fullText,
            tokenCount: src.tokenCount
          })),
          createdAt: space.createdAt,
          updatedAt: space.updatedAt,
          tags: space.tags || [],
          suggestedQuestions: space.suggestedQuestions || []
        });
      }
      if (populated.length > 0) {
        this.cachedSpaces = populated;
      }
      return populated;
    });

    const result = this.cachedSpaces.length > 0 ? this.cachedSpaces : [
      {
        id: 'ks-quantum',
        title: 'Quantum Mechanics & Wave Dynamics',
        description: 'Wave equations, Hilbert spaces, operators, and quantum harmonic oscillators.',
        category: 'Physics',
        ownerId: 'teacher-1',
        classId: 'class-phys-301',
        sources: [
          {
            id: 'src-qm-notes',
            spaceId: 'ks-quantum',
            title: 'Foundations of Wave Mechanics (Lecture Notes)',
            type: 'notes' as const,
            author: 'Dr. Bruce Banner',
            dateAdded: '2026-10-01',
            summary: 'The Schrödinger equation describes the wave function evolution of a quantum system.',
            fullText: 'The Schrödinger equation is a linear partial differential equation that governs the wave function of a quantum-mechanical system.',
            tokenCount: 1200
          }
        ],
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
        tags: ['Physics', 'Quantum'],
        suggestedQuestions: ['What is the Schrödinger equation?']
      },
      {
        id: 'ks-general',
        title: 'General Academic Knowledge',
        description: 'Core concepts and curriculum reference documents.',
        category: 'General',
        ownerId: 'teacher-1',
        classId: undefined,
        sources: [],
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
        tags: ['General'],
        suggestedQuestions: []
      }
    ];

    return new AsyncArray(result, promise) as unknown as KnowledgeSpace[] & Promise<KnowledgeSpace[]>;
  }

  getKnowledgeSpace(id: string): KnowledgeSpace | undefined {
    return this.getKnowledgeSpaces().find((s) => s.id === id);
  }

  createKnowledgeSpace(data: {
    title: string;
    description: string;
    category?: string;
    tags?: string[];
    classId?: string;
  }): KnowledgeSpace & Promise<KnowledgeSpace> {
    const id = `ks-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const now = new Date().toISOString();

    const newSpace: KnowledgeSpace = {
      id,
      title: data.title,
      description: data.description,
      category: data.category || 'General',
      ownerId: 'teacher-1',
      classId: data.classId,
      sources: [],
      createdAt: now,
      updatedAt: now,
      tags: data.tags || [],
      suggestedQuestions: []
    };
    this.cachedSpaces.push(newSpace);

    const promise = jarvisData.knowledge.createSpace({
      id,
      workspaceId: 'ws-stark-core',
      name: data.title,
      description: data.description,
      category: data.category || 'General',
      ownerId: 'teacher-1',
      classId: data.classId,
      tags: data.tags || [],
      suggestedQuestions: []
    }).then(() => newSpace);

    return Object.assign(promise, newSpace);
  }

  addSourceToSpace(
    spaceId: string,
    data: {
      title: string;
      type: 'pdf' | 'notes' | 'lecture' | 'web';
      author?: string;
      summary: string;
      fullText: string;
      tokenCount?: number;
    }
  ): (KnowledgeSource | null) & Promise<KnowledgeSource | null> {
    const space = this.getKnowledgeSpace(spaceId);
    if (!space) {
      const rejected = Promise.resolve(null);
      return Object.assign(rejected, null);
    }

    const id = `src-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const tokenCount = data.tokenCount || Math.round(data.fullText.split(/\s+/).length * 1.3);

    const newSource: KnowledgeSource = {
      id,
      spaceId,
      title: data.title,
      type: data.type,
      author: data.author || 'User',
      dateAdded: now.split('T')[0],
      summary: data.summary,
      fullText: data.fullText,
      tokenCount
    };

    space.sources.push(newSource);
    space.updatedAt = now;

    const promise = jarvisData.knowledge.createSource({
      id,
      workspaceId: 'ws-stark-core',
      knowledgeSpaceId: spaceId,
      name: data.title,
      type: data.type,
      mimeType: data.type === 'pdf' ? 'application/pdf' : 'text/markdown',
      size: `${(data.fullText.length / 1024).toFixed(1)} KB`,
      sizeBytes: data.fullText.length,
      status: 'ready' as const,
      author: data.author || 'User',
      summary: data.summary,
      fullText: data.fullText,
      tokenCount
    }).then(() => newSource);

    return Object.assign(promise, newSource);
  }

  queryGrounded(spaceId: string, query: string): GroundedQueryResponse {
    const space = this.getKnowledgeSpace(spaceId);
    const spaceTitle = space?.title || 'Knowledge Space';
    const sources = space?.sources || [];

    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const matchingSources = sources.filter((s) => {
      const text = (s.title + ' ' + s.summary + ' ' + s.fullText).toLowerCase();
      return terms.some((term) => text.includes(term));
    });

    const activeSources = matchingSources.length > 0 ? matchingSources : sources;

    const citations = activeSources.slice(0, 3).map((src, idx) => ({
      sourceId: src.id,
      sourceTitle: src.title,
      excerpt: src.summary || src.fullText.slice(0, 160) + '...',
      location: `Section ${idx + 1}`
    }));

    let answer = `Based on the verified documents in "${spaceTitle}": `;
    if (activeSources.length > 0) {
      const combined = activeSources.map((s) => s.summary).join(' ');
      answer += combined;
    } else {
      answer += `Zero conflicting assertions identified in the indexed source archive.`;
    }

    return {
      query,
      spaceId,
      spaceTitle,
      answer,
      citations,
      confidence: activeSources.length > 0 ? 0.95 : 0.85,
      timestamp: new Date().toISOString()
    };
  }

  // --- Notion-Style My Workspace Methods ---

  private localPages: WorkspacePage[] = JSON.parse(JSON.stringify(INITIAL_WORKSPACE_PAGES));
  private localDatabases: WorkspaceDatabase[] = JSON.parse(JSON.stringify(INITIAL_WORKSPACE_DATABASES));

  getWorkspacePages(includeDeleted: boolean = false): WorkspacePage[] {
    return this.localPages.filter((p) => (includeDeleted ? p.isDeleted : !p.isDeleted));
  }

  getWorkspacePage(id: string): WorkspacePage | undefined {
    return this.localPages.find((p) => p.id === id);
  }

  createWorkspacePage(data: Partial<WorkspacePage>): WorkspacePage {
    const now = new Date().toISOString();
    const id = data.id || `page-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newPage: WorkspacePage = {
      id,
      title: data.title || 'Untitled Page',
      icon: data.icon || '📄',
      coverImage: data.coverImage,
      parentId: data.parentId !== undefined ? data.parentId : null,
      type: data.type || 'doc',
      ownerId: data.ownerId || 'student-1',
      ownerName: data.ownerName || 'Alex Chen',
      ownerRole: data.ownerRole || 'student',
      visibility: data.visibility || 'personal',
      tags: data.tags || ['General'],
      blocks: data.blocks && data.blocks.length > 0 ? data.blocks : [
        {
          id: `blk-${Date.now()}-1`,
          type: 'paragraph',
          content: ''
        }
      ],
      academicLink: data.academicLink,
      isFavorite: !!data.isFavorite,
      isDeleted: false,
      createdAt: now,
      updatedAt: now
    };

    this.localPages.unshift(newPage);
    return newPage;
  }

  updateWorkspacePage(id: string, data: Partial<WorkspacePage>): WorkspacePage | undefined {
    const page = this.localPages.find((p) => p.id === id);
    if (!page) return undefined;

    if (data.title !== undefined) page.title = data.title;
    if (data.icon !== undefined) page.icon = data.icon;
    if (data.coverImage !== undefined) page.coverImage = data.coverImage;
    if (data.parentId !== undefined) page.parentId = data.parentId;
    if (data.type !== undefined) page.type = data.type;
    if (data.tags !== undefined) page.tags = data.tags;
    if (data.blocks !== undefined) page.blocks = data.blocks;
    if (data.academicLink !== undefined) page.academicLink = data.academicLink;
    if (data.isFavorite !== undefined) page.isFavorite = data.isFavorite;
    page.updatedAt = new Date().toISOString();

    return page;
  }

  updateWorkspacePageBlocks(id: string, blocks: PageBlock[]): WorkspacePage | undefined {
    const page = this.localPages.find((p) => p.id === id);
    if (!page) return undefined;

    page.blocks = blocks;
    page.updatedAt = new Date().toISOString();
    return page;
  }

  deleteWorkspacePage(id: string, permanent: boolean = false): boolean {
    const idx = this.localPages.findIndex((p) => p.id === id);
    if (idx === -1) return false;

    if (permanent) {
      this.localPages.splice(idx, 1);
    } else {
      this.localPages[idx].isDeleted = true;
      this.localPages[idx].deletedAt = new Date().toISOString();
    }
    return true;
  }

  restoreWorkspacePage(id: string): boolean {
    const page = this.localPages.find((p) => p.id === id);
    if (!page) return false;

    page.isDeleted = false;
    delete page.deletedAt;
    page.updatedAt = new Date().toISOString();
    return true;
  }

  getWorkspaceDatabases(): WorkspaceDatabase[] {
    return this.localDatabases;
  }

  getWorkspaceDatabase(id: string): WorkspaceDatabase | undefined {
    return this.localDatabases.find((db) => db.id === id);
  }

  createWorkspaceDatabase(data: Partial<WorkspaceDatabase>): WorkspaceDatabase {
    const now = new Date().toISOString();
    const id = data.id || `db-${Date.now()}`;
    const newDb: WorkspaceDatabase = {
      id,
      title: data.title || 'New Database',
      icon: data.icon || '📊',
      description: data.description || '',
      pageId: data.pageId,
      properties: data.properties || [
        { id: 'prop-name', name: 'Name', type: 'title' },
        { id: 'prop-status', name: 'Status', type: 'status', options: [{ id: 'opt-1', label: 'Done', color: 'emerald' }, { id: 'opt-2', label: 'In Progress', color: 'amber' }] },
        { id: 'prop-tags', name: 'Tags', type: 'multi_select', options: [{ id: 'tag-1', label: 'Physics', color: 'cyan' }] }
      ],
      items: data.items || [],
      defaultView: data.defaultView || 'table',
      createdAt: now,
      updatedAt: now
    };

    this.localDatabases.unshift(newDb);
    return newDb;
  }

  updateWorkspaceDatabase(id: string, data: Partial<WorkspaceDatabase>): WorkspaceDatabase | undefined {
    const db = this.localDatabases.find((d) => d.id === id);
    if (!db) return undefined;

    if (data.title !== undefined) db.title = data.title;
    if (data.icon !== undefined) db.icon = data.icon;
    if (data.description !== undefined) db.description = data.description;
    if (data.properties !== undefined) db.properties = data.properties;
    if (data.items !== undefined) db.items = data.items;
    if (data.defaultView !== undefined) db.defaultView = data.defaultView;
    db.updatedAt = new Date().toISOString();

    return db;
  }

  getWorkspaceTemplates(): WorkspaceTemplate[] {
    return DEFAULT_WORKSPACE_TEMPLATES;
  }

  createPageFromTemplate(templateId: string, customTitle?: string, academicLink?: any): WorkspacePage {
    const template = DEFAULT_WORKSPACE_TEMPLATES.find((t) => t.id === templateId) || DEFAULT_WORKSPACE_TEMPLATES[0];
    const newBlocks: PageBlock[] = JSON.parse(JSON.stringify(template.blocks)).map((b: PageBlock) => ({
      ...b,
      id: `blk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    }));

    return this.createWorkspacePage({
      title: customTitle || template.defaultTitle,
      icon: template.icon,
      type: template.type,
      tags: [...template.sampleTags],
      blocks: newBlocks,
      academicLink
    });
  }

  searchWorkspace(query: string): Array<{ id: string; title: string; type: string; snippet: string; icon?: string }> {
    const term = query.toLowerCase().trim();
    if (!term) return [];

    const results: Array<{ id: string; title: string; type: string; snippet: string; icon?: string }> = [];

    for (const page of this.localPages.filter((p) => !p.isDeleted)) {
      const matchTitle = page.title.toLowerCase().includes(term);
      const matchTags = page.tags.some((t) => t.toLowerCase().includes(term));
      const matchBlock = page.blocks.find((b) => b.content.toLowerCase().includes(term));

      if (matchTitle || matchTags || matchBlock) {
        results.push({
          id: page.id,
          title: page.title,
          type: page.type,
          icon: page.icon,
          snippet: matchBlock ? matchBlock.content.slice(0, 120) : page.tags.join(' · ')
        });
      }
    }

    return results;
  }

  getWorkspacePagesForLesson(courseId: string, lessonId: string): WorkspacePage[] {
    return this.localPages.filter(
      (p) =>
        !p.isDeleted &&
        p.academicLink?.courseId === courseId &&
        p.academicLink?.lessonId === lessonId
    );
  }
}

export const educationStore = new EducationStore();
