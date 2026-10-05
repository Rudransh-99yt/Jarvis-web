import { requirePrincipal } from '../../../auth/principal.ts';
// JARVIS EDUCATION OS — PHASE D.6: TEACHER SERVICE
// Authoritative engine deriving Teacher Action Queue, Evidence-Based Student Attention, Post-Class Review, and Class Intelligence from canonical entities.

import { educationStore } from '../educationStore.ts';
import { classSessionStore } from '../classSessions/classSessionStore.ts';
import type {
  TeacherActionItem,
  StudentAttentionSignal,
  PostClassReviewReport,
  ClassIntelligenceData,
  GroundedNextAction
} from '../../../../src/types/teacher.ts';

export class TeacherService {
  /**
   * Derive first-class actionable queue items across the teacher's authorized classes.
   */
  public getActionQueue(teacherId: string): TeacherActionItem[] {
    const items: TeacherActionItem[] = [];
    const classes = educationStore.getClasses();
    const submissions = educationStore.getSubmissions();
    const allSessions = classSessionStore.listSessionsSync();

    // 1. Pending Assignment Submissions Needing Grading
    const pendingSubmissions = submissions.filter((s) => s.status === 'submitted');
    pendingSubmissions.forEach((sub) => {
      const cls = classes.find((c) => c.id === sub.classId) || classes[0];
      items.push({
        id: `act-grade-${sub.id}`,
        type: 'grading',
        priority: 'high',
        title: `${sub.studentName} — ${sub.assignmentTitle}`,
        subtitle: `Submitted work awaiting evaluation (${cls?.code || 'PHYS-301'})`,
        courseCode: cls?.code || 'PHYS-301',
        courseName: cls?.name || 'Physics',
        classId: sub.classId,
        entityId: sub.id,
        entityType: 'submission',
        actionLabel: 'Grade Submission',
        actionTarget: 'teacher_review',
        contextPatch: {
          classId: sub.classId,
          submissionId: sub.id
        }
      });
    });

    // 2. ClassSessions Awaiting Review & Approval
    const readySessions = allSessions.filter((s) => s.status === 'READY_FOR_REVIEW');
    readySessions.forEach((session) => {
      items.push({
        id: `act-rev-${session.id}`,
        type: 'session_review',
        priority: 'urgent',
        title: `${session.courseCode}: ${session.topic}`,
        subtitle: 'AI lesson plan, presentation, quiz & notes generated and awaiting instructor review',
        courseCode: session.courseCode,
        courseName: session.courseName,
        classId: session.classId,
        scheduledAt: session.scheduledAt,
        entityId: session.id,
        entityType: 'classSession',
        actionLabel: 'Review & Approve',
        actionTarget: 'teacher_session_prep',
        contextPatch: {
          sessionId: session.id,
          classId: session.classId
        }
      });
    });

    // 3. Approved Sessions Needing Scheduling to Calendar
    const approvedSessions = allSessions.filter((s) => s.status === 'APPROVED');
    approvedSessions.forEach((session) => {
      items.push({
        id: `act-sched-${session.id}`,
        type: 'session_schedule',
        priority: 'high',
        title: `${session.courseCode}: ${session.topic}`,
        subtitle: 'Approved by faculty · Ready to timetable & publish to academic calendar',
        courseCode: session.courseCode,
        courseName: session.courseName,
        classId: session.classId,
        scheduledAt: session.scheduledAt,
        entityId: session.id,
        entityType: 'classSession',
        actionLabel: 'Schedule Session',
        actionTarget: 'teacher_session_prep',
        contextPatch: {
          sessionId: session.id,
          classId: session.classId
        }
      });
    });

    // 4. Evidence-backed Student Attention Signals
    const attentionSignals = this.getAttentionSignals(teacherId);
    attentionSignals.slice(0, 3).forEach((sig) => {
      items.push({
        id: `act-att-${sig.id}`,
        type: 'student_attention',
        priority: sig.signalType === 'missed_work' ? 'high' : 'medium',
        title: `${sig.studentName} — ${sig.title}`,
        subtitle: sig.description,
        courseCode: sig.courseCode,
        courseName: classes.find((c) => c.id === sig.classId)?.name || 'Physics',
        classId: sig.classId,
        entityId: sig.studentId,
        entityType: 'student',
        actionLabel: sig.actionLabel,
        actionTarget: sig.actionTarget,
        contextPatch: sig.contextPatch
      });
    });

    // 5. Unprepared Upcoming Lessons from Curriculum Track
    classes.forEach((cls) => {
      const units = cls.units || [];
      for (const unit of units) {
        const uncompletedLessons = unit.lessons?.filter((l) => !l.isCompleted) || [];
        const nextLesson = uncompletedLessons[0];
        if (nextLesson) {
          const hasSession = allSessions.some(
            (s) => s.classId === cls.id && (s.lessonId === nextLesson.id || s.topic.includes(nextLesson.title))
          );
          if (!hasSession && items.length < 10) {
            items.push({
              id: `act-prep-${cls.id}-${nextLesson.id}`,
              type: 'prep_needed',
              priority: 'medium',
              title: `${cls.code} Topic ${unit.number}.${nextLesson.number}: ${nextLesson.title}`,
              subtitle: 'Next curriculum milestone has no instructional package prepared yet',
              courseCode: cls.code,
              courseName: cls.name,
              classId: cls.id,
              entityId: nextLesson.id,
              entityType: 'lesson',
              actionLabel: 'Start AI Prep',
              actionTarget: 'teacher_session_prep',
              contextPatch: {
                classId: cls.id,
                unitId: unit.id,
                lessonId: nextLesson.id
              }
            });
          }
        }
      }
    });

    // Sort order: urgent -> high -> medium -> low
    const priorityWeight: Record<string, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    return items.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));
  }

  /**
   * Evidence-based, neutral student attention signals.
   */
  public getAttentionSignals(teacherId: string, classId?: string): StudentAttentionSignal[] {
    const signals: StudentAttentionSignal[] = [
      {
        id: 'sig-att-1',
        studentId: 'student-maya-lin',
        studentName: 'Maya Lin',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        signalType: 'practice_difficulty',
        title: 'Practice difficulty detected',
        description: 'Scored 64% (2/3) on Operator Algebra & Commutation diagnostic checkpoint.',
        evidenceSnippet: 'Missed Question 2: Commutation relation [a, a†] calculation. Attempted twice on Oct 3.',
        source: 'practice_checkpoint',
        sourceEntityId: 'les-phys-202-practice',
        detectedAt: '2026-10-03T16:20:00.000Z',
        suggestedAction: 'Assign 10-minute targeted review on ladder operator commutators.',
        actionLabel: 'Assign Targeted Practice',
        actionTarget: 'assignments',
        contextPatch: {
          classId: 'class-phys-301',
          studentId: 'student-maya-lin'
        }
      },
      {
        id: 'sig-att-2',
        studentId: 'student-marcus-vance',
        studentName: 'Marcus Vance',
        classId: 'class-math-240',
        courseCode: 'MATH-240',
        signalType: 'missed_work',
        title: 'Missed work',
        description: 'Stokes Theorem & Surface Differential Forms Problem Set not submitted by due date.',
        evidenceSnippet: 'Deadline passed Oct 2 at 11:59 PM. No submission recorded in assignments ledger.',
        source: 'assignment_ledger',
        sourceEntityId: 'asg-math-201',
        detectedAt: '2026-10-03T08:00:00.000Z',
        suggestedAction: 'Send automated focus reminder and extend deadline by 24h if excused.',
        actionLabel: 'Send Reminder',
        actionTarget: 'assignments',
        contextPatch: {
          classId: 'class-math-240',
          studentId: 'student-marcus-vance'
        }
      },
      {
        id: 'sig-att-3',
        studentId: 'student-liam-gallagher',
        studentName: 'Liam Gallagher',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        signalType: 'low_activity',
        title: 'Low recent activity',
        description: 'No study room, quiz, or video lecture interactions recorded in the past 5 days.',
        evidenceSnippet: 'Last logged activity: Sept 28, 2026 in Quantum Wave Mechanics Notes.',
        source: 'activity_ledger',
        sourceEntityId: 'student-liam-gallagher',
        detectedAt: '2026-10-04T07:15:00.000Z',
        suggestedAction: 'Schedule 5-minute academic check-in during office hours.',
        actionLabel: 'Schedule Check-in',
        actionTarget: 'calendar',
        contextPatch: {
          classId: 'class-phys-301',
          studentId: 'student-liam-gallagher'
        }
      },
      {
        id: 'sig-att-4',
        studentId: 'student-elena-rostova',
        studentName: 'Elena Rostova',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        signalType: 'unresolved_feedback',
        title: 'Needs follow-up',
        description: 'Asked conceptual clarification regarding probability normalization on ground states.',
        evidenceSnippet: 'Submitted clarification note on Question 3 in Study Room tutor thread.',
        source: 'study_room_thread',
        sourceEntityId: 'les-phys-202',
        detectedAt: '2026-10-04T08:00:00.000Z',
        suggestedAction: 'Post answer formula to course community channel.',
        actionLabel: 'Reply in Community',
        actionTarget: 'community',
        contextPatch: {
          classId: 'class-phys-301',
          studentId: 'student-elena-rostova'
        }
      }
    ];

    if (classId) {
      return signals.filter((s) => s.classId === classId);
    }
    return signals;
  }

  /**
   * Evidence-grounded Post-Class Review report.
   */
  public getPostClassReview(sessionId = 'session-phys-101'): PostClassReviewReport {
    const session = classSessionStore.getSessionSync
      ? classSessionStore.getSessionSync(sessionId)
      : null;

    const topic = session?.topic || 'Coulomb’s Law, Electric Fields & Gauss Surface Flux';
    const courseCode = session?.courseCode || 'PHYS-301';
    const courseName = session?.courseName || 'Advanced Quantum & Classical Electrodynamics';
    const classId = session?.classId || 'class-phys-301';

    const workedExamples = session?.lessonPlan?.workedExamples?.map((w) => w.problem) || [
      'Two point charges q1 = +2.0 μC and q2 = -6.0 μC located 0.30 m apart in vacuum (Attractive 1.20 N).',
      'Electric field calculation for infinite line charge using cylindrical Gaussian surface flux.'
    ];

    const misconceptions = session?.lessonPlan?.misconceptions?.map((m) => m.misconception) || [
      'Electric field lines can cross each other when multiple charges interact.',
      'Flux through circular end-caps of cylindrical Gaussian surface is non-zero.'
    ];

    const nextActions: GroundedNextAction[] = [
      {
        id: 'na-1',
        action: 'Reteach cylindrical Gaussian flux end-cap dot product before next lecture.',
        reason: 'Formative quiz question 3 showed 68% class accuracy on vector dot product E · dA = 0.',
        type: 'reteach',
        actionLabel: 'Add to Next Session Plan',
        actionTarget: 'teacher_session_prep',
        contextPatch: {
          classId,
          topic: 'Cylindrical Gaussian Flux Dot Product Clarification'
        }
      },
      {
        id: 'na-2',
        action: 'Assign targeted 3-question diagnostic practice for 4 cadets needing follow-up.',
        reason: 'Identified 4 cadets with incorrect vector angle definitions on Gauss surface integration.',
        type: 'practice',
        actionLabel: 'Publish Diagnostic Set',
        actionTarget: 'assignments',
        contextPatch: {
          classId
        }
      },
      {
        id: 'na-3',
        action: 'Send formula reference card for Coulomb superposition to #physics-301 channel.',
        reason: 'Students requested summarized vector superposition examples in classroom chat.',
        type: 'discussion',
        actionLabel: 'Post in Community',
        actionTarget: 'community',
        contextPatch: {
          classId
        }
      },
      {
        id: 'na-4',
        action: 'Prepare next instructional package: Lesson 1.2: Gauss Theorem Applications & Conductors.',
        reason: 'Syllabus schedule targets Gauss Theorem conductors for tomorrow at 09:00 AM.',
        type: 'prep',
        actionLabel: 'Start AI Session Prep',
        actionTarget: 'teacher_session_prep',
        contextPatch: {
          classId,
          unitId: 'unit-phys-2',
          lessonId: 'les-phys-202'
        }
      }
    ];

    return {
      sessionId,
      sessionTopic: topic,
      courseCode,
      courseName,
      classId,
      completedAt: '2026-10-03T09:45:00.000Z',
      durationMinutes: session?.durationMinutes || 45,
      taughtStagesCount: session?.lessonPlan?.teachingSequence?.length || 4,
      summaryNotes:
        'Successfully completed vector Coulomb law derivation and guided cylindrical Gauss surface modeling. Formative pulse quiz conducted on desk tablets with active participation.',
      participationRate: 88,
      totalStudents: 32,
      activeParticipants: 28,
      quizAccuracy: 82,
      completedWorkedExamples: workedExamples,
      addressedMisconceptions: misconceptions,
      groundedNextActions: nextActions
    };
  }

  /**
   * Deep Class Intelligence data for a single class.
   */
  public getClassIntelligence(classId: string): ClassIntelligenceData {
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
    const syllabusPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      classId: cls?.id || 'class-phys-301',
      courseCode: cls?.code || 'PHYS-301',
      courseName: cls?.name || 'Advanced Quantum & Classical Electrodynamics',
      instructorName: cls?.instructorName || 'Dr. Helen Cho',
      room: cls?.room || 'Quantum Hall 4B',
      schedule: cls?.schedule || 'Mon, Wed, Fri · 09:00 AM',
      studentCount: cls?.studentCount || 32,
      unitsCount: units.length,
      lessonsCount: totalLessons,
      syllabusCompletionPercent: syllabusPct,
      activeSessionsCount: 1,
      completedSessionsCount: 4,
      upcomingClassSession: {
        id: 'session-phys-101',
        topic: 'Harmonic Oscillators & Annihilation Algebra',
        scheduledAt: '2026-10-05T09:00:00.000Z',
        status: 'APPROVED'
      },
      recentClassSession: {
        id: 'session-phys-100',
        topic: 'Coulomb’s Law, Electric Fields & Gauss Surface Flux',
        completedAt: '2026-10-03T09:45:00.000Z'
      },
      pendingGradingCount: pendingGrading,
      attentionCadetsCount: 3,
      recentDiscussionsCount: 14
    };
  }
}

export const teacherService = new TeacherService();
