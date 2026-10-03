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
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'clean_slate':
        return <Lock className="w-4 h-4 text-red-400" />;
      case 'defense_matrix':
        return <Shield className="w-4 h-4 text-cyan-400" />;
      case 'stealth_mode':
        return <EyeOff className="w-4 h-4 text-emerald-400" />;
      case 'sentry_overdrive':
        return <Zap className="w-4 h-4 text-yellow-300" />;
      case 'satellite_uplink':
      default:
        return <Radio className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-2 font-mono-code text-xs">
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
        <span className="text-cyan-300 font-bold tracking-wider flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-cyan-400" />
          STARK PROTOCOLS MATRIX
        </span>
        <span className="text-[10px] text-cyan-400/60 uppercase">AUTHORITY OVERRIDE</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            className={`p-2.5 rounded border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
              protocol.active
                ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-black/50 border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-950/20'
            }`}
          >
            {/* Active Glow Indicator */}
            {protocol.active && (
              <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-400/10 rounded-bl-full pointer-events-none" />
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {getIcon(protocol.id)}
                  <span className="font-orbitron font-bold text-white text-[12px]">
                    {protocol.name}
                  </span>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    protocol.active
                      ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/60'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {protocol.active ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
              <p className="text-[10px] text-cyan-300/70 leading-relaxed mb-2">
                {protocol.description}
              </p>
            </div>

            <div className="flex items-center justify-between text-[9px] text-cyan-400/50 border-t border-cyan-500/10 pt-1 mt-1">
              <span>CODE: {protocol.code}</span>
              <span className="text-cyan-300 font-bold group-hover:text-cyan-100">
                {protocol.active ? 'DISENGAGE' : 'ENGAGE'} →
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
