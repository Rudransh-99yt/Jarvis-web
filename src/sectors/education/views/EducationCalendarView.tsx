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
  Sparkles
} from 'lucide-react';

interface EducationCalendarViewProps {
  classes: EducationClass[];
  assignments: Assignment[];
  onSelectCourse: (courseId: string) => void;
  onNavigateTab: (tab: 'classroom' | 'assignments' | 'focus') => void;
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
  onNavigateTab
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-18');
  const [viewFilter, setViewFilter] = useState<'all' | 'classes' | 'deadlines'>('all');

  // Derive schedule events from classes and assignments
  const events: CalendarEvent[] = [
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
      id: 'evt-study-1',
      title: 'Pomodoro Deep Focus Block: Quantum Algebra',
      type: 'study_block',
      time: '05:00 PM - 06:30 PM',
      date: '2026-10-18',
      courseCode: 'PHYS-301',
      location: 'Personal Study Workspace'
    }
  ];

  const filteredEvents = events.filter((e) => {
    if (viewFilter === 'classes') return e.type === 'class';
    if (viewFilter === 'deadlines') return e.type === 'assignment_due' || e.type === 'exam';
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Page Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
          Academic Schedule · Fall 2026
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Academic Calendar & Deadlines
        </h1>
        <p className="text-xs sm:text-sm text-cyan-100/70">
          Track upcoming lectures, problem set due dates, and scheduled focus study blocks.
        </p>
      </div>

      {/* 2. Week Strip Navigation */}
      <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-mono font-bold text-white">
            <CalendarIcon className="w-4 h-4 text-cyan-400" />
            <span>October 2026 · Week 8</span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-cyan-500/20 bg-black/60 text-xs font-mono">
            <button
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1 rounded transition-colors ${
                viewFilter === 'all' ? 'bg-cyan-500/20 text-cyan-200 font-bold' : 'text-cyan-400/60 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setViewFilter('classes')}
              className={`px-3 py-1 rounded transition-colors ${
                viewFilter === 'classes' ? 'bg-cyan-500/20 text-cyan-200 font-bold' : 'text-cyan-400/60 hover:text-white'
              }`}
            >
              Lectures
            </button>
            <button
              onClick={() => setViewFilter('deadlines')}
              className={`px-3 py-1 rounded transition-colors ${
                viewFilter === 'deadlines' ? 'bg-cyan-500/20 text-cyan-200 font-bold' : 'text-cyan-400/60 hover:text-white'
              }`}
            >
              Deadlines
            </button>
          </div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map((d) => {
            const isSelected = d.date === selectedDate;
            return (
              <button
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'border-cyan-500/15 bg-black/30 hover:border-cyan-500/30 text-cyan-300/70 hover:text-white'
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

      {/* 3. Schedule for Selected Day */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
            Events for {selectedDate === '2026-10-18' ? 'Today (Sunday, Oct 18)' : selectedDate}
          </h2>
          <span className="text-xs font-mono text-cyan-400/60">
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
                className="p-4 rounded-xl border border-cyan-500/15 bg-black/40 backdrop-blur-sm space-y-2 hover:border-cyan-500/35 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      {evt.courseCode}
                    </span>
                    <span aria-hidden="true" className="text-cyan-500/40">·</span>
                    <span className="text-xs font-mono text-cyan-400/70 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {evt.time}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded self-start sm:self-auto ${
                      isClass
                        ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                        : isDue
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isClass ? 'Lecture Session' : isDue ? 'Assignment Deadline' : 'Study Block'}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white">{evt.title}</h3>

                <div className="flex items-center justify-between text-xs font-mono text-cyan-400/60 pt-1 border-t border-cyan-500/10">
                  <span className="flex items-center gap-1">
                    {evt.location && <MapPin className="w-3.5 h-3.5 text-cyan-400/50" />}
                    {evt.location || 'Online / Jarvis LMS'}
                  </span>

                  {evt.courseId && (
                    <button
                      onClick={() => onSelectCourse(evt.courseId!)}
                      className="text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
                    >
                      View Syllabus →
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {selectedDayEvents.length === 0 && (
            <div className="p-8 rounded-xl border border-cyan-500/15 bg-black/20 text-center space-y-2">
              <CalendarIcon className="w-6 h-6 text-cyan-400/40 mx-auto" />
              <div className="text-sm font-mono font-bold text-white">No Scheduled Events</div>
              <p className="text-xs text-cyan-100/60">
                You have no lectures or assignment deadlines scheduled for this day.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
