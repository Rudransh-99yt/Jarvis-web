import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { EducationClass, EducationRole } from '../../../types/education.ts';
import type {
  CommunityChannel,
  CommunityMessage,
  CommunityStudyGroup,
  CommunityAnnouncement,
  CommunityAttachment,
  CommunityStudySpace
} from '../../../types/community.ts';
import {
  MessageSquare,
  Users,
  Radio,
  Hash,
  Bell,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Search,
  Plus,
  Send,
  Calendar,
  Clock,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share2,
  Bookmark,
  BookOpen,
  FileText,
  Compass,
  CheckCircle2,
  Hand
} from 'lucide-react';
import { GlassCard, Button, Badge } from '../../../components/ui/index.ts';
import { Avatar } from '../../../components/ui/Avatar.tsx';

// =========================================================================
// PRE-SEEDED CANONICAL DATASETS (Guarantees zero-flicker instant rendering)
// =========================================================================

const SEEDED_CHANNELS: CommunityChannel[] = [
  // 1. General
  {
    id: 'chan-school-general',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    name: 'general-campus',
    topic: 'All-Cadet Campus Discussion & Interdisciplinary Science Hub',
    type: 'GENERAL',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'principal-1',
    createdAt: '2026-10-01T08:05:00.000Z'
  },
  {
    id: 'chan-school-announcements',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    name: 'announcements',
    topic: 'Official Stark Academy Administrative Directives & Dean Notices',
    type: 'ANNOUNCEMENTS',
    isPrivate: false,
    allowedRoleList: ['teacher', 'principal', 'admin'],
    pinnedMessageIds: ['msg-ann-1'],
    createdById: 'principal-1',
    createdAt: '2026-10-01T08:00:00.000Z'
  },
  // 2. Questions
  {
    id: 'chan-phys301-problems',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    name: 'homework-help',
    topic: 'Homework Problem Set #1 Discussion & Step-by-Step Derivations',
    type: 'QUESTIONS',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'teacher-1',
    createdAt: '2026-10-01T09:15:00.000Z'
  },
  {
    id: 'chan-exam-prep',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    name: 'exam-prep-qa',
    topic: 'Midterm & Finals Review Questions and Mock Problem Walkthroughs',
    type: 'QUESTIONS',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'teacher-1',
    createdAt: '2026-10-01T09:18:00.000Z'
  },
  // 3. Resources
  {
    id: 'chan-phys301-resources',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    name: 'course-resources',
    topic: 'NCERT Chapter PDFs, ClassSession Slides & Formula Handouts',
    type: 'RESOURCES',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'teacher-1',
    createdAt: '2026-10-01T09:20:00.000Z'
  },
  {
    id: 'chan-research-preprints',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    name: 'research-preprints',
    topic: 'Peer-reviewed preprints, arXiv highlights and laboratory notes',
    type: 'RESOURCES',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'principal-1',
    createdAt: '2026-10-01T09:25:00.000Z'
  },
  // 4. Classes
  {
    id: 'chan-phys301-theory',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    name: 'phys301-electrodynamics',
    topic: 'Coulomb Vector Form, Gauss Cylindrical Flux & Dipole Potentials',
    type: 'CLASS',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'teacher-1',
    createdAt: '2026-10-01T09:10:00.000Z'
  },
  {
    id: 'chan-cs501-general',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-cs-501',
    name: 'cs501-distributed-systems',
    topic: 'Paxos, Raft, Byzantine Generals & Vector Clocks',
    type: 'CLASS',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'teacher-1',
    createdAt: '2026-10-01T09:30:00.000Z'
  },
  // 5. Subjects
  {
    id: 'chan-quantum-physics',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    name: 'quantum-physics',
    topic: 'Wavefunctions, Hilbert space, operators and Dirac bra-ket formalism',
    type: 'SUBJECT',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'teacher-1',
    createdAt: '2026-10-01T09:35:00.000Z'
  },
  {
    id: 'chan-multivariable-calculus',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    name: 'advanced-mathematics',
    topic: 'Differential forms, manifolds, Stokes theorem and Green identities',
    type: 'SUBJECT',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'teacher-1',
    createdAt: '2026-10-01T09:40:00.000Z'
  },
  // 6. Study Group Dedicated Sync & Discourse Channels
  {
    id: 'chan-sg-quantum',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    studyGroupId: 'sg-phys-quantum',
    name: 'quantum-pioneers-sync',
    topic: 'Peer Study Group: Gauss Boundary Problems & Past Exam Reviews',
    type: 'STUDY_GROUP',
    isPrivate: false,
    allowedUserIds: ['student-1', 'student-2', 'student-3', 'teacher-1'],
    pinnedMessageIds: [],
    createdById: 'student-1',
    createdAt: '2026-10-02T10:00:00.000Z'
  },
  {
    id: 'chan-space-quant-01',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    studyGroupId: 'sg-phys-quantum',
    name: 'space-quantum-harmonics',
    topic: 'Live Discourse for Quantum Harmonic Oscillators & Commutator Algebra',
    type: 'STUDY_GROUP',
    isPrivate: false,
    allowedUserIds: ['student-1', 'student-2', 'student-3', 'teacher-1'],
    pinnedMessageIds: [],
    createdById: 'student-1',
    createdAt: '2026-10-06T08:00:00.000Z'
  },
  {
    id: 'chan-space-calc-02',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-math-240',
    studyGroupId: 'sg-math-diff',
    name: 'space-stokes-manifolds',
    topic: 'Live Discourse for Stokes Theorem on Smooth Manifolds',
    type: 'STUDY_GROUP',
    isPrivate: false,
    allowedUserIds: ['student-4', 'student-5'],
    pinnedMessageIds: [],
    createdById: 'student-4',
    createdAt: '2026-10-06T09:00:00.000Z'
  }
];

const SEEDED_STUDY_GROUPS: CommunityStudyGroup[] = [
  {
    id: 'sg-phys-quantum',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    courseCode: 'PHYS-301',
    subject: 'Physics',
    name: 'Quantum Mechanics Cohort',
    description: 'Peer group dedicated to ladder operators, harmonic oscillators, and commutator algebra derivations.',
    ownerUserId: 'student-1',
    ownerName: 'Alex Chen',
    memberUserIds: ['student-1', 'student-2', 'student-3', 'teacher-1'],
    channelIds: ['chan-phys301-theory', 'chan-sg-quantum'],
    sharedResources: [
      {
        id: 'res-1',
        resourceType: 'class_session',
        resourceId: 'session-phys-101',
        title: 'ClassSession #101: Electrostatics & Gauss Surface Flux',
        context: 'Prepared Class Session Materials'
      }
    ],
    scheduledMeetingAt: new Date(Date.now() + 86400000).toISOString(),
    isSupervised: true,
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z'
  },
  {
    id: 'sg-math-diff',
    schoolId: 'inst-stark-academy',
    classId: 'class-math-240',
    courseCode: 'MATH-240',
    subject: 'Mathematics',
    name: 'Differential Forms & Stokes',
    description: 'Collaborative problem solving for exterior calculus, differential forms, and Stokes theorem on manifolds.',
    ownerUserId: 'student-4',
    ownerName: 'Devon Vance',
    memberUserIds: ['student-4', 'student-5'],
    channelIds: ['chan-multivariable-calculus'],
    sharedResources: [
      {
        id: 'res-diff-1',
        resourceType: 'chapter',
        resourceId: 'unit-stokes',
        title: 'Stokes Theorem on Smooth Manifolds',
        context: 'Parametrization Reference Sheet'
      }
    ],
    scheduledMeetingAt: new Date(Date.now() + 172800000).toISOString(),
    isSupervised: false,
    createdAt: '2026-10-02T11:00:00.000Z',
    updatedAt: '2026-10-02T11:00:00.000Z'
  },
  {
    id: 'sg-cs-consensus',
    schoolId: 'inst-stark-academy',
    classId: 'class-cs-501',
    courseCode: 'CS-501',
    subject: 'Computer Science',
    name: 'Distributed Consensus Labs',
    description: 'Hands-on debugging of Raft leader election state machines, log replication, and RPC partitions.',
    ownerUserId: 'student-2',
    ownerName: 'Marcus Bell',
    memberUserIds: ['student-2', 'student-3', 'student-5'],
    channelIds: ['chan-cs501-general'],
    sharedResources: [],
    scheduledMeetingAt: new Date(Date.now() + 259200000).toISOString(),
    isSupervised: false,
    createdAt: '2026-10-03T09:00:00.000Z',
    updatedAt: '2026-10-03T09:00:00.000Z'
  },
  {
    id: 'sg-phys-relativity',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-302',
    courseCode: 'PHYS-302',
    subject: 'Physics',
    name: 'Relativistic Electrodynamics',
    description: 'Minkowski spacetime formulation of Maxwell equations, Faraday 4-tensor, and gauge transformations.',
    ownerUserId: 'student-3',
    ownerName: 'Elena Rostov',
    memberUserIds: ['student-3', 'student-6'],
    channelIds: ['chan-quantum-physics'],
    sharedResources: [],
    isSupervised: false,
    createdAt: '2026-10-03T14:00:00.000Z',
    updatedAt: '2026-10-03T14:00:00.000Z'
  }
];

