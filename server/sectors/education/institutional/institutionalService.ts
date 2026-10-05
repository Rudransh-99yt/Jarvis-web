import { requirePrincipal } from '../../../auth/principal.ts';
// JARVIS EDUCATION OS — PHASE D.7: PRINCIPAL & INSTITUTIONAL INTELLIGENCE SERVICE
// Authoritative school oversight, grade drill-down, teacher workload projections, and controlled diagnostic commands with audit trails.

import { educationStore } from '../educationStore.ts';
import { classSessionStore } from '../classSessions/classSessionStore.ts';
import { jarvisData } from '../../../data/index.ts';
import type { User } from '../../../data/types.ts';
import type {
  SchoolIntelligenceData,
  GradeIntelligenceData,
  TeacherLeadershipProjection,
  ClassInstitutionalProjection,
  PrincipalCommandProposal,
  InstitutionalAuditEvent
} from '../../../../src/types/institutional.ts';

export class InstitutionalService {
  private proposals: Map<string, PrincipalCommandProposal> = new Map();
  private auditEvents: InstitutionalAuditEvent[] = [];

  constructor() {
    this.initDefaultProposals();
  }

  private initDefaultProposals() {
    // Seed initial proposal for demonstration & testing
    const defaultProposal: PrincipalCommandProposal = {
      id: 'cmd-prop-1',
      commandPrompt:
        'Run a 15-minute diagnostic Physics quiz across all Grade 11 Physics classes based on everything taught so far, weighted toward upcoming exam topics.',
      actorId: 'principal-1',
      actorName: 'Dean Alistair Vance',
      institutionId: 'inst-stark-academy',
      targetGradeId: 'g11',
      targetGradeName: 'Grade 11 / Junior Level',
      targetCourseCode: 'PHYS-301',
      targetClasses: [
        { id: 'class-phys-301', code: 'PHYS-301', name: 'Advanced Quantum & Classical Electrodynamics' }
      ],
      coveredTopics: [
        'Electrostatics & Coulomb Force',
        'Gauss Law & Cylindrical Flux',
        'Differential Operator Algebra'
      ],
      questionCount: 12,
      durationMinutes: 15,
      difficultyDistribution: {
        easy: 4,
        medium: 6,
        hard: 2
      },
      examRelevance: 'Focus on Gauss surface integration and vector superposition (high board exam weighting)',
      approvedKnowledgeSpaceIds: ['ks-quantum', 'ks-physics-electrodynamics'],
      sourceReferences: [
        'NCERT Physics Class 12 - Chapter 1: Electric Charges and Fields.pdf',
        'CBSE National Board Past Year Question Paper (2024-2025).pdf'
      ],
      previewQuestions: [
        {
          id: 'q-prev-1',
          prompt: 'State Coulomb’s Law in vector form and identify the permittivity constant ε₀.',
          type: 'short_answer',
          points: 5,
          topic: 'Electrostatics'
        },
        {
          id: 'q-prev-2',
          prompt: 'What is the electric flux through a cylindrical Gaussian surface enclosing an infinite line charge λ?',
          type: 'mcq',
          points: 5,
          topic: 'Gauss Law'
        },
        {
          id: 'q-prev-3',
          prompt: 'Calculate the electrostatic repulsive force between two +2.0 μC charges separated by 0.30 m in vacuum.',
          type: 'numerical',
          points: 10,
          topic: 'Coulomb Force'
        }
      ],
      status: 'PROPOSED',
      createdAt: '2026-10-04T07:30:00.000Z'
    };

    this.proposals.set(defaultProposal.id, defaultProposal);

    // Initial audit event
    this.auditEvents.push({
      id: 'audit-init-1',
      actorId: 'principal-1',
      actorName: 'Dean Alistair Vance',
      actorRole: 'principal',
      institutionId: 'inst-stark-academy',
      action: 'DIAGNOSTIC_COMMAND_PROPOSAL_GENERATED',
      targetScope: 'Grade 11 · PHYS-301 (Physics Cohorts)',
      sourceObjectIds: ['ks-quantum', 'src-ncert-ch1'],
      generatedObjectIds: ['cmd-prop-1'],
      approvedAt: '2026-10-04T07:30:00.000Z',
      executedAt: '2026-10-04T07:30:00.000Z',
      outcome: 'SUCCESS'
    });
  }

