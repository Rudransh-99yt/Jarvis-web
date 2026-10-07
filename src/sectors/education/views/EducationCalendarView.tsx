import React, { useState } from 'react';
import type { EducationClass, Assignment } from '../../../types/education.ts';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  BookOpen,
  FileCheck2,
  Radio,
  Timer,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { GlassCard, Badge } from '../../../components/ui/index.ts';
import { glassTokens } from '../../../design-system/tokens.ts';

interface EducationCalendarViewProps {
  classes: EducationClass[];
  assignments: Assignment[];
  onSelectCourse: (courseId: string) => void;
  onNavigateTab: (tab: 'classroom' | 'assignments' | 'focus') => void;
  onNavigateWithContext?: (view: string, context?: any) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  type: 'class' | 'assignment_due' | 'study_block' | 'exam';
  time: string;
  date: string;
  courseCode: string;
  location?: string;
  courseId?: string;
}

export const EducationCalendarView: React.FC<EducationCalendarViewProps> = ({
  classes,
  assignments,
  onSelectCourse,
  onNavigateTab,
  onNavigateWithContext
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-18');
  const [viewFilter, setViewFilter] = useState<'all' | 'classes' | 'deadlines' | 'study'>('all');
  const [dynamicEvents, setDynamicEvents] = useState<CalendarEvent[]>([]);

  // Fetch real-time integrated academic calendar events
  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/education/integration/calendar?workspaceId=ws-stark-core')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data || !Array.isArray(data.items)) return;
        const mapped: CalendarEvent[] = data.items.map((item: any) => ({
          id: item.id,
          title: item.title,
          type: item.type === 'class_session' ? 'class' : item.type === 'assignment_due' ? 'assignment_due' : 'study_block',
          time: item.time || '10:00 AM',
          date: item.date || '2026-10-18',
          courseCode: item.courseCode || 'PHYS-301',
          location: item.location || 'Quantum Hall · SmartBoard Ready',
          courseId: item.courseId || item.classId
        }));
        setDynamicEvents(mapped);
      })
      .catch((err) => console.warn('Could not load dynamic calendar feed:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Base schedule events
  const baseEvents: CalendarEvent[] = [
    {
      id: 'evt-phys-1',
      title: 'PHYS-301: Advanced Quantum Lecture (Live)',
      type: 'class',
      time: '09:00 AM - 10:30 AM',
      date: '2026-10-18',
      courseCode: 'PHYS-301',
      location: 'Quantum Hall 4B',
      courseId: 'class-phys-301'
    },
    {
      id: 'evt-study-1',
      title: 'Pomodoro Deep Focus Block: Quantum Operator Algebra',
      type: 'study_block',
      time: '02:00 PM - 03:00 PM',
      date: '2026-10-18',
      courseCode: 'PHYS-301',
      location: 'Focus Study Workspace'
    },
    {
      id: 'evt-asg-1',
      title: 'Quantum Harmonic Oscillator Operator Derivation',
      type: 'assignment_due',
      time: '11:59 PM',
      date: '2026-10-18',
      courseCode: 'PHYS-301',
      courseId: 'class-phys-301'
    },
    {
      id: 'evt-math-1',
      title: 'MATH-240: Differential Forms & Stokes Lecture',
      type: 'class',
      time: '01:00 PM - 02:30 PM',
      date: '2026-10-19',
      courseCode: 'MATH-240',
      location: 'Turing Annex 201',
      courseId: 'class-math-240'
    },
    {
      id: 'evt-cs-1',
      title: 'CS-101: Distributed Algorithms Seminar',
      type: 'class',
      time: '03:00 PM - 04:30 PM',
      date: '2026-10-20',
      courseCode: 'CS-101',
      location: 'Silicon Lab 102',
      courseId: 'class-cs-101'
    },
    {
      id: 'evt-asg-2',
      title: 'Differential Forms & Stokes Theorem Problem Set',
      type: 'assignment_due',
      time: '11:59 PM',
      date: '2026-10-21',
      courseCode: 'MATH-240',
      courseId: 'class-math-240'
    },
    {
      id: 'evt-study-2',
      title: 'Midterm Prep Block: Vector Calculus Review',
      type: 'study_block',
      time: '04:00 PM - 05:30 PM',
      date: '2026-10-24',
      courseCode: 'MATH-240',
      location: 'Personal Study Workspace'
    }
  ];

  const eventIds = new Set(dynamicEvents.map((e) => e.id));
  const events = [...dynamicEvents, ...baseEvents.filter((b) => !eventIds.has(b.id))];

  const filteredEvents = events.filter((e) => {
    if (viewFilter === 'classes') return e.type === 'class';
    if (viewFilter === 'deadlines') return e.type === 'assignment_due' || e.type === 'exam';
    if (viewFilter === 'study') return e.type === 'study_block';
    return true;
  });

  const selectedDayEvents = filteredEvents.filter((e) => e.date === selectedDate);

  const daysOfWeek = [
    { day: 'Sun', date: '2026-10-18', num: 18, isToday: true, hasEvent: true },
    { day: 'Mon', date: '2026-10-19', num: 19, isToday: false, hasEvent: true },
    { day: 'Tue', date: '2026-10-20', num: 20, isToday: false, hasEvent: true },
    { day: 'Wed', date: '2026-10-21', num: 21, isToday: false, hasEvent: true },
    { day: 'Thu', date: '2026-10-22', num: 22, isToday: false, hasEvent: false },
    { day: 'Fri', date: '2026-10-23', num: 23, isToday: false, hasEvent: false },
    { day: 'Sat', date: '2026-10-24', num: 24, isToday: false, hasEvent: true }
  ];

  const handleOpenCanonical = (evt: CalendarEvent) => {
    if (!onNavigateWithContext) return;
    if (evt.type === 'class') {
      onNavigateWithContext('classroom', { classId: evt.courseId || 'class-phys-301' });
    } else if (evt.type === 'assignment_due') {
      onNavigateWithContext('assignments', { classId: evt.courseId || 'class-phys-301' });
    } else if (evt.type === 'study_block') {
      onNavigateWithContext('focus', {
        classId: evt.courseId || 'class-phys-301',
        topic: evt.title
      });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto w-full font-sans pb-12">
      {/* 1. Page Header & Temporal Context (Editorial Unboxed Composition) */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pt-1">
        <div className="space-y-1">
          <div className="text-xs font-mono text-neutral-400 tracking-wider uppercase flex items-center gap-1.5 font-medium">
            <CalendarIcon className="w-3.5 h-3.5 text-neutral-400" />
            <span>Academic Schedule & Timeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Schedule & Deadlines
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-sans max-w-xl">
            Track daily lectures, upcoming assignment cutoffs, and planned focus study blocks.
          </p>
        </div>

        {/* Quiet Legend Dots */}
        <div className="flex items-center gap-3 font-mono text-xs shrink-0 text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80" />
            <span>Class</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
            <span>Due</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400/80" />
            <span>Focus</span>
          </span>
        </div>
      </div>

      {/* 2. Integrated Week Strip Control Surface */}
      <div className="p-4 sm:p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono">
            <CalendarIcon className="w-3.5 h-3.5 text-neutral-400" />
            <span>October 2026 · Week 8</span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl border border-white/[0.06] bg-white/[0.03] text-xs font-mono self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer focus-ring ${
                viewFilter === 'all' ? 'bg-white/[0.1] text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('classes')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer focus-ring ${
                viewFilter === 'classes' ? 'bg-white/[0.1] text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Classes
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('deadlines')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer focus-ring ${
                viewFilter === 'deadlines' ? 'bg-white/[0.1] text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Deadlines
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('study')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer focus-ring ${
                viewFilter === 'study' ? 'bg-white/[0.1] text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Study
            </button>
          </div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map((d) => {
            const isSelected = d.date === selectedDate;
            return (
              <button
                type="button"
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`p-2.5 sm:p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer focus-ring ${
                  isSelected
                    ? 'border-white/[0.22] bg-white/[0.08] text-white font-semibold shadow-sm'
                    : 'border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.05] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span className="text-[10px] font-mono uppercase">{d.day}</span>
                <span className="text-sm sm:text-base font-bold font-mono">{d.num}</span>
                {d.hasEvent && (
                  <span
                    className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-neutral-500'}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Chronological Daily Timeline Flow */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-mono font-semibold tracking-wider text-neutral-300 uppercase">
            Timeline · {selectedDate === '2026-10-18' ? 'Today (Sunday, Oct 18)' : selectedDate}
          </h2>
          <span className="text-xs font-mono text-neutral-500">
            {selectedDayEvents.length} scheduled items
          </span>
        </div>

        <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          {selectedDayEvents.map((evt) => {
            const isClass = evt.type === 'class';
            const isDue = evt.type === 'assignment_due';
            const isStudy = evt.type === 'study_block';

            return (
              <div
                key={evt.id}
                onClick={() => handleOpenCanonical(evt)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer group relative"
              >
                {/* Subtle side indicator line */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    isClass ? 'bg-cyan-400/80' : isDue ? 'bg-amber-400/80' : 'bg-purple-400/80'
                  }`}
                  aria-hidden="true"
                />

                <div className="space-y-1.5 min-w-0 pl-1">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="font-semibold text-neutral-200">
                      {evt.courseCode}
                    </span>
                    <span aria-hidden="true" className="text-neutral-700">·</span>
                    <span className="text-neutral-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      {evt.time}
                    </span>
                    <span aria-hidden="true" className="text-neutral-700">·</span>
                    <span className="text-neutral-500">
                      {isClass ? 'Lecture Session' : isDue ? 'Assignment Cutoff' : 'Deep Focus Block'}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-cyan-200 transition-colors">
                    {evt.title}
                  </h3>

                  <div className="text-xs font-mono text-neutral-400 flex items-center gap-1.5">
                    {evt.location && <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />}
                    <span>{evt.location || 'Online / Jarvis LMS'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
                  {isClass && onNavigateWithContext && (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigateWithContext('classroom', {
                          classId: evt.courseId || 'class-phys-301'
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-neutral-200 hover:text-white transition-colors cursor-pointer text-xs font-mono focus-ring"
                    >
                      Enter Classroom →
                    </button>
                  )}

                  {isDue && onNavigateWithContext && (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigateWithContext('assignments', {
                          classId: evt.courseId || 'class-phys-301'
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-neutral-200 hover:text-white transition-colors cursor-pointer text-xs font-mono focus-ring"
                    >
                      Open Assignment →
                    </button>
                  )}

                  {isStudy && onNavigateWithContext && (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigateWithContext('focus', {
                          classId: evt.courseId || 'class-phys-301',
                          topic: evt.title
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-neutral-200 hover:text-white transition-colors cursor-pointer text-xs font-mono focus-ring"
                    >
                      Start Focus →
                    </button>
                  )}

                  {evt.courseId && (
                    <button
                      type="button"
                      onClick={() => onSelectCourse(evt.courseId!)}
                      className="text-neutral-400 hover:text-white transition-colors cursor-pointer px-2 py-1.5 text-xs font-mono focus-ring"
                    >
                      Syllabus
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {selectedDayEvents.length === 0 && (
            <div className="p-10 text-center space-y-2">
              <CalendarIcon className="w-6 h-6 text-neutral-500 mx-auto" />
              <div className="text-sm font-semibold text-neutral-200">No Scheduled Events</div>
              <p className="text-xs text-neutral-400">
                You have no lectures or assignment deadlines scheduled for this date.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
