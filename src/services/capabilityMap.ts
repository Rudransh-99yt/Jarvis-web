// Centralized Capability & Information Architecture Mapping (Phase P0-5)
import type { DeepEducationView } from '../sectors/education/EducationSector.tsx';
import { can } from './authClient.ts';

export interface ViewCapabilityDefinition {
  requiredCapability: string | null;
  name: string;
  category: 'student' | 'teacher' | 'principal' | 'parent' | 'shared';
  defaultFallbackView: DeepEducationView;
}

export const VIEW_CAPABILITY_MAP: Record<DeepEducationView, ViewCapabilityDefinition> = {
  // STUDENT WORKFLOWS
  student_home: {
    requiredCapability: 'student.learning.view',
    name: 'Student Hub',
    category: 'student',
    defaultFallbackView: 'student_home'
  },
  student_my_learning: {
    requiredCapability: 'student.learning.view',
    name: 'My Learning & Units',
    category: 'student',
    defaultFallbackView: 'student_home'
  },
  subject_detail: {
    requiredCapability: 'student.learning.view',
    name: 'Course Curriculum Detail',
    category: 'student',
    defaultFallbackView: 'student_home'
  },
  chapter_detail: {
    requiredCapability: 'student.learning.view',
    name: 'Unit & Chapter Detail',
    category: 'student',
    defaultFallbackView: 'student_home'
  },
  lesson_workspace: {
    requiredCapability: 'student.learning.view',
    name: 'Lesson Workspace',
    category: 'student',
    defaultFallbackView: 'student_home'
  },
  lesson_practice: {
    requiredCapability: 'student.practice.manage',
    name: 'Practice & Checkpoints',
    category: 'student',
    defaultFallbackView: 'student_home'
  },
  engagement_leaderboard: {
    requiredCapability: 'student.progress.view',
    name: 'Standings & Consistency',
    category: 'student',
    defaultFallbackView: 'student_home'
  },
  engagement_activity: {
    requiredCapability: 'student.progress.view',
    name: 'Activity History',
    category: 'student',
    defaultFallbackView: 'student_home'
  },
  focus: {
    requiredCapability: 'student.focus.manage',
    name: 'Focus Room & Pomodoro',
    category: 'student',
    defaultFallbackView: 'student_home'
  },
  workspace: {
    requiredCapability: 'student.focus.manage',
    name: 'Personal Workspace',
    category: 'student',
    defaultFallbackView: 'student_home'
  },
  notes: {
    requiredCapability: 'student.learning.view',
    name: 'Personal Notes & Formulas',
    category: 'student',
    defaultFallbackView: 'student_home'
  },
  study: {
    requiredCapability: 'student.study.manage',
    name: 'Study Assistant',
    category: 'student',
    defaultFallbackView: 'student_home'
  },
  study_groups: {
    requiredCapability: 'student.community.participate',
    name: 'Study Groups',
    category: 'student',
    defaultFallbackView: 'student_home'
  },

  // TEACHER WORKFLOWS
  teacher_home: {
    requiredCapability: 'teacher.classes.manage',
    name: 'Instructional Command Center',
    category: 'teacher',
    defaultFallbackView: 'teacher_home'
  },
  teacher_class_detail: {
    requiredCapability: 'teacher.classes.manage',
    name: 'Managed Class Detail',
    category: 'teacher',
    defaultFallbackView: 'teacher_home'
  },
  teacher_session_prep: {
    requiredCapability: 'teacher.prep.manage',
    name: 'AI Session Prep & Planning',
    category: 'teacher',
    defaultFallbackView: 'teacher_home'
  },
  teacher_review: {
    requiredCapability: 'teacher.review.manage',
    name: 'Submission Review Queue',
    category: 'teacher',
    defaultFallbackView: 'teacher_home'
  },
  teacher_attention: {
    requiredCapability: 'teacher.attention.view',
    name: 'Student Attention Signals',
    category: 'teacher',
    defaultFallbackView: 'teacher_home'
  },
  teacher_post_class_review: {
    requiredCapability: 'teacher.classes.manage',
    name: 'Post-Class Analytics',
    category: 'teacher',
    defaultFallbackView: 'teacher_home'
  },
  smartboard_os: {
    requiredCapability: 'teacher.smartboard.control',
    name: 'SmartBoard OS Interactive Surface',
    category: 'teacher',
    defaultFallbackView: 'teacher_home'
  },

  // PRINCIPAL WORKFLOWS
  principal_home: {
    requiredCapability: 'principal.institution.view',
    name: 'Executive Institutional Overview',
    category: 'principal',
    defaultFallbackView: 'principal_home'
  },
  principal_grade: {
    requiredCapability: 'principal.grade_intelligence.view',
    name: 'Grade-Level Intelligence',
    category: 'principal',
    defaultFallbackView: 'principal_home'
  },
  principal_teachers: {
    requiredCapability: 'principal.faculty_intelligence.view',
    name: 'Faculty Intelligence',
    category: 'principal',
    defaultFallbackView: 'principal_home'
  },
  principal_audit: {
    requiredCapability: 'principal.audit.view',
    name: 'Audit Trail & Oversight',
    category: 'principal',
    defaultFallbackView: 'principal_home'
  },

  // PARENT WORKFLOWS
  parent_home: {
    requiredCapability: 'parent.family_intelligence.view',
    name: 'Family Intelligence Portal',
    category: 'parent',
    defaultFallbackView: 'parent_home'
  },

  // SHARED / ROLE-ADAPTIVE WORKFLOWS (Strictly scoped by backend data boundaries)
  classes: {
    requiredCapability: null,
    name: 'Classes Directory',
    category: 'shared',
    defaultFallbackView: 'student_home'
  },
  assignments: {
    requiredCapability: null,
    name: 'Assignments',
    category: 'shared',
    defaultFallbackView: 'student_home'
  },
  calendar: {
    requiredCapability: null,
    name: 'Academic Calendar',
    category: 'shared',
    defaultFallbackView: 'student_home'
  },
  community: {
    requiredCapability: null,
    name: 'Academic Community',
    category: 'shared',
    defaultFallbackView: 'student_home'
  },
  videos: {
    requiredCapability: null,
    name: 'Video Library',
    category: 'shared',
    defaultFallbackView: 'student_home'
  },
  classroom: {
    requiredCapability: null,
    name: 'Smart Classroom',
    category: 'shared',
    defaultFallbackView: 'student_home'
  },
  board_history: {
    requiredCapability: null,
    name: 'Board History & Records',
    category: 'shared',
    defaultFallbackView: 'student_home'
  },
  knowledge: {
    requiredCapability: null,
    name: 'Knowledge Spaces',
    category: 'shared',
    defaultFallbackView: 'student_home'
  }
};

/**
 * Returns the canonical default home view for the authenticated user based on server-derived capabilities.
 */
export function getDefaultHomeViewForUser(): DeepEducationView {
  if (can('principal.institution.view')) return 'principal_home';
  if (can('teacher.classes.manage')) return 'teacher_home';
  if (can('parent.family_intelligence.view')) return 'parent_home';
  return 'student_home';
}

/**
 * Evaluates whether the authenticated user has server authorization to open the requested view.
 */
export function canAccessView(view: DeepEducationView): boolean {
  const def = VIEW_CAPABILITY_MAP[view];
  if (!def || !def.requiredCapability) return true;
  return can(def.requiredCapability);
}
