import React from 'react';
import { Shield, Flame, EyeOff, Radio, Lock, Zap } from 'lucide-react';
import { StarkProtocol } from '../types';
import { soundEffects } from '../services/soundEffects';

interface ProtocolsPanelProps {
  protocols: StarkProtocol[];
  onToggleProtocol: (protocolId: string) => void;
}

export const ProtocolsPanel: React.FC<ProtocolsPanelProps> = ({
  protocols,
  onToggleProtocol
}) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'house_party':
        return <Flame className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'clean_slate':
        return <Lock className="w-4 h-4 text-red-400 shrink-0" />;
      case 'defense_matrix':
        return <Shield className="w-4 h-4 text-cyan-400 shrink-0" />;
      case 'stealth_mode':
        return <EyeOff className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'sentry_overdrive':
        return <Zap className="w-4 h-4 text-yellow-300 shrink-0" />;
      case 'satellite_uplink':
      default:
        return <Radio className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col gap-2.5 font-mono-code text-xs w-full min-w-0">
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 gap-2 min-w-0">
        <span className="text-cyan-300 font-bold tracking-wider flex items-center gap-1.5 truncate">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
          STARK PROTOCOLS MATRIX
        </span>
        <span className="text-[10px] text-cyan-400/60 uppercase shrink-0">AUTHORITY OVERRIDE</span>
      </div>

      <div className="flex flex-col gap-2 w-full min-w-0">
        {protocols.map((protocol) => (
          <button
            key={protocol.id}
            onClick={() => {
              if (protocol.active) {
                soundEffects.playClick();
              } else {
                soundEffects.playAffirmative();
              }
              onToggleProtocol(protocol.id);
            }}
            className={`p-2.5 rounded border text-left transition-all relative overflow-hidden group flex flex-col justify-between w-full min-w-0 cursor-pointer ${
              protocol.active
                ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-black/50 border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-950/20'
            }`}
          >
            {/* Active Glow Indicator */}
            {protocol.active && (
              <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-400/10 rounded-bl-full pointer-events-none" />
            )}

            <div className="w-full min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getIcon(protocol.id)}
                  <span className="font-orbitron font-bold text-white text-xs truncate">
                    {protocol.name}
                  </span>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                    protocol.active
                      ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/60'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {protocol.active ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
              <p className="text-[10px] text-cyan-300/70 leading-relaxed break-words mb-2">
                {protocol.description}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 text-[9px] text-cyan-400/50 border-t border-cyan-500/10 pt-1.5 mt-1 w-full min-w-0">
              <span className="truncate">CODE: {protocol.code}</span>
              <span className="text-cyan-300 font-bold group-hover:text-cyan-100 shrink-0">
                {protocol.active ? 'DISENGAGE' : 'ENGAGE'} →
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
