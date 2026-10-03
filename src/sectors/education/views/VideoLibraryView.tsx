import React, { useState, useEffect, useMemo } from 'react';
import type { EducationRole, EducationClass } from '../../../types/education.ts';
import type { VideoRecord } from '../../../types/video.ts';
import { VideoPlayer } from '../../../components/video/VideoPlayer.tsx';
import {
  Video,
  Upload,
  Play,
  Search,
  Filter,
  FileText,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Layers,
  ShieldCheck,
  AlertCircle,
  X,
  Plus
} from 'lucide-react';

interface VideoLibraryViewProps {
  classes: EducationClass[];
  currentRole: EducationRole;
}

export const VideoLibraryView: React.FC<VideoLibraryViewProps> = ({ classes, currentRole }) => {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Upload Modal State (Teacher)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadDesc, setUploadDesc] = useState<string>('');
  const [uploadClassId, setUploadClassId] = useState<string>(classes[0]?.id || 'class-phys-301');
  const [uploadTranscript, setUploadTranscript] = useState<string>('');
  const [uploadKnowledgeSpaceId, setUploadKnowledgeSpaceId] = useState<string>('ks-quantum');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

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
        'x-user-id': 'teacher-1',
        'x-user-role': 'teacher'
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
      const headers: Record<string, string> = {
        'x-user-id': 'teacher-1',
        'x-user-role': 'teacher'
      };
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

      {/* Header Bar: Filter, Search & Teacher Upload Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border border-cyan-500/20 bg-black/40 p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Video className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wider font-mono uppercase">
              ACADEMIC VIDEO & MEDIA KNOWLEDGE
            </h1>
            <p className="text-xs text-cyan-400/70 font-sans">
              Stream course lectures, inspect synchronized transcripts, and query RAG knowledge
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

          {/* Search Box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-400/60" />
            <input
              type="text"
              placeholder="Search lectures..."
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

      {/* Main Two-Column Layout: Player Stage & Playlist/Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left (8 cols): Video Player & Active Lecture Metadata */}
        <div className="lg:col-span-8 space-y-4 min-w-0">
          {selectedVideo ? (
            <div className="space-y-4">
              {/* Constrained Aspect-Ratio Video Player */}
              <div className="rounded-xl overflow-hidden border border-cyan-500/30 bg-black shadow-2xl">
                <VideoPlayer
                  video={selectedVideo}
                  streamUrl={`/api/education/videos/${selectedVideo.id}/stream?workspaceId=${selectedVideo.workspaceId}`}
                />
              </div>

              {/* Video Info Card */}
              <div className="rounded-xl border border-cyan-500/20 bg-slate-950/70 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-500/15 pb-4">
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
                      {selectedVideo.knowledgeSpaceId && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/60 border border-blue-400/30 text-blue-300 font-mono flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-blue-400" />
                          RAG INDEXED
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide break-words">
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

                <p className="text-xs text-cyan-200/80 leading-relaxed font-sans break-words">
                  {selectedVideo.description || 'No additional lecture overview provided.'}
                </p>

                {/* Transcript Section */}
                {selectedVideo.transcript && (
                  <div className="pt-3 border-t border-cyan-500/15 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
                      <span className="flex items-center gap-1.5 font-bold uppercase">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        LECTURE TRANSCRIPT & NOTES
                      </span>
                      <span className="text-[10px] text-cyan-500/60">Searchable & Cited</span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-black/60 border border-cyan-500/20 text-xs text-cyan-100/90 leading-relaxed font-sans max-h-48 overflow-y-auto pr-2 space-y-2">
                      <p>{selectedVideo.transcript}</p>
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
                Select a video from the course catalog on the right to start watching.
              </p>
            </div>
          )}
        </div>

        {/* Right (4 cols): Course Video Catalog / Playlist */}
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
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {filteredVideos.map((vid) => {
                const isSelected = selectedVideo?.id === vid.id;
                return (
                  <div
                    key={vid.id}
                    onClick={() => setSelectedVideo(vid)}
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
                          Transcript
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
