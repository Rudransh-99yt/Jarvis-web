import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EducationClass, EducationRole } from '../../../types/education.ts';
import type {
  CommunityChannel,
  CommunityMessage,
  CommunityThread,
  CommunityStudyGroup,
  CommunityAnnouncement,
  CommunityAttachment,
  CommunityReaction
} from '../../../types/community.ts';
import {
  Hash,
  Volume2,
  Bell,
  MessageSquare,
  Users,
  Pin,
  Smile,
  Reply,
  Edit2,
  Trash2,
  Plus,
  Search,
  BookOpen,
  Calendar,
  Send,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Layers,
  Radio,
  FileText,
  PlayCircle
} from 'lucide-react';

interface CommunityShellProps {
  classes: EducationClass[];
  currentRole: EducationRole;
  initialClassId?: string;
  onNavigateTab?: (tab: string, meta?: any) => void;
}

export const CommunityShell: React.FC<CommunityShellProps> = ({
  classes,
  currentRole,
  initialClassId,
  onNavigateTab
}) => {
  // State: Channels, Messages, Active Selection
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('chan-school-general');
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [studyGroups, setStudyGroups] = useState<CommunityStudyGroup[]>([]);
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);

  // Composer State
  const [inputContent, setInputContent] = useState<string>('');
  const [stagedAttachments, setStagedAttachments] = useState<CommunityAttachment[]>([]);
  const [isAttachingResource, setIsAttachingResource] = useState<boolean>(false);

  // Active Thread / Right Drawer State
  const [activeThreadRoot, setActiveThreadRoot] = useState<CommunityMessage | null>(null);
  const [threadReplies, setThreadReplies] = useState<CommunityMessage[]>([]);
  const [threadInputContent, setThreadInputContent] = useState<string>('');
  const [rightDrawerMode, setRightDrawerMode] = useState<'none' | 'thread' | 'pins' | 'study_group' | 'search'>('none');

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<{
    messages: CommunityMessage[];
    channels: CommunityChannel[];
    studyGroups: CommunityStudyGroup[];
  } | null>(null);

  // Modals
  const [isCreatingGroup, setIsCreatingGroup] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupDesc, setNewGroupDesc] = useState<string>('');
  const [newGroupClassId, setNewGroupClassId] = useState<string>(classes[0]?.id || 'class-phys-301');

  const [isCreatingAnn, setIsCreatingAnn] = useState<boolean>(false);
  const [newAnnTitle, setNewAnnTitle] = useState<string>('');
  const [newAnnBody, setNewAnnBody] = useState<string>('');
  const [newAnnPriority, setNewAnnPriority] = useState<'normal' | 'important' | 'urgent'>('normal');

  // Mobile Drawer Toggle
  const [isMobileRailOpen, setIsMobileRailOpen] = useState<boolean>(false);

  // Collapsed Sections
  const [collapsedClasses, setCollapsedClasses] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const currentUser = {
    id: currentRole === 'student' ? 'student-1' : currentRole === 'teacher' ? 'teacher-1' : 'principal-1',
    displayName: currentRole === 'student' ? 'Alex Mercer' : currentRole === 'teacher' ? 'Dr. Helen Cho' : 'Dean Stark',
    role: currentRole
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

  // 1. Load Channels, Announcements & Study Groups
  const fetchInitialData = useCallback(async () => {
    try {
      const [chanRes, annRes, sgRes] = await Promise.all([
        fetch('/api/education/community/channels', {
          headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
        }),
        fetch('/api/education/community/announcements', {
          headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
        }),
        fetch('/api/education/community/study-groups', {
          headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
        })
      ]);

      if (chanRes.ok) {
        const chanData = await chanRes.json();
        setChannels(chanData.channels || []);
        if (chanData.channels && chanData.channels.length > 0 && !activeChannelId) {
          setActiveChannelId(chanData.channels[0].id);
        }
      }
      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData.announcements || []);
      }
      if (sgRes.ok) {
        const sgData = await sgRes.json();
        setStudyGroups(sgData.studyGroups || []);
      }
    } catch (err) {
      console.error('Failed to load initial community data:', err);
    }
  }, [currentUser.id, currentUser.role, activeChannelId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // 2. Fetch Messages for Active Channel
  const fetchChannelMessages = useCallback(async (channelId: string) => {
    if (!channelId) return;
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/education/community/channels/${channelId}/messages`, {
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    if (activeChannelId) {
      fetchChannelMessages(activeChannelId);
    }
  }, [activeChannelId, fetchChannelMessages]);

  // 3. Setup Real-time SSE Stream
  useEffect(() => {
    const sse = new EventSource('/api/education/community/events');
    sseRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'community.message.created') {
          const newMsg = payload.data as CommunityMessage;
          if (newMsg.channelId === activeChannelId && !newMsg.threadId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          if (activeThreadRoot && newMsg.threadId === `thread-${activeThreadRoot.id}`) {
            setThreadReplies((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        } else if (payload.type === 'community.message.updated') {
          const updated = payload.data as CommunityMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        } else if (payload.type === 'community.message.deleted') {
          const { messageId } = payload.data;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, isDeleted: true, content: '*(This message was removed by moderator or author)*', attachments: [] }
                : m
            )
          );
        } else if (payload.type === 'community.reaction.updated') {
          const { messageId, reactions } = payload.data;
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
          );
        }
      } catch (err) {
        console.warn('SSE message parse error:', err);
      }
    };

    return () => {
      sse.close();
    };
  }, [activeChannelId, activeThreadRoot]);

  // 4. Scroll to bottom of message list on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handler: Send Message in Active Channel
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim() && stagedAttachments.length === 0) return;

    const content = inputContent.trim();
    const attachments = [...stagedAttachments];
    setInputContent('');
    setStagedAttachments([]);

    try {
      const res = await fetch(`/api/education/community/channels/${activeChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({
          content,
          attachments
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Handler: Open Thread Drawer
  const handleOpenThread = async (msg: CommunityMessage) => {
    setActiveThreadRoot(msg);
    setRightDrawerMode('thread');
    try {
      const res = await fetch(`/api/education/community/threads/thread-${msg.id}/messages`, {
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      });
      if (res.ok) {
        const data = await res.json();
        setThreadReplies(data.replies || []);
      }
    } catch (err) {
      console.error('Failed to load thread:', err);
    }
  };

  // Handler: Send Reply in Thread
  const handleSendThreadReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThreadRoot || !threadInputContent.trim()) return;

    const content = threadInputContent.trim();
    setThreadInputContent('');

    try {
      const res = await fetch(`/api/education/community/messages/${activeThreadRoot.id}/thread`, {
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
        setThreadReplies((prev) => [...prev, data.reply]);
        // Update root message reply count
        setMessages((prev) =>
          prev.map((m) =>
            m.id === activeThreadRoot.id
              ? { ...m, replyCount: m.replyCount + 1, latestReplyAt: new Date().toISOString() }
              : m
          )
        );
      }
    } catch (err) {
      console.error('Failed to send thread reply:', err);
    }
  };

  // Handler: Toggle Reaction on Message
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/education/community/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ emoji })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
        );
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  // Handler: Pin / Unpin Message
  const handleTogglePin = async (messageId: string) => {
    try {
      const res = await fetch(`/api/education/community/channels/${activeChannelId}/messages/${messageId}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        }
      });
      if (res.ok) {
        fetchChannelMessages(activeChannelId);
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // Handler: Delete Message
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to remove this message?')) return;
    try {
      await fetch(`/api/education/community/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        }
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Handler: Create Study Group
  const handleCreateStudyGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await fetch('/api/education/community/study-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
          classId: newGroupClassId
        })
      });

      if (res.ok) {
        setIsCreatingGroup(false);
        setNewGroupName('');
        setNewGroupDesc('');
        fetchInitialData();
      }
    } catch (err) {
      console.error('Failed to create study group:', err);
    }
  };

  // Handler: Create Announcement (Staff only)
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnBody.trim()) return;

    try {
      const res = await fetch('/api/education/community/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({
          title: newAnnTitle.trim(),
          body: newAnnBody.trim(),
          priority: newAnnPriority
        })
      });

      if (res.ok) {
        setIsCreatingAnn(false);
        setNewAnnTitle('');
        setNewAnnBody('');
        fetchInitialData();
        fetchChannelMessages(activeChannelId);
      }
    } catch (err) {
      console.error('Failed to create announcement:', err);
    }
  };

  // Handler: Search Community
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await fetch(`/api/education/community/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        setRightDrawerMode('search');
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  // Helper: Attach Academic Resource
  const handleAttachResource = (type: CommunityAttachment['resourceType'], id: string, title: string, context?: string) => {
    const newAtt: CommunityAttachment = {
      id: `att-${Date.now()}`,
      resourceType: type,
      resourceId: id,
      title,
      context
    };
    setStagedAttachments((prev) => [...prev, newAtt]);
    setIsAttachingResource(false);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] min-h-[600px] rounded-2xl border border-cyan-500/20 bg-[#080d16]/95 overflow-hidden shadow-2xl relative font-mono text-cyan-100 select-none">
      {/* =================================================================== */}
      {/* 1. LEFT RAIL: CHANNELS, GROUPS & ANNOUNCEMENTS                      */}
      {/* =================================================================== */}
      <div
        className={`w-64 sm:w-72 bg-black/70 border-r border-cyan-500/20 flex flex-col justify-between shrink-0 transition-all z-30 ${
          isMobileRailOpen ? 'fixed inset-y-0 left-0 shadow-2xl flex' : 'hidden md:flex'
        }`}
      >
        {/* Rail Top Brand */}
        <div className="p-3.5 border-b border-cyan-500/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xs">
              💬
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wider">Stark Community</div>
              <div className="text-[10px] text-cyan-400/60">Academic Network</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {(currentRole === 'teacher' || currentRole === 'principal') && (
              <button
                onClick={() => setIsCreatingAnn(true)}
                title="Create Announcement"
                className="p-1 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900 cursor-pointer text-xs"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsMobileRailOpen(false)}
              className="md:hidden p-1 text-cyan-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Channels Hierarchy Scroll Stream */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar text-xs">
          {/* SECTION: School-Wide Channels */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold text-cyan-400/50 px-2 tracking-wider">
              Campus Directives
            </div>
            {channels
              .filter((c) => !c.classId && !c.studyGroupId)
              .map((chan) => {
                const isActive = chan.id === activeChannelId;
                return (
                  <button
                    key={chan.id}
                    onClick={() => {
                      setActiveChannelId(chan.id);
                      setIsMobileRailOpen(false);
                      setRightDrawerMode('none');
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/20 text-white font-bold border border-cyan-400/40'
                        : 'text-cyan-300/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {chan.type === 'ANNOUNCEMENTS' ? (
                      <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Hash className="w-3.5 h-3.5 text-cyan-400/60 shrink-0" />
                    )}
                    <span className="truncate">{chan.name}</span>
                    {chan.pinnedMessageIds.length > 0 && (
                      <span className="ml-auto text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300">
                        {chan.pinnedMessageIds.length}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          {/* SECTION: Course Cohort Channels */}
          {classes.map((cls) => {
            const classChannels = channels.filter((c) => c.classId === cls.id && !c.studyGroupId);
            const isCollapsed = collapsedClasses[cls.id];

            return (
              <div key={cls.id} className="space-y-1">
                <button
                  onClick={() =>
                    setCollapsedClasses((prev) => ({ ...prev, [cls.id]: !prev[cls.id] }))
                  }
                  className="w-full flex items-center justify-between text-[10px] uppercase font-bold text-cyan-400/70 px-2 py-1 hover:text-cyan-200 cursor-pointer"
                >
                  <span className="truncate">
                    {cls.code} · {cls.name}
                  </span>
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {!isCollapsed && (
                  <div className="space-y-0.5 pl-1">
                    {classChannels.map((chan) => {
                      const isActive = chan.id === activeChannelId;
                      return (
                        <button
                          key={chan.id}
                          onClick={() => {
                            setActiveChannelId(chan.id);
                            setIsMobileRailOpen(false);
                            setRightDrawerMode('none');
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                            isActive
                              ? 'bg-cyan-500/20 text-white font-bold border border-cyan-400/40'
                              : 'text-cyan-300/70 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <Hash className="w-3.5 h-3.5 text-cyan-400/60 shrink-0" />
                          <span className="truncate">{chan.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* SECTION: Peer Study Groups */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-cyan-400/50 px-2 tracking-wider">
              <span>Study Groups</span>
              <button
                onClick={() => setIsCreatingGroup(true)}
                title="Create Study Group"
                className="hover:text-cyan-200 cursor-pointer text-cyan-400"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {studyGroups.map((sg) => {
              const sgChanId = sg.channelIds[0];
              const isActive = activeChannelId === sgChanId;
              return (
                <button
                  key={sg.id}
                  onClick={() => {
                    if (sgChanId) {
                      setActiveChannelId(sgChanId);
                      setIsMobileRailOpen(false);
                      setRightDrawerMode('study_group');
                    }
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 text-white font-bold border border-cyan-400/40'
                      : 'text-cyan-300/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{sg.name}</span>
                  </div>
                  <span className="text-[9px] text-cyan-400/60">{sg.memberUserIds.length}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current User Strip */}
        <div className="p-3 border-t border-cyan-500/15 bg-slate-950/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded-full bg-cyan-900/80 border border-cyan-400/40 flex items-center justify-center font-bold text-cyan-200 text-[10px] shrink-0">
              {currentUser.displayName[0]}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white text-xs truncate">{currentUser.displayName}</div>
              <div className="text-[9px] text-cyan-400/60 uppercase">{currentUser.role}</div>
            </div>
          </div>

          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. MAIN CONVERSATION PANE (DOMINANT WORKSPACE)                       */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col justify-between min-w-0 bg-[#060a12]/80">
        {/* Top Channel Header Bar */}
        <div className="p-3.5 border-b border-cyan-500/15 flex items-center justify-between gap-3 bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsMobileRailOpen(true)}
              className="md:hidden p-1 rounded hover:bg-cyan-500/10 text-cyan-400"
            >
              <Hash className="w-4 h-4" />
            </button>

            <Hash className="w-4 h-4 text-cyan-400 shrink-0 hidden md:block" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate flex items-center gap-2">
                {activeChannel?.name}
                {activeChannel?.type === 'ANNOUNCEMENTS' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
                    ANNOUNCEMENTS
                  </span>
                )}
              </h2>
              {activeChannel?.topic && (
                <p className="text-[11px] text-cyan-400/60 truncate hidden sm:block">
                  {activeChannel.topic}
                </p>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {activeChannel?.classId && onNavigateTab && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono">
                <button
                  onClick={() => onNavigateTab('lesson_workspace')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:text-white text-[10px] cursor-pointer"
                  title="Open active course lesson"
                >
                  <BookOpen className="w-3 h-3 text-cyan-400" />
                  <span>Lesson</span>
                </button>
                <button
                  onClick={() => onNavigateTab('assignments')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:text-white text-[10px] cursor-pointer"
                  title="View course assignments"
                >
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span>Assignments</span>
                </button>
              </div>
            )}

            {/* Search Input */}
            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Search community..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-36 lg:w-48 px-2.5 py-1 text-xs rounded-lg bg-black/40 border border-cyan-500/30 text-white placeholder:text-cyan-500/40 focus:outline-none focus:border-cyan-400"
              />
              <Search className="w-3 h-3 text-cyan-400 absolute right-2.5 top-2" />
            </div>

            {/* Pinned Messages Button */}
            {activeChannel?.pinnedMessageIds && activeChannel.pinnedMessageIds.length > 0 && (
              <button
                onClick={() =>
                  setRightDrawerMode((prev) => (prev === 'pins' ? 'none' : 'pins'))
                }
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs hover:bg-cyan-900/50 cursor-pointer"
              >
                <Pin className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px]">{activeChannel.pinnedMessageIds.length}</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-48 text-xs text-cyan-400/60">
              Loading channel messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <MessageSquare className="w-8 h-8 text-cyan-400/30 mx-auto" />
              <h3 className="text-xs font-bold text-white">Welcome to #{activeChannel?.name}</h3>
              <p className="text-[11px] text-cyan-400/60 max-w-sm mx-auto">
                This is the start of the #{activeChannel?.name} channel. Send a question, share a problem set, or reference course materials.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwner = msg.senderUserId === currentUser.id;
              const isStaff = currentUser.role === 'teacher' || currentUser.role === 'principal';

              return (
                <div
                  key={msg.id}
                  className={`group relative p-3 rounded-xl transition-all border ${
                    msg.isPinned
                      ? 'bg-amber-950/20 border-amber-500/30 shadow-lg'
                      : 'bg-black/30 border-cyan-500/10 hover:border-cyan-500/25'
                  }`}
                >
                  {/* Pinned Marker */}
                  {msg.isPinned && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 mb-1">
                      <Pin className="w-3 h-3" />
                      <span>PINNED NOTICE</span>
                    </div>
                  )}

                  {/* Message Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-cyan-950 border border-cyan-400/40 flex items-center justify-center text-[10px] font-bold text-cyan-200">
                        {msg.senderName[0]}
                      </div>
                      <span className="text-xs font-bold text-white">{msg.senderName}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          msg.senderRole === 'teacher'
                            ? 'bg-blue-950 text-blue-300 border border-blue-400/30'
                            : msg.senderRole === 'principal'
                            ? 'bg-amber-950 text-amber-300 border border-amber-400/30'
                            : 'bg-cyan-950 text-cyan-300'
                        }`}
                      >
                        {msg.senderRole}
                      </span>
                      <span className="text-[10px] text-cyan-400/40">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.isEdited && <span className="text-[9px] text-cyan-400/40">(edited)</span>}
                    </div>

                    {/* Floating Hover Action Bar */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-950/90 border border-cyan-500/30 px-1.5 py-0.5 rounded-lg">
                      <button
                        onClick={() => handleToggleReaction(msg.id, '👍')}
                        title="React Thumbs Up"
                        className="p-1 hover:text-cyan-200 text-cyan-400/70"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleToggleReaction(msg.id, '⚛️')}
                        title="React Atom"
                        className="p-1 hover:text-cyan-200 text-cyan-400/70"
                      >
                        ⚛️
                      </button>
                      <button
                        onClick={() => handleToggleReaction(msg.id, '💡')}
                        title="React Insight"
                        className="p-1 hover:text-cyan-200 text-cyan-400/70"
                      >
                        💡
                      </button>
                      <button
                        onClick={() => handleOpenThread(msg)}
                        title="Reply in Thread"
                        className="p-1 hover:text-cyan-200 text-cyan-400/70"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>

                      {isStaff && (
                        <button
                          onClick={() => handleTogglePin(msg.id)}
                          title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                          className="p-1 hover:text-amber-300 text-amber-400/70"
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {(isOwner || isStaff) && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          title="Delete message"
                          className="p-1 hover:text-rose-300 text-rose-400/70"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message Body Content */}
                  <div className="mt-1.5 text-xs text-cyan-100/90 whitespace-pre-line leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Academic Resource Reference Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/25 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {att.resourceType === 'class_session' ? (
                              <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
                            ) : att.resourceType === 'assignment' ? (
                              <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : att.resourceType === 'video' ? (
                              <PlayCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-white truncate block">{att.title}</span>
                              {att.context && (
                                <span className="text-[10px] text-cyan-400/60 truncate block">
                                  {att.context}
                                </span>
                              )}
                            </div>
                          </div>

                          {onNavigateTab && (
                            <button
                              onClick={() => {
                                if (att.resourceType === 'class_session') {
                                  onNavigateTab('teacher_prep');
                                } else if (att.resourceType === 'assignment') {
                                  onNavigateTab('assignments');
                                } else if (att.resourceType === 'video') {
                                  onNavigateTab('videos');
                                }
                              }}
                              className="flex items-center gap-1 text-[10px] text-cyan-300 hover:text-white px-2 py-0.5 rounded bg-cyan-900/40 border border-cyan-400/30 shrink-0"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reactions & Thread Reply Pills Footer */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1">
                    {msg.reactions.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => handleToggleReaction(msg.id, r.emoji)}
                        className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          r.userIds.includes(currentUser.id)
                            ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 font-bold'
                            : 'bg-black/40 border-cyan-500/20 text-cyan-400/70 hover:bg-white/5'
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span>{r.count}</span>
                      </button>
                    ))}

                    {/* Thread Counter Pill */}
                    {msg.replyCount > 0 && (
                      <button
                        onClick={() => handleOpenThread(msg)}
                        className="flex items-center gap-1 text-[10px] font-bold text-cyan-300 hover:text-white px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 transition-all cursor-pointer ml-auto"
                      >
                        <Reply className="w-3 h-3" />
                        <span>{msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer */}
        <div className="p-3 border-t border-cyan-500/15 bg-slate-950/80">
          {/* Staged Attachments Preview */}
          {stagedAttachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {stagedAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-400/40 text-xs text-cyan-200"
                >
                  <span className="font-bold truncate max-w-[200px]">{att.title}</span>
                  <button
                    onClick={() => setStagedAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-rose-400 hover:text-rose-200"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder={`Message #${activeChannel?.name || 'channel'}... (type @ to mention, reference resources)`}
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-black/50 border border-cyan-500/30 text-white placeholder:text-cyan-500/40 focus:outline-none focus:border-cyan-400"
              />

              {/* Resource Attachment Picker Button */}
              <button
                type="button"
                onClick={() => setIsAttachingResource(!isAttachingResource)}
                title="Reference Academic Resource"
                className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50 cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                type="submit"
                disabled={!inputContent.trim() && stagedAttachments.length === 0}
                className="p-2 rounded-xl bg-gradient-to-r from-cyan-500/30 to-blue-600/30 border border-cyan-400/50 text-white hover:from-cyan-500/40 hover:to-blue-600/40 disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-4 h-4 text-cyan-300" />
              </button>
            </div>

            {/* Attach Resource Popover */}
            {isAttachingResource && (
              <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/40 shadow-2xl space-y-2 animate-fade-in text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300 uppercase">
                  <span>Reference Academic Resource</span>
                  <button onClick={() => setIsAttachingResource(false)} className="text-cyan-400/60 hover:text-white">
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleAttachResource(
                        'class_session',
                        'session-phys-101',
                        'ClassSession #101: Electrostatics',
                        'Prepared Class Session Materials'
                      )
                    }
                    className="p-2 rounded-lg bg-black/40 border border-cyan-500/20 hover:border-cyan-400 text-left"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300 mb-1" />
                    <div className="font-bold text-white truncate">Session #101: Electrostatics</div>
                    <div className="text-[10px] text-cyan-400/60">ClassSession Deck</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleAttachResource(
                        'assignment',
                        'asg-1',
                        'Homework Problem Set #1: Electrostatics',
                        'Due in 3 days'
                      )
                    }
                    className="p-2 rounded-lg bg-black/40 border border-cyan-500/20 hover:border-cyan-400 text-left"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400 mb-1" />
                    <div className="font-bold text-white truncate">Problem Set #1</div>
                    <div className="text-[10px] text-cyan-400/60">Assignment</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleAttachResource(
                        'chapter',
                        'unit-em-maxwell',
                        'Unit 1: Electrostatics & Field Potentials',
                        'Course Syllabus'
                      )
                    }
                    className="p-2 rounded-lg bg-black/40 border border-cyan-500/20 hover:border-cyan-400 text-left"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400 mb-1" />
                    <div className="font-bold text-white truncate">Unit 1: Electrostatics</div>
                    <div className="text-[10px] text-cyan-400/60">Curriculum Chapter</div>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. RIGHT CONTEXTUAL DRAWER: THREADS, PINS, STUDY GROUPS, SEARCH     */}
      {/* =================================================================== */}
      {rightDrawerMode !== 'none' && (
        <div className="w-80 lg:w-96 bg-black/80 border-l border-cyan-500/20 flex flex-col justify-between shrink-0 z-20 animate-fade-in">
          {/* Drawer Header */}
          <div className="p-3.5 border-b border-cyan-500/15 flex items-center justify-between text-xs">
            <div className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              {rightDrawerMode === 'thread' && (
                <>
                  <Reply className="w-4 h-4 text-cyan-400" />
                  <span>Thread Discussion</span>
                </>
              )}
              {rightDrawerMode === 'pins' && (
                <>
                  <Pin className="w-4 h-4 text-amber-400" />
                  <span>Pinned Channel Notices</span>
                </>
              )}
              {rightDrawerMode === 'study_group' && (
                <>
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Study Group Hub</span>
                </>
              )}
              {rightDrawerMode === 'search' && (
                <>
                  <Search className="w-4 h-4 text-cyan-400" />
                  <span>Community Search</span>
                </>
              )}
            </div>

            <button
              onClick={() => setRightDrawerMode('none')}
              className="p-1 rounded text-cyan-400/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
            {/* THREAD VIEW */}
            {rightDrawerMode === 'thread' && activeThreadRoot && (
              <div className="space-y-4">
                {/* Root Message Card */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/25 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{activeThreadRoot.senderName}</span>
                    <span className="text-[10px] text-cyan-400/50">
                      {new Date(activeThreadRoot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-cyan-100/90 whitespace-pre-line">{activeThreadRoot.content}</p>
                </div>

                <div className="text-[10px] uppercase font-bold text-cyan-400/50 px-1">
                  {threadReplies.length} {threadReplies.length === 1 ? 'Reply' : 'Replies'}
                </div>

                {/* Reply Stream */}
                <div className="space-y-3">
                  {threadReplies.map((reply) => (
                    <div key={reply.id} className="p-2.5 rounded-lg bg-black/40 border border-cyan-500/15 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-[11px]">{reply.senderName}</span>
                        <span className="text-[9px] text-cyan-400/50">
                          {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-cyan-100/80 whitespace-pre-line text-xs">{reply.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PINNED MESSAGES VIEW */}
            {rightDrawerMode === 'pins' && (
              <div className="space-y-3">
                {messages
                  .filter((m) => m.isPinned)
                  .map((pin) => (
                    <div key={pin.id} className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300">{pin.senderName}</span>
                        <span className="text-[10px] text-amber-400/60">
                          {new Date(pin.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-cyan-100/90 text-xs">{pin.content}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* SEARCH RESULTS VIEW */}
            {rightDrawerMode === 'search' && searchResults && (
              <div className="space-y-3">
                <div className="text-[10px] uppercase font-bold text-cyan-400/50">
                  {searchResults.messages.length} Results for "{searchQuery}"
                </div>
                {searchResults.messages.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setActiveChannelId(m.channelId);
                      setRightDrawerMode('none');
                    }}
                    className="p-2.5 rounded-lg bg-black/40 border border-cyan-500/15 hover:border-cyan-400 cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-white">{m.senderName}</span>
                      <span className="text-cyan-400/60">{m.channelId}</span>
                    </div>
                    <p className="text-cyan-100/80 line-clamp-2 text-xs">{m.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thread Reply Composer Footer */}
          {rightDrawerMode === 'thread' && (
            <div className="p-3 border-t border-cyan-500/15 bg-slate-950/80">
              <form onSubmit={handleSendThreadReply} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Reply in thread..."
                  value={threadInputContent}
                  onChange={(e) => setThreadInputContent(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-black/50 border border-cyan-500/30 text-white placeholder:text-cyan-500/40 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={!threadInputContent.trim()}
                  className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. MODALS: CREATE STUDY GROUP & CREATE ANNOUNCEMENT                 */}
      {/* =================================================================== */}
      {isCreatingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-950 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2">
              <span className="font-bold text-white text-sm">Create Peer Study Group</span>
              <button onClick={() => setIsCreatingGroup(false)} className="text-cyan-400/60 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudyGroup} className="space-y-3">
              <div>
                <label className="text-cyan-300 block mb-1">Study Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Quantum Pioneers"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-cyan-500/30 text-white"
                />
              </div>

              <div>
                <label className="text-cyan-300 block mb-1">Associated Class</label>
                <select
                  value={newGroupClassId}
                  onChange={(e) => setNewGroupClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-cyan-500/30 text-white"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-cyan-300 block mb-1">Description / Focus Goals</label>
                <textarea
                  rows={2}
                  placeholder="e.g. CBSE & National Board physics problems practice"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-cyan-500/30 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingGroup(false)}
                  className="px-3 py-1.5 rounded-lg text-cyan-400/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500/30 border border-cyan-400/50 text-white font-bold"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreatingAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-950 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2">
              <span className="font-bold text-white text-sm">Publish Official Announcement</span>
              <button onClick={() => setIsCreatingAnn(false)} className="text-cyan-400/60 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div>
                <label className="text-cyan-300 block mb-1">Announcement Title</label>
                <input
                  type="text"
                  placeholder="e.g. Term Examination Timetable Released"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-cyan-500/30 text-white"
                />
              </div>

              <div>
                <label className="text-cyan-300 block mb-1">Priority</label>
                <select
                  value={newAnnPriority}
                  onChange={(e) => setNewAnnPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-cyan-500/30 text-white"
                >
                  <option value="normal">Normal</option>
                  <option value="important">Important (Pinned)</option>
                  <option value="urgent">Urgent Directive</option>
                </select>
              </div>

              <div>
                <label className="text-cyan-300 block mb-1">Announcement Body</label>
                <textarea
                  rows={4}
                  placeholder="Draft official faculty announcement text..."
                  value={newAnnBody}
                  onChange={(e) => setNewAnnBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-cyan-500/30 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingAnn(false)}
                  className="px-3 py-1.5 rounded-lg text-cyan-400/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newAnnTitle.trim() || !newAnnBody.trim()}
                  className="px-4 py-1.5 rounded-lg bg-amber-500/30 border border-amber-400/50 text-white font-bold"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
