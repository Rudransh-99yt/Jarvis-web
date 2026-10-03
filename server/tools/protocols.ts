import { Type } from '@google/genai';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from './types.ts';

export interface ServerProtocol {
  id: 'house_party' | 'defense_matrix' | 'stealth_mode' | 'clean_slate';
  code: string;
  name: string;
  description: string;
  category: 'Assault' | 'Defense' | 'Emergency';
  active: boolean;
  soundCue: 'affirmative' | 'scan' | 'warning';
}

export const ALLOWED_PROTOCOL_IDS = ['house_party', 'defense_matrix', 'stealth_mode', 'clean_slate'] as const;
export type AllowedProtocolId = typeof ALLOWED_PROTOCOL_IDS[number];

class ServerProtocolStore {
  private protocols: Map<AllowedProtocolId, ServerProtocol> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  resetToDefaults(): void {
    const defaults: ServerProtocol[] = [
      {
        id: 'house_party',
        code: 'PROTOCOL-07',
        name: 'House Party',
        description: 'Deploys all automated autonomous Iron Man armor suits from subterranean storage.',
        category: 'Assault',
        active: false,
        soundCue: 'affirmative'
      },
      {
        id: 'defense_matrix',
        code: 'DEF-900',
        name: 'Defense Matrix',
        description: 'Elevates electromagnetic shield harmonics to maximum resilience across perimeter.',
        category: 'Defense',
        active: false,
        soundCue: 'scan'
      },
      {
        id: 'stealth_mode',
        code: 'STL-44',
        name: 'Stealth Camouflage',
        description: 'Dampens acoustic signatures and shifts optical refraction to active camouflage.',
        category: 'Defense',
        active: false,
        soundCue: 'scan'
      },
      {
        id: 'clean_slate',
        code: 'OMEGA-00',
        name: 'Clean Slate',
        description: 'Emergency security protocol to purge localized data caches and seal vaults.',
        category: 'Emergency',
        active: false,
        soundCue: 'warning'
      }
    ];

    this.protocols.clear();
    for (const proto of defaults) {
      this.protocols.set(proto.id, proto);
    }
  }

  getAll(): ServerProtocol[] {
    return Array.from(this.protocols.values());
  }

  get(id: AllowedProtocolId): ServerProtocol | undefined {
    return this.protocols.get(id);
  }

  setProtocol(id: AllowedProtocolId, active: boolean): { ok: boolean; protocol?: ServerProtocol; previousState?: boolean; error?: string } {
    const current = this.protocols.get(id);
    if (!current) {
      return { ok: false, error: `Protocol '${id}' is not recognized.` };
    }
    const previousState = current.active;
    current.active = active;
    return { ok: true, protocol: { ...current }, previousState };
  }

  getActiveProtocols(): ServerProtocol[] {
    return this.getAll().filter((p) => p.active);
  }
}

export const serverProtocolStore = new ServerProtocolStore();

// Tool: get_protocols (aliases: system.protocols.get)
export const getProtocolsTool: ToolDefinition<{}> = {
  name: 'get_protocols',
  sector: 'system',
  aliases: ['system.protocols.get', 'system.protocols', 'get_system_protocols'],
  description: 'Returns the current state and configuration of all Stark tactical security protocols.',
  declaration: {
    name: 'get_protocols',
    description: 'Retrieve current operational status and parameters for all Stark protocols (House Party, Defense Matrix, Stealth, Clean Slate).',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  validate(_args: unknown): ValidationResult<{}> {
    return { valid: true, data: {} };
  },
  async execute(_args: {}, _context: ToolExecutionContext): Promise<ToolResult> {
    const protocols = serverProtocolStore.getAll();
    const active = protocols.filter((p) => p.active).map((p) => p.name);
    return {
      ok: true,
      data: {
        totalProtocols: protocols.length,
        activeProtocolsCount: active.length,
        activeProtocols: active,
        protocols: protocols.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          category: p.category,
          active: p.active
        }))
      }
    };
  }
};

interface SetProtocolArgs {
  protocolId: AllowedProtocolId;
  active: boolean;
}

// Tool: set_protocol (aliases: system.protocols.set)
export const setProtocolTool: ToolDefinition<SetProtocolArgs> = {
  name: 'set_protocol',
  sector: 'system',
  aliases: ['system.protocols.set', 'set_system_protocol'],
  description: 'Enables or disables an explicitly allowlisted Stark tactical security protocol.',
  declaration: {
    name: 'set_protocol',
    description: 'Set the active state of an approved protocol (house_party, defense_matrix, stealth_mode, clean_slate).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        protocolId: {
          type: Type.STRING,
          description: "Target protocol identifier. Must be one of: 'house_party', 'defense_matrix', 'stealth_mode', 'clean_slate'."
        },
        active: {
          type: Type.BOOLEAN,
          description: 'True to engage/enable the protocol; false to disengage/disable it.'
        }
      },
      required: ['protocolId', 'active']
    }
  },
  validate(args: unknown): ValidationResult<SetProtocolArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: false, error: 'Arguments must be an object with protocolId and active.' };
    }
    const raw = args as Record<string, unknown>;

    if (typeof raw.protocolId !== 'string') {
      return { valid: false, error: "Parameter 'protocolId' must be a string." };
    }

    const normalizedId = raw.protocolId.trim().toLowerCase();
    if (!ALLOWED_PROTOCOL_IDS.includes(normalizedId as AllowedProtocolId)) {
      return {
        valid: false,
        error: `Invalid protocolId '${raw.protocolId}'. Allowed protocols: ${ALLOWED_PROTOCOL_IDS.join(', ')}.`
      };
    }

    if (typeof raw.active !== 'boolean') {
      return { valid: false, error: "Parameter 'active' must be a boolean (true or false)." };
    }

    return {
      valid: true,
      data: {
        protocolId: normalizedId as AllowedProtocolId,
        active: raw.active
      }
    };
  },
  async execute(args: SetProtocolArgs, context: ToolExecutionContext): Promise<ToolResult> {
    const updateResult = serverProtocolStore.setProtocol(args.protocolId, args.active);
    if (!updateResult.ok || !updateResult.protocol) {
      return {
        ok: false,
        error: {
          code: 'PROTOCOL_UPDATE_FAILED',
          message: updateResult.error || 'Failed to update protocol.'
        }
      };
    }

    const proto = updateResult.protocol;
    return {
      ok: true,
      data: {
        protocolId: proto.id,
        code: proto.code,
        name: proto.name,
        active: proto.active,
        previousState: updateResult.previousState,
        category: proto.category,
        timestamp: context.timestamp,
        notification: `Protocol [${proto.name}] is now ${proto.active ? 'ENGAGED' : 'DISENGAGED'}.`
      }
    };
  }
};
