import type { Request, Response, NextFunction } from 'express';

const LOCAL_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://0.0.0.0:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

export function normalizeOrigin(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed === '*') return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveAllowedOrigins(isProduction: boolean): string[] {
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || process.env.PUBLIC_APP_URL || '';
  const parsed = allowedOriginsEnv
    .split(',')
    .map((s) => normalizeOrigin(s))
    .filter((s): s is string => Boolean(s));

  if (isProduction) {
    return parsed;
  }

  // In non-production, include explicit configuration plus standard local dev origins
  const devOrigins = new Set<string>([...LOCAL_DEV_ORIGINS, ...parsed]);
  return Array.from(devOrigins);
}

export function isOriginAllowed(origin: string | undefined, isProduction: boolean, allowedOrigins: string[]): boolean {
  if (!origin) return true; // Same-origin or non-browser client without Origin header

  const normalized = normalizeOrigin(origin);
  if (!normalized) return false; // Invalid origin URL, unexpected scheme, or wildcard

  if (isProduction) {
    // Fail safe in production if no origins are configured
    if (allowedOrigins.length === 0) return false;
    // Strict exact equality comparison against normalized allowlist
    return allowedOrigins.includes(normalized);
  }

  // Non-production: check explicit list or localhost/127.0.0.1 regex
  if (allowedOrigins.includes(normalized)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized);
}

export function validateCorsConfiguration(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const raw = process.env.ALLOWED_ORIGINS || process.env.PUBLIC_APP_URL;

  if (isProduction) {
    if (!raw || raw.trim().length === 0) {
      if (process.env.REQUIRE_CORS === 'true' || process.env.STRICT_CORS === 'true') {
        throw new Error('PRODUCTION_CORS_ERROR: ALLOWED_ORIGINS or PUBLIC_APP_URL is required in production.');
      }
      console.warn('[Security] Production notice: No ALLOWED_ORIGINS configured. All cross-origin browser requests will be rejected fail-closed.');
      return;
    }

    const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (items.includes('*')) {
      throw new Error('PRODUCTION_CORS_ERROR: Wildcard (*) origin is prohibited in production when credentials are enabled.');
    }

    for (const item of items) {
      const normalized = normalizeOrigin(item);
      if (!normalized) {
        throw new Error(`PRODUCTION_CORS_ERROR: Invalid or malformed origin "${item}" in CORS configuration.`);
      }
    }
  }
}

export function corsAndSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = resolveAllowedOrigins(isProduction);

  // 1. Core security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 2. CORS origin evaluation
  const origin = req.headers.origin;
  const allowed = isOriginAllowed(origin, isProduction, allowedOrigins);

  if (origin && allowed) {
    const normalized = normalizeOrigin(origin) || origin;
    res.setHeader('Access-Control-Allow-Origin', normalized);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-correlation-id, x-request-id');
    res.setHeader('Access-Control-Expose-Headers', 'x-correlation-id, content-length');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  // 3. Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    if (origin && !allowed) {
      res.status(403).json({
        error: {
          code: 'CORS_FORBIDDEN',
          message: 'Origin not allowed by CORS policy.'
        }
      });
      return;
    }
    res.status(204).end();
    return;
  }

  next();
}
