import { Type } from '@google/genai';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from './types.ts';
import { providerManager } from '../providers/providerManager.ts';
import { sessionStore } from '../session/sessionStore.ts';

// Tool: get_system_health (aliases: system.health)
export const getSystemHealthTool: ToolDefinition<{}> = {
  name: 'get_system_health',
  sector: 'system',
  aliases: ['system.health', 'system_health'],
  description: 'Returns real-time health, uptime, provider link status, and session metrics for Jarvis-Web.',
  declaration: {
    name: 'get_system_health',
    description: 'Retrieve current operational status, subsystem integrity, AI provider satellite link state, and server uptime.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  validate(_args: unknown): ValidationResult<{}> {
    return { valid: true, data: {} };
  },
  async execute(_args: {}, context: ToolExecutionContext): Promise<ToolResult> {
    const { provider, isFallback } = providerManager.getActiveProvider();

    return {
      ok: true,
      data: {
        status: 'healthy',
        service: 'web-jarvis-api',
        version: '1.2.0',
        uptimeSeconds: context.serverUptime,
        timestamp: context.timestamp,
        nodeEnvironment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        activeSessions: (sessionStore as any).sessions?.size ?? 1,
        satelliteProvider: {
          name: provider.name,
          online: !isFallback,
          latency: 'NOMINAL (<45ms)'
        },
        subsystems: {
          arcReactor: 'NOMINAL',
          shieldHarmonics: 'STABLE',
          holographicHUD: 'SYNCHRONIZED',
          audioSynthesis: 'READY'
        }
      }
    };
  }
};

// Tool: get_time (aliases: system.time)
export const getTimeTool: ToolDefinition<{}> = {
  name: 'get_time',
  sector: 'system',
  aliases: ['system.time', 'system_time'],
  description: 'Returns the current server clock time, date, UTC timestamp, and Stark system epoch.',
  declaration: {
    name: 'get_time',
    description: 'Get current chronological time, UTC timestamp, and Stark epoch cycle.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  validate(_args: unknown): ValidationResult<{}> {
    return { valid: true, data: {} };
  },
  async execute(_args: {}, context: ToolExecutionContext): Promise<ToolResult> {
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      ok: true,
      data: {
        iso: now.toISOString(),
        utc: now.toUTCString(),
        formattedTime: now.toLocaleTimeString('en-US', { hour12: false }),
        formattedDate: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        starkEpoch: `STARK-OS-${now.getFullYear()}.${dayOfYear}`,
        timestamp: context.timestamp
      }
    };
  }
};
