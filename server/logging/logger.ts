import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

export type SubsystemCategory =
  | 'JARVIS_APP'
  | 'BACKEND'
  | 'DATABASE'
  | 'STORAGE'
  | 'GEMINI'
  | 'AUTH'
  | 'HTTP';

export interface StructuredLog {
  timestamp: string;
  subsystem: SubsystemCategory;
  level: 'info' | 'warn' | 'error';
  message: string;
  correlationId?: string;
  meta?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    code?: string;
  };
}

class ProductionLogger {
  private formatLog(log: StructuredLog): string {
    const cid = log.correlationId ? ` [cid:${log.correlationId}]` : '';
    const metaStr = log.meta && Object.keys(log.meta).length > 0 ? ` ${JSON.stringify(log.meta)}` : '';
    const errStr = log.error ? ` ERROR: ${log.error.name}: ${log.error.message}` : '';
    return `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.subsystem}]${cid} ${log.message}${metaStr}${errStr}`;
  }

  info(subsystem: SubsystemCategory, message: string, meta?: Record<string, unknown>, correlationId?: string): void {
    const entry: StructuredLog = {
      timestamp: new Date().toISOString(),
      subsystem,
      level: 'info',
      message,
      correlationId,
      meta
    };
    console.log(this.formatLog(entry));
  }

  warn(subsystem: SubsystemCategory, message: string, meta?: Record<string, unknown>, correlationId?: string): void {
    const entry: StructuredLog = {
      timestamp: new Date().toISOString(),
      subsystem,
      level: 'warn',
      message,
      correlationId,
      meta
    };
    console.warn(this.formatLog(entry));
  }

  error(subsystem: SubsystemCategory, message: string, err?: unknown, meta?: Record<string, unknown>, correlationId?: string): void {
    const errorDetails = err instanceof Error ? {
      name: err.name,
      message: err.message,
      code: (err as any).code
    } : err ? { name: 'UnknownError', message: String(err) } : undefined;

    const entry: StructuredLog = {
      timestamp: new Date().toISOString(),
      subsystem,
      level: 'error',
      message,
      correlationId,
      meta,
      error: errorDetails
    };
    console.error(this.formatLog(entry));
  }
}

export const logger = new ProductionLogger();

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  const correlationId = typeof incomingId === 'string' && incomingId.trim()
    ? incomingId.trim()
    : `corr-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;

  req.correlationId = correlationId;
  req.startTime = Date.now();
  res.setHeader('x-correlation-id', correlationId);

  // Skip logging high-frequency internal polling or static asset noise
  const isStaticNoise = req.path.startsWith('/@') || req.path.startsWith('/node_modules') || req.path.endsWith('.js') || req.path.endsWith('.css') || req.path.endsWith('.svg');
  if (!isStaticNoise) {
    res.on('finish', () => {
      const duration = Date.now() - (req.startTime || Date.now());
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      if (level === 'error') {
        logger.error('HTTP', `${req.method} ${req.originalUrl || req.path} -> ${res.statusCode} (${duration}ms)`, undefined, { statusCode: res.statusCode, durationMs: duration }, correlationId);
      } else if (level === 'warn') {
        logger.warn('HTTP', `${req.method} ${req.originalUrl || req.path} -> ${res.statusCode} (${duration}ms)`, { statusCode: res.statusCode, durationMs: duration }, correlationId);
      } else if (req.path.startsWith('/api')) {
        logger.info('HTTP', `${req.method} ${req.originalUrl || req.path} -> ${res.statusCode} (${duration}ms)`, { statusCode: res.statusCode, durationMs: duration }, correlationId);
      }
    });
  }

  next();
}
