export type HudTheme = 'cyan' | 'mark85' | 'stealth' | 'violet';

export interface SystemMetric {
  name: string;
  value: number;
  max: number;
  unit: string;
  status: 'nominal' | 'warning' | 'critical' | 'optimal';
}

export interface ArmorMark {
  id: string;
  designation: string;
  name: string;
  class: string;
  powerOutput: string;
  status: 'Active' | 'Standby' | 'Damaged' | 'Deployed' | 'Assembling';
  integrity: number;
  description: string;
  features: string[];
}

export interface StarkDirective {
  id: string;
  title: string;
  category: 'Research' | 'Security' | 'Defense' | 'Personal';
  timestamp: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'omega';
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  type: 'system' | 'user' | 'jarvis' | 'protocol' | 'alert';
  message: string;
}

export interface StarkProtocol {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'Defense' | 'Assault' | 'Emergency' | 'Utility';
  active: boolean;
  soundCue: string;
}

// Aliases for compatibility
export type ArmorSuit = ArmorMark;
export type Protocol = StarkProtocol;
export interface Memo {
  id: string;
  text: string;
  priority: 'High' | 'Medium' | 'Low';
  timestamp: string;
}

export * from './types/api';