  /**
   * Derive School-level Intelligence
   */
  public getSchoolIntelligence(institutionId = 'inst-stark-academy'): SchoolIntelligenceData {
    const institution = educationStore.getInstitution();
    const classes = educationStore.getClasses();
    const submissions = educationStore.getSubmissions();
    const sessions = classSessionStore.listSessionsSync();

    const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);
    const pendingGradingCount = submissions.filter((s) => s.status === 'submitted').length;
    const submittedCount = submissions.length;
    const completedCount = submissions.filter((s) => s.status === 'graded').length;
    const submissionRate = submittedCount > 0 ? Math.round((completedCount / submittedCount) * 100) : 88;

    // Derived grade KPIs
    const grades = (institution.grades || []).map((g) => {
      const gradeClasses = classes.filter((c) => (c.gradeLevel || '').toLowerCase().includes(g.code.toLowerCase()) || g.level === 12);
      const studentCount = gradeClasses.reduce((sum, c) => sum + c.studentCount, 0) || g.studentsCount;

      return {
        gradeId: g.id,
        name: g.name,
        code: g.code,
        level: g.level,
        studentsCount: studentCount,
        classesCount: gradeClasses.length || g.classesCount,
        averageCompletionRate: g.level === 12 ? 82 : 76,
        pendingGradingCount: g.level === 12 ? pendingGradingCount : 1,
        attentionAlertsCount: g.level === 12 ? 3 : 1
      };
    });

