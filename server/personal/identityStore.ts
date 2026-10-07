import type {
  PersonalJarvisIdentity,
  ProgressiveOnboardingPayload,
  UserContext,
  PersonalGoal,
  PersonalPreferences,
  PersonalProfile
} from './types.ts';

/**
 * PersonalIdentityStore
 * Manages persistent PersonalJarvisIdentity representations.
 * Principle: The user is ONE person across multiple contexts and roles.
 */
export class PersonalIdentityStore {
  private identities: Map<string, PersonalJarvisIdentity> = new Map();

  constructor() {
    this.seedDefaultIdentities();
  }

  private seedDefaultIdentities(): void {
    const student1Contexts: UserContext[] = [
      {
        id: 'ctx-student1-personal',
        type: 'PERSONAL',
        title: 'Personal & Lifelong Learning',
        description: 'Independent personal projects, habits, and self-directed curiosity',
        isDefault: false,
        isActive: false,
        metadata: {
          tags: ['personal', 'productivity']
        },
        permissions: {
          canAccessInstitutionData: false,
          sharePersonalMemory: false
        },
        createdAt: new Date('2026-09-01T00:00:00Z').toISOString()
      },
      {
        id: 'ctx-student1-edu',
        type: 'EDUCATION',
        title: 'Class 11 Physics & JEE Prep',
        description: 'Stark Academy Senior Physics and Competitive Entrance Preparation',
        isDefault: true,
        isActive: true,
        metadata: {
          institutionId: 'inst-stark-academy',
          institutionName: 'Stark Academy of Science & Technology',
          gradeLevel: 'Grade 11 / Senior Level',
          curriculum: 'Advanced STEM / AP Physics C',
          targetExam: 'JEE Advanced / National Olympiad',
          courseIds: ['class-phys-301', 'class-math-240', 'class-cs-101'],
          workspaceId: 'ws-stark-core'
        },
        permissions: {
          canAccessInstitutionData: true,
          sharePersonalMemory: false
        },
        createdAt: new Date('2026-09-01T00:00:00Z').toISOString()
      },
      {
        id: 'ctx-student1-research',
        type: 'RESEARCH',
        title: 'Quantum Wave Packet Simulation',
        description: 'Independent research project on computational Born interpretations',
        isDefault: false,
        isActive: false,
        metadata: {
          workspaceId: 'ws-quantum-sim',
          tags: ['research', 'quantum', 'simulation']
        },
        permissions: {
          canAccessInstitutionData: false,
          sharePersonalMemory: false
        },
        createdAt: new Date('2026-09-15T00:00:00Z').toISOString()
      }
    ];

    const student1Profile: PersonalProfile = {
      displayName: 'Alex Stark',
      preferredName: 'Alex',
      email: 'alex.stark@stark-academy.edu',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&fit=crop&crop=face',
      timezone: 'America/New_York',
      locale: 'en-US',
      ageRange: '16-18',
      country: 'United States',
      bio: 'Cadet at Stark Academy focusing on Quantum Electrodynamics, Classical Mechanics, and Propulsion Systems.'
    };

    const student1Preferences: PersonalPreferences = {
      explanationStyle: 'first_principles',
      tone: 'analytical_respectful',
      communicationCadence: 'balanced',
      hudTheme: 'cyan_tactical',
      soundEnabled: true,
      bookOnlyModeDefault: false
    };

    const student1Goals: PersonalGoal[] = [
      {
        id: 'goal-1',
        title: 'Master Newton’s Laws & Classical Lagrangian Dynamics',
        category: 'academic',
        targetDate: '2026-11-15',
        progressPercent: 78,
        status: 'active'
      },
      {
        id: 'goal-2',
        title: 'Complete Quantum Infinite Well Derivations',
        category: 'mastery',
        targetDate: '2026-12-01',
        progressPercent: 60,
        status: 'active'
      },
      {
        id: 'goal-3',
        title: 'Submit Regional Physics Fair Research Abstract',
        category: 'career',
        targetDate: '2027-01-20',
        progressPercent: 25,
        status: 'active'
      }
    ];

    this.identities.set('student-1', {
      userId: 'student-1',
      profile: student1Profile,
      preferences: student1Preferences,
      goals: student1Goals,
      interests: ['Quantum Mechanics', 'Classical Dynamics', 'Differential Topology', 'Aerodynamics'],
      roles: ['student', 'researcher'],
      activeContextId: 'ctx-student1-edu',
      contexts: student1Contexts,
      stats: {
        totalStudyMinutes: 840,
        conceptsMastered: 14,
        activeStreakDays: 6,
        memoryEntriesCount: 12
      },
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: new Date().toISOString()
    });
  }