const SEEDED_MESSAGES: Record<string, CommunityMessage[]> = {
  'chan-school-general': [
    {
      id: 'msg-gen-1',
      communityId: 'comm-stark-academy',
      schoolId: 'inst-stark-academy',
      channelId: 'chan-school-general',
      senderUserId: 'teacher-1',
      senderName: 'Dr. Sarah',
      senderRole: 'teacher',
      content: 'Welcome cadets to this semester\'s academic communication ecosystem. The peer study rooms and synchronised formula canvases are now live.',
      attachments: [],
      mentions: [],
      reactions: [{ emoji: '🚀', userIds: ['student-1', 'student-2'], count: 2 }],
      isPinned: true,
      isEdited: false,
      isDeleted: false,
      replyCount: 3,
      createdAt: '2026-10-06T08:00:00.000Z',
      updatedAt: '2026-10-06T08:00:00.000Z'
    },
    {
      id: 'msg-gen-2',
      communityId: 'comm-stark-academy',
      schoolId: 'inst-stark-academy',
      channelId: 'chan-school-general',
      senderUserId: 'student-2',
      senderName: 'Marcus Bell',
      senderRole: 'student',
      content: 'Has anyone started problem 3 from the Electrodynamics problem set? The boundary condition at the dielectric interface is tricky.',
      attachments: [],
      mentions: [],
      reactions: [{ emoji: '👍', userIds: ['student-1'], count: 1 }],
      isPinned: false,
      isEdited: false,
      isDeleted: false,
      replyCount: 1,
      createdAt: '2026-10-06T09:15:00.000Z',
      updatedAt: '2026-10-06T09:15:00.000Z'
    },
    {
      id: 'msg-gen-3',
      communityId: 'comm-stark-academy',
      schoolId: 'inst-stark-academy',
      channelId: 'chan-school-general',
      senderUserId: 'student-1',
      senderName: 'Alex Chen',
      senderRole: 'student',
      content: 'Yes! Use D1n - D2n = σf. Check the Quantum Mechanics cohort study space, we have the derivation notes pinned on the board.',
      attachments: [],
      mentions: ['student-2'],
      reactions: [{ emoji: '💡', userIds: ['student-2'], count: 1 }],
      isPinned: false,
      isEdited: false,
      isDeleted: false,
      replyCount: 0,
      createdAt: '2026-10-06T09:30:00.000Z',
      updatedAt: '2026-10-06T09:30:00.000Z'
    }
  ],
  'chan-phys301-theory': [
    {
      id: 'msg-theory-1',
      communityId: 'comm-stark-academy',
      schoolId: 'inst-stark-academy',
      channelId: 'chan-phys301-theory',
      senderUserId: 'student-2',
      senderName: 'Marcus Bell',
      senderRole: 'student',
      content: 'Has anyone finished deriving the step operator commutator for the harmonic potential? [a, a†] = 1?',
      attachments: [],
      mentions: [],
      reactions: [{ emoji: '💡', userIds: ['student-1'], count: 1 }],
      isPinned: false,
      isEdited: false,
      isDeleted: false,
      replyCount: 1,
      createdAt: '2026-10-05T16:30:00.000Z',
      updatedAt: '2026-10-05T16:30:00.000Z'
    },
    {
      id: 'msg-theory-2',
      communityId: 'comm-stark-academy',
      schoolId: 'inst-stark-academy',
      channelId: 'chan-phys301-theory',
      senderUserId: 'student-1',
      senderName: 'Alex Chen',
      senderRole: 'student',
      content: 'Yes! Expanding x and p in terms of the operators verifies [x, p] = iℏ directly yields [a, a†] = 1. Check the live study space for the whiteboard steps.',
      attachments: [],
      mentions: ['student-2'],
      reactions: [{ emoji: '🔥', userIds: ['student-2'], count: 1 }, { emoji: '👍', userIds: ['teacher-1'], count: 1 }],
      isPinned: false,
      isEdited: false,
      isDeleted: false,
      replyCount: 0,
      createdAt: '2026-10-05T17:12:00.000Z',
      updatedAt: '2026-10-05T17:12:00.000Z'
    }
  ],
  'chan-space-quant-01': [
    {
      id: 'msg-space-1',
      communityId: 'comm-stark-academy',
      schoolId: 'inst-stark-academy',
      channelId: 'chan-space-quant-01',
      senderUserId: 'student-2',
      senderName: 'Marcus Bell',
      senderRole: 'student',
      content: 'Remember that a|0⟩ = 0 by definition, so the ground state has zero annihilation eigenvalue.',
      attachments: [],
      mentions: [],
      reactions: [{ emoji: '👍', userIds: ['student-1'], count: 1 }],
      isPinned: false,
      isEdited: false,
      isDeleted: false,
      replyCount: 0,
      createdAt: '2026-10-06T10:14:00.000Z',
      updatedAt: '2026-10-06T10:14:00.000Z'
    },
    {
      id: 'msg-space-2',
      communityId: 'comm-stark-academy',
      schoolId: 'inst-stark-academy',
      channelId: 'chan-space-quant-01',
      senderUserId: 'teacher-1',
      senderName: 'Dr. Sarah',
      senderRole: 'teacher',
      content: 'Exactly Marcus. And substitute [x, p] = iℏ into the Hamiltonian to verify the zero-point term 1/2 ℏω.',
      attachments: [],
      mentions: [],
      reactions: [{ emoji: '💯', userIds: ['student-1', 'student-2'], count: 2 }],
      isPinned: false,
      isEdited: false,
      isDeleted: false,
      replyCount: 0,
      createdAt: '2026-10-06T10:16:00.000Z',
      updatedAt: '2026-10-06T10:16:00.000Z'
    }
  ]
};

const SEEDED_ANNOUNCEMENTS: CommunityAnnouncement[] = [
  {
    id: 'ann-1',
    schoolId: 'inst-stark-academy',
    channelId: 'chan-school-announcements',
    title: 'Midterm Physics Examination Schedule Published',
    body: 'The advanced electrodynamics and quantum mechanics midterm assessments are set for next Friday. Study spaces are reserved for cohort reviews.',
    authorUserId: 'principal-1',
    authorName: 'Dean Vance',
    authorRole: 'principal',
    priority: 'important',
    attachments: [],
    acknowledgedUserIds: [],
    createdAt: '2026-10-06T07:30:00.000Z'
  }
];

