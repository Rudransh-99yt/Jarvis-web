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
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="space-y-1">
          <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Academic Temporal Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Schedule & Deadlines
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Track daily lectures, upcoming assignment cutoffs, and planned focus study blocks.
          </p>
        </div>

        {/* Legend Chips */}
        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
          <span className="flex items-center gap-1 text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            <span>Class</span>
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Due</span>
          </span>
          <span className="flex items-center gap-1 text-purple-300">
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            <span>Focus</span>
          </span>
        </div>
      </div>

      {/* 2. Week Strip Navigation */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-mono font-bold text-white">
            <CalendarIcon className="w-4 h-4 text-cyan-400" />
            <span>October 2026 · Week 8</span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-800 bg-slate-950 text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('classes')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewFilter === 'classes' ? 'bg-slate-800 text-blue-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Classes
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('deadlines')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewFilter === 'deadlines' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Deadlines
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('study')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewFilter === 'study' ? 'bg-slate-800 text-purple-300 font-bold' : 'text-slate-400 hover:text-white'
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
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-[10px] font-mono uppercase">{d.day}</span>
                <span className="text-base font-bold font-mono">{d.num}</span>
                {d.hasEvent && (
                  <span
                    className={`h-1 w-1 rounded-full ${isSelected ? 'bg-cyan-300' : 'bg-cyan-400/60'}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Chronological Daily Agenda */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
            Chronological Timeline · {selectedDate === '2026-10-18' ? 'Today (Sunday, Oct 18)' : selectedDate}
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {selectedDayEvents.length} scheduled items
          </span>
        </div>

        <div className="space-y-3">
          {selectedDayEvents.map((evt) => {
            const isClass = evt.type === 'class';
            const isDue = evt.type === 'assignment_due';
            const isStudy = evt.type === 'study_block';

            return (
              <div
                key={evt.id}
                onClick={() => handleOpenCanonical(evt)}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition-all cursor-pointer group space-y-2.5 backdrop-blur-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      {evt.courseCode}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {evt.time}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded self-start sm:self-auto font-medium ${
                      isClass
                        ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                        : isDue
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                        : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {isClass ? 'Lecture Session' : isDue ? 'Assignment Deadline' : 'Focus Study Block'}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white group-hover:text-cyan-200 transition-colors">
                  {evt.title}
                </h3>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="flex items-center gap-1 text-slate-500">
                    {evt.location && <MapPin className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{evt.location || 'Online / Jarvis LMS'}</span>
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {isClass && onNavigateWithContext && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateWithContext('classroom', {
                            classId: evt.courseId || 'class-phys-301'
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-blue-950/40 border border-blue-500/30 text-blue-300 hover:text-white transition-colors cursor-pointer"
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
                        className="px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 hover:text-white transition-colors cursor-pointer"
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
                        className="px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-500/30 text-purple-300 hover:text-white transition-colors cursor-pointer"
                      >
                        Start Focus →
                      </button>
                    )}

                    {evt.courseId && (
                      <button
                        type="button"
                        onClick={() => onSelectCourse(evt.courseId!)}
                        className="text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer pl-1"
                      >
                        Syllabus →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {selectedDayEvents.length === 0 && (
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center space-y-2">
              <CalendarIcon className="w-6 h-6 text-slate-600 mx-auto" />
              <div className="text-sm font-mono font-bold text-white">No Scheduled Events</div>
              <p className="text-xs text-slate-400">
                You have no lectures or assignment deadlines scheduled for this date.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
