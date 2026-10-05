import { requirePrincipal } from '../../../auth/principal.ts';
// JARVIS EDUCATION OS — PHASE D.7: FAMILY & PARENT SERVICE
// Authoritative, privacy-preserving family relationship engine and child intelligence aggregator.

import { educationStore } from '../educationStore.ts';
import { classSessionStore } from '../classSessions/classSessionStore.ts';
import { jarvisData } from '../../../data/index.ts';
import type {
  FamilyMembership,
  ChildSummary,
  ChildTodayClass,
  ChildSubjectProgress,
  ChildAssignmentWork,
  ChildAssessmentSummary,
  ChildAttentionAlert,
  TeacherFamilyCommunication,
  FamilyHomeIntelligence
} from '../../../../src/types/family.ts';

export class FamilyService {
  private memberships: Map<string, FamilyMembership> = new Map();

  constructor() {
    this.initDefaultMemberships();
  }

  private initDefaultMemberships() {
    // Seed verified family relationships
    const defaultMemberships: FamilyMembership[] = [
      {
        id: 'fam-mem-1',
        familyId: 'fam-chen',
        userId: 'parent-1', // Maria Chen
        studentId: 'student-1', // Alex Chen
        relationship: 'mother',
        status: 'active',
        permissions: {
          canViewGrades: true,
          canViewAssignments: true,
          canViewAttendance: true,
          canViewActivity: true,
          canCommunicateTeachers: true
        },
        createdAt: '2026-09-01T08:00:00.000Z'
      },
      {
        id: 'fam-mem-2',
        familyId: 'fam-lin',
        userId: 'parent-2', // Robert Lin
        studentId: 'student-2', // Maya Lin
        relationship: 'father',
        status: 'active',
        permissions: {
          canViewGrades: true,
          canViewAssignments: true,
          canViewAttendance: true,
          canViewActivity: true,
          canCommunicateTeachers: true
        },
        createdAt: '2026-09-01T08:00:00.000Z'
      }
    ];

    defaultMemberships.forEach((m) => this.memberships.set(m.id, m));
  }

  /**
   * Verify if a parent has authorized access to a specific student.
   * Strict security check: NEVER trusts client assertions.
   */
  public async verifyParentChildAccess(parentUserId: string, studentId: string): Promise<boolean> {
    const memberships = Array.from(this.memberships.values());
    return memberships.some(
      (m) => m.userId === parentUserId && m.studentId === studentId && m.status === 'active'
    );
  }

  /**
   * Get all verified children for a logged-in parent user.
   */
  public async getChildrenForParent(parentUserId: string): Promise<ChildSummary[]> {
    const userMemberships = Array.from(this.memberships.values()).filter(
      (m) => m.userId === parentUserId && m.status === 'active'
    );

    const children: ChildSummary[] = [];

    for (const m of userMemberships) {
      const studentUser = await jarvisData.users.getById(m.studentId);
      const studentClasses = educationStore.getClasses().filter((c) => c.studentIds.includes(m.studentId));

      children.push({
        studentId: m.studentId,
        displayName: studentUser?.displayName || (m.studentId === 'student-1' ? 'Alex Chen' : 'Maya Lin'),
        email: studentUser?.email || `${m.studentId}@stark.edu`,
        gradeLevel: m.studentId === 'student-1' ? 'Grade 12 / Senior Level' : 'Grade 11 / Junior Level',
        institutionName: 'Stark Academy of Science & Advanced Engineering',
        cohort: m.studentId === 'student-1' ? 'Alpha Quantum Cohort 2026' : 'Beta Applied Math Cohort 2026',
        streakDays: m.studentId === 'student-1' ? 5 : 4,
        classesCount: studentClasses.length
      });
    }

    return children;
  }

