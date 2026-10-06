import React, { useState, useEffect, useRef } from 'react';
import type { EducationClass, EducationRole, MessagingNotification } from '../../../types/education.ts';
import type { FileRecord } from '../../../types/storage.ts';
import {
  Send,
  Paperclip,
  Radio,
  Users,
  Shield,
  CheckCheck,
  FileText,
  AlertCircle,
  X,
  RefreshCw,
  Bell
} from 'lucide-react';
import { FileUploadModal } from '../../../components/files/FileUploadModal.tsx';
import { FileAttachmentBadge } from '../../../components/files/FileAttachmentBadge.tsx';
import { FileViewerModal } from '../../../components/files/FileViewerModal.tsx';
import { authClient } from '../../../services/authClient.ts';


interface MessageItem {
  id: string;
  senderUserId?: string;
  senderName?: string;
  senderRole?: 'teacher' | 'student' | string;
  body: string;
  attachments?: FileRecord[];
  attachmentFileIds?: string[];
  createdAt?: string;
  timestamp?: string;
  readBy?: string[];
}

interface ClassMessagingDeckProps {
  currentClass: EducationClass;
  currentRole: EducationRole;
  workspaceId?: string;
}

export const ClassMessagingDeck: React.FC<ClassMessagingDeckProps> = ({
  currentClass,
  currentRole,
  workspaceId = 'ws-stark-core'
}) => {
  const currentUserId = currentRole === 'teacher' ? 'teacher-1' : 'student-1';
  const currentUserName = currentRole === 'teacher' ? 'Dr. Sarah' : 'Alex Chen';

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<MessagingNotification | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCounter, setReconnectCounter] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch initial message history from REST API
  const fetchMessages = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/messages?classId=${currentClass.id}&workspaceId=${workspaceId}`,
        {
          headers: {
            ...authClient.getAuthHeaders(),
            'x-user-role': currentRole
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      } else {
        const err = await res.json();
        setErrorMessage(err.error?.message || 'Failed to load class message stream.');
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setErrorMessage(err.message || 'Network error fetching messages.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [currentClass.id, currentRole]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 2. Establish Real-Time SSE Uplink for instant bi-directional updates
  useEffect(() => {
    if (!currentClass?.id) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const streamUrl = `/api/messages/stream?classId=${encodeURIComponent(
      currentClass.id
    )}&workspaceId=${encodeURIComponent(workspaceId)}&userId=${encodeURIComponent(
      currentUserId
    )}&role=${encodeURIComponent(currentRole)}`;

    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setIsConnected(true);
      setErrorMessage(null);
    });

    es.addEventListener('message', (event) => {
      try {
        const newMsg: MessageItem = JSON.parse(event.data);
        if (!newMsg || !newMsg.id) return;

        setMessages((prev) => {
          // Deduplication: Guard against replayed or duplicate realtime events
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev.map((m) => (m.id === newMsg.id ? { ...m, ...newMsg } : m));
          }
          return [...prev, newMsg];
        });
      } catch (err) {
        console.error('Error parsing incoming realtime message:', err);
      }
    });

    es.addEventListener('notification', (event) => {
      try {
        const notif: MessagingNotification = JSON.parse(event.data);
        if (notif && notif.senderUserId !== currentUserId) {
          setToastNotification(notif);
          setTimeout(() => setToastNotification(null), 5000);
        }
      } catch (err) {
        console.error('Error parsing notification event:', err);
      }
    });

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      // Auto-reconnect after 4s
      setTimeout(() => {
        setReconnectCounter((c) => c + 1);
      }, 4000);
    };

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [currentClass.id, currentUserId, currentRole, reconnectCounter]);

  // 3. Send Message Action
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && pendingAttachments.length === 0) || isSending) return;

    setIsSending(true);
    setErrorMessage(null);

    const bodyToSend = inputText.trim();
    const attachmentIds = pendingAttachments.map((f) => f.id);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders(),
          'x-user-role': currentRole
        },
        body: JSON.stringify({
          classId: currentClass.id,
          workspaceId,
          body: bodyToSend,
          attachmentFileIds: attachmentIds
        })
      });

      if (res.ok) {
        const result = await res.json();
        // Optimistically add message if not already received via SSE
        if (result.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === result.message.id)) return prev;
            return [...prev, result.message];
          });
        }
        setInputText('');
        setPendingAttachments([]);
      } else {
        const err = await res.json();
        setErrorMessage(err.error?.message || 'Transmission failed.');
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setErrorMessage(err.message || 'Failed to transmit message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="rounded-xl border border-cyan-500/25 bg-black/60 backdrop-blur-md overflow-hidden shadow-2xl flex flex-col min-h-[460px] h-[560px] md:h-[640px]">
      {/* 1. Header Tactical Bar */}
      <div className="p-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-black to-slate-950 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-mono text-white tracking-wide uppercase">
                {currentClass.code} Course Comm Link
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isConnected
                    ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
                    : 'border-amber-500/40 bg-amber-950/50 text-amber-300'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  }`}
                />
                {isConnected ? 'M11 REALTIME UPLINK ONLINE' : 'RECONNECTING...'}
              </span>
            </div>
            <p className="text-[11px] text-cyan-300/70 font-mono mt-0.5">
              Secure duplex communications between course instructor and enrolled cadets.
            </p>
          </div>
        </div>

        {/* User Identity / Role indicator */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1 rounded border border-cyan-500/30 bg-black/50 text-cyan-300 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>TRANSMITTING AS:</span>
            <strong className="text-white uppercase">{currentUserName} ({currentRole})</strong>
          </div>
          <button
            onClick={fetchMessages}
            title="Refresh messages"
            className="p-1.5 rounded border border-cyan-500/20 hover:border-cyan-400 text-cyan-400 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Authorized Participants Strip */}
      <div className="px-4 py-2 border-b border-cyan-500/10 bg-slate-950/70 flex items-center justify-between text-[11px] font-mono text-cyan-400/80">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>AUTHORIZED CHANNEL PARTICIPANTS:</span>
          <span className="text-cyan-200">
            {currentClass.instructorName} [Instructor] • Alex Chen [Cadet] • Maya Lin [Cadet]
          </span>
        </div>
        <div className="text-[10px] text-cyan-400/50">ENCRYPTION: QUANTUM LATTICE (M11)</div>
      </div>

      {/* Toast Notification Banner */}
      {toastNotification && (
        <div className="m-3 p-3 rounded-lg border border-cyan-400/40 bg-cyan-950/90 text-cyan-100 text-xs font-mono flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-cyan-400 animate-bounce" />
            <div>
              <div className="font-bold text-white">{toastNotification.title}</div>
              <div className="text-cyan-200/80 text-[11px]">{toastNotification.body}</div>
            </div>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-cyan-400/60 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="m-3 p-3 rounded-lg border border-red-500/40 bg-red-950/70 text-red-200 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Messages Stream Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-cyan-400/60 font-mono text-xs">
            <Radio className="w-8 h-8 text-cyan-500/40 mb-2 animate-pulse" />
            <p>No transmissions logged yet in {currentClass.code}.</p>
            <p className="text-[11px] text-cyan-500/40 mt-1">
              Begin by posting a dispatch or uploading reference course files below.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderUserId === currentUserId;
          const isTeacher = msg.senderRole === 'teacher';
          const timeStr = msg.createdAt
            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : msg.timestamp || 'Just now';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              {/* Header: Sender info */}
              <div className="flex items-center gap-2 text-[11px] font-mono px-1">
                <span
                  className={`font-bold ${
                    isTeacher ? 'text-cyan-300' : 'text-emerald-400'
                  }`}
                >
                  {msg.senderName || 'Authorized User'}
                </span>
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded border border-cyan-500/30 bg-cyan-950/30 text-cyan-400">
                  {isTeacher ? 'INSTRUCTOR' : 'STUDENT'}
                </span>
                <span className="text-slate-500 text-[10px]">{timeStr}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-xl p-3.5 shadow-md border ${
                  isMe
                    ? 'border-cyan-400/30 bg-gradient-to-br from-cyan-950/60 to-slate-900/90 text-cyan-50'
                    : isTeacher
                    ? 'border-cyan-500/25 bg-slate-900/90 text-slate-100'
                    : 'border-emerald-500/25 bg-slate-900/90 text-slate-100'
                }`}
              >
                {/* Text Body */}
                <p className="whitespace-pre-wrap leading-relaxed text-xs md:text-sm">
                  {msg.body}
                </p>

                {/* Attachments Section (Reuse Milestone 10) */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-cyan-500/15 space-y-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/70 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      <span>Attached Files ({msg.attachments.length}):</span>
                    </div>

                    <div className="space-y-1.5">
                      {msg.attachments.map((file) => (
                        <FileAttachmentBadge
                          key={file.id}
                          file={file}
                          onPreview={(f) => setPreviewFile(f)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Read receipt */}
              {isMe && msg.readBy && msg.readBy.length > 1 && (
                <div className="text-[9px] font-mono text-cyan-400/60 flex items-center gap-1 pr-1">
                  <CheckCheck className="w-3 h-3 text-cyan-400" />
                  <span>Acknowledged</span>
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Pending Attachment Preview Bar */}
      {pendingAttachments.length > 0 && (
        <div className="px-4 py-2 border-t border-cyan-500/20 bg-cyan-950/30 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider">
            Staged Attachments ({pendingAttachments.length}):
          </span>
          {pendingAttachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 border border-cyan-400/40 text-xs font-mono text-cyan-200"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[140px]">{file.originalName}</span>
              <button
                type="button"
                onClick={() => setPendingAttachments((prev) => prev.filter((p) => p.id !== file.id))}
                className="hover:text-red-400 ml-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 5. Message Composer Bar */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-cyan-500/20 bg-slate-950/80 flex items-end gap-2"
      >
        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          title="Attach Course Document or Diagram (M10 Storage)"
          className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-all cursor-pointer shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <div className="flex-1 relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Transmit message to ${currentClass.name}... (Press Enter to send, Shift+Enter for newline)`}
            rows={2}
            className="w-full resize-none rounded-lg border border-cyan-500/30 bg-black/70 px-3 py-2 text-xs md:text-sm text-cyan-100 placeholder:text-cyan-500/40 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={isSending || (!inputText.trim() && pendingAttachments.length === 0)}
          className="px-4 py-2.5 rounded-lg border border-cyan-400/40 bg-gradient-to-r from-cyan-600/40 to-blue-600/40 hover:from-cyan-500/50 hover:to-blue-500/50 text-cyan-200 font-mono text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]"
        >
          {isSending ? (
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
          ) : (
            <Send className="w-4 h-4 text-cyan-300" />
          )}
          <span className="hidden sm:inline">TRANSMIT</span>
        </button>
      </form>

      {/* 6. M10 File Upload Modal Integration */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(fileRecord: FileRecord) => {
          setPendingAttachments((prev) => [...prev, fileRecord]);
        }}
        workspaceId={workspaceId}
        defaultAssociations={{
          classId: currentClass.id
        }}
        title={`Attach File to ${currentClass.code} Message`}
        description="Upload images, PDF lecture notes, or research documents to attach directly to your class communication."
      />

      {/* 7. File Viewer Inspection Modal */}
      {previewFile && (
        <FileViewerModal
          file={previewFile}
          isOpen={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>

  );
};
