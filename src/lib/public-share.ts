import { randomBytes, createHash } from 'crypto';

export function generateSecureToken(): string {
  // 32 cryptographically secure random bytes -> 256-bit entropy
  const buffer = randomBytes(32);
  // Base64URL representation
  return buffer.toString('base64url');
}

export function hashToken(token: string): string {
  // SHA-256 hash for persistence/lookup
  return createHash('sha256').update(token).digest('hex');
}

// Basic in-memory rate limiting for anonymous endpoints (Node 6 alignment for Phase 1a)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

export function checkAnonymousRateLimit(ip: string, token: string = ''): boolean {
  const key = `${ip}:${token}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 10; // 10 requests per minute per IP+Token

  let record = rateLimitMap.get(key);
  
  if (!record || record.expiresAt < now) {
    record = { count: 1, expiresAt: now + windowMs };
    rateLimitMap.set(key, record);
    return true;
  }
  
  record.count++;
  if (record.count > maxRequests) {
    return false;
  }
  
  return true;
}
