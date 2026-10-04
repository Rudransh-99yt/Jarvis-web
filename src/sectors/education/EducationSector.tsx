import React, { useState, useEffect } from 'react';
import type {
  EducationRole,
  EducationClass,
  Assignment,
  StudentSubmission,
  KnowledgeSpace,
  GroundedQueryResponse,
  AcademicInstitution
} from '../../types/education.ts';
import { EducationSidebar, EducationSidebarSection } from './components/EducationSidebar.tsx';
import { EducationBreadcrumbs, BreadcrumbItem } from './components/EducationBreadcrumbs.tsx';

// Progressive Views
import { StudentHomeView } from './views/StudentHomeView.tsx';
import { StudentMyLearningView } from './views/StudentMyLearningView.tsx';
import { SubjectDetailView } from './views/SubjectDetailView.tsx';
import { ChapterDetailView } from './views/ChapterDetailView.tsx';
import { LessonWorkspaceView } from './views/LessonWorkspaceView.tsx';

// Productivity & Community Views
import { FocusWorkspaceView } from './focus/FocusWorkspaceView.tsx';
import { FocusLockBlockedModal } from './focus/FocusLockBlockedModal.tsx';
import { FocusIndicatorStrip } from './focus/FocusIndicatorStrip.tsx';
import { FocusPolicyEngine } from './focus/focusPolicy.ts';
import type { FocusSession } from '../../types/focus.ts';
import { MyWorkspaceView } from './workspace/MyWorkspaceView.tsx';
import { EducationCommunityView } from './views/EducationCommunityView.tsx';
import { EducationCalendarView } from './views/EducationCalendarView.tsx';

// Teacher Views
import { TeacherHomeView } from './views/TeacherHomeView.tsx';
import { TeacherClassDetailView } from './views/TeacherClassDetailView.tsx';
import { TeacherCurriculumModal } from './views/TeacherCurriculumModal.tsx';
import { TeacherSessionPrepView } from './views/TeacherSessionPrepView.tsx';

// Principal View
import { PrincipalExecutiveView } from './views/PrincipalExecutiveView.tsx';

// Preserved Core Views
import { SmartClassroomView } from './views/SmartClassroomView.tsx';
import { VideoLibraryView } from './views/VideoLibraryView.tsx';
import { ClassesView } from './views/ClassesView.tsx';
import { AssignmentsView } from './views/AssignmentsView.tsx';
import { KnowledgeWorkspaceView } from './views/KnowledgeWorkspaceView.tsx';
import { StudyAssistantView } from './views/StudyAssistantView.tsx';
import { StudentPersonalNotesView } from './views/StudentPersonalNotesView.tsx';

import { Menu, Home, Layers, Flame, FileCheck2, Building2 } from 'lucide-react';

interface EducationSectorProps {
  currentRole: EducationRole;
  onToggleRole: (newRole?: EducationRole) => void;
  onSendChatMessage: (message: string, context?: any) => Promise<string>;
}

export type DeepEducationView =
  | 'student_home'
  | 'student_my_learning'
  | 'subject_detail'
  | 'chapter_detail'
  | 'lesson_workspace'
  | 'teacher_home'
  | 'teacher_class_detail'
  | 'teacher_session_prep'
  | 'principal_home'
  | 'classroom'
  | 'videos'
  | 'classes'
  | 'assignments'
  | 'calendar'
  | 'focus'
  | 'workspace'
  | 'community'
  | 'study_groups'
  | 'notes'
  | 'knowledge'
  | 'study';

