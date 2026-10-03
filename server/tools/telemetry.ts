import { Type } from '@google/genai';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from './types.ts';
import { serverProtocolStore } from './protocols.ts';

// Simulated Stark Armor Fleet State
export interface ArmorData {
  id: string;
  designation: string;
  name: string;
  class: string;
  powerOutput: string;
  status: 'Standby' | 'Deployed' | 'Maintenance';
  integrity: number;
  description: string;
  features: string[];
}

const ARMOR_FLEET: ArmorData[] = [
  {
    id: 'mark3',
    designation: 'MARK III',
    name: 'Classic Gold-Titanium',
    class: 'Heavy Combat Multi-Role',
    powerOutput: '1.8 GW Palladium',
    status: 'Standby',
    integrity: 94,
    description: 'Iconic Gold-Titanium alloy with twin palm repulsors and chest uni-beam.',
    features: ['Anti-Icing Heaters', 'Flares Countermeasure', 'Supersonic Flight']
  },
  {
    id: 'mark7',
    designation: 'MARK VII',
    name: 'Rapid Deployment Pod',
    class: 'Avenger Vanguard',
    powerOutput: '2.4 GW Arc',
    status: 'Standby',
    integrity: 96,
    description: 'Equipped with laser-guided airborne homing pods for zero-gantry mid-air donning.',
    features: ['Rotary Micro-Missiles', 'Triple Laser Pods', 'Heavy Thruster Array']
  },
  {
    id: 'mark42',
    designation: 'MARK XLII',
    name: 'Autonomous Prehensile',
    class: 'Modular Telepresence',
    powerOutput: '2.9 GW Arc',
    status: 'Standby',
    integrity: 88,
    description: 'Subcutaneous micro-transponder tracking enables each piece to fly independently.',
    features: ['Prehensile Propulsion', 'Neural Telepresence', 'Sub-Orbital Recovery']
  },
  {
    id: 'mark44',
    designation: 'MARK XLIV',
    name: 'Hulkbuster',
    class: 'Super-Heavy Titan Exo',
    powerOutput: '7.5 GW Dual-Core',
    status: 'Standby',
    integrity: 100,
    description: 'Veronica satellite-deployed orbital fortress chassis for extreme kinetic containment.',
    features: ['Hydraulic Pneumatics', 'In-Flight Replacement Limbs', 'Impact Dampeners']
  },
  {
    id: 'mark50',
    designation: 'MARK L',
    name: 'Bleeding Edge Nanotech',
    class: 'Liquid Nanomaterial',
    powerOutput: '4.2 GW Nano-Arc',
    status: 'Standby',
    integrity: 98,
    description: 'Stores nanoparticles inside chest housing, instantaneously manifesting weaponry and shields.',
    features: ['Nanotech Manifestation', 'Zero-G Thruster Wings', 'Energy Shields']
  },
  {
    id: 'mark85',
    designation: 'MARK LXXXV',
    name: 'Cosmic Nanotech Pinnacle',
    class: 'Omega Vanguard',
    powerOutput: '6.0 GW Quantum Arc',
    status: 'Standby',
    integrity: 100,
    description: 'Reinforced nano-structure engineered with cosmic energy channeling for ultimate resilience.',
    features: ['Nano Lightning Refocuser', 'Cosmic Energy Baffling', 'Energy Blade Array']
  }
];

