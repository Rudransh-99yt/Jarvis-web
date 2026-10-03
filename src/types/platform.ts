// Reusable Domain Models for Core Jarvis Platform

export type SectorId = 'command' | 'education' | 'finance' | 'research' | 'home';

export interface SectorDefinition {
  id: SectorId;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  badge?: string;
  status: 'active' | 'beta' | 'planned';
  category: 'core' | 'sector';
  path: string;
}

export type UserRole = 'admin' | 'commander' | 'teacher' | 'student' | 'guest';

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  activeSector: SectorId;
  preferences?: {
    theme?: 'cyber-dark' | 'tactical' | 'clean';
    voiceSynthesis?: boolean;
    audioCues?: boolean;
    streamSpeed?: 'normal' | 'fast';
  };
}

export interface UserFile {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  ownerId: string;
  sectorId: SectorId;
  tags: string[];
  textContent?: string;
}

export interface SourceReference {
  sourceId: string;
  sourceTitle: string;
  excerpt: string;
  location?: string; // e.g., "Section 3.2" or "Page 4"
}
