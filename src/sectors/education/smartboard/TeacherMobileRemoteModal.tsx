import React, { useState, useEffect } from 'react';
import type { SmartBoardDevice } from '../../../types/smartboard.ts';
import {
  Smartphone,
  Tv,
  QrCode,
  KeyRound,
  Send,
  ChevronLeft,
  ChevronRight,
  Power,
  X,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId?: string;
  courseCode?: string;
}

export const TeacherMobileRemoteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activeSessionId = 'session-phys-101',
  courseCode = 'PHYS-301'
}) => {
  const [boards, setBoards] = useState<SmartBoardDevice[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('board-phys-01');
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'boards' | 'pair' | 'remote'>('boards');
  const [pairingStatus, setPairingStatus] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/education/smartboard/control-plane/boards')
        .then((r) => r.json())
        .then((data) => {
          if (data.boards) {
            setBoards(data.boards);
            if (data.boards.length > 0) setSelectedBoardId(data.boards[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClaimPairing = async () => {
    if (!pinInput.trim()) return;
    setIsLoading(true);
    setPairingStatus(null);
    try {
      const res = await fetch('/api/education/smartboard/control-plane/pairing/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: selectedBoardId,
          pinCode: pinInput.trim(),
          sessionId: activeSessionId
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setPairingStatus('Successfully paired with SmartBoard!');
        setActiveTab('remote');
      } else {
        setPairingStatus(data.error || 'Pairing failed. Check PIN code.');
      }
    } catch {
      setPairingStatus('Network error connecting to board.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSession = async (boardId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/education/smartboard/control-plane/send-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, sessionId: activeSessionId })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setPairingStatus(`Session ${courseCode} sent to board successfully!`);
        setActiveTab('remote');
      }
    } catch {
      setPairingStatus('Failed to send session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoteAction = async (
    action: 'NEXT_PAGE' | 'PREV_PAGE' | 'SET_PAGE' | 'CLEAR_PAGE' | 'TOGGLE_LASER' | 'END_SESSION'
  ) => {
    try {
      const res = await fetch('/api/education/smartboard/control-plane/remote-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: selectedBoardId, action })
      });
      const data = await res.json();
      if (res.ok && data.ok && data.boardDoc) {
        setCurrentPageIndex(data.boardDoc.activePageIndex);
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-md w-full flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-cyan-300 font-hud">SmartBoard Mobile Control Plane</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 border-b border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('boards')}
            className={`py-2.5 text-center font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'boards' ? 'border-cyan-400 text-cyan-300 bg-slate-800/40' : 'border-transparent text-slate-400'
            }`}
          >
            My Boards
          </button>
          <button
            onClick={() => setActiveTab('pair')}
            className={`py-2.5 text-center font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'pair' ? 'border-cyan-400 text-cyan-300 bg-slate-800/40' : 'border-transparent text-slate-400'
            }`}
          >
            Pairing PIN
          </button>
          <button
            onClick={() => setActiveTab('remote')}
            className={`py-2.5 text-center font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'remote' ? 'border-cyan-400 text-cyan-300 bg-slate-800/40' : 'border-transparent text-slate-400'
            }`}
          >
            Live Remote
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {pairingStatus && (
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs font-mono text-cyan-300">
              {pairingStatus}
            </div>
          )}

          {activeTab === 'boards' && (
            <div className="space-y-3">
              <span className="text-xs font-mono text-slate-400 uppercase">Available Classroom Surfaces</span>
              <div className="space-y-2">
                {boards.map((b) => (
                  <div
                    key={b.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      selectedBoardId === b.id ? 'bg-slate-800/80 border-cyan-500/50' : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                        <Tv className="w-3.5 h-3.5 text-cyan-400" />
                        {b.displayName}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">{b.classroomName}</p>
                    </div>

                    <button
                      onClick={() => handleSendSession(b.id)}
                      disabled={isLoading}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Send
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pair' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <KeyRound className="w-8 h-8 text-cyan-400 mx-auto" />
                <h4 className="text-xs font-bold text-white font-mono">Enter 6-Digit PIN on Screen</h4>
                <p className="text-[11px] text-slate-400">
                  Look at the physical classroom SmartBoard to read the ephemeral pairing challenge.
                </p>
                <input
                  type="text"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="e.g. 842109"
                  className="w-full text-center text-xl font-bold tracking-widest bg-slate-900 border border-slate-700 rounded-lg p-2 text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                onClick={handleClaimPairing}
                disabled={isLoading || pinInput.length < 6}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono cursor-pointer disabled:opacity-40 transition-colors"
              >
                {isLoading ? 'Pairing...' : 'Pair with SmartBoard'}
              </button>
            </div>
          )}

          {activeTab === 'remote' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <span className="text-[11px] font-mono text-cyan-400 uppercase">Currently Controlling</span>
                <h4 className="text-sm font-bold text-white font-mono">{courseCode} Lecture Presentation</h4>
                <div className="text-xs font-mono text-slate-400">Page {currentPageIndex + 1}</div>
              </div>

              {/* Navigation Controls */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleRemoteAction('PREV_PAGE')}
                  className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-mono text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-cyan-400" />
                  <span>Previous Page</span>
                </button>
                <button
                  onClick={() => handleRemoteAction('NEXT_PAGE')}
                  className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-mono text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-cyan-400" />
                  <span>Next Page</span>
                </button>
              </div>

              {/* Utility Actions (Clear Canvas / Laser / Knowledge) */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleRemoteAction('CLEAR_PAGE')}
                  className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 font-mono text-xs text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clear Canvas</span>
                </button>
                <button
                  onClick={() => handleRemoteAction('TOGGLE_LASER')}
                  className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 font-mono text-xs text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>Laser Pointer</span>
                </button>
              </div>

              {/* D.13 Board Knowledge Actions */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/30 space-y-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Board Knowledge Actions</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/education/smartboard/knowledge/release', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ boardDocId: `doc-${activeSessionId}`, isReleased: true })
                        });
                        const data = await res.json();
                        setPairingStatus(res.ok ? 'Whiteboard published to enrolled students!' : data.error);
                      } catch {
                        setPairingStatus('Error publishing board');
                      }
                    }}
                    className="py-2 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Publish Board</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/education/smartboard/knowledge/index', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ boardDocId: `doc-${activeSessionId}`, triggerRagIngest: true })
                        });
                        const data = await res.json();
                        setPairingStatus(res.ok ? 'Board indexed into Knowledge Space!' : data.error);
                      } catch {
                        setPairingStatus('Error indexing board');
                      }
                    }}
                    className="py-2 px-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Sync Knowledge</span>
                  </button>
                </div>
              </div>

              {/* Emergency / End Action */}
              <button
                onClick={() => handleRemoteAction('END_SESSION')}
                className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Power className="w-4 h-4" /> End SmartBoard Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
