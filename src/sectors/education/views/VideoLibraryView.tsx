import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { EducationRole, EducationClass } from '../../../types/education.ts';
import type { VideoRecord, VideoSearchResult, VideoQAResult, VideoCitation } from '../../../types/video.ts';
import { VideoPlayer } from '../../../components/video/VideoPlayer.tsx';
import { authClient } from '../../../services/authClient.ts';

import {
  Video,
  Upload,
  Play,
  Search,
  Filter,
  FileText,
  Clock,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  ShieldCheck,
  AlertCircle,
  X,
  Plus,
  Bot,
  HelpCircle,
  ArrowRight,
  Bookmark,
  ChevronRight,
  Database,
  ExternalLink,
  Flame,
  Volume2,
  RefreshCw
} from 'lucide-react';

interface VideoLibraryViewProps {
  classes: EducationClass[];
  currentRole: EducationRole;
}

export const VideoLibraryView: React.FC<VideoLibraryViewProps> = ({ classes, currentRole }) => {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [activeStreamUrl, setActiveStreamUrl] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Player synchronization
  const [seekToSeconds, setSeekToSeconds] = useState<number | null>(null);
  const [currentPlayerTime, setCurrentPlayerTime] = useState<number>(0);

  // AI Discovery / Grounded Search State
  const [discoveryQuery, setDiscoveryQuery] = useState<string>('');
  const [discoveryResults, setDiscoveryResults] = useState<VideoSearchResult[]>([]);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [hasDiscovered, setHasDiscovered] = useState<boolean>(false);

  // Grounded Video Q&A State
  const [qaQuestion, setQaQuestion] = useState<string>('');
  const [qaResult, setQaResult] = useState<VideoQAResult | null>(null);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [activeViewTab, setActiveViewTab] = useState<'qa' | 'transcript' | 'discovery' | 'overview'>('qa');

  // Upload Modal State (Teacher)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadDesc, setUploadDesc] = useState<string>('');
  const [uploadClassId, setUploadClassId] = useState<string>(classes[0]?.id || 'class-phys-301');
  const [uploadTranscript, setUploadTranscript] = useState<string>('');
  const [uploadKnowledgeSpaceId, setUploadKnowledgeSpaceId] = useState<string>('ks-quantum');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {
        'x-user-id': currentRole === 'teacher' ? 'teacher-1' : 'student-1',
        'x-user-role': currentRole
      };
      const res = await fetch('/api/education/videos', { headers });
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
        if (data.videos && data.videos.length > 0 && !selectedVideo) {
          setSelectedVideo(data.videos[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch videos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [currentRole]);

  // Request fresh scoped playback ticket when active video or role changes
  useEffect(() => {
    if (!selectedVideo) {
      setActiveStreamUrl('');
      return;
    }

    let isMounted = true;
    const fetchPlaybackTicket = async () => {
      try {
        const headers: Record<string, string> = {
          'x-user-id': currentRole === 'teacher' ? 'teacher-1' : 'student-1',
          'x-user-role': currentRole
        };
        const res = await fetch(`/api/education/videos/${selectedVideo.id}/playback?workspaceId=${selectedVideo.workspaceId}`, {
          headers
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.streamUrl) {
            setActiveStreamUrl(data.streamUrl);
          }
        }
      } catch (err) {
        console.warn('[VideoLibraryView] Failed to acquire playback ticket:', err);
      }
    };

    fetchPlaybackTicket();

    return () => {
      isMounted = false;
    };
  }, [selectedVideo?.id, currentRole]);

  // AI Concept Discovery Handler
  const handlePerformDiscovery = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : discoveryQuery).trim();
    if (!q) return;

    if (queryText !== undefined) {
      setDiscoveryQuery(q);
    }

    setIsDiscovering(true);
    setHasDiscovered(true);
    try {
      const headers: Record<string, string> = {
        'x-user-id': currentRole === 'teacher' ? 'teacher-1' : 'student-1',
        'x-user-role': currentRole
      };
      const res = await fetch(`/api/education/videos/search?q=${encodeURIComponent(q)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDiscoveryResults(data.results || []);
        setActiveViewTab('discovery');
      } else {
        const err = await res.json();
        showNotice(err.error?.message || 'Discovery search failed.', 'error');
      }
    } catch (err: any) {
      showNotice(err.message || 'Error executing AI discovery search.', 'error');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Jump to specific video & timestamp from citation or discovery result
  const handleJumpToTimestamp = (targetVideoId: string, seconds: number) => {
    const targetVideo = videos.find((v) => v.id === targetVideoId);
    if (targetVideo && selectedVideo?.id !== targetVideo.id) {
      setSelectedVideo(targetVideo);
    }

    setSeekToSeconds(seconds);
    playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Grounded Video Q&A Handler
  const handleAskQuestion = async (customPrompt?: string) => {
    const q = (customPrompt || qaQuestion).trim();
    if (!q) return;

    if (customPrompt) {
      setQaQuestion(customPrompt);
    }

    setIsAsking(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': currentRole === 'teacher' ? 'teacher-1' : 'student-1',
        'x-user-role': currentRole
      };

      const url = selectedVideo
        ? `/api/education/videos/${selectedVideo.id}/ask`
        : '/api/education/videos/ask';

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: q,
          classId: selectedVideo ? selectedVideo.classId : (selectedClassFilter !== 'all' ? selectedClassFilter : undefined),
          workspaceId: selectedVideo ? selectedVideo.workspaceId : 'ws-stark-core'
        })
      });

      if (res.ok) {
        const data: VideoQAResult = await res.json();
        setQaResult(data);
        setActiveViewTab('qa');
      } else {
        const err = await res.json();
        showNotice(err.error?.message || 'Q&A inquiry failed.', 'error');
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to generate grounded Q&A answer.', 'error');
    } finally {
      setIsAsking(false);
    }
  };

  // Handle Video Upload (Teacher)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      showNotice('Please provide a title for the video lecture.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authClient.getAuthHeaders(),
        
      };

      let base64Data: string | undefined;
      let filename = 'lecture_video.mp4';
      let mimeType = 'video/mp4';

      if (selectedFile) {
        filename = selectedFile.name;
        mimeType = selectedFile.type || 'video/mp4';
        const buffer = await selectedFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      }

      const res = await fetch('/api/education/videos', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          classId: uploadClassId,
          workspaceId: 'ws-stark-core',
          title: uploadTitle.trim(),
          description: uploadDesc.trim(),
          filename,
          mimeType,
          base64Data,
          transcript: uploadTranscript.trim() || undefined,
          knowledgeSpaceId: uploadKnowledgeSpaceId || undefined,
          visibility: 'class'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setVideos((prev) => [data.video, ...prev]);
        setSelectedVideo(data.video);
        setIsUploadModalOpen(false);
        setUploadTitle('');
        setUploadDesc('');
        setUploadTranscript('');
        setSelectedFile(null);
        showNotice(`Video lecture '${data.video.title}' successfully published to course!`);
      } else {
        const errData = await res.json();
        showNotice(errData.error?.message || 'Upload failed.', 'error');
      }
    } catch (err: any) {
      showNotice(err.message || 'Network error during upload.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Delete (Teacher)
  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to permanently delete this video lecture?')) return;
    try {
      const headers: Record<string, string> = { ...authClient.getAuthHeaders() };
      const res = await fetch(`/api/education/videos/${videoId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId));
        if (selectedVideo?.id === videoId) {
          setSelectedVideo(videos.find((v) => v.id !== videoId) || null);
        }
        showNotice('Video lecture permanently deleted from course storage.');
      }
    } catch (err) {
      showNotice('Failed to delete video.', 'error');
    }
  };

  // Filtered video list
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (selectedClassFilter !== 'all' && v.classId !== selectedClassFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = v.title.toLowerCase().includes(q);
        const matchDesc = v.description.toLowerCase().includes(q);
        const matchTag = (v.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTag) return false;
      }
      return true;
    });
  }, [videos, selectedClassFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notice && (
        <div
          className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header Bar: Filter, Concept Discovery & Teacher Upload */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border border-cyan-500/20 bg-black/40 p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Video className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wider font-mono uppercase flex items-center gap-2">
              <span>ACADEMIC VIDEO & MEDIA KNOWLEDGE</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                M15 GROUNDED RAG
              </span>
            </h1>
            <p className="text-xs text-cyan-400/70 font-sans">
              Stream course lectures, search verified concept timestamps, and synthesize grounded Q&A
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Class Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="bg-transparent text-cyan-200 border-none outline-none cursor-pointer pr-2 text-xs"
            >
              <option value="all" className="bg-slate-950 text-cyan-200">All Courses</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-950 text-cyan-200">
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Filter Search */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-400/60" />
            <input
              type="text"
              placeholder="Filter catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-cyan-500/30 bg-black/60 text-xs font-mono text-cyan-100 placeholder-cyan-500/40 focus:border-cyan-400 outline-none"
            />
          </div>

          {/* Teacher Upload Button */}
          {currentRole === 'teacher' && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold font-mono tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>UPLOAD VIDEO</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Grounded Discovery Search Bar */}
      <div className="rounded-xl border border-cyan-500/30 bg-slate-950/80 p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-bold uppercase">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>AI CONCEPT DISCOVERY & TIMESTAMP SEARCH</span>
          </div>
          <div className="text-[11px] font-mono text-cyan-400/60 flex items-center gap-2">
            <span>RAG Grounded Across Accessible Lectures</span>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              type="text"
              placeholder="Search concepts, e.g. 'harmonic oscillator', 'ladder operators', 'zero point energy', 'Stokes theorem'..."
              value={discoveryQuery}
              onChange={(e) => setDiscoveryQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePerformDiscovery()}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-cyan-500/40 bg-black/70 text-xs font-mono text-cyan-100 placeholder-cyan-500/50 focus:border-cyan-400 outline-none shadow-inner"
            />
          </div>
          <button
            onClick={() => handlePerformDiscovery()}
            disabled={isDiscovering || !discoveryQuery.trim()}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 shrink-0"
          >
            {isDiscovering ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>SEARCHING...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>DISCOVER</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Concept Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[10px] font-mono text-cyan-500/60 uppercase">Quick Concepts:</span>
          {[
            'Ladder Operators',
            'Zero Point Energy',
            'Hamiltonian Operator',
            'Stokes Theorem',
            'Commutation Relation',
            'Energy Eigenstates'
          ].map((concept) => (
            <button
              key={concept}
              onClick={() => handlePerformDiscovery(concept)}
              className="px-2.5 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-mono transition-colors"
            >
              {concept}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left (Player Stage + Q&A Assistant) & Right (Catalog + Discovery Results) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column (8 cols): Video Player & Grounded Interactive Panels */}
        <div className="lg:col-span-8 space-y-5 min-w-0">
          {selectedVideo ? (
            <div className="space-y-4">
              {/* Video Player Box */}
              <div ref={playerContainerRef} className="rounded-xl overflow-hidden border border-cyan-500/30 bg-black shadow-2xl">
                <VideoPlayer
                  key={`${selectedVideo.id}-${activeStreamUrl}`}
                  video={selectedVideo}
                  streamUrl={activeStreamUrl || `/api/education/videos/${selectedVideo.id}/stream`}
                  seekToSeconds={seekToSeconds}
                  onSeekComplete={() => setSeekToSeconds(null)}
                  onTimeUpdate={(t) => setCurrentPlayerTime(t)}
                />
              </div>

              {/* Interactive Navigation Tabs under Player */}
              <div className="rounded-xl border border-cyan-500/20 bg-slate-950/80 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold">
                        {selectedVideo.classId}
                      </span>
                      {selectedVideo.durationSeconds && (
                        <span className="text-xs text-cyan-400/70 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {Math.floor(selectedVideo.durationSeconds / 60)} min
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/60 border border-blue-400/30 text-blue-300 font-mono flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-blue-400" />
                        GROUNDED RAG
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide break-words">
                      {selectedVideo.title}
                    </h2>
                  </div>

                  {/* Teacher Delete Action */}
                  {currentRole === 'teacher' && (
                    <button
                      onClick={() => handleDeleteVideo(selectedVideo.id)}
                      className="p-2 rounded-lg border border-rose-500/30 bg-rose-950/40 hover:bg-rose-500/20 text-rose-300 text-xs transition-colors shrink-0"
                      title="Delete Video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Sub-Panel Tabs: Grounded Q&A, Transcript Timeline, Discovery Results, Overview */}
                <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2">
                  <button
                    onClick={() => setActiveViewTab('qa')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                      activeViewTab === 'qa'
                        ? 'bg-cyan-500/30 border border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'text-cyan-400/70 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    <span>GROUNDED VIDEO Q&A</span>
                  </button>

                  <button
                    onClick={() => setActiveViewTab('transcript')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                      activeViewTab === 'transcript'
                        ? 'bg-cyan-500/30 border border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'text-cyan-400/70 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>TIMESTAMPS & TRANSCRIPT</span>
                  </button>

                  {hasDiscovered && (
                    <button
                      onClick={() => setActiveViewTab('discovery')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                        activeViewTab === 'discovery'
                          ? 'bg-cyan-500/30 border border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          : 'text-cyan-400/70 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>DISCOVERY MATCHES ({discoveryResults.length})</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveViewTab('overview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                      activeViewTab === 'overview'
                        ? 'bg-cyan-500/30 border border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'text-cyan-400/70 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>OVERVIEW</span>
                  </button>
                </div>

                {/* TAB 1: GROUNDED VIDEO Q&A */}
                {activeViewTab === 'qa' && (
                  <div className="space-y-4 pt-1 animate-fade-in">
                    <div className="p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs font-mono text-cyan-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-cyan-400" />
                          LECTURE Q&A ASSISTANT
                        </span>
                        <span className="text-[10px] text-cyan-400/60">
                          Scoped to: <strong className="text-white">{selectedVideo.title}</strong>
                        </span>
                      </div>
                      <p className="text-[11px] text-cyan-300/80 leading-relaxed font-sans">
                        Ask any conceptual question about this lecture. Answers are generated strictly from the verified transcript with jumpable timestamps.
                      </p>

                      {/* Suggested Prompts */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {[
                          'What is the main idea of this lecture?',
                          'Explain ladder operators.',
                          'Where does the lecturer discuss zero-point energy?',
                          'Which part explains the Hamiltonian?'
                        ].map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => handleAskQuestion(prompt)}
                            disabled={isAsking}
                            className="px-2.5 py-1 rounded bg-black/60 hover:bg-cyan-500/20 border border-cyan-500/30 text-[11px] text-cyan-300 hover:text-white transition-colors"
                          >
                            "{prompt}"
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question Input */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <HelpCircle className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
                        <input
                          type="text"
                          placeholder="Ask anything about this lecture..."
                          value={qaQuestion}
                          onChange={(e) => setQaQuestion(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-cyan-500/40 bg-black/70 text-xs font-mono text-cyan-100 placeholder-cyan-500/40 focus:border-cyan-400 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => handleAskQuestion()}
                        disabled={isAsking || !qaQuestion.trim()}
                        className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 shrink-0"
                      >
                        {isAsking ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>SYNTHESIZING...</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-3.5 h-3.5" />
                            <span>ASK AI</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Synthesized Grounded Q&A Answer Card */}
                    {qaResult && (
                      <div className="p-4 rounded-xl border border-cyan-400/40 bg-black/80 shadow-2xl space-y-4 animate-fade-in">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              qaResult.isGrounded
                                ? 'bg-emerald-950 border border-emerald-400/50 text-emerald-300'
                                : 'bg-amber-950 border border-amber-400/50 text-amber-300'
                            }`}>
                              {qaResult.isGrounded ? 'VERIFIED LECTURE EVIDENCE' : 'INSUFFICIENT EVIDENCE'}
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400/70">
                              Confidence: {Math.round(qaResult.confidence * 100)}%
                            </span>
                          </div>

                          <div className="text-[10px] font-mono text-cyan-500/60">
                            Model: <span className="text-cyan-300">{qaResult.modelUsed}</span>
                          </div>
                        </div>

                        {/* Answer Text */}
                        <div className="text-xs text-cyan-100 font-sans leading-relaxed whitespace-pre-wrap">
                          {qaResult.answer}
                        </div>

                        {/* Verified Citations List */}
                        {qaResult.citations && qaResult.citations.length > 0 && (
                          <div className="pt-3 border-t border-cyan-500/20 space-y-2">
                            <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                              <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                              VERIFIED LECTURE CITATIONS ({qaResult.citations.length})
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {qaResult.citations.map((cite, idx) => (
                                <div
                                  key={cite.chunkId || idx}
                                  className="p-3 rounded-lg border border-cyan-500/30 bg-slate-950/80 space-y-2 flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 mb-1">
                                      <span className="font-bold truncate pr-2">{cite.sourceTitle}</span>
                                      {cite.timestampLabel && (
                                        <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                                          {cite.timestampLabel}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-cyan-200/80 font-sans italic line-clamp-3">
                                      "{cite.excerpt}"
                                    </p>
                                  </div>

                                  {cite.startSeconds !== undefined && (
                                    <button
                                      onClick={() => handleJumpToTimestamp(cite.videoId || selectedVideo.id, cite.startSeconds!)}
                                      className="w-full mt-2 py-1 px-2 rounded bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/40 text-[11px] font-mono font-bold text-cyan-200 flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                      <Play className="w-3 h-3 fill-cyan-300 text-cyan-300" />
                                      <span>JUMP TO {cite.timestampLabel || `${cite.startSeconds}s`}</span>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: TIMESTAMPS & TRANSCRIPT TIMELINE */}
                {activeViewTab === 'transcript' && (
                  <div className="space-y-3 pt-1 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
                      <span className="font-bold uppercase flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        SYNCHRONIZED LECTURE SEGMENTS
                      </span>
                      <span className="text-[10px] text-cyan-500/60">Click segment to seek</span>
                    </div>

                    {selectedVideo.segments && selectedVideo.segments.length > 0 ? (
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {selectedVideo.segments.map((seg) => {
                          const isPlayingThis = currentPlayerTime >= seg.startSeconds && currentPlayerTime <= seg.endSeconds;
                          return (
                            <div
                              key={seg.id}
                              onClick={() => handleJumpToTimestamp(selectedVideo.id, seg.startSeconds)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                isPlayingThis
                                  ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)] text-white'
                                  : 'bg-black/50 border-cyan-500/20 hover:border-cyan-400/50 text-cyan-200/80 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-cyan-400" />
                                  {seg.timestampLabel || `${seg.startSeconds}s`}
                                </span>
                                {isPlayingThis && (
                                  <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1 font-bold">
                                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                                    CURRENTLY PLAYING
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-sans leading-relaxed">{seg.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : selectedVideo.transcript ? (
                      <div className="p-4 rounded-lg bg-black/60 border border-cyan-500/20 text-xs text-cyan-100 font-sans leading-relaxed max-h-80 overflow-y-auto">
                        <p>{selectedVideo.transcript}</p>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs font-mono text-cyan-500/50">
                        No transcript indexed for this lecture video.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: DISCOVERY RESULTS */}
                {activeViewTab === 'discovery' && (
                  <div className="space-y-3 pt-1 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
                      <span className="font-bold uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        AI CONCEPT MATCHES FOR: "{discoveryQuery}"
                      </span>
                      <span className="text-[10px] text-cyan-500/60">{discoveryResults.length} matches found</span>
                    </div>

                    {discoveryResults.length === 0 ? (
                      <div className="text-center py-8 text-xs font-mono text-cyan-500/50">
                        No direct concept matches found in course archives.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {discoveryResults.map((res) => (
                          <div
                            key={`${res.videoId}-${res.chunkId}`}
                            className="p-3.5 rounded-xl border border-cyan-500/30 bg-black/60 hover:bg-cyan-950/30 transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
                                    {res.className || res.classId}
                                  </span>
                                  <h4 className="text-xs font-bold text-white truncate">
                                    {res.videoTitle}
                                  </h4>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-cyan-400/70 shrink-0">
                                Match: {Math.round(res.score * 100)}%
                              </span>
                            </div>

                            <p className="text-xs font-sans text-cyan-200/90 italic leading-relaxed">
                              "{res.text}"
                            </p>

                            <div className="flex items-center justify-between pt-2 border-t border-cyan-500/10">
                              <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-cyan-400" />
                                {res.timestampLabel || '00:00'}
                              </span>

                              <button
                                onClick={() => handleJumpToTimestamp(res.videoId, res.startSeconds || 0)}
                                className="px-3 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/40 text-[11px] font-mono font-bold text-cyan-200 flex items-center gap-1.5 transition-colors"
                              >
                                <Play className="w-3 h-3 fill-cyan-300 text-cyan-300" />
                                <span>PLAY FROM {res.timestampLabel || '00:00'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: OVERVIEW */}
                {activeViewTab === 'overview' && (
                  <div className="space-y-3 pt-1 animate-fade-in text-xs text-cyan-200/90 leading-relaxed font-sans">
                    <p>{selectedVideo.description || 'No additional lecture overview provided.'}</p>
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      {(selectedVideo.tags || []).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/20 text-[10px] font-mono text-cyan-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-cyan-500/20 bg-slate-950/50 p-12 text-center space-y-3">
              <Video className="w-12 h-12 text-cyan-500/30 mx-auto" />
              <h3 className="text-sm font-bold text-cyan-300 font-mono">NO VIDEO SELECTED</h3>
              <p className="text-xs text-cyan-400/60 max-w-sm mx-auto">
                Select a video from the course catalog on the right or search for a concept using AI Discovery above.
              </p>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Course Video Catalog / Playlist */}
        <div className="lg:col-span-4 space-y-3 min-w-0">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
            <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              COURSE CATALOG ({filteredVideos.length})
            </span>
            <span className="text-[10px] font-mono text-cyan-500/60">
              {currentRole === 'student' ? 'Enrolled Classes' : 'All Classes'}
            </span>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-xs font-mono text-cyan-400/50">
              Scanning video archives...
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-12 text-xs font-mono text-cyan-400/50 space-y-2">
              <Video className="w-8 h-8 mx-auto text-cyan-500/30" />
              <p>No video lectures found matching criteria.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
              {filteredVideos.map((vid) => {
                const isSelected = selectedVideo?.id === vid.id;
                return (
                  <div
                    key={vid.id}
                    onClick={() => {
                      setSelectedVideo(vid);
                      setSeekToSeconds(0);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.25)] text-cyan-200'
                        : 'border-cyan-500/20 bg-black/40 hover:bg-white/5 text-cyan-400/70 hover:text-cyan-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
                        {vid.classId}
                      </span>
                      {vid.durationSeconds && (
                        <span className="text-[10px] font-mono text-cyan-400/60 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {Math.floor(vid.durationSeconds / 60)}m
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-white mb-1 line-clamp-2">
                      {vid.title}
                    </h4>

                    <p className="text-[11px] text-cyan-400/60 line-clamp-2 font-sans mb-2">
                      {vid.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-cyan-500/60 pt-2 border-t border-cyan-500/10">
                      <span>{new Date(vid.createdAt).toLocaleDateString()}</span>
                      {vid.transcript && (
                        <span className="flex items-center gap-1 text-cyan-300">
                          <FileText className="w-3 h-3 text-cyan-400" />
                          Transcript Indexed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Teacher Video Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-2xl space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2 text-cyan-300 font-mono font-bold text-sm">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>PUBLISH COURSE VIDEO LECTURE</span>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-cyan-400/80 mb-1 block">COURSE:</label>
                <select
                  value={uploadClassId}
                  onChange={(e) => setUploadClassId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-cyan-500/30 bg-black/60 text-cyan-200 outline-none focus:border-cyan-400"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-cyan-400/80 mb-1 block">LECTURE TITLE:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wave Mechanics & Probability Currents"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-cyan-500/30 bg-black/60 text-cyan-100 placeholder-cyan-500/40 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-cyan-400/80 mb-1 block">DESCRIPTION / SUMMARY:</label>
                <textarea
                  rows={2}
                  placeholder="Brief overview of concepts covered in this video..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-cyan-500/30 bg-black/60 text-cyan-100 placeholder-cyan-500/40 outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div>
                <label className="text-cyan-400/80 mb-1 block">VIDEO FILE (.mp4, .webm, .ogg):</label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full p-2 rounded-lg border border-cyan-500/30 bg-black/60 text-cyan-300 text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-mono file:bg-cyan-500/20 file:text-cyan-200 hover:file:bg-cyan-500/30"
                />
                <p className="text-[10px] text-cyan-500/50 mt-1">
                  Optional: If no file selected, a mock media stream container will be initialized.
                </p>
              </div>

              <div>
                <label className="text-cyan-400/80 mb-1 block">LECTURE TRANSCRIPT (FOR RAG & SEARCH):</label>
                <textarea
                  rows={3}
                  placeholder="Paste lecture transcript text here to enable grounded AI Q&A and student search..."
                  value={uploadTranscript}
                  onChange={(e) => setUploadTranscript(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-cyan-500/30 bg-black/60 text-cyan-100 placeholder-cyan-500/40 outline-none focus:border-cyan-400 resize-none font-sans text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-cyan-500/20">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-cyan-500/30 bg-black/40 text-cyan-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>UPLOADING...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>PUBLISH VIDEO</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