// Tool: get_system_telemetry (aliases: system.telemetry)
export const getSystemTelemetryTool: ToolDefinition<{}> = {
  name: 'get_system_telemetry',
  sector: 'system',
  aliases: ['system.telemetry', 'system_telemetry'],
  description: 'Returns real-time engineering telemetry for the Arc Reactor, Quantum Core, electromagnetic shields, and threat assessment.',
  declaration: {
    name: 'get_system_telemetry',
    description: 'Retrieve real-time power grid output, core temperature, plasma stability, and shield harmonics from the Stark HUD telemetry bus.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  validate(_args: unknown): ValidationResult<{}> {
    return { valid: true, data: {} };
  },
  async execute(_args: {}, context: ToolExecutionContext): Promise<ToolResult> {
    const activeProtocols = serverProtocolStore.getActiveProtocols();

    return {
      ok: true,
      data: {
        timestamp: context.timestamp,
        threatLevel: activeProtocols.some((p) => p.category === 'Emergency') ? 'DEFCON 2 - ELEVATED ALERT' : 'DEFCON 5 - PEACETIME NOMINAL',
        arcReactor: {
          coreOutputGW: 3.2,
          coreTempK: 412,
          plasmaStabilityPct: 99.4,
          efficiencyPct: 98.7,
          fluxFrequencyHz: 60.02,
          status: 'NOMINAL'
        },
        quantumCore: {
          syncRatePct: 99.2,
          computeThroughput: '4.8 PFLOPS',
          entropyRatio: 0.0012,
          coherenceState: 'COHERENT'
        },
        defenseShields: {
          harmonicResonancePct: 94.0,
          perimeterCoveragePct: 100,
          vectorArray: 'ACTIVE_POLARIZED',
          reinforcementWards: activeProtocols.some((p) => p.id === 'defense_matrix') ? 'OVERCHARGED' : 'STANDARD'
        },
        activeProtocols: activeProtocols.map((p) => p.name)
      }
    };
  }
};

interface GetArmorStatusArgs {
  armorId?: string;
}

// Tool: get_armor_status (aliases: system.armor.status, system.armor)
export const getArmorStatusTool: ToolDefinition<GetArmorStatusArgs> = {
  name: 'get_armor_status',
  sector: 'system',
  aliases: ['system.armor.status', 'system.armor', 'get_armor_fleet'],
  description: 'Returns operational status, structural integrity, power rating, and deployment state of Iron Man armor marks in the Stark subterranean vault.',
  declaration: {
    name: 'get_armor_status',
    description: 'Inspect status, integrity, and deployment readiness of Stark armor marks (or an individual mark by ID).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        armorId: {
          type: Type.STRING,
          description: "Optional specific armor identifier (e.g., 'mark3', 'mark7', 'mark42', 'mark44', 'mark50', 'mark85'). If omitted, returns entire fleet status."
        }
      }
    }
  },
  validate(args: unknown): ValidationResult<GetArmorStatusArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: true, data: {} };
    }
    const raw = args as Record<string, unknown>;
    if (raw.armorId !== undefined) {
      if (typeof raw.armorId !== 'string') {
        return { valid: false, error: "Optional 'armorId' must be a string." };
      }
      return { valid: true, data: { armorId: raw.armorId.trim().toLowerCase() } };
    }
    return { valid: true, data: {} };
  },
  async execute(args: GetArmorStatusArgs, _context: ToolExecutionContext): Promise<ToolResult> {
    if (args.armorId) {
      const match = ARMOR_FLEET.find(
        (a) => a.id.toLowerCase() === args.armorId || a.designation.toLowerCase().replace(/\s+/g, '') === args.armorId?.replace(/\s+/g, '')
      );
      if (!match) {
        return {
          ok: false,
          error: {
            code: 'ARMOR_NOT_FOUND',
            message: `Armor suit '${args.armorId}' is not found in Stark subterranean inventory.`
          }
        };
      }
      return {
        ok: true,
        data: {
          armor: match
        }
      };
    }

    const housePartyActive = serverProtocolStore.get('house_party')?.active ?? false;
    const fleetStatus = ARMOR_FLEET.map((a) => ({
      ...a,
      status: housePartyActive ? 'Deployed' : a.status
    }));

    return {
      ok: true,
      data: {
        totalSuits: fleetStatus.length,
        deployedCount: fleetStatus.filter((a) => a.status === 'Deployed').length,
        standbyCount: fleetStatus.filter((a) => a.status === 'Standby').length,
        averageIntegrity: Math.round(
          fleetStatus.reduce((acc, curr) => acc + curr.integrity, 0) / fleetStatus.length
        ),
        armors: fleetStatus
      }
    };
  }
};