export const EducationSector: React.FC<EducationSectorProps> = ({
  currentRole,
  onToggleRole,
  onSendChatMessage
}) => {
  // Navigation & Hierarchy State
  const [currentView, setCurrentView] = useState<DeepEducationView>(
    currentRole === 'student' ? 'student_home' : currentRole === 'teacher' ? 'teacher_home' : 'principal_home'
  );
  const [activeCourseId, setActiveCourseId] = useState<string>('class-phys-301');
  const [activeUnitId, setActiveUnitId] = useState<string>('unit-phys-2');
  const [activeLessonId, setActiveLessonId] = useState<string>('les-phys-202');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('ks-quantum');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Phase D: Shared Academic Context
  const [academicContext, setAcademicContext] = useState<import('../../types/academicContext.ts').AcademicContext>({
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-stark-core',
    classId: 'class-phys-301',
    courseId: 'class-phys-301',
    courseCode: 'PHYS-301',
    courseName: 'Advanced Quantum & Classical Electrodynamics',
    subjectName: 'Physics',
    unitId: 'unit-phys-2',
    unitTitle: 'Quantum Harmonic Oscillators & Ladder Operators',
    lessonId: 'les-phys-202',
    lessonTitle: 'Creation & Annihilation Operator Dynamics',
    classSessionId: 'session-phys-101'
  });

  // Data State
  const [institution, setInstitution] = useState<AcademicInstitution | undefined>();
  const [classes, setClasses] = useState<EducationClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [knowledgeSpaces, setKnowledgeSpaces] = useState<KnowledgeSpace[]>([]);
  const [selectedGradingSub, setSelectedGradingSub] = useState<StudentSubmission | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Curriculum Modal State for Teachers
  const [curriculumModal, setCurriculumModal] = useState<{
    isOpen: boolean;
    mode: 'create_unit' | 'create_lesson';
    courseId: string;
    courseCode: string;
    unitId?: string;
    unitTitle?: string;
  }>({
    isOpen: false,
    mode: 'create_unit',
    courseId: '',
    courseCode: ''
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Scroll to top whenever the active view or primary entity target changes
  useEffect(() => {
    const scrollContainer = document.getElementById('education-workspace-scroll');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      scrollContainer.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [currentView, activeCourseId, activeUnitId, activeLessonId]);

  // Browser Back/Forward PopState Navigation Support
  useEffect(() => {
    // Initial replaceState to anchor initial view in history
    if (!window.history.state || !window.history.state.eduView) {
      window.history.replaceState(
        { eduView: currentView, activeCourseId, activeUnitId, activeLessonId },
        '',
        window.location.pathname
      );
    }

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.eduView) {
        setCurrentView(e.state.eduView);
        if (e.state.activeCourseId) setActiveCourseId(e.state.activeCourseId);
        if (e.state.activeUnitId) setActiveUnitId(e.state.activeUnitId);
        if (e.state.activeLessonId) setActiveLessonId(e.state.activeLessonId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Focus Session State & Navigation Guard
  const [activeFocusSession, setActiveFocusSession] = useState<FocusSession | null>(null);
  const [blockedNavState, setBlockedNavState] = useState<{
    isOpen: boolean;
    blockedRoute: string;
    reason?: string;
  } | null>(null);

  const fetchActiveFocusSession = async () => {
    try {
      const res = await fetch('/api/education/focus/active', {
        headers: {
          'x-user-id': currentRole === 'student' ? 'student-1' : 'teacher-1',
          'x-user-role': currentRole
        }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveFocusSession(data.session);
      }
    } catch (err) {
      console.warn('Failed to fetch active focus session:', err);
    }
  };

  const handleSafeNavigate = (targetView: DeepEducationView, targetCourseId?: string) => {
    if (
      activeFocusSession &&
      (activeFocusSession.mode === 'STUDY_LOCK' || activeFocusSession.mode === 'EXAM_LOCK') &&
      activeFocusSession.status === 'ACTIVE'
    ) {
      const evalResult = FocusPolicyEngine.evaluateNavigation(
        activeFocusSession,
        targetView,
        targetCourseId || activeCourseId
      );
      if (!evalResult.allowed) {
        setBlockedNavState({
          isOpen: true,
          blockedRoute: targetView,
          reason: evalResult.reason
        });
        return;
      }
    }
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      window.history.pushState(
        {
          eduView: targetView,
          activeCourseId: targetCourseId || activeCourseId,
          activeUnitId,
          activeLessonId
        },
        '',
        window.location.pathname
      );
    }
    setCurrentView(targetView);
  };

  const handleNavigateWithContext = (
    targetView: DeepEducationView,
    contextPatch?: Partial<import('../../types/academicContext.ts').AcademicContext>
  ) => {
    if (contextPatch) {
      setAcademicContext((prev) => ({ ...prev, ...contextPatch }));
      if (contextPatch.courseId || contextPatch.classId) {
        setActiveCourseId(contextPatch.courseId || contextPatch.classId!);
      }
      if (contextPatch.unitId) {
        setActiveUnitId(contextPatch.unitId);
      }
      if (contextPatch.lessonId) {
        setActiveLessonId(contextPatch.lessonId);
      }
      if (contextPatch.knowledgeSpaceIds && contextPatch.knowledgeSpaceIds[0]) {
        setSelectedSpaceId(contextPatch.knowledgeSpaceIds[0]);
      }
    }
    handleSafeNavigate(targetView, contextPatch?.courseId || contextPatch?.classId);
  };

  // Hydrate state from server REST API on mount
  const fetchEducationState = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/education/state');
      if (res.ok) {
        const data = await res.json();
        if (data.institution) setInstitution(data.institution);
        if (data.classes) setClasses(data.classes);
        if (data.assignments) setAssignments(data.assignments);
        if (data.submissions) setSubmissions(data.submissions);
        if (data.knowledgeSpaces) setKnowledgeSpaces(data.knowledgeSpaces);
      }
      await fetchActiveFocusSession();
    } catch (err) {
      console.warn('Failed to fetch education state from API:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchEducationState();
  }, [currentRole]);

  // Update default view when role switches
  useEffect(() => {
    if (currentRole === 'student') {
      if (['teacher_home', 'teacher_class_detail', 'principal_home'].includes(currentView)) {
        setCurrentView('student_home');
      }
    } else if (currentRole === 'teacher') {
      if (['student_home', 'student_my_learning', 'principal_home'].includes(currentView)) {
        setCurrentView('teacher_home');
      }
    } else if (currentRole === 'principal') {
      if (['student_home', 'student_my_learning', 'teacher_home'].includes(currentView)) {
        setCurrentView('principal_home');
      }
    }
  }, [currentRole]);

  // Global scroll architecture: reset primary vertical scroll on view or entity navigation
  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll-container') || document.querySelector('[data-scroll-owner="true"]');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    } else {
      window.scrollTo(0, 0);
    }
  }, [currentView, activeCourseId, activeUnitId, activeLessonId]);

  // Active items lookup
  const activeCourse = classes.find((c) => c.id === activeCourseId) || classes[0];
  const activeUnit = activeCourse?.units?.find((u) => u.id === activeUnitId) || activeCourse?.units?.[0];
  const activeLesson = activeUnit?.lessons?.find((l) => l.id === activeLessonId) || activeUnit?.lessons?.[0];

  // Progressive Navigation Handlers
  const handleSelectCourse = (courseId: string) => {
    setActiveCourseId(courseId);
    const cls = classes.find((c) => c.id === courseId);
    if (cls?.units && cls.units.length > 0) {
      setActiveUnitId(cls.units[0].id);
      if (cls.units[0].lessons && cls.units[0].lessons.length > 0) {
        setActiveLessonId(cls.units[0].lessons[0].id);
      }
    }
    if (currentRole === 'teacher') {
      setCurrentView('teacher_class_detail');
    } else {
      setCurrentView('subject_detail');
    }
  };

  const handleSelectUnit = (courseId: string, unitId: string) => {
    setActiveCourseId(courseId);
    setActiveUnitId(unitId);
    const cls = classes.find((c) => c.id === courseId);
    const unit = cls?.units?.find((u) => u.id === unitId);
    if (unit?.lessons && unit.lessons.length > 0) {
      setActiveLessonId(unit.lessons[0].id);
    }
    setCurrentView('chapter_detail');
  };

  const handleOpenLesson = (courseId: string, unitId: string, lessonId: string) => {
    setActiveCourseId(courseId);
    setActiveUnitId(unitId);
    setActiveLessonId(lessonId);
    setCurrentView('lesson_workspace');
  };

  const handleToggleLessonComplete = async (isCompleted: boolean) => {
    if (!activeCourse || !activeUnit || !activeLesson) return;

    try {
      await fetch(`/api/education/classes/${activeCourse.id}/units/${activeUnit.id}/lessons/${activeLesson.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted })
      });

      // Update local state
      setClasses((prev) =>
        prev.map((cls) => {
          if (cls.id !== activeCourse.id) return cls;
          return {
            ...cls,
            units: cls.units?.map((u) => {
              if (u.id !== activeUnit.id) return u;
              const updatedLessons = u.lessons.map((l) => (l.id === activeLesson.id ? { ...l, isCompleted } : l));
              const doneCount = updatedLessons.filter((l) => l.isCompleted).length;
              return {
                ...u,
                lessons: updatedLessons,
                masteryPercent: Math.round((doneCount / updatedLessons.length) * 100),
                isCompleted: doneCount === updatedLessons.length
              };
            })
          };
        })
      );
      showNotification(isCompleted ? `Lesson marked as completed! (+20 XP)` : `Lesson marked in progress.`);
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  // Teacher Create Assignment Handler
  const handleCreateAssignment = async (data: {
    classId: string;
    title: string;
    description: string;
    instructions: string;
    dueDate: string;
    maxScore: number;
    category?: 'Worksheet' | 'Lab Report' | 'Exam' | 'Project';
  }) => {
    try {
      const res = await fetch('/api/education/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, teacherId: 'teacher-1' })
      });
      if (res.ok) {
        const payload = await res.json();
        setAssignments((prev) => [payload.assignment, ...prev]);
        showNotification(`Assignment '${data.title}' published successfully!`);
      }
    } catch (err) {
      console.error('Failed to create assignment:', err);
    }
  };

  // Student Submit Work Handler
  const handleSubmitWork = async (data: {
    assignmentId: string;
    studentId: string;
    studentName: string;
    content: string;
    attachments?: Array<{ name: string; size: string }>;
  }) => {
    try {
      const res = await fetch('/api/education/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const payload = await res.json();
        setSubmissions((prev) => {
          const filtered = prev.filter(
            (s) => !(s.assignmentId === data.assignmentId && s.studentId === data.studentId)
          );
          return [payload.submission, ...filtered];
        });
        showNotification(`Your work for assignment was successfully submitted!`);
      }
    } catch (err) {
      console.error('Failed to submit work:', err);
    }
  };

  // Teacher Grade Submission Handler
  const handleGradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
    try {
      const res = await fetch(`/api/education/submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, feedback })
      });
      if (res.ok) {
        const payload = await res.json();
        setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? payload.submission : s)));
        showNotification(`Submission graded (${grade}/100) with feedback returned.`);
      }
    } catch (err) {
      console.error('Failed to grade submission:', err);
    }
  };

  // Teacher Save Unit Handler
  const handleSaveUnit = async (data: {
    title: string;
    description: string;
    learningObjectives: string[];
    estimatedHours: number;
  }) => {
    if (!curriculumModal.courseId) return;
    try {
      const res = await fetch(`/api/education/classes/${curriculumModal.courseId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const payload = await res.json();
        setClasses((prev) =>
          prev.map((cls) => {
            if (cls.id !== curriculumModal.courseId) return cls;
            return {
              ...cls,
              units: [...(cls.units || []), payload.unit]
            };
          })
        );
        showNotification(`Unit '${data.title}' created and published!`);
      }
    } catch (err) {
      console.error('Failed to create unit:', err);
    }
  };

  // Teacher Save Lesson Handler
  const handleSaveLesson = async (data: {
    title: string;
    description: string;
    durationMinutes: number;
    notes: string;
    keyTakeaways: string[];
    videoId?: string;
  }) => {
    if (!curriculumModal.courseId || !curriculumModal.unitId) return;
    try {
      const res = await fetch(`/api/education/classes/${curriculumModal.courseId}/units/${curriculumModal.unitId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, unitId: curriculumModal.unitId })
      });
      if (res.ok) {
        const payload = await res.json();
        setClasses((prev) =>
          prev.map((cls) => {
            if (cls.id !== curriculumModal.courseId) return cls;
            return {
              ...cls,
              units: cls.units?.map((u) => {
                if (u.id !== curriculumModal.unitId) return u;
                return {
                  ...u,
                  lessons: [...(u.lessons || []), payload.lesson]
                };
              })
            };
          })
        );
        showNotification(`Lesson '${data.title}' added to Unit!`);
      }
    } catch (err) {
      console.error('Failed to create lesson:', err);
    }
  };

  // Knowledge Spaces Handlers
  const handleCreateSpace = async (title: string, description: string, category: string) => {
    try {
      const res = await fetch('/api/education/knowledge-spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: title, description, category })
      });
      if (res.ok) {
        const payload = await res.json();
        setKnowledgeSpaces((prev) => [...prev, payload.space]);
        setSelectedSpaceId(payload.space.id);
        showNotification(`Knowledge Space '${title}' initialized.`);
      }
    } catch (err) {
      console.error('Failed to create space:', err);
    }
  };

  const handleAddSource = async (spaceId: string, title: string, fullText: string, type: 'pdf' | 'notes' | 'lecture' | 'web') => {
    try {
      const res = await fetch(`/api/education/knowledge-spaces/${spaceId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: title, content: fullText, type: type === 'web' ? 'url' : 'text' })
      });
      if (res.ok) {
        const payload = await res.json();
        setKnowledgeSpaces((prev) =>
          prev.map((s) => (s.id === spaceId ? { ...s, sources: [...s.sources, payload.source] } : s))
        );
        showNotification(`Source '${title}' attached and indexed into RAG index.`);
      }
    } catch (err) {
      console.error('Failed to add source:', err);
    }
  };

  const handleDeleteSource = async (spaceId: string, sourceId: string) => {
    try {
      const res = await fetch(`/api/education/knowledge-spaces/${spaceId}/sources/${sourceId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setKnowledgeSpaces((prev) =>
          prev.map((s) => (s.id === spaceId ? { ...s, sources: s.sources.filter((src) => src.id !== sourceId) } : s))
        );
        showNotification(`Source removed from space.`);
      }
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  const handleReindexSource = async (spaceId: string, sourceId: string) => {
    try {
      const res = await fetch(`/api/education/knowledge-spaces/${spaceId}/sources/${sourceId}/reindex`, {
        method: 'POST'
      });
      if (res.ok) {
        showNotification(`Vector embeddings re-indexed successfully.`);
      }
    } catch (err) {
      console.error('Failed to reindex source:', err);
    }
  };

  const handleQueryGrounded = async (spaceId: string, query: string): Promise<GroundedQueryResponse> => {
    const res = await fetch(`/api/education/knowledge-spaces/${spaceId}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, userId: 'student-1', userRole: currentRole })
    });
    if (!res.ok) throw new Error('Query failed');
    return res.json();
  };

  // Derive active sidebar section
  const getSidebarActiveSection = (): EducationSidebarSection => {
    if (['student_home', 'teacher_home'].includes(currentView)) return 'home';
    if (currentView === 'student_my_learning') return 'my_learning';
    if (['classes', 'subject_detail', 'chapter_detail', 'lesson_workspace', 'teacher_class_detail'].includes(currentView)) return 'classes';
    if (currentView === 'assignments') return 'assignments';
    if (currentView === 'calendar') return 'calendar';
    if (currentView === 'focus') return 'focus';
    if (currentView === 'workspace') return 'workspace';
    if (currentView === 'community') return 'community';
    if (currentView === 'study_groups') return 'study_groups';
    if (currentView === 'notes') return 'notes';
    if (currentView === 'knowledge') return 'knowledge';
    if (currentView === 'videos') return 'videos';
    if (currentView === 'teacher_session_prep') return 'teacher_prep';
    if (currentView === 'classroom') return 'classroom';
    if (currentView === 'principal_home') return 'principal_overview';
    return 'home';
  };

  const handleSidebarSelectSection = (section: EducationSidebarSection) => {
    switch (section) {
      case 'home':
        setCurrentView(currentRole === 'student' ? 'student_home' : currentRole === 'teacher' ? 'teacher_home' : 'principal_home');
        break;
      case 'teacher_prep':
        setCurrentView('teacher_session_prep');
        break;
      case 'my_learning':
        setCurrentView('student_my_learning');
        break;
      case 'classes':
        setCurrentView('classes');
        break;
      case 'assignments':
        setCurrentView('assignments');
        break;
      case 'calendar':
        setCurrentView('calendar');
        break;
      case 'focus':
        setCurrentView('focus');
        break;
      case 'workspace':
        setCurrentView('workspace');
        break;
      case 'community':
        setCurrentView('community');
        break;
      case 'study_groups':
        setCurrentView('study_groups');
        break;
      case 'notes':
        setCurrentView('notes');
        break;
      case 'knowledge':
        setCurrentView('knowledge');
        break;
      case 'videos':
        setCurrentView('videos');
        break;
      case 'classroom':
        setCurrentView('classroom');
        break;
      case 'principal_overview':
        setCurrentView('principal_home');
        break;
    }
  };

  // Dynamic Breadcrumb Trail
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    if (['student_home', 'teacher_home', 'principal_home'].includes(currentView)) {
      return [];
    }

    if (currentView === 'student_my_learning') {
      items.push({ id: 'my_learning', label: 'My Learning Tracks', type: 'section' });
      return items;
    }

    if (currentView === 'calendar') {
      items.push({ id: 'calendar', label: 'Academic Calendar', type: 'section' });
      return items;
    }

    if (currentView === 'focus') {
      items.push({ id: 'focus', label: 'Focus Session', type: 'section' });
      return items;
    }

    if (currentView === 'workspace') {
      items.push({ id: 'workspace', label: 'My Workspace & Notes', type: 'section' });
      return items;
    }

    if (currentView === 'community') {
      items.push({ id: 'community', label: 'Class Community', type: 'section' });
      return items;
    }

    if (currentView === 'study_groups') {
      items.push({ id: 'study_groups', label: 'Peer Study Groups', type: 'section' });
      return items;
    }

    if (currentView === 'notes') {
      items.push({ id: 'notes', label: 'Study Notes & Formulas', type: 'section' });
      return items;
    }

    if (currentView === 'classroom') {
      items.push({ id: 'classroom', label: 'Smart Classroom', type: 'section' });
      return items;
    }

    if (currentView === 'videos') {
      items.push({ id: 'videos', label: 'Video Library & Q&A', type: 'section' });
      return items;
    }

    if (currentView === 'classes') {
      items.push({ id: 'classes', label: 'All Classes', type: 'section' });
      return items;
    }

    if (currentView === 'assignments') {
      items.push({ id: 'assignments', label: 'Assignments & Assessments', type: 'section' });
      return items;
    }

    if (currentView === 'knowledge') {
      items.push({ id: 'knowledge', label: 'Knowledge Spaces', type: 'section' });
      return items;
    }

    if (activeCourse) {
      items.push({
        id: activeCourse.id,
        label: `${activeCourse.code}: ${activeCourse.name}`,
        type: 'subject',
        onClick: () => {
          if (currentRole === 'teacher') setCurrentView('teacher_class_detail');
          else setCurrentView('subject_detail');
        }
      });
    }

    if (['chapter_detail', 'lesson_workspace'].includes(currentView) && activeUnit) {
      items.push({
        id: activeUnit.id,
        label: `Unit ${activeUnit.number}: ${activeUnit.title}`,
        type: 'unit',
        onClick: () => setCurrentView('chapter_detail')
      });
    }

    if (currentView === 'lesson_workspace' && activeLesson && activeUnit) {
      items.push({
        id: activeLesson.id,
        label: `Lesson ${activeUnit.number}.${activeLesson.number}: ${activeLesson.title}`,
        type: 'lesson'
      });
    }

    return items;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex-1 min-h-0 flex flex-row overflow-hidden h-full">
      {/* 1. Dedicated Education Left Sidebar */}
      <EducationSidebar
        currentRole={currentRole}
        onChangeRole={(r) => onToggleRole(r)}
        activeSection={getSidebarActiveSection()}
        onSelectSection={handleSidebarSelectSection}
        activeCourseId={activeCourseId}
        onSelectCourse={(cId) => handleSelectCourse(cId)}
        classes={classes}
        institution={institution}
        isSyncing={isSyncing}
        onRefresh={fetchEducationState}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Education Application Workspace */}
      <main id="education-workspace-scroll" className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto px-4 sm:px-8 py-6 pb-20 lg:pb-12 overscroll-contain">
        {/* Mobile Header Bar */}
        <div className="lg:hidden flex items-center justify-between pb-4 mb-4 border-b border-cyan-500/15">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-cyan-500/30 bg-black/60 text-cyan-300 hover:text-white"
              title="Open Navigation"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-mono font-bold text-white truncate">
              {institution?.name || 'Stark Academy'}
            </span>
          </div>

          <span className="text-[11px] font-mono text-cyan-400/80 uppercase font-semibold">
            {currentRole}
          </span>
        </div>

        {/* Interactive Breadcrumb Trail & Persistent Focus Indicator */}
        <div className="mb-6 max-w-4xl mx-auto w-full flex flex-wrap items-center justify-between gap-3">
          {breadcrumbs.length > 0 ? (
            <EducationBreadcrumbs
              items={breadcrumbs}
              onHomeClick={() =>
                handleSafeNavigate(
                  currentRole === 'student'
                    ? 'student_home'
                    : currentRole === 'teacher'
                    ? 'teacher_home'
                    : 'principal_home'
                )
              }
            />
          ) : <div />}

          <FocusIndicatorStrip
            activeSession={activeFocusSession}
            onOpenFocusWorkspace={() => setCurrentView('focus')}
          />
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="mb-6 max-w-4xl mx-auto w-full p-3 rounded-lg border border-cyan-400/40 bg-cyan-950/80 text-cyan-200 text-xs font-mono flex items-center gap-2 shadow-lg animate-fade-in">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{notification}</span>
          </div>
        )}

        {/* 3. Deep View Routing */}
        <div className="flex-1 w-full">
          {/* Student Views */}
          {currentView === 'student_home' && (
            <StudentHomeView
              classes={classes}
              assignments={assignments}
              submissions={submissions}
              onSelectCourse={(id) => handleSelectCourse(id)}
              onOpenLesson={(cId, uId, lId) => handleOpenLesson(cId, uId, lId)}
              onNavigateTab={(t) => setCurrentView(t as any)}
            />
          )}

          {currentView === 'student_my_learning' && (
            <StudentMyLearningView
              classes={classes}
              onSelectCourse={(id) => handleSelectCourse(id)}
              onSelectUnit={(cId, uId) => handleSelectUnit(cId, uId)}
              onOpenLesson={(cId, uId, lId) => handleOpenLesson(cId, uId, lId)}
            />
          )}

          {currentView === 'subject_detail' && activeCourse && (
            <SubjectDetailView
              course={activeCourse}
              assignments={assignments}
              onSelectUnit={(uId) => handleSelectUnit(activeCourse.id, uId)}
              onOpenLesson={(uId, lId) => handleOpenLesson(activeCourse.id, uId, lId)}
              onNavigateTab={(t) => setCurrentView(t as any)}
            />
          )}

          {currentView === 'chapter_detail' && activeCourse && activeUnit && (
            <ChapterDetailView
              course={activeCourse}
              unit={activeUnit}
              onOpenLesson={(lId) => handleOpenLesson(activeCourse.id, activeUnit.id, lId)}
              onBackToCourse={() => setCurrentView('subject_detail')}
              onLaunchStudyAssistant={(topic) => {
                setSelectedSpaceId(activeCourse.id === 'class-math-240' ? 'ks-calculus' : 'ks-quantum');
                setCurrentView('study');
              }}
            />
          )}

          {currentView === 'lesson_workspace' && activeCourse && activeUnit && activeLesson && (
            <LessonWorkspaceView
              course={activeCourse}
              unit={activeUnit}
              lesson={activeLesson}
              onToggleComplete={handleToggleLessonComplete}
              onNavigateLesson={(uId, lId) => handleOpenLesson(activeCourse.id, uId, lId)}
              onBackToChapter={() => setCurrentView('chapter_detail')}
              onQueryGrounded={handleQueryGrounded}
              onNavigateToContext={(v, ctx) => handleNavigateWithContext(v as any, ctx)}
            />
          )}

          {/* Productivity & Community Workspaces */}
          {currentView === 'calendar' && (
            <EducationCalendarView
              classes={classes}
              assignments={assignments}
              onSelectCourse={(id) => handleSelectCourse(id)}
              onNavigateTab={(t) => setCurrentView(t as any)}
              onNavigateWithContext={(v, ctx) => handleNavigateWithContext(v as any, ctx)}
            />
          )}

          {currentView === 'focus' && (
            <FocusWorkspaceView
              classes={classes}
              currentRole={currentRole}
              initialSession={activeFocusSession}
              onNavigateTab={(t, meta) => handleSafeNavigate(t as any, meta?.courseId)}
              onOpenLesson={(cId, uId, lId) => handleOpenLesson(cId, uId, lId)}
              onSessionStateChange={(s) => setActiveFocusSession(s)}
            />
          )}

          {currentView === 'workspace' && (
            <MyWorkspaceView
              classes={classes}
              knowledgeSpaces={knowledgeSpaces}
              initialCourseId={activeCourseId}
              initialLessonId={activeLessonId}
              onBackToHome={() => setCurrentView(currentRole === 'student' ? 'student_home' : 'teacher_home')}
              onNavigateToAcademicLink={(link) => {
                if (link.courseId && link.unitId && link.lessonId) {
                  handleOpenLesson(link.courseId, link.unitId, link.lessonId);
                } else if (link.courseId && link.unitId) {
                  handleSelectUnit(link.courseId, link.unitId);
                } else if (link.courseId) {
                  handleSelectCourse(link.courseId);
                } else if (link.assignmentId) {
                  setCurrentView('assignments');
                } else if (link.knowledgeSpaceId) {
                  setSelectedSpaceId(link.knowledgeSpaceId);
                  setCurrentView('knowledge');
                }
              }}
            />
          )}

          {currentView === 'community' && (
            <EducationCommunityView
              classes={classes}
              currentRole={currentRole}
              initialClassId={academicContext.classId || activeCourseId}
              onNavigateTab={(t, meta) => handleNavigateWithContext(t as DeepEducationView, meta)}
              onBackToHome={() => setCurrentView(currentRole === 'student' ? 'student_home' : 'teacher_home')}
            />
          )}

          {/* Teacher Views */}
          {currentView === 'teacher_home' && (
            <TeacherHomeView
              classes={classes}
              assignments={assignments}
              submissions={submissions}
              onSelectClass={(id) => handleSelectCourse(id)}
              onOpenCreateAssignmentModal={() => setCurrentView('assignments')}
              onSelectSubmissionForGrading={(sub) => {
                setSelectedGradingSub(sub);
                setCurrentView('assignments');
              }}
              onNavigateTab={(t) => setCurrentView(t as any)}
            />
          )}

          {currentView === 'teacher_class_detail' && activeCourse && (
            <TeacherClassDetailView
              course={activeCourse}
              assignments={assignments}
              onBackToClasses={() => setCurrentView('classes')}
              onOpenUnit={(uId) => handleSelectUnit(activeCourse.id, uId)}
              onOpenCreateUnitModal={() =>
                setCurriculumModal({
                  isOpen: true,
                  mode: 'create_unit',
                  courseId: activeCourse.id,
                  courseCode: activeCourse.code
                })
              }
              onOpenCreateLessonModal={(uId) => {
                const unit = activeCourse.units?.find((u) => u.id === uId);
                setCurriculumModal({
                  isOpen: true,
                  mode: 'create_lesson',
                  courseId: activeCourse.id,
                  courseCode: activeCourse.code,
                  unitId: uId,
                  unitTitle: unit?.title
                });
              }}
              onNavigateTab={(t) => setCurrentView(t as any)}
            />
          )}

          {/* Teacher AI Session Prep */}
          {currentView === 'teacher_session_prep' && (
            <TeacherSessionPrepView
              classes={classes}
              onNavigateTab={(t) => setCurrentView(t as any)}
              onLaunchSmartboard={(sessionId) => {
                setCurrentView('classroom');
              }}
              onNavigateToContext={(v, ctx) => handleNavigateWithContext(v as any, ctx)}
            />
          )}

          {/* Principal View */}
          {currentView === 'principal_home' && (
            <PrincipalExecutiveView
              institution={institution}
              classes={classes}
              assignments={assignments}
              submissions={submissions}
              onSelectCourse={(id) => handleSelectCourse(id)}
              onNavigateTab={(t) => setCurrentView(t as any)}
            />
          )}

          {/* Preserved Core Workspaces */}
          {currentView === 'classroom' && (
            <SmartClassroomView classes={classes} currentRole={currentRole} />
          )}

          {currentView === 'videos' && (
            <VideoLibraryView classes={classes} currentRole={currentRole} />
          )}

          {currentView === 'classes' && (
            <ClassesView classes={classes} currentRole={currentRole} />
          )}

          {currentView === 'assignments' && (
            <AssignmentsView
              assignments={assignments}
              submissions={submissions}
              classes={classes}
              currentRole={currentRole}
              onNavigateToContext={(v, ctx) => handleNavigateWithContext(v as any, ctx)}
              onCreateAssignment={handleCreateAssignment}
              onSubmitWork={handleSubmitWork}
              onGradeSubmission={handleGradeSubmission}
              selectedSubmissionForGrading={selectedGradingSub}
              onClearSelectedGradingSubmission={() => setSelectedGradingSub(null)}
            />
          )}

          {currentView === 'knowledge' && (
            <KnowledgeWorkspaceView
              knowledgeSpaces={knowledgeSpaces}
              activeSpaceId={selectedSpaceId}
              onSelectSpace={(id) => setSelectedSpaceId(id)}
              onCreateSpace={handleCreateSpace}
              onAddSource={handleAddSource}
              onDeleteSource={handleDeleteSource}
              onReindexSource={handleReindexSource}
              onQueryGrounded={handleQueryGrounded}
            />
          )}

          {currentView === 'community' && (
            <EducationCommunityView
              classes={classes}
              currentRole={currentRole}
              initialClassId={academicContext.classId || activeCourseId}
              onNavigateTab={(t, meta) => handleNavigateWithContext(t as DeepEducationView, meta)}
              onBackToHome={() => setCurrentView(currentRole === 'student' ? 'student_home' : 'teacher_home')}
            />
          )}

          {currentView === 'study_groups' && (
            <EducationCommunityView
              classes={classes}
              currentRole={currentRole}
              initialClassId={academicContext.classId || activeCourseId}
              onNavigateTab={(t, meta) => handleNavigateWithContext(t as DeepEducationView, meta)}
              onBackToHome={() => setCurrentView(currentRole === 'student' ? 'student_home' : 'teacher_home')}
            />
          )}

          {currentView === 'notes' && (
            <StudentPersonalNotesView
              classes={classes}
              knowledgeSpaces={knowledgeSpaces}
              onBackToHome={() => setCurrentView(currentRole === 'student' ? 'student_home' : 'teacher_home')}
              onQueryGrounded={handleQueryGrounded}
            />
          )}

          {currentView === 'study' && (
            <StudyAssistantView
              currentRole={currentRole}
              onSendMessage={(msg) =>
                onSendChatMessage(msg, { sector: 'education', role: currentRole, activeSpaceId: selectedSpaceId })
              }
            />
          )}
        </div>
      </main>

      {/* 4. Teacher Curriculum Modal */}
      <TeacherCurriculumModal
        isOpen={curriculumModal.isOpen}
        onClose={() => setCurriculumModal((prev) => ({ ...prev, isOpen: false }))}
        mode={curriculumModal.mode}
        courseId={curriculumModal.courseId}
        courseCode={curriculumModal.courseCode}
        unitId={curriculumModal.unitId}
        unitTitle={curriculumModal.unitTitle}
        onSaveUnit={handleSaveUnit}
        onSaveLesson={handleSaveLesson}
      />

      {/* 5. Mobile Sticky Bottom Navigation (Top 4 destinations) */}
      <nav aria-label="Mobile Navigation" className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-black/90 border-t border-cyan-500/20 backdrop-blur-xl flex items-center justify-around px-2 z-30">
        <button
          onClick={() =>
            setCurrentView(
              currentRole === 'student'
                ? 'student_home'
                : currentRole === 'teacher'
                ? 'teacher_home'
                : 'principal_home'
            )
          }
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] gap-0.5 text-[10px] font-mono cursor-pointer ${
            ['student_home', 'teacher_home', 'principal_home'].includes(currentView)
              ? 'text-cyan-300 font-bold'
              : 'text-cyan-400/60'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setCurrentView('student_my_learning')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] gap-0.5 text-[10px] font-mono cursor-pointer ${
            currentView === 'student_my_learning' ? 'text-cyan-300 font-bold' : 'text-cyan-400/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tracks</span>
        </button>

        <button
          onClick={() => setCurrentView('focus')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] gap-0.5 text-[10px] font-mono cursor-pointer ${
            currentView === 'focus' ? 'text-cyan-300 font-bold' : 'text-cyan-400/60'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Focus</span>
        </button>

        <button
          onClick={() => setCurrentView('assignments')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] gap-0.5 text-[10px] font-mono cursor-pointer ${
            currentView === 'assignments' ? 'text-cyan-300 font-bold' : 'text-cyan-400/60'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Work</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center min-h-[44px] min-w-[48px] gap-0.5 text-[10px] font-mono text-cyan-400/60 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>

      {/* 6. Focus Lock Navigation Interceptor Modal */}
      <FocusLockBlockedModal
        isOpen={Boolean(blockedNavState?.isOpen)}
        blockedRoute={blockedNavState?.blockedRoute || ''}
        reason={blockedNavState?.reason}
        activeSession={activeFocusSession}
        onReturnToFocus={() => {
          setBlockedNavState(null);
          setCurrentView('focus');
        }}
        onEmergencyExit={async (reason) => {
          if (activeFocusSession) {
            try {
              await fetch(`/api/education/focus/sessions/${activeFocusSession.id}/cancel`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-id': currentRole === 'student' ? 'student-1' : 'teacher-1',
                  'x-user-role': currentRole
                },
                body: JSON.stringify({ reason })
              });
              setActiveFocusSession(null);
              setBlockedNavState(null);
              showNotification('Focus Lock unlocked.');
            } catch (err) {
              console.warn('Unlock error:', err);
            }
          }
        }}
      />
    </div>
  );
};
