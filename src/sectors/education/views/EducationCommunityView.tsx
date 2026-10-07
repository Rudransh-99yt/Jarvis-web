import React from 'react';
import type { EducationClass, EducationRole } from '../../../types/education.ts';
import { CommunityHub } from '../community/CommunityHub.tsx';

interface EducationCommunityViewProps {
  classes: EducationClass[];
  currentRole: EducationRole;
  initialClassId?: string;
  initialTab?: 'overview' | 'channels' | 'groups' | 'spaces';
  onNavigateTab?: (tab: string, meta?: any) => void;
  onBackToHome?: () => void;
}

export const EducationCommunityView: React.FC<EducationCommunityViewProps> = ({
  classes,
  currentRole,
  initialClassId,
  initialTab = 'overview',
  onNavigateTab,
  onBackToHome
}) => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <CommunityHub
        classes={classes}
        currentRole={currentRole}
        initialClassId={initialClassId}
        initialTab={initialTab}
        onNavigateTab={onNavigateTab}
        onBackToHome={onBackToHome}
      />
    </div>
  );
};