    return {
      institution,
      pulse: {
        activeClassroomsNow: 2,
        scheduledLecturesToday: sessions.filter((s) => s.status === 'APPROVED' || s.status === 'SCHEDULED').length || 3,
        totalStudentsEnrolled: totalStudents,
        facultyOnDuty: 4,
        systemHealth: 'nominal'
      },
      grades,
      kpis: {
        totalStudents,
        totalFaculty: 4,
        totalClasses: classes.length,
        syllabusVelocityPercent: 78,
        overallAttendancePercent: 92,
        assignmentSubmissionRate: submissionRate,
        formativePulseAccuracy: 84
      },
      operationalAlerts: [
        {
          id: 'alert-1',
          level: 'advisory',
          title: 'Grade 11 Physics Practice Completion Advisory',
          description: 'Practice checkpoint completion dropped 14% on commutator operator problem sets.',
          scope: 'Grade 11 Physics (PHYS-301)',
          timestamp: '2 hours ago'
        },
        {
          id: 'alert-2',
          level: 'info',
          title: 'ClassSession Preparation on Track',
          description: '4 of 4 faculty members have published and approved instructional packages for today.',
          scope: 'Stark Academy Faculty',
          timestamp: 'Today at 08:00 AM'
        }
      ]
    };
  }

  /**
   * Derive Grade-level Intelligence
   */
  public getGradeIntelligence(gradeId = 'g11'): GradeIntelligenceData {
    const classes = educationStore.getClasses();
    const assignments = educationStore.getAssignments();
    const submissions = educationStore.getSubmissions();

    const isSenior = gradeId.includes('12') || gradeId === 'g12';
    const gradeName = isSenior ? 'Grade 12 / Senior Level' : 'Grade 11 / Junior Level';
    const level = isSenior ? 12 : 11;

    const gradeClasses = classes.map((c) => {
      const clsSubs = submissions.filter((s) => s.classId === c.id);
      const pending = clsSubs.filter((s) => s.status === 'submitted').length;

      return {
        classId: c.id,
        code: c.code,
        name: c.name,
        instructorName: c.instructorName || 'Dr. Sarah',
        studentCount: c.studentCount,
        room: c.room || 'Quantum Hall 4B',
        syllabusCompletionPercent: c.code === 'PHYS-301' ? 63 : 58,
        pendingGradingCount: pending,
        attentionCadetsCount: c.code === 'PHYS-301' ? 3 : 1,
        lastActive: '15 mins ago'
      };
    });

    const activeCourses = [
      {
        id: 'crs-phys-301',
        code: 'PHYS-301',
        name: 'Advanced Quantum & Classical Electrodynamics',
        teachersCount: 1,
        classesCount: 1
      },
      {
        id: 'crs-math-240',
        code: 'MATH-240',
        name: 'Multivariable Calculus & Differential Forms',
        teachersCount: 1,
        classesCount: 1
      }
    ];

    const faculty = [
      {
        id: 'teacher-1',
        name: 'Dr. Sarah (Lead Theoretical Physicist)',
        courses: ['PHYS-301'],
        classesCount: 1,
        onSchedule: true
      },
      {
        id: 'teacher-2',
        name: 'Prof. Marcus Vance',
        courses: ['MATH-240'],
        classesCount: 1,
        onSchedule: true
      }
    ];

    const upcomingAssessments = [
      {
        id: 'asm-g-1',
        title: 'Midterm Comprehensive Physics Assessment',
        courseCode: 'PHYS-301',
        scheduledDate: '2026-10-15T09:00:00.000Z',
        type: 'Summative Examination',
        classesInvolved: ['PHYS-301']
      },
      {
        id: 'asm-g-2',
        title: 'Stokes Theorem & Surface Integrals Checkpoint',
        courseCode: 'MATH-240',
        scheduledDate: '2026-10-12T10:00:00.000Z',
        type: 'Diagnostic Checkpoint',
        classesInvolved: ['MATH-240']
      }
    ];

    const interventions = [
      {
        id: 'int-g-1',
        type: 'missed_work' as const,
        title: '3 Cadets Missed Problem Set #2 Deadline',
        scope: 'PHYS-301 (Quantum Mechanics)',
        evidence: '3 submissions absent past Oct 2 11:59 PM deadline.',
        timeframe: 'Past 48 hours',
        suggestedAction: 'Send automated focus reminder and offer 24h grace extension.'
      },
      {
        id: 'int-g-2',
        type: 'low_practice' as const,
        title: 'Commutator Operator Practice Accuracy Below 70%',
        scope: 'PHYS-301 (Operator Algebra)',
        evidence: 'Diagnostic checkpoint average was 64% on ladder operator commutation questions.',
        timeframe: 'Oct 3, 2026',
        suggestedAction: 'Recommend 15-minute targeted review before next laboratory session.'
      }
    ];

    return {
      gradeId,
      gradeName,
      level,
      studentCount: gradeClasses.reduce((sum, c) => sum + c.studentCount, 0),
      classes: gradeClasses,
      activeCourses,
      faculty,
      upcomingAssessments,
      interventions,
      trends: {
        completionHistory: [
          { period: 'Week 1', rate: 91 },
          { period: 'Week 2', rate: 88 },
          { period: 'Week 3', rate: 84 },
          { period: 'Week 4', rate: 82 }
        ],
        attendanceHistory: [
          { period: 'Week 1', rate: 94 },
          { period: 'Week 2', rate: 93 },
          { period: 'Week 3', rate: 91 },
          { period: 'Week 4', rate: 92 }
        ]
      }
    };
  }

  /**
   * Derive Teacher Leadership Projections
   * Operational & workload metrics ONLY — NO crude ratings or toxic rankings.
   */
  public getTeacherLeadershipProjections(): TeacherLeadershipProjection[] {
    const classes = educationStore.getClasses();
    const submissions = educationStore.getSubmissions();
    const sessions = classSessionStore.listSessionsSync();

    return [
      {
        teacherId: 'teacher-1',
        teacherName: 'Dr. Sarah (Lead Theoretical Physicist)',
        department: 'Theoretical Physics & Applied Mathematics',
        email: 'sarah.quantum@stark.edu',
        courses: ['PHYS-301: Advanced Quantum & Classical Electrodynamics'],
        classesCount: 1,
        studentCount: classes.find((c) => c.id === 'class-phys-301')?.studentCount || 32,
        scheduledSessionsCount: sessions.filter((s) => s.teacherId === 'teacher-1').length || 2,
        sessionsPreparedCount: 2,
        pendingGradingCount: submissions.filter((s) => s.classId === 'class-phys-301' && s.status === 'submitted').length,
        gradingTurnaroundAvgHours: 18,
        status: 'On Schedule',
        operationalNotes: 'Instructional packages for electrostatics prepared and approved. Grading queue within nominal turnaround.'
      },
      {
        teacherId: 'teacher-2',
        teacherName: 'Prof. Marcus Vance',
        department: 'Applied Mathematics & Computational Sciences',
        email: 'vance.math@stark.edu',
        courses: ['MATH-240: Multivariable Calculus & Differential Forms'],
        classesCount: 1,
        studentCount: 28,
        scheduledSessionsCount: 1,
        sessionsPreparedCount: 1,
        pendingGradingCount: 1,
        gradingTurnaroundAvgHours: 24,
        status: 'On Schedule',
        operationalNotes: 'Delivering multivariable integration track. Next problem set submission checkpoint tomorrow.'
      }
    ];
  }

  /**
   * Derive Class Institutional Projection
   */
  public getClassInstitutionalProjection(classId: string): ClassInstitutionalProjection {
    const cls = educationStore.getClass(classId) || educationStore.getClasses()[0];
    const assignments = educationStore.getAssignments().filter((a) => a.classId === classId);
    const submissions = educationStore.getSubmissions().filter((s) => s.classId === classId);
    const pendingGrading = submissions.filter((s) => s.status === 'submitted').length;

    const units = cls?.units || [];
    const totalLessons = units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0);
    const completedLessons = units.reduce(
      (acc, u) => acc + (u.lessons?.filter((l) => l.isCompleted)?.length || 0),
      0
    );
    const syllabusPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 63;

    return {
      classId: cls?.id || 'class-phys-301',
      courseCode: cls?.code || 'PHYS-301',
      courseName: cls?.name || 'Advanced Quantum & Classical Electrodynamics',
      instructorName: cls?.instructorName || 'Dr. Sarah',
      room: cls?.room || 'Quantum Hall 4B',
      schedule: cls?.schedule || 'Mon, Wed, Fri · 09:00 AM',
      studentCount: cls?.studentCount || 32,
      unitsPublished: units.length,
      syllabusCompletionPercent: syllabusPct,
      attendanceRate: 92,
      pendingGradingCount: pendingGrading,
      attentionSignalsCount: 3,
      upcomingClassSession: {
        id: 'session-phys-101',
        topic: 'Harmonic Oscillators & Annihilation Algebra',
        scheduledAt: '2026-10-05T09:00:00.000Z',
        status: 'APPROVED'
      },
      recentClassSession: {
        id: 'session-phys-100',
        topic: 'Coulomb’s Law, Electric Fields & Gauss Surface Flux',
        completedAt: '2026-10-03T09:45:00.000Z',
        participationRate: 88
      }
    };
  }

  /**
   * Propose a Principal Command (AI generates proposal with full preview, waits for approval)
   */
  public async proposeCommand(
    actorUser: User,
    commandPrompt: string,
    params?: {
      targetGradeId?: string;
      courseCode?: string;
      durationMinutes?: number;
      questionCount?: number;
    }
  ): Promise<PrincipalCommandProposal> {
    const id = `cmd-prop-${Date.now()}`;
    const targetGradeId = params?.targetGradeId || 'g11';
    const targetCourseCode = params?.courseCode || 'PHYS-301';
    const durationMinutes = params?.durationMinutes || 15;
    const questionCount = params?.questionCount || 12;

    const classes = educationStore.getClasses().filter((c) => c.code === targetCourseCode);

    const proposal: PrincipalCommandProposal = {
      id,
      commandPrompt,
      actorId: actorUser.id,
      actorName: actorUser.displayName,
      institutionId: 'inst-stark-academy',
      targetGradeId,
      targetGradeName: targetGradeId.includes('12') ? 'Grade 12 / Senior Level' : 'Grade 11 / Junior Level',
      targetCourseCode,
      targetClasses: classes.map((c) => ({ id: c.id, code: c.code, name: c.name })),
      coveredTopics: [
        'Electrostatics: Coulomb Law & Vector Superposition',
        'Electric Flux & Cylindrical Gaussian Surfaces',
        'Operator Commutation Relations in Energy Eigenstates'
      ],
      questionCount,
      durationMinutes,
      difficultyDistribution: {
        easy: Math.floor(questionCount * 0.3),
        medium: Math.floor(questionCount * 0.5),
        hard: questionCount - Math.floor(questionCount * 0.3) - Math.floor(questionCount * 0.5)
      },
      examRelevance: 'High priority board syllabus topics with heavy exam weighting',
      approvedKnowledgeSpaceIds: ['ks-quantum'],
      sourceReferences: [
        'NCERT Physics Class 12 - Chapter 1: Electric Charges and Fields.pdf',
        'CBSE National Board Past Year Question Paper (2024-2025).pdf'
      ],
      previewQuestions: [
        {
          id: `prev-q-1-${id}`,
          prompt: 'Calculate the total electric flux Φ_E through a cylindrical surface of length L enclosing line charge λ.',
          type: 'numerical',
          points: 10,
          topic: 'Gauss Law'
        },
        {
          id: `prev-q-2-${id}`,
          prompt: 'Which of the following describes the field inside an ideal spherical conductor in electrostatic equilibrium?',
          type: 'mcq',
          points: 5,
          topic: 'Electrostatics'
        },
        {
          id: `prev-q-3-${id}`,
          prompt: 'Derive the commutation bracket [x, p] in one-dimensional wave mechanics.',
          type: 'short_answer',
          points: 10,
          topic: 'Operator Algebra'
        }
      ],
      status: 'PROPOSED',
      createdAt: new Date().toISOString()
    };

    this.proposals.set(id, proposal);

    // Record audit event for proposal creation
    this.auditEvents.unshift({
      id: `audit-${Date.now()}-prop`,
      actorId: actorUser.id,
      actorName: actorUser.displayName,
      actorRole: actorUser.role,
      institutionId: 'inst-stark-academy',
      action: 'PRINCIPAL_COMMAND_PROPOSED',
      targetScope: `${proposal.targetGradeName} · ${proposal.targetCourseCode}`,
      sourceObjectIds: proposal.approvedKnowledgeSpaceIds,
      generatedObjectIds: [id],
      approvedAt: proposal.createdAt,
      executedAt: proposal.createdAt,
      outcome: 'SUCCESS'
    });

    return proposal;
  }

  /**
   * Approve and execute a Principal Command Proposal
   */
  public async approveAndExecuteCommand(
    actorUser: User,
    proposalId: string
  ): Promise<{ proposal: PrincipalCommandProposal; auditEvent: InstitutionalAuditEvent; createdQuizId: string }> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal '${proposalId}' not found.`);
    }

    if (proposal.status === 'EXECUTED') {
      throw new Error(`Proposal '${proposalId}' has already been executed.`);
    }

    // Role check: Only principal, admin, or commander can execute
    if (actorUser.role !== 'principal' && actorUser.role !== 'admin' && actorUser.role !== 'commander') {
      throw new Error(`Access Denied: User '${actorUser.id}' with role '${actorUser.role}' cannot execute institutional commands.`);
    }

    const now = new Date().toISOString();
    const targetClassId = proposal.targetClasses[0]?.id || 'class-phys-301';

    // Execute through canonical Quiz Repository
    const createdQuizId = `diag-quiz-${Date.now()}`;
    const createdQuiz = await jarvisData.quizzes.createQuiz({
      id: createdQuizId,
      workspaceId: 'ws-stark-core',
      classId: targetClassId,
      classroomSessionId: 'session-phys-101',
      teacherId: actorUser.id,
      title: `${proposal.targetCourseCode} Institutional Diagnostic: ${proposal.targetGradeName}`,
      description: `Comprehensive 15-minute diagnostic requested by Academic Leadership covering ${proposal.coveredTopics.join(', ')}.`,
      status: 'live'
    });

    for (let idx = 0; idx < proposal.previewQuestions.length; idx++) {
      const q = proposal.previewQuestions[idx];
      await jarvisData.quizzes.addQuestion({
        id: `diag-q-${idx + 1}-${Date.now()}`,
        quizId: createdQuiz.id,
        questionText: q.prompt,
        options: q.type === 'mcq' ? ['Zero (E = 0)', 'Non-zero and radial', 'Infinite', 'Undetermined'] : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctOption: 'A',
        points: q.points,
        order: idx + 1
      });
    }

    proposal.status = 'EXECUTED';
    proposal.approvedAt = now;
    proposal.executedAt = now;
    proposal.resultingQuizIds = [createdQuiz.id];

    this.proposals.set(proposalId, proposal);

    // Record formal Institutional Audit Event
    const auditEvent: InstitutionalAuditEvent = {
      id: `audit-${Date.now()}-exec`,
      actorId: actorUser.id,
      actorName: actorUser.displayName,
      actorRole: actorUser.role,
      institutionId: proposal.institutionId,
      action: 'PRINCIPAL_DIAGNOSTIC_QUIZ_EXECUTED',
      targetScope: `${proposal.targetGradeName} · Classes: ${proposal.targetClasses.map((c) => c.code).join(', ')}`,
      sourceObjectIds: proposal.approvedKnowledgeSpaceIds,
      generatedObjectIds: [createdQuiz.id, proposal.id],
      approvedAt: now,
      executedAt: now,
      outcome: 'SUCCESS',
      metadata: {
        quizId: createdQuiz.id,
        questionCount: proposal.questionCount,
        durationMinutes: proposal.durationMinutes,
        courseCode: proposal.targetCourseCode
      }
    };

    this.auditEvents.unshift(auditEvent);

    return {
      proposal,
      auditEvent,
      createdQuizId: createdQuiz.id
    };
  }

  /**
   * Get all proposals
   */
  public getProposals(): PrincipalCommandProposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Get proposal by ID
   */
  public getProposal(id: string): PrincipalCommandProposal | undefined {
    return this.proposals.get(id);
  }

  /**
   * Get Institutional Audit Ledger
   */
  public getAuditEvents(institutionId = 'inst-stark-academy'): InstitutionalAuditEvent[] {
    return this.auditEvents.filter((a) => a.institutionId === institutionId);
  }
}

export const institutionalService = new InstitutionalService();
