import React from 'react';
import type { EducationClass, EducationRole } from '../../../types/education.ts';
import { CommunityShell } from '../community/CommunityShell.tsx';

interface EducationCommunityViewProps {
  classes: EducationClass[];
  currentRole: EducationRole;
  initialClassId?: string;
  onNavigateTab?: (tab: string, meta?: any) => void;
  onBackToHome?: () => void;
}

export const EducationCommunityView: React.FC<EducationCommunityViewProps> = ({
  classes,
  currentRole,
  initialClassId,
  onNavigateTab
}) => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <CommunityShell
        classes={classes}
        currentRole={currentRole}
        initialClassId={initialClassId}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
};