const SEEDED_STUDY_SPACES: CommunityStudySpace[] = [
  {
    id: 'space-quant-01',
    groupId: 'sg-phys-quantum',
    groupName: 'Quantum Mechanics Cohort',
    courseCode: 'PHYS-301',
    title: 'Quantum Harmonic Oscillators & Commutator Algebra',
    topic: 'Deriving ladder operator commutation [a, a†] = 1 and ground state energy eigenfunctions.',
    activeCount: 3,
    participants: [
      { id: 'student-1', name: 'Alex Chen', role: 'Student', isSpeaking: true, audioEnabled: true, videoEnabled: false, isHandRaised: false },
      { id: 'student-2', name: 'Marcus Bell', role: 'Student', isSpeaking: false, audioEnabled: true, videoEnabled: false, isHandRaised: false },
      { id: 'teacher-1', name: 'Dr. Sarah', role: 'Instructor', isSpeaking: false, audioEnabled: true, videoEnabled: false, isHandRaised: false }
    ],
    participantUserIds: ['student-1', 'student-2', 'teacher-1'],
    voiceConnected: true,
    videoEnabled: false,
    sharedProblemContext: 'Problem Set 4 · Problem 3: Evaluate matrix elements ⟨n|x|m⟩ using ladder representation.',
    formulaNotes: 'a = √(mω/2ℏ)(x + ip/mω)\na† = √(mω/2ℏ)(x - ip/mω)\n[a, a†] = 1\nH = ℏω(a†a + 1/2)',
    status: 'ACTIVE_NOW',
    startedAt: '38 minutes ago',
    discussionChannelId: 'chan-space-quant-01'
  },
  {
    id: 'space-calc-02',
    groupId: 'sg-math-diff',
    groupName: 'Differential Forms & Stokes',
    courseCode: 'MATH-240',
    title: 'Stokes Theorem on Smooth Manifolds',
    topic: 'Integration of differential 2-forms over parameterized boundary surfaces.',
    activeCount: 2,
    participants: [
      { id: 'student-4', name: 'Devon Vance', role: 'Student', isSpeaking: false, audioEnabled: true, videoEnabled: false, isHandRaised: false },
      { id: 'student-5', name: 'Maya Lin', role: 'Student', isSpeaking: false, audioEnabled: true, videoEnabled: false, isHandRaised: false }
    ],
    participantUserIds: ['student-4', 'student-5'],
    voiceConnected: true,
    videoEnabled: false,
    sharedProblemContext: 'MATH-240 Unit 3: Verification of d(ω) = d(F · dr) for cylindrical vortex vectors.',
    formulaNotes: '∫_∂S ω = ∫_S dω\nd(P dx + Q dy) = (∂Q/∂x - ∂P/∂y) dx ∧ dy',
    status: 'ACTIVE_NOW',
    startedAt: '15 minutes ago',
    discussionChannelId: 'chan-space-calc-02'
  },
  {
    id: 'space-up-midterm',
    groupId: 'sg-phys-quantum',
    groupName: 'Quantum Mechanics Cohort',
    courseCode: 'PHYS-301',
    title: 'Midterm Exam Preparation Jam',
    topic: 'Comprehensive review of wavefunctions, ladder operators, and finite well potentials.',
    activeCount: 0,
    participants: [],
    participantUserIds: [],
    voiceConnected: false,
    videoEnabled: false,
    sharedProblemContext: 'Review questions from 2024-2025 past papers with faculty assistants.',
    formulaNotes: 'ψ(x, t) = ∑ c_n ψ_n(x) e^(-iE_n t/ℏ)',
    status: 'UPCOMING',
    startedAt: 'Friday · 04:00 PM EST',
    discussionChannelId: 'chan-space-up-midterm'
  },
  {
    id: 'space-up-consensus',
    groupId: 'sg-cs-consensus',
    groupName: 'Distributed Consensus Labs',
    courseCode: 'CS-501',
    title: 'Byzantine Fault Tolerance Paper Review',
    topic: 'Lamport, Shostak, and Pease 1982 paper walkthrough and oral question review.',
    activeCount: 0,
    participants: [],
    participantUserIds: [],
    voiceConnected: false,
    videoEnabled: false,
    sharedProblemContext: '3m + 1 bounds under oral vs signed message assumptions.',
    formulaNotes: 'n > 3m oral messages\nn > m signed messages',
    status: 'UPCOMING',
    startedAt: 'Tomorrow · 06:30 PM EST',
    discussionChannelId: 'chan-space-up-consensus'
  }
];

// =========================================================================
// COMPONENT PROPS
// =========================================================================

interface CommunityHubProps {
  classes: EducationClass[];
  currentRole: EducationRole;
  initialClassId?: string;
  initialTab?: 'overview' | 'channels' | 'groups' | 'spaces';
  onNavigateTab?: (tab: string, meta?: any) => void;
  onBackToHome?: () => void;
}

