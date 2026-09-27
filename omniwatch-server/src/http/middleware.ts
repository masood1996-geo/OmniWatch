import type { NextFunction, Request, Response } from 'express';
import type { AppConfig } from '../config';
import { safeCompare } from '../store/api-keys';

export interface RateLimitedRequest extends Request {
  apiKeyId?: number;
  apiKeyScopes?: string[];
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export function createRateLimiter(options: { capacity: number; windowMs: number }): (req: RateLimitedRequest, res: Response, next: NextFunction) => void {
  const buckets = new Map<string, Bucket>();
  const cleanup = setInterval(() => {
    const cutoff = Date.now() - options.windowMs * 2;
    for (const [key, bucket] of buckets) {
      if (bucket.updatedAt < cutoff) buckets.delete(key);
    }
  }, options.windowMs);
  cleanup.unref?.();

  return (req, res, next) => {
    const identity = req.apiKeyId !== undefined ? `key:${req.apiKeyId}` : `ip:${req.ip || 'unknown'}`;
    const now = Date.now();
    let bucket = buckets.get(identity);
    if (!bucket) {
      bucket = { tokens: options.capacity, updatedAt: now };
      buckets.set(identity, bucket);
    }
    const refill = ((now - bucket.updatedAt) / options.windowMs) * options.capacity;
    bucket.tokens = Math.min(options.capacity, bucket.tokens + refill);
    bucket.updatedAt = now;
    if (bucket.tokens < 1) {
      const retryAfter = Math.ceil(((1 - bucket.tokens) * options.windowMs) / options.capacity / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      res.status(429).json({ success: false, error: 'rate_limited', message: 'Too many requests; slow down.' });
      return;
    }
    bucket.tokens -= 1;
    next();
  };
}

export function securityHeaders(cfg: AppConfig) {
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self' https:",
    "worker-src 'self' blob:",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
  ].join('; ');
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (cfg.nodeEnv === 'production') {
      res.setHeader('Content-Security-Policy', csp);
    }
    next();
  };
}

export function createCorsOptions(cfg: AppConfig) {
  if (!cfg.corsOrigin) {
    return { origin: false as const };
  }
  if (cfg.corsOrigin === '*') {
    return { origin: '*' };
  }
  const allowed = cfg.corsOrigin.split(',').map(o => o.trim()).filter(Boolean);
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowed.includes(origin)) callback(null, true);
      else callback(new Error('Origin not allowed by CORS'));
    },
  };
}

export function adminGuard(cfg: AppConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!cfg.adminApiKey) {
      res.status(503).json({
        success: false,
        error: 'admin_key_not_configured',
        message: 'ADMIN_API_KEY is not set; administrative endpoints are locked.',
      });
      return;
    }
    const header = req.header('x-admin-key') || (req.header('authorization')?.replace(/^Bearer\s+/i, '') ?? '');
    if (!header || !safeCompare(header, cfg.adminApiKey)) {
      res.status(401).json({ success: false, error: 'unauthorized', message: 'Valid ADMIN_API_KEY required.' });
      return;
    }
    next();
  };
}

export function apiNotFound() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ success: false, error: 'not_found', path: req.path });
      return;
    }
    next();
  };
}
