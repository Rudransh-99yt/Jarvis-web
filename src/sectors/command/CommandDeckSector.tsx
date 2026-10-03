import React from 'react';
import { ArcReactor } from '../../components/ArcReactor.tsx';
import { SystemTelemetry } from '../../components/SystemTelemetry.tsx';
import { ProtocolsPanel } from '../../components/ProtocolsPanel.tsx';
import { ArmorMatrix } from '../../components/ArmorMatrix.tsx';
import { MemosPanel } from '../../components/MemosPanel.tsx';
import { TerminalLogs } from '../../components/TerminalLogs.tsx';
import { AudioWaveform } from '../../components/AudioWaveform.tsx';
import type { ArmorMark, StarkProtocol, StarkDirective, TerminalLog, HudTheme } from '../../types.ts';

interface CommandDeckSectorProps {
  // Telemetry & States
  corePower: number;
  temperature: number;
  plasmaStability: number;
  efficiency: number;
  isOverclocked: boolean;
  isScanning: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isTransmitting: boolean;
  activeSuit: ArmorMark;
  armors: ArmorMark[];
  protocols: StarkProtocol[];
  directives: StarkDirective[];
  logs: TerminalLog[];
  theme?: HudTheme;
  // Actions
  onCoreClick: () => void;
  onRunScan: () => void;
  onToggleOverclock: () => void;
  onToggleProtocol: (id: string) => void;
  onSelectSuit: (suit: ArmorMark) => void;
  onToggleArmorDeploy: (id: string) => void;
  onAddDirective: (text: string) => void;
  onToggleDirective: (id: string) => void;
  onDeleteDirective: (id: string) => void;
  onToggleVoice: () => void;
  onExecuteCommand: (command: string) => void;
  onClearLogs: () => void;
}

export const CommandDeckSector: React.FC<CommandDeckSectorProps> = ({
  corePower,
  isOverclocked,
  isScanning,
  isSpeaking,
  isListening,
  isTransmitting,
  activeSuit,
  armors,
  protocols,
  directives,
  logs,
  theme = 'cyan',
  onRunScan,
  onToggleOverclock,
  onToggleProtocol,
  onToggleArmorDeploy,
  onAddDirective,
  onToggleDirective,
  onDeleteDirective,
  onToggleVoice,
  onExecuteCommand,
  onClearLogs
}) => {
  return (
    <div className="space-y-6">
      {/* Sector Sub-header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-cyan-500/20 bg-black/40 px-4 py-3 rounded-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
            SECTOR: COMMAND DECK // CORE TACTICAL OPERATIONS
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-cyan-400/70">
          <span>ARC POWER: <strong className="text-cyan-300">{corePower.toFixed(1)} GW</strong></span>
          <span>•</span>
          <span>SHIELD RESONANCE: <strong className="text-cyan-300">94.0%</strong></span>
          <span>•</span>
          <span>DEFCON: <strong className="text-emerald-400">5 (NOMINAL)</strong></span>
        </div>
      </div>

      {/* Primary Tri-Column HUD Cockpit Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Directives & Telemetry */}
        <div className="space-y-6 lg:col-span-3">
          <MemosPanel
            directives={directives}
            onAddDirective={onAddDirective}
            onToggleDirective={onToggleDirective}
            onDeleteDirective={onDeleteDirective}
          />
          <SystemTelemetry
            theme={theme}
            isScanning={isScanning}
          />
        </div>

        {/* Center Column: Arc Reactor Core & Holographic Waveform */}
        <div className="flex flex-col items-center justify-between space-y-6 lg:col-span-6">
          <ArcReactor
            theme={theme}
            isSpeaking={isSpeaking}
            isListening={isListening}
            onOverdrive={onToggleOverclock}
          />

          <div className="w-full">
            <AudioWaveform isSpeaking={isSpeaking} isListening={isListening} theme={theme} />
          </div>
        </div>

        {/* Right Column: Protocols & Armor Matrix */}
        <div className="space-y-6 lg:col-span-3">
          <ProtocolsPanel protocols={protocols} onToggleProtocol={onToggleProtocol} />
          <ArmorMatrix
            armors={armors}
            selectedArmorId={activeSuit.id}
            onToggleArmorDeploy={onToggleArmorDeploy}
          />
        </div>
      </div>

      {/* Terminal & Tactical Log Console */}
      <div className="w-full">
        <TerminalLogs
          logs={logs}
          isListening={isListening}
          isSpeaking={isSpeaking}
          isTransmitting={isTransmitting}
          onStartVoice={onToggleVoice}
          onStopVoice={onToggleVoice}
          onClearLogs={onClearLogs}
          onExecuteCommand={onExecuteCommand}
        />
      </div>
    </div>
  );
};
