// JARVIS EDUCATION OS — PHASE D.5: SERVER ENGAGEMENT STORE
// Authoritative point calculation, anti-gaming idempotency, and privacy-governed leaderboard aggregation.

import type {
  StudentEngagementEvent,
  EngagementPointsConfig,
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardPrivacyScope,
  StudentEngagementStats,
  EngagementEventType
} from '../../../../src/types/engagement.ts';
import { DEFAULT_ENGAGEMENT_CONFIG } from '../../../../src/types/engagement.ts';

export class EngagementStore {
  private events: StudentEngagementEvent[] = [];
  private idempotencyKeys: Set<string> = new Set();
  private config: EngagementPointsConfig = { ...DEFAULT_ENGAGEMENT_CONFIG };
  private privacyScope: LeaderboardPrivacyScope = 'CLASS'; // default: class-level visibility
  private initialized = false;

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData(): void {
    if (this.initialized) return;

    // Seed realistic base accomplishments for Stark Academy Class 12 cadets
    const seedEvents: StudentEngagementEvent[] = [
      // Alex Chen (Current Student - student-1)
      {
        id: 'eng-seed-1',
        studentId: 'student-1',
        studentName: 'Alex Chen',
        institutionId: 'inst-stark-academy',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        type: 'lesson_completed',
        title: 'Schrödinger Wave Equation & Postulates',
        description: 'Completed foundational wave mechanics lesson and notes.',
        sourceEntityType: 'lesson',
        sourceEntityId: 'les-phys-101',
        points: 10,
        occurredAt: '2026-10-01T10:15:00.000Z'
      },
      {
        id: 'eng-seed-2',
        studentId: 'student-1',
        studentName: 'Alex Chen',
        institutionId: 'inst-stark-academy',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        type: 'focus_completed',
        title: 'Deep Focus Block: Harmonic Oscillators',
        description: 'Completed 45m uninterrupted Pomodoro focus session.',
        sourceEntityType: 'focusSession',
        sourceEntityId: 'foc-seed-1',
        points: 10,
        occurredAt: '2026-10-02T14:30:00.000Z'
      },
      {
        id: 'eng-seed-3',
        studentId: 'student-1',
        studentName: 'Alex Chen',
        institutionId: 'inst-stark-academy',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        type: 'practice_completed',
        title: 'Quantum Eigenvalue Diagnostic Checkpoint',
        description: 'Scored 100% on 5 practice verification exercises.',
        sourceEntityType: 'practice',
        sourceEntityId: 'les-phys-101-practice',
        points: 10,
        occurredAt: '2026-10-03T11:00:00.000Z'
      },
      {
        id: 'eng-seed-4',
        studentId: 'student-1',
        studentName: 'Alex Chen',
        institutionId: 'inst-stark-academy',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        type: 'assignment_submitted',
        title: 'Quantum Harmonic Oscillator Derivation',
        description: 'Submitted analytical problem set before deadline.',
        sourceEntityType: 'assignment',
        sourceEntityId: 'asg-phys-1',
        points: 15,
        occurredAt: '2026-10-03T16:00:00.000Z'
      },
      {
        id: 'eng-seed-5',
        studentId: 'student-1',
        studentName: 'Alex Chen',
        institutionId: 'inst-stark-academy',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        type: 'assignment_on_time',
        title: 'On-Time Submission Bonus',
        description: 'Turned in assignment 24 hours prior to deadline.',
        sourceEntityType: 'assignment',
        sourceEntityId: 'asg-phys-1',
        points: 5,
        occurredAt: '2026-10-03T16:00:00.000Z'
      },
      {
        id: 'eng-seed-6',
        studentId: 'student-1',
        studentName: 'Alex Chen',
        institutionId: 'inst-stark-academy',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        type: 'quiz_completed',
        title: 'Annihilation Operator Live Diagnostic',
        description: 'Completed formative classroom quiz checkpoint.',
        sourceEntityType: 'quiz',
        sourceEntityId: 'quiz-phys-1',
        points: 15,
        occurredAt: '2026-10-04T08:30:00.000Z'
      },

      // Maya Lin (student-2)
      {
        id: 'eng-seed-m1',
        studentId: 'student-2',
        studentName: 'Maya Lin',
        institutionId: 'inst-stark-academy',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        type: 'lesson_completed',
        title: 'Schrödinger Wave Equation & Postulates',
        description: 'Completed foundational wave mechanics lesson.',
        sourceEntityType: 'lesson',
        sourceEntityId: 'les-phys-101',
        points: 10,
        occurredAt: '2026-10-01T09:45:00.000Z'
      },
      {
        id: 'eng-seed-m2',
        studentId: 'student-2',
        studentName: 'Maya Lin',
        institutionId: 'inst-stark-academy',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        type: 'assignment_submitted',
        title: 'Quantum Harmonic Oscillator Derivation',
        description: 'Submitted homework assignment.',
        sourceEntityType: 'assignment',
        sourceEntityId: 'asg-phys-1',
        points: 15,
        occurredAt: '2026-10-02T18:00:00.000Z'
      },
      {
        id: 'eng-seed-m3',
        studentId: 'student-2',
        studentName: 'Maya Lin',
        institutionId: 'inst-stark-academy',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        type: 'streak_milestone',
        title: '7-Day Study Consistency Milestone',
        description: 'Completed daily learning actions 7 days in a row.',
        sourceEntityType: 'lesson',
        sourceEntityId: 'streak-7d',
        points: 20,
        occurredAt: '2026-10-03T19:00:00.000Z'
      },

      // Marcus Vance (student-3)
      {
        id: 'eng-seed-mv1',
        studentId: 'student-3',
        studentName: 'Marcus Vance',
        institutionId: 'inst-stark-academy',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        type: 'lesson_completed',
        title: 'Schrödinger Wave Equation',
        description: 'Completed lesson content.',
        sourceEntityType: 'lesson',
        sourceEntityId: 'les-phys-101',
        points: 10,
        occurredAt: '2026-10-02T11:00:00.000Z'
      },
      {
        id: 'eng-seed-mv2',
        studentId: 'student-3',
        studentName: 'Marcus Vance',
        institutionId: 'inst-stark-academy',
        classId: 'class-phys-301',
        courseCode: 'PHYS-301',
        type: 'focus_completed',
        title: 'Deep Calculus Problem Solving',
        description: 'Completed 30m study lock.',
        sourceEntityType: 'focusSession',
        sourceEntityId: 'foc-mv-1',
        points: 10,
        occurredAt: '2026-10-03T14:00:00.000Z'
      }
    ];

    for (const ev of seedEvents) {
      this.events.push(ev);
      const key = `${ev.studentId}::${ev.type}::${ev.sourceEntityId}`;
      this.idempotencyKeys.add(key);
    }

    this.initialized = true;
  }