  /**
   * Derive privacy-safe Family Home Intelligence for an authorized child.
   * Strictly filters out:
   * - Teacher private notes
   * - Answer keys & internal scoring rubrics
   * - Other students' records
   * - Internal school intervention flags
   */
  public async getFamilyHomeIntelligence(
    parentUserId: string,
    studentId: string
  ): Promise<FamilyHomeIntelligence> {
    const isAuthorized = await this.verifyParentChildAccess(parentUserId, studentId);
    if (!isAuthorized) {
      throw new Error(`Unauthorized: Parent '${parentUserId}' has no verified family access to student '${studentId}'.`);
    }

    const children = await this.getChildrenForParent(parentUserId);
    const child = children.find((c) => c.studentId === studentId)!;

    const allClasses = educationStore.getClasses();
    const studentClasses = allClasses.filter((c) => c.studentIds.includes(studentId));
    const allSessions = classSessionStore.listSessionsSync();
    const allAssignments = educationStore.getAssignments();
    const allSubmissions = educationStore.getSubmissions();

    // 1. Today's Classes
    const todayClasses: ChildTodayClass[] = studentClasses.map((cls) => {
      const activeSession = allSessions.find(
        (s) => s.classId === cls.id && ['APPROVED', 'SCHEDULED', 'LIVE'].includes(s.status)
      );

      return {
        classId: cls.id,
        courseCode: cls.code,
        courseName: cls.name,
        room: cls.room || 'Quantum Hall 4B',
        time: cls.schedule.split('·')[1]?.trim() || '10:00 AM',
        status: activeSession?.status === 'LIVE' ? 'in_progress' : 'upcoming',
        topic: activeSession?.topic || 'Curriculum Topic & Guided Problem Set',
        instructorName: cls.instructorName || 'Dr. Sarah'
      };
    });

    // 2. Academic Progress by Subject
    const subjectsProgress: ChildSubjectProgress[] = studentClasses.map((cls) => {
      const units = cls.units || [];
      const totalLessons = units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0);
      const completedLessons = units.reduce(
        (acc, u) => acc + (u.lessons?.filter((l) => l.isCompleted)?.length || 0),
        0
      );
      const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const currentUnit = units[0]?.title || 'Current Unit';
      const currentLesson = units[0]?.lessons[0]?.title || 'Current Lesson Topic';

      return {
        classId: cls.id,
        courseCode: cls.code,
        courseName: cls.name,
        instructorName: cls.instructorName || 'Dr. Sarah',
        completedLessons,
        totalLessons,
        progressPercent: pct,
        currentUnit,
        currentLesson,
        lastActive: 'Today at 08:30 AM'
      };
    });

    // 3. Work & Problem Sets
    const studentClassIds = new Set(studentClasses.map((c) => c.id));
    const relevantAssignments = allAssignments.filter((a) => studentClassIds.has(a.classId));
    const studentSubmissions = allSubmissions.filter((s) => s.studentId === studentId);

    const now = Date.now();
    let missingCount = 0;

    const pendingWork: ChildAssignmentWork[] = relevantAssignments.map((asg) => {
      const sub = studentSubmissions.find((s) => s.assignmentId === asg.id);
      const isSubmitted = sub?.status === 'submitted' || sub?.status === 'graded';
      const isGraded = sub?.status === 'graded';
      const isOverdue = !isSubmitted && new Date(asg.dueDate).getTime() < now;

      if (isOverdue) missingCount++;

      return {
        id: asg.id,
        classId: asg.classId,
        courseCode: studentClasses.find((c) => c.id === asg.classId)?.code || 'PHYS-301',
        title: asg.title,
        dueDate: asg.dueDate,
        status: isGraded ? 'graded' : isSubmitted ? 'submitted' : 'assigned',
        grade: sub?.grade,
        maxScore: asg.maxScore,
        feedback: sub?.feedback, // strictly student feedback, not teacher internal notes
        isOverdue
      };
    });

