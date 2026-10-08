import { providerManager } from '../providers/providerManager.ts';
import { toolRegistry } from '../tools/index.ts';
import { storageManager } from '../storage/index.ts';
import { jarvisData } from '../data/index.ts';
import { getAlphaAllowlistConfig } from '../auth/alphaAllowlist.ts';
import type { SubsystemCategory } from '../logging/logger.ts';

export interface SubsystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: Record<string, unknown>;
  error?: string;
}

export interface ProductionDiagnosticsResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  failedSubsystems: SubsystemCategory[];
  subsystems: {
    JARVIS_APP: SubsystemHealth;
    BACKEND: SubsystemHealth;
    DATABASE: SubsystemHealth;
    STORAGE: SubsystemHealth;
    GEMINI: SubsystemHealth;
    AUTH: SubsystemHealth;
  };
  // Preserved backwards compatibility properties
  provider: {
    name: string;
    available: boolean;
  };
  sectors: {
    active: string[];
    available: string[];
  };
  tools: {
    count: number;
    registered: string[];
  };
  persistence: {
    driver: string;
    persistent: boolean;
    path?: string;
  };
  storage: {
    provider: string;
    ready: boolean;
  };
}

export async function getProductionDiagnostics(startTime: number): Promise<ProductionDiagnosticsResponse> {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const { provider, isFallback } = providerManager.getActiveProvider();
  const allowlistConfig = getAlphaAllowlistConfig();
  const failedSubsystems: SubsystemCategory[] = [];

  // 1. JARVIS_APP Subsystem
  const appHealth: SubsystemHealth = {
    status: 'healthy',
    details: {
      uptimeSeconds,
      version: '1.5.0',
      activeSectors: ['command', 'education', 'research'],
      toolCount: toolRegistry.list().length
    }
  };

  // 2. BACKEND Subsystem
  const memory = process.memoryUsage();
  const backendHealth: SubsystemHealth = {
    status: 'healthy',
    details: {
      nodeVersion: process.version,
      platform: process.platform,
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      environment: process.env.NODE_ENV || 'development'
    }
  };

  // 3. DATABASE Subsystem
  let databaseHealth: SubsystemHealth;
  try {
    const isPersistent = jarvisData.isPersistent;
    const path = jarvisData.storagePath;
    databaseHealth = {
      status: 'healthy',
      details: {
        driver: 'json-file-store',
        persistent: isPersistent,
        storagePath: path || 'in-memory'
      }
    };
  } catch (_err) {
    failedSubsystems.push('DATABASE');
    databaseHealth = {
      status: 'unhealthy',
      error: 'Database initialization check failed'
    };
  }

  // 4. STORAGE Subsystem
  let storageHealth: SubsystemHealth;
  try {
    const storageProvider = storageManager.getProvider();
    storageHealth = {
      status: 'healthy',
      details: {
        provider: storageProvider.name,
        ready: true
      }
    };
  } catch (_err) {
    failedSubsystems.push('STORAGE');
    storageHealth = {
      status: 'unhealthy',
      error: 'Storage provider check failed'
    };
  }

  // 5. GEMINI Subsystem
  let geminiHealth: SubsystemHealth;
  try {
    const configured = provider.isConfigured();
    geminiHealth = {
      status: !isFallback && configured ? 'healthy' : isFallback ? 'degraded' : 'healthy',
      details: {
        providerName: provider.name,
        available: !isFallback,
        configured,
        fallbackMode: isFallback
      }
    };
  } catch (_err) {
    failedSubsystems.push('GEMINI');
    geminiHealth = {
      status: 'degraded',
      error: 'Gemini provider check failed'
    };
  }

  // 6. AUTH Subsystem
  const authHealth: SubsystemHealth = {
    status: 'healthy',
    details: {
      mode: 'hmac-sha256',
      alphaAllowlistActive: allowlistConfig.enabled,
      allowlistCount: allowlistConfig.allowedEntries.length
    }
  };

  const overallStatus =
    failedSubsystems.length === 0
      ? 'healthy'
      : failedSubsystems.includes('DATABASE')
      ? 'unhealthy'
      : 'degraded';

  return {
    status: overallStatus,
    service: 'web-jarvis-api',
    version: '1.5.0',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    failedSubsystems,
    subsystems: {
      JARVIS_APP: appHealth,
      BACKEND: backendHealth,
      DATABASE: databaseHealth,
      STORAGE: storageHealth,
      GEMINI: geminiHealth,
      AUTH: authHealth
    },
    // Backwards-compatible contract preserved for existing tests & UI
    provider: {
      name: provider.name,
      available: !isFallback
    },
    sectors: {
      active: ['command', 'education', 'research'],
      available: ['command', 'education', 'research', 'finance', 'home']
    },
    tools: {
      count: toolRegistry.list().length,
      registered: toolRegistry.list().map((t) => t.name)
    },
    persistence: {
      driver: 'json-file-store',
      persistent: jarvisData.isPersistent,
      path: jarvisData.storagePath
    },
    storage: {
      provider: storageManager.getProvider().name,
      ready: true
    }
  };
}
