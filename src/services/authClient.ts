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

  private currentToken: string | null = null;
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
    const userMap: Record<string, string> = {
      student: 'student-1',
      teacher: 'teacher-1',
      principal: 'principal-1',
      parent: 'parent-1',
      commander: 'user-tony'
    };
    const targetUserId = userMap[role] || `dev-${role}`;
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId })
      });
      if (res.ok) {
        const data = await res.json();
        this.currentToken = data.token;
        if (data.user) this.setUser(data.user);
      }
    } catch (err) {
      console.error('[AuthClient] Dev login failed:', err);
    }
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

    async getSSETicket(scope: string = 'user', resourceId?: string): Promise<string | null> {
    try {
      let url = `/api/auth/sse-ticket?scope=${scope}`;
      if (resourceId) url += `&resourceId=${resourceId}`;
      const res = await fetch(url, { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.ticket;
      }
    } catch { }
    return null;
  }

  getAuthHeaders(): Record<string, string> {
    if (this.currentToken) {
      return { 'Authorization': `Bearer ${this.currentToken}` };
    }
    return {};
  }
}
export const authClient = new AuthClient();

export function can(capability: string): boolean {
  return authClient.can(capability);
}