export const CommunityHub: React.FC<CommunityHubProps> = ({
  classes,
  currentRole,
  initialClassId: _initialClassId,
  initialTab = 'overview',
  onNavigateTab: _onNavigateTab,
  onBackToHome: _onBackToHome
}) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'channels' | 'groups' | 'spaces'>(initialTab);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeLiveSpaceId, setActiveLiveSpaceId] = useState<string | null>(null);
  const [activeGroupSubTab, setActiveGroupSubTab] = useState<'discussion' | 'space' | 'resources' | 'members' | 'sessions'>('discussion');

  // Backend Data State (Pre-seeded with instant fallbacks)
  const [channels, setChannels] = useState<CommunityChannel[]>(SEEDED_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>('chan-school-general');
  const [messages, setMessages] = useState<CommunityMessage[]>(SEEDED_MESSAGES['chan-school-general'] || []);
  const [studyGroups, setStudyGroups] = useState<CommunityStudyGroup[]>(SEEDED_STUDY_GROUPS);
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>(SEEDED_ANNOUNCEMENTS);
  const [studySpaces, setStudySpaces] = useState<CommunityStudySpace[]>(SEEDED_STUDY_SPACES);

  // Derived Active / Upcoming Spaces
  const activeSpaces = useMemo(
    () => studySpaces.filter((s) => s.status === 'ACTIVE_NOW' || s.status === 'ACTIVE'),
    [studySpaces]
  );
  const upcomingSpaces = useMemo(
    () => studySpaces.filter((s) => s.status === 'UPCOMING' || s.status === 'SCHEDULED'),
    [studySpaces]
  );

  // Active Group & Group Discussion State
  const activeGroup = useMemo(
    () => studyGroups.find((g) => g.id === selectedGroupId) || studyGroups[0],
    [studyGroups, selectedGroupId]
  );
  const groupDiscussionChannelId = useMemo(
    () => activeGroup?.channelIds?.[0] || 'chan-phys301-theory',
    [activeGroup]
  );
  const [groupMessages, setGroupMessages] = useState<CommunityMessage[]>([]);
  const [groupDiscussionInput, setGroupDiscussionInput] = useState<string>('');

  // Active Live Study Space & Presence State
  const activeLiveSpace = useMemo(
    () => studySpaces.find((s) => s.id === activeLiveSpaceId) || studySpaces[0],
    [studySpaces, activeLiveSpaceId]
  );
  const spaceChannelId = useMemo(
    () => activeLiveSpace?.discussionChannelId || 'chan-space-quant-01',
    [activeLiveSpace]
  );
  const [spaceMessages, setSpaceMessages] = useState<CommunityMessage[]>([]);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);

  // Chat Composer State (Channels)
  const [inputContent, setInputContent] = useState<string>('');
  const [stagedAttachments, setStagedAttachments] = useState<CommunityAttachment[]>([]);

  // Search & Filter
  const [groupFilter, setGroupFilter] = useState<'my' | 'discover'>('my');
  const [channelSearch, setChannelSearch] = useState<string>('');
  const [groupSearch, setGroupSearch] = useState<string>('');
  const [spaceSubTab, setSpaceSubTab] = useState<'active' | 'upcoming'>('active');

  // Live Study Space Audio/Video Capabilities State
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [liveChatInput, setLiveChatInput] = useState<string>('');

  // Modals
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupDesc, setNewGroupDesc] = useState<string>('');
  const [newGroupClassId, setNewGroupClassId] = useState<string>(classes[0]?.id || 'class-phys-301');

  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState<boolean>(false);
  const [newSpaceTitle, setNewSpaceTitle] = useState<string>('');
  const [newSpaceTopic, setNewSpaceTopic] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const groupMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const spaceMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const currentUser = {
    id: currentRole === 'student' ? 'student-1' : currentRole === 'teacher' ? 'teacher-1' : 'principal-1',
    displayName: currentRole === 'student' ? 'Alex Chen' : currentRole === 'teacher' ? 'Dr. Sarah' : 'Dean Stark',
    role: (currentRole === 'parent' ? 'student' : currentRole) as 'student' | 'teacher' | 'principal'
  };

  // Initial Data Fetching from persistent backend (merges smoothly)
  const fetchInitialData = useCallback(async () => {
    try {
      const [chanRes, annRes, sgRes, spRes] = await Promise.all([
        fetch('/api/education/community/channels', {
          headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
        }),
        fetch('/api/education/community/announcements', {
          headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
        }),
        fetch('/api/education/community/study-groups', {
          headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
        }),
        fetch('/api/education/community/study-spaces', {
          headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
        })
      ]);

      if (chanRes.ok) {
        const chanData = await chanRes.json();
        if (chanData.channels && chanData.channels.length > 0) {
          setChannels(chanData.channels);
        }
      }
      if (annRes.ok) {
        const annData = await annRes.json();
        if (annData.announcements && annData.announcements.length > 0) {
          setAnnouncements(annData.announcements);
        }
      }
      if (sgRes.ok) {
        const sgData = await sgRes.json();
        if (sgData.studyGroups && sgData.studyGroups.length > 0) {
          setStudyGroups(sgData.studyGroups);
        }
      }
      if (spRes.ok) {
        const spData = await spRes.json();
        if (spData.studySpaces && spData.studySpaces.length > 0) {
          setStudySpaces(spData.studySpaces);
        }
      }
    } catch (err) {
      console.warn('Backend community sync info: using pre-seeded local stores', err);
    }
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch messages for active channel
  const fetchChannelMessages = useCallback(async (channelId: string) => {
    if (!channelId) return;
    try {
      const res = await fetch(`/api/education/community/channels/${channelId}/messages`, {
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
          return;
        }
      }
    } catch {
      // fallback to seeded messages if offline
    }
    if (SEEDED_MESSAGES[channelId]) {
      setMessages(SEEDED_MESSAGES[channelId]);
    } else {
      setMessages([]);
    }
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    if (activeChannelId) {
      fetchChannelMessages(activeChannelId);
    }
  }, [activeChannelId, fetchChannelMessages]);

  // Fetch group discussion messages
  const fetchGroupMessages = useCallback(async (channelId: string) => {
    if (!channelId) return;
    try {
      const res = await fetch(`/api/education/community/channels/${channelId}/messages`, {
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setGroupMessages(data.messages);
          return;
        }
      }
    } catch {
      // offline fallback
    }
    if (SEEDED_MESSAGES[channelId]) {
      setGroupMessages(SEEDED_MESSAGES[channelId]);
    } else {
      setGroupMessages([]);
    }
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    if (selectedGroupId && activeGroupSubTab === 'discussion') {
      fetchGroupMessages(groupDiscussionChannelId);
    }
  }, [selectedGroupId, activeGroupSubTab, groupDiscussionChannelId, fetchGroupMessages]);

  // Fetch study space chat messages
  const fetchSpaceMessages = useCallback(async (channelId: string) => {
    if (!channelId) return;
    try {
      const res = await fetch(`/api/education/community/channels/${channelId}/messages`, {
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setSpaceMessages(data.messages);
          return;
        }
      }
    } catch {
      // offline fallback
    }
    if (SEEDED_MESSAGES[channelId]) {
      setSpaceMessages(SEEDED_MESSAGES[channelId]);
    } else {
      setSpaceMessages([]);
    }
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    if (activeLiveSpaceId && spaceChannelId) {
      fetchSpaceMessages(spaceChannelId);
    }
  }, [activeLiveSpaceId, spaceChannelId, fetchSpaceMessages]);

  // SSE Stream for Real-time chat & Presence
  useEffect(() => {
    try {
      const sse = new EventSource('/api/education/community/events');
      sseRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'community.message.created') {
            const newMsg = payload.data as CommunityMessage;
            if (newMsg.channelId === activeChannelId && !newMsg.threadId) {
              setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
            }
            if (newMsg.channelId === groupDiscussionChannelId && !newMsg.threadId) {
              setGroupMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
            }
            if (newMsg.channelId === spaceChannelId && !newMsg.threadId) {
              setSpaceMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
            }
          } else if (payload.type === 'community.reaction.updated') {
            const { messageId, reactions } = payload.data;
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
            setGroupMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
            setSpaceMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
          } else if (payload.type === 'study_group.member.joined') {
            const { groupId, memberUserIds } = payload.data;
            setStudyGroups((prev) =>
              prev.map((g) => (g.id === groupId ? { ...g, memberUserIds } : g))
            );
          } else if (payload.type === 'study_group.member.left') {
            const { groupId, memberUserIds } = payload.data;
            setStudyGroups((prev) =>
              prev.map((g) => (g.id === groupId ? { ...g, memberUserIds } : g))
            );
          } else if (payload.type === 'study_space.created') {
            const newSp = payload.data;
            setStudySpaces((prev) => [newSp, ...prev.filter((s) => s.id !== newSp.id)]);
          } else if (payload.type === 'study_space.ended') {
            const endedSp = payload.data;
            setStudySpaces((prev) =>
              prev.map((s) => (s.id === endedSp.id ? { ...s, status: 'CONCLUDED', activeCount: 0, participants: [] } : s))
            );
          } else if (payload.type === 'study_space.member.joined') {
            const { spaceId, participantUserIds, userId } = payload.data;
            setStudySpaces((prev) =>
              prev.map((s) => {
                if (s.id === spaceId) {
                  const participants = s.participants ? [...s.participants] : [];
                  if (!participants.some((p) => p.id === userId)) {
                    participants.push({
                      id: userId,
                      name: userId === currentUser.id ? currentUser.displayName : 'Cadet',
                      role: 'student',
                      isSpeaking: false,
                      audioEnabled: true,
                      videoEnabled: false,
                      isHandRaised: false
                    });
                  }
                  return { ...s, participantUserIds, participants, activeCount: participants.length };
                }
                return s;
              })
            );
          } else if (payload.type === 'study_space.member.left') {
            const { spaceId, participantUserIds, userId } = payload.data;
            setStudySpaces((prev) =>
              prev.map((s) => {
                if (s.id === spaceId) {
                  const participants = (s.participants || []).filter((p) => p.id !== userId);
                  return { ...s, participantUserIds, participants, activeCount: participants.length };
                }
                return s;
              })
            );
          } else if (payload.type === 'study_space.participant.updated') {
            const { spaceId, userId, participant } = payload.data;
            setStudySpaces((prev) =>
              prev.map((s) => {
                if (s.id === spaceId) {
                  const participants = (s.participants || []).map((p) =>
                    p.id === userId ? { ...p, ...participant } : p
                  );
                  return { ...s, participants };
                }
                return s;
              })
            );
          }
        } catch {
          // ignore parse errors
        }
      };

      return () => {
        sse.close();
      };
    } catch {
      // SSE unsupported or offline
    }
  }, [activeChannelId, groupDiscussionChannelId, spaceChannelId, currentUser.id, currentUser.displayName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    groupMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);

  useEffect(() => {
    spaceMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [spaceMessages]);

  // Handlers for Study Group Join / Leave
  const handleJoinGroup = async (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Optimistic UI update
    setStudyGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, memberUserIds: Array.from(new Set([...g.memberUserIds, currentUser.id])) }
          : g
      )
    );

    try {
      const res = await fetch(`/api/education/community/study-groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.studyGroup) {
          setStudyGroups((prev) => prev.map((g) => (g.id === groupId ? data.studyGroup : g)));
        }
      }
    } catch (err) {
      console.warn('Network join failed:', err);
    }
  };

  const handleLeaveGroup = async (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Optimistic UI update
    setStudyGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, memberUserIds: g.memberUserIds.filter((id) => id !== currentUser.id) }
          : g
      )
    );

    try {
      const res = await fetch(`/api/education/community/study-groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.studyGroup) {
          setStudyGroups((prev) => prev.map((g) => (g.id === groupId ? data.studyGroup : g)));
        }
      }
    } catch (err) {
      console.warn('Network leave failed:', err);
    }
  };

  // Handlers for Study Spaces (Synchronous Live Cockpit)
  const handleEnterSpace = async (spaceId: string, groupId?: string) => {
    if (groupId) setSelectedGroupId(groupId);
    setActiveLiveSpaceId(spaceId);

    try {
      const res = await fetch(`/api/education/community/study-spaces/${spaceId}/join`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.studySpace) {
          setStudySpaces((prev) => prev.map((s) => (s.id === spaceId ? data.studySpace : s)));
        }
      }
    } catch (err) {
      console.warn('Network join space failed:', err);
    }
  };

  const handleLeaveSpace = async () => {
    const spaceId = activeLiveSpaceId;
    setActiveLiveSpaceId(null);
    if (!spaceId) return;

    try {
      const res = await fetch(`/api/education/community/study-spaces/${spaceId}/leave`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.studySpace) {
          setStudySpaces((prev) => prev.map((s) => (s.id === spaceId ? data.studySpace : s)));
        }
      }
    } catch (err) {
      console.warn('Network leave space failed:', err);
    }
  };

  const handleEndSpace = async () => {
    const spaceId = activeLiveSpaceId;
    if (!spaceId) return;
    setActiveLiveSpaceId(null);

    try {
      const res = await fetch(`/api/education/community/study-spaces/${spaceId}/end`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.studySpace) {
          setStudySpaces((prev) => prev.map((s) => (s.id === spaceId ? data.studySpace : s)));
        }
      }
    } catch (err) {
      console.warn('Network end space failed:', err);
    }
  };

  const handleToggleMic = async () => {
    const newMuted = !isMicMuted;
    setIsMicMuted(newMuted);

    if (activeLiveSpaceId) {
      try {
        await fetch(`/api/education/community/study-spaces/${activeLiveSpaceId}/participant-state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
            'x-user-role': currentUser.role
          },
          body: JSON.stringify({
            audioEnabled: !newMuted,
            isSpeaking: !newMuted
          })
        });
      } catch (err) {
        console.warn('Mic toggle sync failed:', err);
      }
    }
  };

  const handleToggleHandRaise = async () => {
    const newHand = !isHandRaised;
    setIsHandRaised(newHand);

    if (activeLiveSpaceId) {
      try {
        await fetch(`/api/education/community/study-spaces/${activeLiveSpaceId}/participant-state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
            'x-user-role': currentUser.role
          },
          body: JSON.stringify({
            isHandRaised: newHand
          })
        });
      } catch (err) {
        console.warn('Hand raise sync failed:', err);
      }
    }
  };

  // Handlers for Live Chat and Discussions
  const handleSendLiveChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveChatInput.trim() || !spaceChannelId) return;

    const content = liveChatInput.trim();
    setLiveChatInput('');

    const optimisticMsg: CommunityMessage = {
      id: `msg-live-${Date.now()}`,
      communityId: 'comm-stark-academy',
      channelId: spaceChannelId,
      schoolId: 'inst-stark-academy',
      senderUserId: currentUser.id,
      senderName: currentUser.displayName,
      senderRole: currentUser.role,
      content,
      reactions: [],
      attachments: [],
      mentions: [],
      replyCount: 0,
      isPinned: false,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSpaceMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/education/community/channels/${spaceChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setSpaceMessages((prev) =>
            prev.map((m) => (m.id === optimisticMsg.id ? data.message : m))
          );
        }
      }
    } catch (err) {
      console.warn('Failed to send live chat message:', err);
    }
  };

  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupDiscussionInput.trim() || !groupDiscussionChannelId) return;

    const content = groupDiscussionInput.trim();
    setGroupDiscussionInput('');

    const optimisticMsg: CommunityMessage = {
      id: `msg-group-${Date.now()}`,
      communityId: 'comm-stark-academy',
      channelId: groupDiscussionChannelId,
      schoolId: 'inst-stark-academy',
      senderUserId: currentUser.id,
      senderName: currentUser.displayName,
      senderRole: currentUser.role,
      content,
      reactions: [],
      attachments: [],
      mentions: [],
      replyCount: 0,
      isPinned: false,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setGroupMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/education/community/channels/${groupDiscussionChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setGroupMessages((prev) =>
            prev.map((m) => (m.id === optimisticMsg.id ? data.message : m))
          );
        }
      }
    } catch (err) {
      console.warn('Failed to send group message:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim() || !activeChannelId) return;

    const content = inputContent.trim();
    setInputContent('');

    const optimisticMsg: CommunityMessage = {
      id: `msg-${Date.now()}`,
      communityId: 'comm-stark-academy',
      channelId: activeChannelId,
      schoolId: 'inst-stark-academy',
      senderUserId: currentUser.id,
      senderName: currentUser.displayName,
      senderRole: currentUser.role,
      content,
      reactions: [],
      attachments: stagedAttachments,
      mentions: [],
      replyCount: 0,
      isPinned: false,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setStagedAttachments([]);

    try {
      const res = await fetch(`/api/education/community/channels/${activeChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ content, attachments: stagedAttachments })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticMsg.id ? data.message : m))
          );
        }
      }
    } catch (err) {
      console.warn('Failed to send channel message:', err);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    const updater = (list: CommunityMessage[]) =>
      list.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions?.find((r) => r.emoji === emoji);
        let nextReactions = [...(m.reactions || [])];
        if (existing) {
          if (existing.userIds.includes(currentUser.id)) {
            nextReactions = nextReactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - 1, userIds: r.userIds.filter((u) => u !== currentUser.id) }
                  : r
              )
              .filter((r) => r.count > 0);
          } else {
            nextReactions = nextReactions.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, userIds: [...r.userIds, currentUser.id] }
                : r
            );
          }
        } else {
          nextReactions.push({ emoji, count: 1, userIds: [currentUser.id] });
        }
        return { ...m, reactions: nextReactions };
      });

    setMessages(updater);
    setGroupMessages(updater);
    setSpaceMessages(updater);

    try {
      await fetch(`/api/education/community/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ emoji })
      });
    } catch (err) {
      console.warn('Reaction update failed:', err);
    }
  };

  const handleCreateStudyGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const selectedClass = classes.find((c) => c.id === newGroupClassId);
      const res = await fetch('/api/education/community/study-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || 'Peer collaboration & problem solving',
          subject: selectedClass?.name || 'General Academic',
          courseCode: selectedClass?.code || 'GEN-101',
          classId: newGroupClassId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.studyGroup) {
          setStudyGroups((prev) => [data.studyGroup, ...prev]);
          setSelectedGroupId(data.studyGroup.id);
        }
      }
    } catch (err) {
      console.warn('Create study group failed:', err);
    } finally {
      setIsCreateGroupModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
    }
  };

  const handleCreateStudySpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceTitle.trim()) return;

    try {
      const activeSg = activeGroup || studyGroups[0];
      const res = await fetch('/api/education/community/study-spaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({
          studyGroupId: activeSg?.id || 'sg-phys-quantum',
          title: newSpaceTitle.trim(),
          topic: newSpaceTopic.trim() || 'Collaborative problem solving and derivation.',
          courseCode: activeSg?.courseCode || 'PHYS-301',
          sharedProblemContext: 'Live interactive scratchpad workspace.'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.studySpace) {
          setStudySpaces((prev) => [data.studySpace, ...prev]);
          setActiveLiveSpaceId(data.studySpace.id);
        }
      }
    } catch (err) {
      console.warn('Create study space failed:', err);
    } finally {
      setIsCreateSpaceModalOpen(false);
      setNewSpaceTitle('');
      setNewSpaceTopic('');
    }
  };

  // Grouped Channels according to Information Architecture
  const categorizedChannels = useMemo(() => {
    const q = channelSearch.toLowerCase().trim();
    const filtered = channels.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || (c.topic && c.topic.toLowerCase().includes(q))
    );

    return {
      general: filtered.filter((c) => c.type === 'GENERAL' || c.type === 'ANNOUNCEMENTS'),
      questions: filtered.filter((c) => c.type === 'QUESTIONS'),
      resources: filtered.filter((c) => c.type === 'RESOURCES'),
      classes: filtered.filter((c) => c.type === 'CLASS'),
      subjects: filtered.filter((c) => c.type === 'SUBJECT')
    };
  }, [channels, channelSearch]);

  // Filtered Study Groups
  const filteredStudyGroups = useMemo(() => {
    const q = groupSearch.toLowerCase().trim();
    return studyGroups.filter((g) => {
      const matchesSearch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.courseCode.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (groupFilter === 'my') {
        return g.memberUserIds.includes(currentUser.id);
      }
      return true;
    });
  }, [studyGroups, groupSearch, groupFilter, currentUser.id]);

  // =========================================================================
  // VIEW: LIVE STUDY SPACE (Collaborative Synchronous Cockpit)
  // =========================================================================
  if (activeLiveSpaceId && activeLiveSpace) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto font-sans pb-12">
        {/* Contextual Breadcrumbs */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl glass-level-1">
          <div className="flex items-center gap-2 text-xs truncate min-w-0">
            <button
              onClick={handleLeaveSpace}
              className="flex items-center gap-1.5 text-neutral-300 hover:text-white transition-colors cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {selectedGroupId && activeGroup ? activeGroup.name : 'Community'}</span>
            </button>
            <span className="text-neutral-600">/</span>
            <span className="font-mono text-neutral-400">{activeLiveSpace.courseCode}</span>
            <span className="text-neutral-600">/</span>
            <span className="text-white font-semibold truncate">{activeLiveSpace.title}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="cyan" label="LIVE COLLABORATION" dot />
            {(activeLiveSpace.createdById === currentUser.id || currentUser.role === 'teacher' || currentUser.role === 'principal') && (
              <Button
                size="sm"
                variant="danger"
                onClick={handleEndSpace}
              >
                End Space
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLeaveSpace}
              className="text-neutral-300 hover:text-white"
            >
              Leave Space
            </Button>
          </div>
        </div>

        {/* Live Space Cockpit Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[580px]">
          {/* Left Panel (8 cols): Shared Collaborative Problem & Whiteboard Notes */}
          <div className="lg:col-span-8 space-y-4">
            {/* Live Capability Bar */}
            <div className="p-4 rounded-xl glass-level-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-semibold text-white">
                    {activeLiveSpace.participants.length} Active Cadets
                  </span>
                </div>
                <span className="text-neutral-600 hidden sm:inline">·</span>
                <div className="flex -space-x-1.5">
                  {activeLiveSpace.participants.map((p) => (
                    <div key={p.id} className="relative" title={`${p.name} (${p.role})`}>
                      <Avatar name={p.name} size="sm" />
                      {p.isSpeaking && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-neutral-900 animate-pulse" />
                      )}
                      {p.isHandRaised && (
                        <span className="absolute -top-1.5 -right-1.5 text-xs leading-none bg-neutral-900 rounded-full px-0.5 shadow-sm border border-amber-400/50" title="Hand Raised">
                          ✋
                        </span>
                      )}
                      {p.audioEnabled === false && !p.isSpeaking && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 border border-neutral-900" title="Muted" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Presence Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMic}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isMicMuted
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  }`}
                  title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isMicMuted ? 'Muted' : 'Voice Active'}</span>
                </button>

                <button
                  onClick={handleToggleHandRaise}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isHandRaised
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200'
                      : 'bg-white/[0.05] border border-white/[0.1] text-neutral-300 hover:text-white'
                  }`}
                  title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                >
                  <Hand className="w-3.5 h-3.5" />
                  <span>{isHandRaised ? 'Hand Raised ✋' : 'Raise Hand'}</span>
                </button>

                <button
                  onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isVideoEnabled
                      ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200'
                      : 'bg-white/[0.05] border border-white/[0.1] text-neutral-300 hover:text-white'
                  }`}
                  title={isVideoEnabled ? 'Disable Camera' : 'Enable Camera'}
                >
                  {isVideoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  <span>{isVideoEnabled ? 'Cam Live' : 'Cam Off'}</span>
                </button>

                <button
                  onClick={() => setIsScreenSharing(!isScreenSharing)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isScreenSharing
                      ? 'bg-purple-500/20 border border-purple-500/40 text-purple-200'
                      : 'bg-white/[0.05] border border-white/[0.1] text-neutral-300 hover:text-white'
                  }`}
                  title="Share Screen"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Screen</span>
                </button>
              </div>
            </div>

            {/* Collaborative Board & Problem Focus Canvas */}
            <GlassCard level="lesson" highlight className="p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-cyan-300 font-semibold uppercase tracking-wider">
                  Active Study Focus
                </span>
                <span className="text-neutral-400 text-xs font-mono">Synced Live</span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">{activeLiveSpace.title}</h3>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{activeLiveSpace.topic}</p>
              </div>

              {/* Shared Academic Problem Statement Context */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
                  <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Problem Context & Objectives</span>
                </div>
                <div className="text-xs text-neutral-200 font-mono leading-relaxed bg-black/30 p-2.5 rounded-lg border border-white/[0.04]">
                  {activeLiveSpace.sharedProblemContext}
                </div>
              </div>

              {/* Shared Formula Scratchpad */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span className="font-medium flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Collaborative Whiteboard Formulas</span>
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">LaTeX / Matrix Sync</span>
                </div>
                <pre className="text-xs font-mono text-cyan-100 bg-[#060912]/80 p-3.5 rounded-xl border border-white/[0.08] overflow-x-auto leading-relaxed shadow-inner">
                  {activeLiveSpace.formulaNotes}
                </pre>
              </div>
            </GlassCard>
          </div>

          {/* Right Panel (4 cols): Live Room Chat & Instant Discourse */}
          <div className="lg:col-span-4 flex flex-col h-full rounded-2xl glass-level-2 overflow-hidden">
            <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>Live Space Discourse</span>
              </div>
              <span className="text-[11px] font-mono text-cyan-300 font-semibold">Realtime Sync</span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[460px] custom-scrollbar text-xs">
              <div className="text-[11px] text-center text-neutral-400 py-1 font-mono border-b border-white/[0.04]">
                Session initialized · Encryption & RBAC active
              </div>

              {spaceMessages.length === 0 ? (
                <div className="text-center py-10 text-neutral-400 text-xs font-mono">
                  No discourse yet in this space. Post a step or question!
                </div>
              ) : (
                spaceMessages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${msg.senderUserId === currentUser.id ? 'text-white' : msg.senderRole === 'teacher' ? 'text-emerald-300' : 'text-cyan-300'}`}>
                        {msg.senderName}
                      </span>
                      <span className="text-neutral-400 font-mono text-[10px]">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`p-2.5 rounded-lg border text-neutral-200 ${msg.senderUserId === currentUser.id ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-white/[0.04] border-white/[0.06]'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={spaceMessagesEndRef} />
            </div>

            {/* Live Chat Input */}
            <div className="p-3 border-t border-white/[0.08] bg-black/20">
              <form
                onSubmit={handleSendLiveChatMessage}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Share a thought, step, or theorem..."
                  value={liveChatInput}
                  onChange={(e) => setLiveChatInput(e.target.value)}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-cyan-500/40 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus-ring"
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: STUDY GROUP CONTAINER (Group Details & Subtabs)
  // =========================================================================
  if (selectedGroupId && activeGroup) {
    const groupSpace = activeSpaces.find((s) => s.groupId === activeGroup.id);
    const isGroupMember = activeGroup.memberUserIds.includes(currentUser.id);
    const isGroupOwner = activeGroup.ownerUserId === currentUser.id;

    return (
      <div className="space-y-4 max-w-7xl mx-auto font-sans pb-12">
        {/* Contextual Breadcrumbs */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl glass-level-1">
          <div className="flex items-center gap-2 text-xs truncate min-w-0">
            <button
              onClick={() => setSelectedGroupId(null)}
              className="flex items-center gap-1.5 text-neutral-300 hover:text-white transition-colors cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Study Groups</span>
            </button>
            <span className="text-neutral-600">/</span>
            <span className="font-mono text-neutral-400">{activeGroup.courseCode}</span>
            <span className="text-neutral-600">/</span>
            <span className="text-white font-semibold truncate">{activeGroup.name}</span>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => handleEnterSpace(groupSpace?.id || 'space-quant-01', activeGroup.id)}
            icon={<Radio className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />}
          >
            Enter Live Study Space
          </Button>
        </div>

        {/* Group Header Card */}
        <GlassCard level="2" highlight className="p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                <span className="text-cyan-300 font-semibold">{activeGroup.courseCode}</span>
                <span>·</span>
                <span>{activeGroup.subject}</span>
                <span>·</span>
                <span>Lead: {activeGroup.ownerName}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{activeGroup.name}</h1>
              <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">{activeGroup.description}</p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <span className="text-xs font-mono text-neutral-400 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                {activeGroup.memberUserIds.length} Registered Cadets
              </span>
              {isGroupMember ? (
                <div className="flex items-center gap-2">
                  <Badge variant="cyan" label={isGroupOwner ? 'Cohort Lead' : 'Enrolled Member'} dot />
                  {!isGroupOwner && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleLeaveGroup(activeGroup.id, e)}
                      className="text-neutral-400 hover:text-rose-300"
                    >
                      Leave Cohort
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={(e) => handleJoinGroup(activeGroup.id, e)}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Join Cohort
                </Button>
              )}
            </div>
          </div>

          {/* Group Sub-Navigation Tabs */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06] overflow-x-auto no-scrollbar">
            {[
              { id: 'discussion', label: 'Discussion Channel', icon: MessageSquare },
              { id: 'space', label: 'Live Study Space', icon: Radio },
              { id: 'resources', label: 'Shared Resources', icon: Bookmark },
              { id: 'members', label: 'Cadet Roster', icon: Users },
              { id: 'sessions', label: 'Upcoming Sessions', icon: Calendar }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeGroupSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveGroupSubTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white/[0.09] text-white font-semibold border border-white/[0.14] shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-neutral-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Sub-Tab Content */}
        {activeGroupSubTab === 'discussion' && (
          <div className="p-5 rounded-2xl glass-level-2 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="font-semibold text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-cyan-400" />
                <span>#{activeGroup.courseCode.toLowerCase()}-study-discussion</span>
              </div>
              <span className="text-neutral-400 font-mono text-[11px]">Realtime Peer Stream</span>
            </div>

            <div className="p-4 rounded-xl bg-black/20 border border-white/[0.06] space-y-3 min-h-[260px] max-h-[440px] overflow-y-auto custom-scrollbar">
              {groupMessages.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-xs font-mono">
                  No discourse yet in #{activeGroup.name}. Post the first academic query or problem step!
                </div>
              ) : (
                groupMessages.map((msg) => (
                  <div key={msg.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <Avatar name={msg.senderName} size="sm" />
                        <span className={`font-semibold ${msg.senderUserId === currentUser.id ? 'text-white' : msg.senderRole === 'teacher' ? 'text-emerald-300' : 'text-cyan-300'}`}>
                          {msg.senderName} {msg.senderUserId === currentUser.id ? '(You)' : ''}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono uppercase">{msg.senderRole}</span>
                      </div>
                      <span className="text-neutral-400 font-mono text-[10px]">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`p-3 rounded-xl border text-neutral-200 leading-relaxed text-xs ${msg.senderUserId === currentUser.id ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="flex items-center gap-1">
                        {msg.reactions && msg.reactions.map((r) => {
                          const hasReacted = r.userIds.includes(currentUser.id);
                          return (
                            <button
                              key={r.emoji}
                              onClick={() => handleToggleReaction(msg.id, r.emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono cursor-pointer transition-all ${
                                hasReacted
                                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                                  : 'bg-white/[0.04] text-neutral-400 hover:text-white border border-white/[0.08]'
                              }`}
                            >
                              <span>{r.emoji}</span>
                              <span>{r.count}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                        {['👍', '💡', '🚀', '⚛️'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="hover:scale-125 transition-transform text-xs cursor-pointer p-0.5"
                            title={`React ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={groupMessagesEndRef} />
            </div>

            <form onSubmit={handleSendGroupMessage} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Message #${activeGroup.courseCode.toLowerCase()}-study-discussion...`}
                value={groupDiscussionInput}
                onChange={(e) => setGroupDiscussionInput(e.target.value)}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-cyan-500/40 rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 focus-ring"
              />
              <Button size="sm" variant="primary" type="submit" icon={<Send className="w-3.5 h-3.5" />}>
                Send
              </Button>
            </form>
          </div>
        )}

        {activeGroupSubTab === 'space' && (
          <GlassCard level="lesson" className="p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="cyan" label={groupSpace ? 'ACTIVE STUDY SPACE' : 'SYNCHRONOUS SPACE'} dot={!!groupSpace} />
              <span className="text-xs font-mono text-neutral-400">Audio/Whiteboard Enabled</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{groupSpace?.title || `${activeGroup.name} Collaboration Room`}</h3>
              <p className="text-xs text-neutral-300 mt-1">
                {groupSpace ? `${groupSpace.activeCount} cadets currently studying in this group space.` : 'No active session in progress. Launch a group study space!'}
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => handleEnterSpace(groupSpace?.id || 'space-quant-01', activeGroup.id)}
              icon={<Radio className="w-4 h-4 text-cyan-300 animate-pulse" />}
            >
              {groupSpace ? 'Join Synchronous Study Space' : 'Launch Group Study Space'}
            </Button>
          </GlassCard>
        )}

        {activeGroupSubTab === 'resources' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl glass-level-2 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Bookmark className="w-4 h-4 text-cyan-400" />
                <span>Ladder Operator Proof Sheet (PDF)</span>
              </div>
              <p className="text-xs text-neutral-400">Derivation of ground state zero-point energy and commutator algebra.</p>
            </div>
            <div className="p-4 rounded-xl glass-level-2 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Problem Set 4 Solutions Guide</span>
              </div>
              <p className="text-xs text-neutral-400">Step-by-step matrix element evaluations for ⟨n|x|m⟩.</p>
            </div>
          </div>
        )}

        {activeGroupSubTab === 'members' && (
          <div className="p-4 rounded-xl glass-level-2 space-y-3">
            <div className="text-xs font-semibold text-white">Enrolled Cadets ({activeGroup.memberUserIds.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['Alex Chen (You)', 'Marcus Bell', 'Elena Rostov', 'Dr. Sarah (Supervisor)'].map((name, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <Avatar name={name} size="sm" />
                  <span className="text-xs text-neutral-200">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeGroupSubTab === 'sessions' && (
          <div className="p-4 rounded-xl glass-level-2 space-y-3">
            <div className="text-xs font-semibold text-white">Scheduled Review Sessions</div>
            <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white">Midterm Exam Preparation Jam</div>
                <div className="text-[11px] text-neutral-400 font-mono">Friday · 04:00 PM EST · Study Space 1</div>
              </div>
              <Badge variant="neutral" label="Scheduled" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MAIN COMMUNITY HUB: 4-Tier Hierarchical Ecosystem
  // =========================================================================
  return (
    <div className="space-y-5 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Academic Header & Top Progressive Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl glass-level-1">
        <div className="space-y-0.5 min-w-0">
          <div className="text-xs font-mono text-neutral-400 tracking-wider uppercase font-medium flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>Academic Communication Ecosystem</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Campus Community
          </h1>
        </div>

        {/* 4 Primary Tiers: Overview, Channels, Study Groups, Study Spaces */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: Sparkles },
            { id: 'channels', label: 'Channels', icon: Hash, badge: channels.length },
            { id: 'groups', label: 'Study Groups', icon: Users, badge: studyGroups.length },
            { id: 'spaces', label: 'Study Spaces', icon: Radio, badge: activeSpaces.length, pulse: true }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedGroupId(null);
                  setActiveLiveSpaceId(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white/[0.09] text-white font-semibold border border-white/[0.14] shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-neutral-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] font-mono tabular-nums px-1 rounded ${
                    isActive ? 'bg-cyan-500/20 text-cyan-200' : 'text-neutral-500'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                {tab.pulse && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. OVERVIEW TAB: Progressive Clean Front Area                          */}
      {/* ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* SECTION 1: Recent Activity & Administrative Announcements */}
          {announcements.length > 0 && (
            <div className="p-4 rounded-2xl glass-level-2 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-amber-300" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-amber-400 uppercase font-semibold">Recent Directive</span>
                    <span className="text-neutral-600">·</span>
                    <span className="text-[11px] text-neutral-400">{announcements[0].authorName}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate">{announcements[0].title}</h3>
                  <p className="text-xs text-neutral-300 line-clamp-1">{announcements[0].body}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveChannelId('chan-school-announcements');
                  setActiveTab('channels');
                }}
                className="text-xs text-amber-300 hover:text-white flex items-center gap-1 font-medium shrink-0 cursor-pointer"
              >
                <span>Read Directive</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* SECTION 2: Active Now Study Spaces (Immediate Live Context) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h2 className="text-sm font-semibold text-white">Active Now Study Spaces ({activeSpaces.length})</h2>
              </div>
              <button
                onClick={() => setActiveTab('spaces')}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View All Spaces</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSpaces.map((space) => (
                <div
                  key={space.id}
                  className="p-5 rounded-2xl glass-lesson-card space-y-3.5 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-cyan-300 font-semibold">{space.courseCode} · {space.groupName}</span>
                    <Badge variant="cyan" label={`${space.activeCount} CADETS LIVE`} dot />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{space.title}</h3>
                    <p className="text-xs text-neutral-300 mt-1 line-clamp-2 leading-relaxed">{space.topic}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Started {space.startedAt}
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleEnterSpace(space.id, space.groupId)}
                      icon={<Radio className="w-3.5 h-3.5 text-cyan-300" />}
                    >
                      Join Study Space
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: Your Study Groups */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">Your Study Groups</h2>
              </div>
              <button
                onClick={() => setActiveTab('groups')}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Browse All Groups</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {studyGroups.slice(0, 3).map((group) => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className="p-4 rounded-xl glass-schedule-card cursor-pointer group space-y-2 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-neutral-200">{group.courseCode}</span>
                    <span className="text-[11px] font-mono text-neutral-400">{group.memberUserIds.length} members</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-cyan-200 transition-colors truncate">
                    {group.name}
                  </h3>
                  <p className="text-xs text-neutral-400 line-clamp-2">{group.description}</p>
                  <div className="pt-1 flex items-center gap-1 text-[11px] text-cyan-400 font-medium">
                    <span>Enter Hub</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: Your Conversations (Recent Discussions) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-neutral-300" />
                <h2 className="text-sm font-semibold text-white">Your Academic Conversations</h2>
              </div>
              <button
                onClick={() => setActiveTab('channels')}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>All Channels</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {channels.slice(0, 3).map((chan) => (
                <div
                  key={chan.id}
                  onClick={() => {
                    setActiveChannelId(chan.id);
                    setActiveTab('channels');
                  }}
                  className="p-3.5 rounded-xl glass-schedule-card flex items-center justify-between gap-3 cursor-pointer group hover:border-white/[0.14] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Hash className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white group-hover:text-cyan-200 transition-colors truncate">
                          #{chan.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono uppercase">{chan.type}</span>
                      </div>
                      <p className="text-xs text-neutral-400 truncate">{chan.topic}</p>
                    </div>
                  </div>

                  <span className="text-xs text-neutral-400 group-hover:text-white shrink-0 font-medium flex items-center gap-1">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5: Discover (Explore Emerging Cohorts & Shared Resources) */}
          <div className="p-5 rounded-2xl glass-level-2 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-semibold uppercase">
                <Compass className="w-3.5 h-3.5" />
                <span>Discover Campus Ecosystem</span>
              </div>
              <h3 className="text-sm font-semibold text-white">Find new study partners or form an ad-hoc problem room</h3>
              <p className="text-xs text-neutral-400">Join interdisciplinary cohorts across Quantum Electrodynamics, Stokes Manifolds, and Distributed Systems.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setGroupFilter('discover');
                  setActiveTab('groups');
                }}
              >
                Discover Groups
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsCreateGroupModalOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Form Cohort
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. CHANNELS TAB: 5-Tier Hierarchical Stream                            */}
      {/* ===================================================================== */}
      {activeTab === 'channels' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 rounded-2xl glass-level-1 overflow-hidden min-h-[600px]">
          {/* Channels Hierarchy Column (4 cols) */}
          <div className="md:col-span-4 p-3.5 border-r border-white/[0.08] flex flex-col gap-4">
            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search channels..."
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-cyan-500/40 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus-ring"
              />
            </div>

            {/* Hierarchical Categorized List */}
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
              {/* Category: General */}
              {categorizedChannels.general.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 px-2">
                    General
                  </div>
                  {categorizedChannels.general.map((chan) => {
                    const isActive = chan.id === activeChannelId;
                    return (
                      <button
                        key={chan.id}
                        onClick={() => setActiveChannelId(chan.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-500/15 via-white/[0.08] to-white/[0.03] text-white font-semibold border border-cyan-500/30'
                            : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          {chan.type === 'ANNOUNCEMENTS' ? (
                            <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <Hash className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-300' : 'text-neutral-400'}`} />
                          )}
                          <span className="truncate">{chan.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Category: Questions */}
              {categorizedChannels.questions.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 px-2">
                    Questions & Help
                  </div>
                  {categorizedChannels.questions.map((chan) => {
                    const isActive = chan.id === activeChannelId;
                    return (
                      <button
                        key={chan.id}
                        onClick={() => setActiveChannelId(chan.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-500/15 via-white/[0.08] to-white/[0.03] text-white font-semibold border border-cyan-500/30'
                            : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <Hash className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-300' : 'text-neutral-400'}`} />
                          <span className="truncate">{chan.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Category: Resources */}
              {categorizedChannels.resources.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 px-2">
                    Resources & Handouts
                  </div>
                  {categorizedChannels.resources.map((chan) => {
                    const isActive = chan.id === activeChannelId;
                    return (
                      <button
                        key={chan.id}
                        onClick={() => setActiveChannelId(chan.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-500/15 via-white/[0.08] to-white/[0.03] text-white font-semibold border border-cyan-500/30'
                            : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <Bookmark className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-300' : 'text-neutral-400'}`} />
                          <span className="truncate">{chan.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Category: Classes */}
              {categorizedChannels.classes.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 px-2">
                    Classes
                  </div>
                  {categorizedChannels.classes.map((chan) => {
                    const isActive = chan.id === activeChannelId;
                    return (
                      <button
                        key={chan.id}
                        onClick={() => setActiveChannelId(chan.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-500/15 via-white/[0.08] to-white/[0.03] text-white font-semibold border border-cyan-500/30'
                            : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-300' : 'text-neutral-400'}`} />
                          <span className="truncate">{chan.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Category: Subjects */}
              {categorizedChannels.subjects.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 px-2">
                    Subjects
                  </div>
                  {categorizedChannels.subjects.map((chan) => {
                    const isActive = chan.id === activeChannelId;
                    return (
                      <button
                        key={chan.id}
                        onClick={() => setActiveChannelId(chan.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-500/15 via-white/[0.08] to-white/[0.03] text-white font-semibold border border-cyan-500/30'
                            : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <Hash className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-300' : 'text-neutral-400'}`} />
                          <span className="truncate">{chan.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Messages & Chat Stream (8 cols) */}
          <div className="md:col-span-8 flex flex-col h-full min-h-[580px]">
            {/* Channel Header */}
            <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white flex items-center gap-1.5 truncate">
                  <Hash className="w-4 h-4 text-cyan-400" />
                  <span>{channels.find((c) => c.id === activeChannelId)?.name || 'general'}</span>
                </div>
                <div className="text-[11px] text-neutral-400 truncate">
                  {channels.find((c) => c.id === activeChannelId)?.topic}
                </div>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[460px] custom-scrollbar text-xs">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-xs">
                  No discourse yet in this channel. Be the first to post!
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <Avatar name={msg.senderName} size="sm" />
                        <span className="font-semibold text-white">{msg.senderName}</span>
                        <span className="text-[10px] text-neutral-400 uppercase font-mono">{msg.senderRole}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-neutral-200 leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-3 border-t border-white/[0.08] bg-black/20">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Share notes, ask questions, or contribute..."
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-cyan-500/40 rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 focus-ring"
                />
                <Button size="sm" variant="primary" type="submit" icon={<Send className="w-3.5 h-3.5" />}>
                  Send
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. STUDY GROUPS TAB: My Groups & Discover Groups Directory            */}
      {/* ===================================================================== */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <button
                  onClick={() => setGroupFilter('my')}
                  className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                    groupFilter === 'my' ? 'bg-white/[0.09] text-white font-semibold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  My Groups ({studyGroups.filter((g) => g.memberUserIds.includes(currentUser.id)).length})
                </button>
                <button
                  onClick={() => setGroupFilter('discover')}
                  className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                    groupFilter === 'discover' ? 'bg-white/[0.09] text-white font-semibold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Discover Groups ({studyGroups.length})
                </button>
              </div>

              {/* Group Search Input */}
              <div className="relative hidden sm:block">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Filter groups..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder:text-neutral-500 focus-ring w-48"
                />
              </div>
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsCreateGroupModalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              New Study Group
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudyGroups.map((group) => {
              const isMember = group.memberUserIds.includes(currentUser.id);
              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className="p-5 rounded-2xl glass-level-2 hover:border-cyan-500/30 transition-all cursor-pointer group space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-cyan-300 font-semibold">{group.courseCode}</span>
                    <div className="flex items-center gap-1.5">
                      {isMember && <Badge variant="cyan" label="ENROLLED" />}
                      <span className="text-[11px] font-mono text-neutral-400">{group.memberUserIds.length} Cadets</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">
                      {group.name}
                    </h3>
                    <p className="text-xs text-neutral-300 mt-1 line-clamp-2 leading-relaxed">{group.description}</p>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-mono text-[11px]">Lead: {group.ownerName}</span>
                    <div className="flex items-center gap-2">
                      {!isMember && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => handleJoinGroup(group.id, e)}
                          icon={<Plus className="w-3 h-3" />}
                        >
                          Join Cohort
                        </Button>
                      )}
                      <span className="text-cyan-400 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Enter Hub <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. STUDY SPACES TAB: Active Now & Upcoming Spaces                      */}
      {/* ===================================================================== */}
      {activeTab === 'spaces' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl glass-level-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Synchronous Academic Study Spaces</h2>
              <p className="text-xs text-neutral-400">Live problem workspaces, peer whiteboard synchronization & discourse.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <button
                  onClick={() => setSpaceSubTab('active')}
                  className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                    spaceSubTab === 'active' ? 'bg-white/[0.09] text-white font-semibold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Active Now ({activeSpaces.length})
                </button>
                <button
                  onClick={() => setSpaceSubTab('upcoming')}
                  className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                    spaceSubTab === 'upcoming' ? 'bg-white/[0.09] text-white font-semibold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Upcoming ({upcomingSpaces.length})
                </button>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsCreateSpaceModalOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Create Space
              </Button>
            </div>
          </div>

          {spaceSubTab === 'active' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSpaces.map((space) => (
                <div key={space.id} className="p-5 rounded-2xl glass-lesson-card space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-cyan-300 font-semibold">{space.courseCode} · {space.groupName}</span>
                    <Badge variant="cyan" label={`${space.activeCount} CADETS COLLABORATING`} dot />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{space.title}</h3>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{space.topic}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/20 border border-white/[0.06] text-xs font-mono text-neutral-200">
                    {space.sharedProblemContext}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-xs font-mono text-neutral-400">{space.startedAt}</span>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleEnterSpace(space.id, space.groupId)}
                      icon={<Radio className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />}
                    >
                      Enter Live Space
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {spaceSubTab === 'upcoming' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingSpaces.map((space) => (
                <div key={space.id} className="p-5 rounded-2xl glass-schedule-card space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-neutral-300 font-semibold">{space.courseCode} · {space.groupName}</span>
                    <Badge variant="neutral" label="SCHEDULED" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{space.title}</h3>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{space.topic}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs font-mono text-neutral-300">
                    {space.sharedProblemContext}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-xs font-mono text-cyan-300 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {space.startedAt}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleEnterSpace(space.id, space.groupId)}
                    >
                      Set Reminder
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Study Group */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl glass-level-3 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Form New Peer Study Group</h3>
              <button
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudyGroup} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-medium">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Electrodynamics Vector Calculus Group"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus-ring"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium">Associated Course</label>
                <select
                  value={newGroupClassId}
                  onChange={(e) => setNewGroupClassId(e.target.value)}
                  className="w-full bg-[#121622] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus-ring"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.code} - {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium">Description & Goals</label>
                <textarea
                  placeholder="Review weekly problem sets, discuss commutator algebra..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus-ring h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" type="button" onClick={() => setIsCreateGroupModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Create Cohort
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Study Space */}
      {isCreateSpaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl glass-level-3 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Launch Synchronous Study Space</h3>
              <button
                onClick={() => setIsCreateSpaceModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudySpace} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-medium">Session Title</label>
                <input
                  type="text"
                  placeholder="e.g. Stokes Theorem Boundary Integral Review"
                  value={newSpaceTitle}
                  onChange={(e) => setNewSpaceTitle(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus-ring"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-medium">Topic & Problem Scope</label>
                <textarea
                  placeholder="Review problem 4 differential form integration..."
                  value={newSpaceTopic}
                  onChange={(e) => setNewSpaceTopic(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus-ring h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" type="button" onClick={() => setIsCreateSpaceModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Launch Space
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