  public getPointsConfig(): EngagementPointsConfig {
    return { ...this.config };
  }

  public setPointsConfig(update: Partial<EngagementPointsConfig>): EngagementPointsConfig {
    this.config = { ...this.config, ...update };
    return { ...this.config };
  }

  public getPrivacyScope(): LeaderboardPrivacyScope {
    return this.privacyScope;
  }

  public setPrivacyScope(scope: LeaderboardPrivacyScope): void {
    this.privacyScope = scope;
  }

  /**
   * Record a student engagement event with anti-gaming idempotency.
   * If the event was already rewarded, returns { event, isDuplicate: true, pointsAwarded: 0 }.
   */
  public recordEvent(data: {
    studentId: string;
    studentName: string;
    institutionId: string;
    classId: string;
    courseCode?: string;
    type: EngagementEventType;
    title: string;
    description: string;
    sourceEntityType: StudentEngagementEvent['sourceEntityType'];
    sourceEntityId: string;
    metadata?: Record<string, unknown>;
  }): { event: StudentEngagementEvent; isDuplicate: boolean; pointsAwarded: number } {
    const idempotencyKey = `${data.studentId}::${data.type}::${data.sourceEntityId}`;

    if (this.idempotencyKeys.has(idempotencyKey)) {
      const existing = this.events.find(
        (e) => e.studentId === data.studentId && e.type === data.type && e.sourceEntityId === data.sourceEntityId
      );
      return {
        event: existing || {
          id: `eng-${Date.now()}`,
          ...data,
          points: 0,
          occurredAt: new Date().toISOString()
        },
        isDuplicate: true,
        pointsAwarded: 0
      };
    }

    // Determine authoritative points by type
    let points = 10;
    switch (data.type) {
      case 'lesson_completed':
        points = this.config.lessonCompleted;
        break;
      case 'practice_completed':
        points = this.config.practiceCompleted;
        break;
      case 'quiz_completed':
        points = this.config.quizCompleted;
        break;
      case 'assignment_submitted':
        points = this.config.assignmentSubmitted;
        break;
      case 'assignment_on_time':
        points = this.config.assignmentOnTimeBonus;
        break;
      case 'focus_completed':
        points = this.config.focusCompleted;
        break;
      case 'community_helpful':
        points = this.config.communityHelpful;
        break;
      case 'streak_milestone':
        points = this.config.streakMilestoneBonus;
        break;
      default:
        points = 10;
    }

    const newEvent: StudentEngagementEvent = {
      id: `eng-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId: data.studentId,
      studentName: data.studentName,
      institutionId: data.institutionId || 'inst-stark-academy',
      classId: data.classId || 'class-phys-301',
      courseCode: data.courseCode,
      type: data.type,
      title: data.title,
      description: data.description,
      sourceEntityType: data.sourceEntityType,
      sourceEntityId: data.sourceEntityId,
      points,
      occurredAt: new Date().toISOString(),
      metadata: data.metadata
    };

    this.events.push(newEvent);
    this.idempotencyKeys.add(idempotencyKey);

    return {
      event: newEvent,
      isDuplicate: false,
      pointsAwarded: points
    };
  }

  /**
   * Get student's chronological activity history.
   */
  public getStudentActivity(studentId: string): StudentEngagementEvent[] {
    return this.events
      .filter((e) => e.studentId === studentId)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }

  /**
   * Get comprehensive stats and breakdown for a student.
   */
  public getStudentStats(studentId: string, currentClassId = 'class-phys-301'): StudentEngagementStats {
    const studentEvents = this.getStudentActivity(studentId);
    const totalPoints = studentEvents.reduce((acc, e) => acc + e.points, 0);

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const pointsThisWeek = studentEvents
      .filter((e) => new Date(e.occurredAt) >= oneWeekAgo)
      .reduce((acc, e) => acc + e.points, 0);

    const pointsToday = studentEvents
      .filter((e) => new Date(e.occurredAt) >= startOfToday)
      .reduce((acc, e) => acc + e.points, 0);

    const breakdown = {
      lessons: studentEvents.filter((e) => e.type === 'lesson_completed').reduce((acc, e) => acc + e.points, 0),
      practice: studentEvents.filter((e) => e.type === 'practice_completed').reduce((acc, e) => acc + e.points, 0),
      quizzes: studentEvents.filter((e) => e.type === 'quiz_completed').reduce((acc, e) => acc + e.points, 0),
      assignments: studentEvents.filter((e) => ['assignment_submitted', 'assignment_on_time'].includes(e.type)).reduce((acc, e) => acc + e.points, 0),
      focus: studentEvents.filter((e) => e.type === 'focus_completed').reduce((acc, e) => acc + e.points, 0),
      community: studentEvents.filter((e) => e.type === 'community_helpful').reduce((acc, e) => acc + e.points, 0)
    };

    // Calculate rank
    const classLeaderboard = this.getLeaderboard('class', currentClassId, studentId);
    const classRank = classLeaderboard.find((e) => e.studentId === studentId)?.rank || 1;

    const cohortLeaderboard = this.getLeaderboard('cohort', currentClassId, studentId);
    const cohortRank = cohortLeaderboard.find((e) => e.studentId === studentId)?.rank || 1;

    const schoolLeaderboard = this.getLeaderboard('school', currentClassId, studentId);
    const schoolRank = schoolLeaderboard.find((e) => e.studentId === studentId)?.rank || 1;

    return {
      studentId,
      studentName: studentEvents[0]?.studentName || 'Alex Chen',
      totalPoints,
      classRank,
      cohortRank,
      schoolRank,
      streakDays: 5, // 5 active consecutive days
      pointsThisWeek,
      pointsToday,
      breakdown,
      recentEvents: studentEvents.slice(0, 10)
    };
  }

  /**
   * Generate aggregated leaderboard for requested scope ('class' | 'cohort' | 'school').
   */
  public getLeaderboard(
    scope: LeaderboardScope,
    classId: string,
    currentUserId: string
  ): LeaderboardEntry[] {
    // If privacy is OFF, return only the current user's entry
    if (this.privacyScope === 'OFF') {
      const myStats = this.events.filter((e) => e.studentId === currentUserId);
      const points = myStats.reduce((acc, e) => acc + e.points, 0);
      return [
        {
          rank: 1,
          studentId: currentUserId,
          displayName: 'You (Private Mode)',
          avatarInitials: 'YOU',
          points,
          streakDays: 5,
          completedActivitiesCount: myStats.length,
          isCurrentUser: true,
          tier: 'Cadet'
        }
      ];
    }

    // Default roster entries to make the Stark Academy cohort rich and competitive
    const baseRoster: Array<{ id: string; name: string; initials: string; basePoints: number; streak: number; milestone: string }> = [
      { id: 'usr-cadet-elena', name: 'Elena Rostova', initials: 'ER', basePoints: 1240, streak: 9, milestone: '9-Day Streak Milestone' },
      { id: 'usr-cadet-priya', name: 'Priya Patel', initials: 'PP', basePoints: 1210, streak: 8, milestone: 'Differential Forms Master' },
      { id: 'student-2', name: 'Maya Lin', initials: 'ML', basePoints: 1195, streak: 7, milestone: '7-Day Streak Milestone' },
      { id: 'usr-cadet-marcus', name: 'Marcus Vance', initials: 'MV', basePoints: 1170, streak: 6, milestone: 'Quantum Diagnostics Ace' },
      { id: 'usr-cadet-david', name: 'David Okafor', initials: 'DO', basePoints: 1165, streak: 6, milestone: 'Wave Mechanics Notes' },
      { id: 'usr-cadet-jordan', name: 'Jordan Lee', initials: 'JL', basePoints: 1145, streak: 5, milestone: 'Calculus Problem Set' },
      { id: 'usr-cadet-samara', name: 'Samara Khan', initials: 'SK', basePoints: 1090, streak: 4, milestone: 'Tensor Field Derivations' },
      { id: 'usr-cadet-liam', name: 'Liam O’Connor', initials: 'LO', basePoints: 1040, streak: 3, milestone: 'Gauss Law Checkpoint' }
    ];

    // Calculate live points for all students in events
    const liveTotals: Record<string, { points: number; count: number; name: string }> = {};
    for (const ev of this.events) {
      if (!liveTotals[ev.studentId]) {
        liveTotals[ev.studentId] = { points: 0, count: 0, name: ev.studentName };
      }
      liveTotals[ev.studentId].points += ev.points;
      liveTotals[ev.studentId].count += 1;
    }

    // Combine base points with recorded dynamic points for student-1
    const currentUserDynamic = liveTotals[currentUserId]?.points || 0;
    const currentUserCount = liveTotals[currentUserId]?.count || 0;
    // Current user base points (so rank sits around #5-#7 naturally)
    const currentUserTotalPoints = 1110 + currentUserDynamic;

    const entries: Array<Omit<LeaderboardEntry, 'rank'>> = [
      {
        studentId: currentUserId,
        displayName: 'Alex Chen (You)',
        avatarInitials: 'AC',
        points: currentUserTotalPoints,
        streakDays: 5,
        completedActivitiesCount: 6 + currentUserCount,
        recentMilestone: 'Wave Mechanics Checkpoint',
        isCurrentUser: true,
        tier: 'Gold'
      },
      ...baseRoster.map((c) => ({
        studentId: c.id,
        displayName: c.name,
        avatarInitials: c.initials,
        points: c.basePoints + (liveTotals[c.id]?.points || 0),
        streakDays: c.streak,
        completedActivitiesCount: Math.round(c.basePoints / 15),
        recentMilestone: c.milestone,
        isCurrentUser: c.id === currentUserId,
        tier: (c.basePoints >= 1200 ? 'Gold' : c.basePoints >= 1100 ? 'Silver' : 'Bronze') as any
      }))
    ];

    // Filter scope if needed (e.g. class vs cohort)
    let scopedEntries = entries;
    if (scope === 'class') {
      // In class scope, show the 6 class members
      scopedEntries = entries.slice(0, 6);
    } else if (scope === 'cohort') {
      // In cohort scope, show grade-level
      scopedEntries = entries.slice(0, 8);
    }

    // Sort by points descending
    scopedEntries.sort((a, b) => b.points - a.points);

    // Assign canonical ranks with tie handling
    let currentRank = 1;
    return scopedEntries.map((item, idx) => {
      if (idx > 0 && item.points === scopedEntries[idx - 1].points) {
        // Tie maintains same rank
      } else {
        currentRank = idx + 1;
      }
      return {
        ...item,
        rank: currentRank,
        tier: currentRank <= 2 ? 'Gold' : currentRank <= 4 ? 'Silver' : 'Bronze'
      };
    });
  }
}

export const engagementStore = new EngagementStore();
