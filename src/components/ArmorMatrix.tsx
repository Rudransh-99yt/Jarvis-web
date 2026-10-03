import React, { useState } from 'react';
import { Shield, Zap, Crosshair, ChevronRight, Check } from 'lucide-react';
import { ArmorMark } from '../types';
import { soundEffects } from '../services/soundEffects';

interface ArmorMatrixProps {
  armors: ArmorMark[];
  onToggleArmorDeploy: (armorId: string) => void;
  selectedArmorId?: string;
}

export const ArmorMatrix: React.FC<ArmorMatrixProps> = ({
  armors,
  onToggleArmorDeploy,
  selectedArmorId
}) => {
  const [activeSuitId, setActiveSuitId] = useState<string>(selectedArmorId || armors[armors.length - 1].id);

  const currentArmor = armors.find((a) => a.id === activeSuitId) || armors[0];

  const handleSelect = (id: string) => {
    soundEffects.playClick();
    setActiveSuitId(id);
  };

  const handleDeployToggle = (id: string) => {
    soundEffects.playAffirmative();
    onToggleArmorDeploy(id);
  };

  return (
    <div className="flex flex-col gap-2.5 font-mono-code text-xs h-full">
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
        <span className="text-cyan-300 font-bold tracking-wider flex items-center gap-1.5">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          ARMOR FLEET VAULT
        </span>
        <span className="text-[10px] text-cyan-400/60 uppercase">
          {armors.filter((a) => a.status === 'Deployed').length} SUITS DEPLOYED
        </span>
      </div>

      {/* Suit Selector Badges */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {armors.map((armor) => (
          <button
            key={armor.id}
            onClick={() => handleSelect(armor.id)}
            className={`px-2.5 py-1 rounded text-[10px] font-orbitron font-bold transition-all whitespace-nowrap border ${
              armor.id === activeSuitId
                ? 'bg-cyan-500/30 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                : 'bg-black/40 border-cyan-500/20 text-cyan-400/70 hover:border-cyan-500/40 hover:text-cyan-200'
            }`}
          >
            {armor.designation}
          </button>
        ))}
      </div>

      {/* Selected Armor Detailed Card */}
      <div className="bg-black/50 border border-cyan-500/30 rounded p-3 relative overflow-hidden flex-1 flex flex-col justify-between">
        {/* Hologram Corner Accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/10 to-transparent pointer-events-none" />

        <div>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-orbitron font-bold text-white tracking-wide">
                  {currentArmor.name}
                </h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  {currentArmor.class}
                </span>
              </div>
              <span className="text-[10px] text-cyan-400/70">DESIGNATION: {currentArmor.designation}</span>
            </div>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                currentArmor.status === 'Deployed'
                  ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300'
              }`}
            >
              {currentArmor.status}
            </span>
          </div>

          <p className="text-[11px] text-cyan-200/80 leading-relaxed mb-3">
            {currentArmor.description}
          </p>

          {/* Armor Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-[10px]">
            <div className="bg-black/40 border border-cyan-500/20 rounded p-1.5">
              <span className="text-cyan-400/60 block">POWER SPEC</span>
              <span className="text-white font-orbitron font-bold">{currentArmor.powerOutput}</span>
            </div>
            <div className="bg-black/40 border border-cyan-500/20 rounded p-1.5">
              <span className="text-cyan-400/60 block">INTEGRITY</span>
              <span className="text-emerald-400 font-orbitron font-bold">{currentArmor.integrity}%</span>
            </div>
          </div>

          {/* Integrated Weapon Loadout */}
          <div className="space-y-1 mb-3">
            <span className="text-[10px] text-cyan-400/70 font-bold block">INTEGRATED SYSTEMS</span>
            <div className="flex flex-wrap gap-1">
              {currentArmor.features.map((feat, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-950/50 border border-cyan-500/20 text-cyan-200"
                >
                  {feat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Deploy Action Button */}
        <button
          onClick={() => handleDeployToggle(currentArmor.id)}
          className={`w-full py-1.5 rounded font-orbitron text-[11px] font-bold tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
            currentArmor.status === 'Deployed'
              ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-300'
              : 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
          }`}
        >
          {currentArmor.status === 'Deployed' ? (
            <>RECALL TO VAULT POD</>
          ) : (
            <>DEPLOY CHASSIS TO FLIGHT DECK</>
          )}
        </button>
      </div>
    </div>
  );
};
