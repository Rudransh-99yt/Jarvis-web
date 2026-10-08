import type { Request, Response, NextFunction } from 'express';

export function corsAndSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // 1. Production security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 2. CORS configuration
  const origin = req.headers.origin;
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || process.env.PUBLIC_APP_URL || '';
  const allowedOrigins = allowedOriginsEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (origin) {
    const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin);
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-user-role, x-correlation-id, x-request-id');
      res.setHeader('Access-Control-Expose-Headers', 'x-correlation-id, content-length');
    }
  }

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
