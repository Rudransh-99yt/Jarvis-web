import React, { useState, useEffect } from 'react';
import type { ClassSession } from '../../../types/classSession.ts';
import type { EducationClass } from '../../../types/education.ts';
import { TeacherSessionsListView } from '../teacherPrep/TeacherSessionsListView.tsx';
import { TeacherSessionPrepWizard } from '../teacherPrep/TeacherSessionPrepWizard.tsx';

interface TeacherSessionPrepViewProps {
  classes: EducationClass[];
  onNavigateTab: (tab: string) => void;
  onLaunchSmartboard?: (sessionId: string) => void;
}

export const TeacherSessionPrepView: React.FC<TeacherSessionPrepViewProps> = ({
  classes,
  onNavigateTab,
  onLaunchSmartboard
}) => {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [mode, setMode] = useState<'list' | 'wizard'>('list');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load Sessions
  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/education/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const handleStartNew = () => {
    setActiveSessionId(null);
    setMode('wizard');
  };

  const handleOpenSession = (id: string) => {
    setActiveSessionId(id);
    setMode('wizard');
  };

  const handleDeleteSession = async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch(`/api/education/sessions/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleSessionSaved = (saved: ClassSession) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [saved, ...prev];
    });
  };

  if (mode === 'wizard') {
    return (
      <TeacherSessionPrepWizard
        classes={classes}
        existingSession={activeSession}
        onBackToList={() => {
          setMode('list');
          setActiveSessionId(null);
          fetchSessions();
        }}
        onSessionSaved={handleSessionSaved}
        onLaunchSmartboard={(sessionId) => {
          if (onLaunchSmartboard) {
            onLaunchSmartboard(sessionId);
          } else {
            onNavigateTab('classroom');
          }
        }}
      />
    );
  }

  return (
    <TeacherSessionsListView
      sessions={sessions}
      classes={classes}
      onStartNewSession={handleStartNew}
      onOpenSession={handleOpenSession}
      onLaunchSmartboard={(sessionId) => {
        if (onLaunchSmartboard) {
          onLaunchSmartboard(sessionId);
        } else {
          onNavigateTab('classroom');
        }
      }}
      onDeleteSession={handleDeleteSession}
    />
  );
};
