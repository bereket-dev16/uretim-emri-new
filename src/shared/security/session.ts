import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'depo_session';

export function sessionCookieSecure(): boolean {
  if (process.env.SESSION_COOKIE_SECURE) {
    return process.env.SESSION_COOKIE_SECURE === 'true';
  }

  return process.env.NODE_ENV === 'production';
}

export function sessionIdleTimeoutHours(): number {
  const raw = Number(process.env.SESSION_IDLE_TIMEOUT_HOURS ?? 8);
  return Number.isFinite(raw) && raw > 0 ? raw : 8;
}

export function sessionSlidingWindowMinutes(): number {
  const raw = Number(process.env.SESSION_SLIDING_WINDOW_MINUTES ?? 15);
  return Number.isFinite(raw) && raw > 0 ? raw : 15;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionExpiresAt(fromDate = new Date()): Date {
  return new Date(fromDate.getTime() + sessionIdleTimeoutHours() * 60 * 60 * 1000);
}

export function shouldSlideSession(lastSeenAt: Date): boolean {
  const elapsedMs = Date.now() - lastSeenAt.getTime();
  return elapsedMs >= sessionSlidingWindowMinutes() * 60 * 1000;
}
