// Client-Side Authentication & Role Capability Client
import type { UserRole } from '../../server/data/types.ts';

export interface AuthClientUser {
  id: string;
  displayName: string;
  email?: string;
  role: string;
  department?: string;
  institutionId?: string;
  avatarUrl?: string;
  capabilities?: string[];
}

export const CLIENT_ROLE_CAPABILITIES: Record<string, string[]> = {
  student: [
    'student.learning.view',
    'student.courses.view',
    'student.assignments.view',
    'student.assignments.submit',
    'student.practice.manage',
    'student.focus.manage',
    'student.progress.view',
    'student.community.view',
    'student.community.participate',
    'student.smartboard.view_released',
    'student.videos.view',
    'student.classroom.participate',
    'student.study.manage'
  ],
  teacher: [
    'teacher.classes.manage',
    'teacher.curriculum.manage',
    'teacher.prep.manage',
    'teacher.sessions.manage',
    'teacher.grading.manage',
    'teacher.review.manage',
    'teacher.attention.view',
    'teacher.smartboard.control',
    'teacher.smartboard.release',
    'teacher.community.moderate',
    'teacher.announcements.post',
    'teacher.videos.manage',
    'teacher.classroom.host',
    'teacher.visualization.create',
    'teacher.visualization.manage'
  ],
  parent: [
    'parent.children.view',
    'parent.progress.view',
    'parent.learning_support.view',
    'parent.alerts.view',
    'parent.family_intelligence.view',
    'parent.community.view'
  ],
  principal: [
    'principal.institution.view',
    'principal.school.manage',
    'principal.grade_intelligence.view',
    'principal.faculty_intelligence.view',
    'principal.attendance_trends.view',
    'principal.interventions.manage',
    'principal.audit.view'
  ],
  commander: [
    'admin.system.manage',
    'admin.users.manage',
    'admin.configuration.manage',
    'principal.institution.view',
    'principal.school.manage',
    'principal.grade_intelligence.view',
    'principal.faculty_intelligence.view',
    'principal.attendance_trends.view',
    'principal.interventions.manage',
    'principal.audit.view',
    'teacher.classes.manage',
    'teacher.grading.manage',
    'teacher.review.manage',
    'teacher.prep.manage',
    'teacher.sessions.manage',
    'teacher.attention.view',
    'teacher.smartboard.control',
    'teacher.smartboard.release',
    'teacher.community.moderate',
    'student.learning.view',
    'student.courses.view',
    'student.assignments.view',
    'student.progress.view',
    'parent.children.view'
  ],
  admin: [
    'admin.system.manage',
    'admin.users.manage',
    'admin.configuration.manage',
    'principal.institution.view',
    'principal.school.manage',
    'principal.grade_intelligence.view',
    'principal.faculty_intelligence.view',
    'principal.attendance_trends.view',
    'principal.interventions.manage',
    'principal.audit.view',
    'teacher.classes.manage',
    'teacher.grading.manage',
    'teacher.review.manage',
    'teacher.prep.manage',
    'teacher.sessions.manage',
    'teacher.attention.view',
    'teacher.smartboard.control',
    'teacher.smartboard.release',
    'teacher.community.moderate',
    'student.learning.view',
    'student.courses.view',
    'student.assignments.view',
    'student.progress.view',
    'parent.children.view'
  ]
};

class AuthClient {
  private currentUser: AuthClientUser = {
    id: 'user-tony',
    displayName: 'Tony Stark',
    email: 'tony@starkindustries.com',
    role: 'commander',
    department: 'Executive Engineering & Defense',
    institutionId: 'inst-stark-academy',
    capabilities: CLIENT_ROLE_CAPABILITIES.commander
  };

  private listeners: Set<() => void> = new Set();

  getCurrentUser(): AuthClientUser | null {
    return this.currentUser;
  }

  getRole(): string {
    return this.currentUser?.role || 'student';
  }

  getCapabilities(): string[] {
    if (!this.currentUser) return [];
    if (this.currentUser.role === 'commander' || this.currentUser.role === 'admin') {
      return CLIENT_ROLE_CAPABILITIES.commander;
    }
    return this.currentUser.capabilities || CLIENT_ROLE_CAPABILITIES[this.currentUser.role] || [];
  }

  can(capability: string): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'commander' || this.currentUser.role === 'admin') return true;
    const caps = this.getCapabilities();
    return caps.includes(capability);
  }

  setUser(user: Partial<AuthClientUser>) {
    const role = user.role || this.currentUser.role;
    const caps = user.capabilities || CLIENT_ROLE_CAPABILITIES[role] || [];
    this.currentUser = {
      ...this.currentUser,
      ...user,
      role,
      capabilities: caps
    };
    this.notify();
  }

  async initDevSession(role: string): Promise<void> {
    const userMap: Record<string, AuthClientUser> = {
      student: {
        id: 'student-1',
        displayName: 'Peter Parker (Spider-Man)',
        email: 'peter.parker@stark.edu',
        role: 'student',
        department: 'Theoretical Physics & Applied Robotics',
        institutionId: 'inst-stark-academy',
        capabilities: CLIENT_ROLE_CAPABILITIES.student
      },
      teacher: {
        id: 'teacher-1',
        displayName: 'Dr. Sarah (Lead Physicist)',
        email: 'sarah.quantum@stark.edu',
        role: 'teacher',
        department: 'Quantum Mechanics & Field Theory',
        institutionId: 'inst-stark-academy',
        capabilities: CLIENT_ROLE_CAPABILITIES.teacher
      },
      principal: {
        id: 'principal-1',
        displayName: 'Dr. Bruce Banner',
        email: 'banner@stark.edu',
        role: 'principal',
        department: 'Academy Administration & Research',
        institutionId: 'inst-stark-academy',
        capabilities: CLIENT_ROLE_CAPABILITIES.principal
      },
      parent: {
        id: 'parent-1',
        displayName: 'May Parker',
        email: 'may.parker@stark.edu',
        role: 'parent',
        department: 'Family Support Advisory',
        institutionId: 'inst-stark-academy',
        capabilities: CLIENT_ROLE_CAPABILITIES.parent
      },
      commander: {
        id: 'user-tony',
        displayName: 'Tony Stark',
        email: 'tony@starkindustries.com',
        role: 'commander',
        department: 'Executive Engineering & Defense',
        institutionId: 'inst-stark-academy',
        capabilities: CLIENT_ROLE_CAPABILITIES.commander
      }
    };

    const targetUser = userMap[role] || {
      id: `dev-${role}`,
      displayName: `Dev User (${role})`,
      role,
      institutionId: 'inst-stark-academy',
      capabilities: CLIENT_ROLE_CAPABILITIES[role] || []
    };

    this.setUser(targetUser);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[AuthClient] Listener error:', err);
      }
    }
  }

  async refreshMe(): Promise<AuthClientUser | null> {
    try {
      const res = await fetch('/api/auth/me', {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          this.setUser(data.user);
          return this.currentUser;
        }
      }
    } catch {
      // Fallback gracefully to current client state
    }
    return this.currentUser;
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.currentUser) return {};
    return {
      'x-user-id': this.currentUser.id,
      'x-user-role': this.currentUser.role
    };
  }
}

export const authClient = new AuthClient();

export function can(capability: string): boolean {
  return authClient.can(capability);
}
