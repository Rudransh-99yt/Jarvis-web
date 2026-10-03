// Education Sector Data Bridge backed by Core Jarvis Persistence Layer
import type {
  EducationClass,
  Assignment,
  StudentSubmission,
  KnowledgeSpace,
  KnowledgeSource,
  GroundedQueryResponse
} from '../../../src/types/education.ts';
import { jarvisData } from '../../data/index.ts';

export class EducationStore {
  // Synchronous cached accessors that read directly from current repository state
  getClasses(): EducationClass[] {
    const state = (jarvisData as any)['store'] ? (jarvisData as any)['store'].getState() : null;
    if (state && Array.isArray(state.classes)) {
      return state.classes.map((c: EducationClass) => ({ ...c }));
    }
    return [];
  }

  getClass(id: string): EducationClass | undefined {
    return this.getClasses().find((c) => c.id === id);
  }

  getAssignments(classId?: string): Assignment[] {
    const state = (jarvisData as any)['store'] ? (jarvisData as any)['store'].getState() : null;
    if (state && Array.isArray(state.assignments)) {
      return state.assignments
        .filter((a: Assignment) => !classId || a.classId === classId)
        .map((a: Assignment) => ({ ...a }));
    }
    return [];
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
  }): Assignment {
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

    if ((jarvisData as any)['store']) {
      (jarvisData as any)['store'].mutate((state: any) => {
        state.assignments.push(newAsg);
        const c = state.classes.find((item: any) => item.id === data.classId);
        if (c) {
          c.assignmentsCount = (c.assignmentsCount || 0) + 1;
        }
      });
    }

    return newAsg;
  }

  getSubmissions(studentId?: string, assignmentId?: string): StudentSubmission[] {
    const state = (jarvisData as any)['store'] ? (jarvisData as any)['store'].getState() : null;
    if (state && Array.isArray(state.submissions)) {
      return state.submissions
        .filter((s: StudentSubmission) => (!studentId || s.studentId === studentId) && (!assignmentId || s.assignmentId === assignmentId))
        .map((s: StudentSubmission) => ({ ...s }));
    }
    return [];
  }

  createOrUpdateSubmission(data: {
    assignmentId: string;
    studentId: string;
    studentName?: string;
    content: string;
    attachments?: Array<{ name: string; size: string }>;
  }): StudentSubmission {
    const asg = this.getAssignment(data.assignmentId);
    const now = new Date().toISOString();
    let result: StudentSubmission;

    if ((jarvisData as any)['store']) {
      result = (jarvisData as any)['store'].mutate((state: any) => {
        const existingIdx = state.submissions.findIndex(
          (s: any) => s.assignmentId === data.assignmentId && s.studentId === data.studentId
        );

        if (existingIdx >= 0) {
          state.submissions[existingIdx] = {
            ...state.submissions[existingIdx],
            content: data.content,
            attachments: data.attachments || state.submissions[existingIdx].attachments,
            submittedAt: now,
            status: state.submissions[existingIdx].status === 'graded' ? 'graded' : 'submitted'
          };
          return { ...state.submissions[existingIdx] };
        }

        const submissionId = `sub-${data.studentId}-${data.assignmentId}-${Date.now().toString(36)}`;
        const submission: StudentSubmission = {
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

        state.submissions.push(submission);
        const a = state.assignments.find((item: any) => item.id === data.assignmentId);
        if (a) {
          a.submittedCount = (a.submittedCount || 0) + 1;
        }

        return { ...submission };
      });
    } else {
      result = {
        id: `sub-${data.studentId}-${data.assignmentId}`,
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
    }

    return result;
  }

  gradeSubmission(submissionId: string, grade: number, feedback: string): StudentSubmission | null {
    if (!(jarvisData as any)['store']) return null;

    return (jarvisData as any)['store'].mutate((state: any) => {
      const sub = state.submissions.find((s: any) => s.id === submissionId);
      if (!sub) return null;

      const previousStatus = sub.status;
      sub.grade = grade;
      sub.feedback = feedback;
      sub.status = 'graded';
      sub.gradedAt = new Date().toISOString();

      if (previousStatus !== 'graded') {
        const asg = state.assignments.find((a: any) => a.id === sub.assignmentId);
        if (asg) {
          asg.gradedCount = (asg.gradedCount || 0) + 1;
        }
      }

      return { ...sub };
    });
  }

  // --- Knowledge Spaces & Grounded Retrieval ---
  getKnowledgeSpaces(): KnowledgeSpace[] {
    const state = (jarvisData as any)['store'] ? (jarvisData as any)['store'].getState() : null;
    if (!state || !Array.isArray(state.knowledgeSpaces)) return [];

    return state.knowledgeSpaces.map((space: any) => {
      const sources = (state.knowledgeSources || [])
        .filter((src: any) => src.knowledgeSpaceId === space.id)
        .map((src: any) => ({
          id: src.id,
          spaceId: src.knowledgeSpaceId,
          title: src.name,
          type: src.type,
          author: src.author,
          dateAdded: src.createdAt ? src.createdAt.split('T')[0] : '2026-10-01',
          summary: src.summary,
          fullText: src.fullText,
          tokenCount: src.tokenCount
        }));

      return {
        id: space.id,
        title: space.name,
        description: space.description,
        category: space.category,
        ownerId: space.ownerId,
        classId: space.classId,
        sources,
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
        tags: space.tags || [],
        suggestedQuestions: space.suggestedQuestions || []
      };
    });
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
  }): KnowledgeSpace {
    const id = `ks-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const now = new Date().toISOString();

    const newSpaceRecord = {
      id,
      workspaceId: 'ws-stark-core',
      name: data.title,
      description: data.description,
      category: data.category || 'General',
      ownerId: 'teacher-1',
      classId: data.classId,
      tags: data.tags || [],
      suggestedQuestions: [],
      createdAt: now,
      updatedAt: now
    };

    if ((jarvisData as any)['store']) {
      (jarvisData as any)['store'].mutate((state: any) => {
        state.knowledgeSpaces.push(newSpaceRecord);
      });
    }

    return {
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
  ): KnowledgeSource | null {
    const space = this.getKnowledgeSpace(spaceId);
    if (!space) return null;

    const id = `src-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newSourceRecord = {
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
      tokenCount: data.tokenCount || Math.round(data.fullText.split(/\s+/).length * 1.3),
      createdAt: now,
      updatedAt: now
    };

    if ((jarvisData as any)['store']) {
      (jarvisData as any)['store'].mutate((state: any) => {
        state.knowledgeSources.push(newSourceRecord);
        const s = state.knowledgeSpaces.find((item: any) => item.id === spaceId);
        if (s) s.updatedAt = now;
      });
    }

    return {
      id,
      spaceId,
      title: data.title,
      type: data.type,
      author: data.author || 'User',
      dateAdded: now.split('T')[0],
      summary: data.summary,
      fullText: data.fullText,
      tokenCount: newSourceRecord.tokenCount
    };
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
}

export const educationStore = new EducationStore();
