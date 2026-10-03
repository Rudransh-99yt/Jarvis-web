// Milestone 12: Smart Classroom Foundation Contracts

export type ClassroomSessionStatus = 'scheduled' | 'live' | 'paused' | 'ended';

export type SmartBoardStateType = 'lesson' | 'waiting' | 'question' | 'results' | 'paused' | 'ended';

export type ParticipantConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export type RemoteDeviceType = 'web' | 'mobile' | 'tablet' | 'software_remote';

export interface SmartBoardState {
  state: SmartBoardStateType;
  currentTopic?: string;
  activeSlideIndex?: number;
  message?: string;
  updatedAt: string;
}

export interface ClassroomSession {
  id: string;
  sessionId: string; // Convenience alias identical to id
  workspaceId: string;
  classId: string;
  teacherId: string;
  title: string;
  status: ClassroomSessionStatus;
  boardState: SmartBoardState;
  startedAt?: string;
  endedAt?: string;
  activeStudentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassroomParticipant {
  id: string; // `${sessionId}:${studentId}`
  sessionId: string;
  studentId: string;
  displayName: string;
  joinedAt: string;
  lastSeenAt: string;
  connectionStatus: ParticipantConnectionStatus;
  deviceType: RemoteDeviceType;
  metadata?: Record<string, unknown>;
}

export type ClassroomEventType =
  | 'classroom.session.started'
  | 'classroom.session.paused'
  | 'classroom.session.resumed'
  | 'classroom.session.ended'
  | 'classroom.student.joined'
  | 'classroom.student.left'
  | 'classroom.student.presence'
  | 'classroom.board.state.changed'
  | 'quiz.created'
  | 'quiz.updated'
  | 'quiz.started'
  | 'quiz.question.started'
  | 'quiz.question.updated'
  | 'quiz.response.accepted'
  | 'quiz.response.rejected'
  | 'quiz.question.locked'
  | 'quiz.results.updated'
  | 'quiz.paused'
  | 'quiz.resumed'
  | 'quiz.completed'
  | 'quiz.cancelled';

export interface RealtimeClassroomEvent {
  type: ClassroomEventType;
  sessionId: string;
  classId: string;
  workspaceId: string;
  data: any;
  timestamp: string;
}

export interface CreateClassroomSessionInput {
  id?: string;
  workspaceId: string;
  classId: string;
  teacherId: string;
  title?: string;
  status?: ClassroomSessionStatus;
  boardState?: Partial<SmartBoardState>;
}
