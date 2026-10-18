// In-Memory IP Rate Limiter for Authentication Endpoints (Milestone 2.2)

/**
 * IpRateLimiter:
 *
 * ARCHITECTURAL NOTICE:
 * SINGLE-PROCESS SAFEGUARD: This sliding-window rate limiter runs in local process memory.
 * It protects a single server process against rapid client flooding.
 * In a distributed, multi-container deployment, edge rate limiting (e.g., API Gateway,
 * Cloudflare, or Redis-backed token bucket) is required.
 */
export class IpRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(maxRequests = 10, windowMs = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Periodic cleanup of stale IPs every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanupStale(), 5 * 60 * 1000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  check(ip: string): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const cleanIp = (ip || 'unknown').trim();
    const now = Date.now();
    const cutoff = now - this.windowMs;

    const timestamps = (this.hits.get(cleanIp) || []).filter((t) => t > cutoff);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const retryAfterMs = Math.max(0, oldest + this.windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs
      };
    }

    timestamps.push(now);
    this.hits.set(cleanIp, timestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      retryAfterMs: 0
    };
  }

  reset(): void {
    this.hits.clear();
  }

  close(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.hits.clear();
  }

  private cleanupStale(): void {
    const cutoff = Date.now() - this.windowMs;
    for (const [ip, times] of this.hits.entries()) {
      const valid = times.filter((t) => t > cutoff);
      if (valid.length === 0) {
        this.hits.delete(ip);
      } else {
        this.hits.set(ip, valid);
      }
    }
  }
}

export const authIpRateLimiter = new IpRateLimiter(10, 60 * 1000);