  async getIdentity(userId: string): Promise<PersonalJarvisIdentity> {
    let identity = this.identities.get(userId);
    if (!identity) {
      // Create a default baseline identity for unknown users
      identity = {
        userId,
        profile: {
          displayName: 'Jarvis Cadet',
          preferredName: 'Cadet',
          email: `${userId}@jarvis.os`,
          avatarUrl: '',
          timezone: 'UTC',
          locale: 'en-US'
        },
        preferences: {
          explanationStyle: 'concise_tactical',
          tone: 'analytical_respectful',
          communicationCadence: 'balanced',
          hudTheme: 'cyan_tactical',
          soundEnabled: true,
          bookOnlyModeDefault: false
        },
        goals: [],
        interests: ['Science', 'Technology'],
        roles: ['student'],
        activeContextId: `ctx-${userId}-personal`,
        contexts: [
          {
            id: `ctx-${userId}-personal`,
            type: 'PERSONAL',
            title: 'Personal Workspace',
            description: 'Default personal operating context',
            isDefault: true,
            isActive: true,
            metadata: {},
            permissions: {
              canAccessInstitutionData: false,
              sharePersonalMemory: false
            },
            createdAt: new Date().toISOString()
          }
        ],
        stats: {
          totalStudyMinutes: 0,
          conceptsMastered: 0,
          activeStreakDays: 1,
          memoryEntriesCount: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.identities.set(userId, identity);
    }
    return identity;
  }

  async updateIdentity(userId: string, updates: Partial<PersonalJarvisIdentity>): Promise<PersonalJarvisIdentity> {
    const existing = await this.getIdentity(userId);
    const updated: PersonalJarvisIdentity = {
      ...existing,
      ...updates,
      userId,
      updatedAt: new Date().toISOString()
    };
    this.identities.set(userId, updated);
    return updated;
  }

  /**
   * Progressive onboarding: initializes identity smoothly without giant questionnaires.
   */
  async processProgressiveOnboarding(payload: ProgressiveOnboardingPayload): Promise<PersonalJarvisIdentity> {
    const existing = await this.getIdentity(payload.userId);

    const contexts: UserContext[] = [
      {
        id: `ctx-${payload.userId}-personal`,
        type: 'PERSONAL',
        title: 'Personal & Lifelong Learning',
        description: 'Independent personal projects and self-directed inquiry',
        isDefault: payload.primaryRole !== 'student' && payload.primaryRole !== 'teacher',
        isActive: false,
        metadata: {},
        permissions: {
          canAccessInstitutionData: false,
          sharePersonalMemory: false
        },
        createdAt: new Date().toISOString()
      }
    ];

    if (payload.educationInfo || payload.primaryRole === 'student' || payload.primaryRole === 'teacher') {
      contexts.push({
        id: `ctx-${payload.userId}-edu`,
        type: payload.primaryRole === 'teacher' ? 'TEACHER' : 'EDUCATION',
        title: payload.educationInfo?.curriculum || `${payload.educationInfo?.gradeLevel || 'Secondary'} Education`,
        description: `Active curriculum and academic preparation environment`,
        isDefault: true,
        isActive: true,
        metadata: {
          gradeLevel: payload.educationInfo?.gradeLevel,
          curriculum: payload.educationInfo?.curriculum,
          targetExam: payload.educationInfo?.targetExam,
          institutionName: payload.educationInfo?.institutionName
        },
        permissions: {
          canAccessInstitutionData: true,
          sharePersonalMemory: false
        },
        createdAt: new Date().toISOString()
      });
    }

    const goals: PersonalGoal[] = (payload.educationInfo?.academicGoals || []).map((g, idx) => ({
      id: `goal-${idx + 1}`,
      title: g,
      category: 'academic',
      progressPercent: 0,
      status: 'active'
    }));

    const activeContext = contexts.find((c) => c.isActive) || contexts[0];

    const newIdentity: PersonalJarvisIdentity = {
      userId: payload.userId,
      profile: {
        displayName: payload.name,
        preferredName: payload.preferredName || payload.name.split(' ')[0],
        email: existing.profile.email,
        avatarUrl: existing.profile.avatarUrl,
        timezone: existing.profile.timezone,
        locale: existing.profile.locale,
        ageRange: payload.ageRange,
        country: payload.country
      },
      preferences: {
        ...existing.preferences,
        ...(payload.preferences || {})
      },
      goals: goals.length > 0 ? goals : existing.goals,
      interests: payload.interests || existing.interests,
      roles: [payload.primaryRole],
      activeContextId: activeContext.id,
      contexts,
      stats: existing.stats,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    this.identities.set(payload.userId, newIdentity);
    return newIdentity;
  }
}

export const personalIdentityStore = new PersonalIdentityStore();
