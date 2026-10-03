import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Mic, MicOff, Trash2, Loader2 } from 'lucide-react';
import { TerminalLog } from '../types';
import { soundEffects } from '../services/soundEffects';

interface TerminalLogsProps {
  logs: TerminalLog[];
  onExecuteCommand: (command: string) => void;
  onClearLogs: () => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  isTransmitting?: boolean;
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({
  logs,
  onExecuteCommand,
  onClearLogs,
  onStartVoice,
  onStopVoice,
  isListening,
  isSpeaking,
  isTransmitting = false
}) => {
  const [inputVal, setInputVal] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isTransmitting) return;
    soundEffects.playClick();
    onExecuteCommand(inputVal.trim());
    setInputVal('');
  };

  const quickCommands = [
    'Status Report',
    'House Party Protocol',
    'Arc Reactor Power',
    'Atmospheric Weather',
    'Perimeter Security',
    'Calculate 250 * 4.8'
  ];

  const getLogStyle = (type: TerminalLog['type']) => {
    switch (type) {
      case 'user':
        return 'text-amber-300 font-semibold';
      case 'jarvis':
        return 'text-cyan-200 border-l-2 border-cyan-400 pl-2 bg-cyan-950/20 py-0.5';
      case 'protocol':
        return 'text-yellow-400 font-bold';
      case 'alert':
        return 'text-red-400 font-bold bg-red-950/30 px-1 py-0.5 rounded';
      case 'system':
      default:
        return 'text-cyan-500/70';
    }
  };

  return (
    <div className="flex flex-col gap-2 font-mono-code text-xs h-full bg-black/60 border border-cyan-500/20 rounded p-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-300 font-bold tracking-wider">COMMAND INTERFACE & LOGS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-cyan-500/70">
            {isTransmitting
              ? 'UPLINK ACTIVE (STREAMING)...'
              : isSpeaking
              ? 'JARVIS SPEAKING...'
              : isListening
              ? 'LISTENING TO MICROPHONE...'
              : 'READY FOR INPUT'}
          </span>
          <button
            onClick={() => {
              soundEffects.playClick();
              onClearLogs();
            }}
            title="Clear Log Feed"
            className="p-1 text-cyan-400/50 hover:text-cyan-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Log Terminal Feed */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto space-y-1.5 p-2 bg-black/50 border border-cyan-500/10 rounded min-h-[140px] max-h-[220px]"
      >
        {logs.map((log) => (
          <div key={log.id} className={`text-[11px] leading-relaxed flex gap-2 ${getLogStyle(log.type)}`}>
            <span className="text-cyan-600 shrink-0 text-[10px]">[{log.timestamp}]</span>
            <span className="font-bold text-cyan-400 shrink-0">
              {log.type === 'user' ? 'STARK >' : log.type === 'jarvis' ? 'JARVIS :' : 'SYS >'}
            </span>
            <span className="break-words whitespace-pre-wrap">{log.message}</span>
          </div>
        ))}
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {quickCommands.map((cmd) => (
          <button
            key={cmd}
            disabled={isTransmitting}
            onClick={() => {
              soundEffects.playClick();
              onExecuteCommand(cmd);
            }}
            className={`px-2 py-0.5 rounded text-[10px] border whitespace-nowrap transition-colors ${
              isTransmitting
                ? 'opacity-50 cursor-not-allowed bg-cyan-950/20 border-cyan-500/10 text-cyan-500/40'
                : 'bg-cyan-950/40 hover:bg-cyan-900/60 border-cyan-500/20 text-cyan-300'
            }`}
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Input & Voice Bar */}
      <form onSubmit={handleSubmit} className="flex gap-1.5 pt-1">
        <button
          type="button"
          disabled={isTransmitting}
          onClick={() => {
            if (isListening) {
              soundEffects.playClick();
              onStopVoice();
            } else {
              soundEffects.playAffirmative();
              onStartVoice();
            }
          }}
          title={isListening ? 'Stop Listening' : 'Speak to Jarvis (Voice Input)'}
          className={`px-3 py-1.5 rounded border transition-all flex items-center gap-1.5 text-xs font-bold ${
            isListening
              ? 'bg-red-500/30 border-red-500 text-red-200 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]'
              : 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-400 text-cyan-200'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-cyan-300" />}
          <span>{isListening ? 'LISTENING' : 'VOICE'}</span>
        </button>

        <input
          type="text"
          value={inputVal}
          disabled={isTransmitting}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={
            isTransmitting
              ? 'Synthesizing neural response...'
              : isListening
              ? 'Listening for your voice...'
              : 'Type directive or voice command (e.g., "What is the speed of light?")...'
          }
          className="flex-1 bg-black/80 border border-cyan-500/30 rounded px-3 py-1.5 text-xs text-white placeholder-cyan-500/40 focus:outline-none focus:border-cyan-400 font-mono-code disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={isTransmitting || !inputVal.trim()}
          className={`px-3.5 py-1.5 rounded flex items-center gap-1 font-bold transition-all border ${
            isTransmitting
              ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400/60 cursor-not-allowed'
              : 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
          }`}
        >
          {isTransmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{isTransmitting ? 'UPLINK' : 'TRANSMIT'}</span>
        </button>
      </form>
    </div>
  );
};