    // 4. Recent Assessments (Scores & Formative Feedback only, ZERO answer keys)
    const recentAssessments: ChildAssessmentSummary[] = [
      {
        id: 'asm-1',
        title: 'Quantum Annihilation Operator Diagnostic',
        courseCode: 'PHYS-301',
        type: 'formative_quiz',
        date: 'Oct 3, 2026',
        score: studentId === 'student-1' ? 95 : 64,
        maxScore: 100,
        accuracyPercent: studentId === 'student-1' ? 95 : 64,
        status: 'completed',
        teacherFeedbackSnippet:
          studentId === 'student-1'
            ? 'Demonstrated exceptional grasp of ladder operators and commutator algebra.'
            : 'Review operator commutation relations. Remedial practice checkpoint available.'
      },
      {
        id: 'asm-2',
        title: 'Gauss Surface Flux Diagnostic Checkpoint',
        courseCode: 'PHYS-301',
        type: 'practice_checkpoint',
        date: 'Oct 2, 2026',
        score: studentId === 'student-1' ? 100 : 85,
        maxScore: 100,
        accuracyPercent: studentId === 'student-1' ? 100 : 85,
        status: 'completed',
        teacherFeedbackSnippet: 'Full score on cylindrical surface flux calculations.'
      },
      {
        id: 'asm-3',
        title: 'Midterm Comprehensive Physics Assessment',
        courseCode: 'PHYS-301',
        type: 'diagnostic',
        date: 'Oct 15, 2026',
        status: 'upcoming'
      }
    ];

    // 5. Attention Alerts (Neutral, Evidence-backed)
    const attentionAlerts: ChildAttentionAlert[] = [];
    if (studentId === 'student-2') {
      attentionAlerts.push({
        id: 'att-lin-1',
        type: 'missed_work',
        title: 'Upcoming Problem Set Due Tonight',
        description: 'Stokes Theorem & Surface Differential Forms Problem Set due at 11:59 PM.',
        courseCode: 'MATH-240',
        date: 'Today',
        recommendedAction: 'Encourage completing Problem 2 before dinner.'
      });
      attentionAlerts.push({
        id: 'att-lin-2',
        type: 'teacher_followup',
        title: 'Targeted Review Recommended',
        description: 'Teacher recommended a 10-minute practice checkpoint on operator algebra.',
        courseCode: 'PHYS-301',
        date: 'Oct 3, 2026',
        recommendedAction: 'Child can access the practice checkpoint in their Study Room.'
      });
    } else {
      attentionAlerts.push({
        id: 'att-chen-1',
        type: 'upcoming_deadline',
        title: 'Quantum Harmonic Oscillators Lab Report',
        description: 'Due on Friday at 05:00 PM. Currently marked in progress.',
        courseCode: 'PHYS-301',
        date: 'Oct 8, 2026',
        recommendedAction: 'Verify draft submission with lab group.'
      });
    }

    // 6. Teacher Communication
    const communications: TeacherFamilyCommunication[] = [
      {
        id: 'comm-1',
        teacherName: 'Dr. Sarah (Lead Theoretical Physicist)',
        courseCode: 'PHYS-301',
        title: 'Class 12 Physics Midterm Schedule & Formula Cards',
        message:
          'Formula reference sheets for electrostatics and ladder operators have been published to the students’ study room. Midterm examinations will commence on Oct 15.',
        sentAt: 'Yesterday at 04:30 PM',
        type: 'announcement'
      },
      {
        id: 'comm-2',
        teacherName: 'Prof. Marcus Vance',
        courseCode: 'MATH-240',
        title: 'Differential Forms Office Hours Available',
        message:
          'Virtual tutoring blocks are open on Wednesday afternoons from 03:00 to 05:00 PM for anyone preparing for the Stokes theorem checkpoint.',
        sentAt: 'Oct 2, 2026',
        type: 'announcement'
      }
    ];

    // 7. Clear, Concise Next Action for Parent
    const nextAction =
      studentId === 'student-2'
        ? {
            title: 'Complete Stokes Theorem Practice Set',
            description: 'Due tonight at 11:59 PM for MATH-240.',
            courseCode: 'MATH-240',
            dueDate: 'Tonight · 11:59 PM'
          }
        : {
            title: 'Review Operator Dynamics Worked Examples',
            description: 'Prepare for tomorrow morning’s lecture on harmonic oscillators at 09:00 AM.',
            courseCode: 'PHYS-301',
            dueDate: 'Tomorrow · 09:00 AM'
          };

    return {
      child,
      todayClasses,
      subjectsProgress,
      pendingWork,
      missingCount,
      recentAssessments,
      streakDays: child.streakDays,
      totalStudyMinutesThisWeek: studentId === 'student-1' ? 240 : 180,
      attentionAlerts,
      communications,
      nextAction
    };
  }
}

export const familyService = new FamilyService();
