import React, { useState, useEffect } from 'react';
import type { ClassSession } from '../../../types/classSession.ts';
import type { SmartBoardDevice } from '../../../types/smartboard.ts';
import { authClient } from '../../../services/authClient.ts';
import {
  Tv,
  CheckCircle2,
  AlertCircle,
  Radio,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Lock,
  ExternalLink,
  Layers,
  X
} from 'lucide-react';

interface SendToSmartBoardModalProps {
  session: ClassSession;
  isOpen: boolean;
  onClose: () => void;
  onOpenSmartBoardLive: (boardId: string, sessionId: string) => void;
}

export const SendToSmartBoardModal: React.FC<SendToSmartBoardModalProps> = ({
  session,
  isOpen,
  onClose,
  onOpenSmartBoardLive
}) => {
  const [devices, setDevices] = useState<SmartBoardDevice[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('board-phys-01');
  const [pairCode, setPairCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    board: SmartBoardDevice;
    ticket?: string;
  } | null>(null);

  // Fetch registered devices
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);
    setSuccessResult(null);

    fetch(`/api/education/smartboard/devices?classroomId=${session.classId}`, {
      headers: { ...authClient.getAuthHeaders() }
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.devices && data.devices.length > 0) {
          setDevices(data.devices);
          setSelectedBoardId(data.devices[0].id);
        } else {
          // Fallback to all devices
          fetch('/api/education/smartboard/devices', {
            headers: { ...authClient.getAuthHeaders() }
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((allData) => {
              if (allData?.devices) {
                setDevices(allData.devices);
                if (allData.devices.length > 0) setSelectedBoardId(allData.devices[0].id);
              }
            });
        }
      })
      .catch(() => setError('Failed to discover registered classroom SmartBoards.'))
      .finally(() => setIsLoading(false));
  }, [isOpen, session.classId]);

  if (!isOpen) return null;

  const selectedBoard = devices.find((d) => d.id === selectedBoardId);

  const handleSend = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Send session to board
      const res = await fetch('/api/education/smartboard/send-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authClient.getAuthHeaders() },
        body: JSON.stringify({
          boardId: selectedBoardId,
          sessionId: session.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to dispatch session to board.');
      }

      setSuccessResult({
        board: data.board
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred during board dispatch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            <span>LIVE IN CLASS</span>
          </span>
        );
      case 'READY':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>SESSION READY</span>
          </span>
        );
      case 'AVAILABLE':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Available to Pair</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-3xl border border-cyan-500/40 bg-slate-950 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
              <Tv className="w-4 h-4" />
              <span>SmartBoard Classroom Dispatch</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Send to SmartBoard</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen */}
        {successResult ? (
          <div className="space-y-5 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Session Ready on {successResult.board.displayName}</h3>
              <p className="text-xs text-slate-300 font-sans max-w-md mx-auto">
                ClassSession <span className="font-mono text-cyan-300">"{session.topic}"</span> has been dispatched to {successResult.board.classroomName}. The board is synchronized and ready for instruction.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Display:</span>
                <span className="text-white font-bold">{successResult.board.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hardware Status:</span>
                <span className="text-emerald-400 font-bold">READY · Synchronized</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Security:</span>
                <span className="text-cyan-300">Scoped Token Verified</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenSmartBoardLive(selectedBoardId, session.id);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <span>Launch SmartBoard Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-900 text-slate-300 text-xs font-mono cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form Content */
          <div className="space-y-5">
            {/* Session Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-300 font-bold">{session.courseCode}</span>
                <span className="text-slate-400">{session.durationMinutes} min Session</span>
              </div>
              <h3 className="text-sm font-bold text-white">{session.topic}</h3>
              <p className="text-xs text-slate-400 line-clamp-1">{session.lessonPlan?.title || session.lessonTitle}</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Target SmartBoard Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block">
                Select Target SmartBoard Device
              </label>

              {isLoading ? (
                <div className="p-4 text-center text-xs font-mono text-slate-500">
                  Discovering classroom hardware...
                </div>
              ) : devices.length === 0 ? (
                <div className="p-4 text-center text-xs font-mono text-slate-500">
                  No registered SmartBoards found for this venue.
                </div>
              ) : (
                <div className="space-y-2">
                  {devices.map((d) => {
                    const isSelected = selectedBoardId === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedBoardId(d.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md'
                            : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{d.displayName}</span>
                            {getStatusBadge(d.status)}
                          </div>
                          <p className="text-xs text-slate-400 font-sans">{d.classroomName} · {d.location}</p>
                        </div>

                        <div className="shrink-0 text-right font-mono text-[11px] text-slate-500">
                          {d.capabilities.maxResolution || '4K'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Security note */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400 font-sans">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Server authorizes instructor credentials and issues a scoped hardware ticket. Private notes and answer keys remain strictly protected.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSubmitting || !selectedBoardId}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-cyan-500/20"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <span>Send to SmartBoard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
