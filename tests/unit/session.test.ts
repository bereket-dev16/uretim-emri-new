import { describe, expect, it } from 'vitest';

import { hashSessionToken, sessionExpiresAt } from '@/shared/security/session';

describe('session helpers', () => {
  it('hashes session token deterministically', () => {
    const input = 'session-token';
    expect(hashSessionToken(input)).toBe(hashSessionToken(input));
  });

  it('builds expiration date in the future', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const expires = sessionExpiresAt(from);

    expect(expires.getTime()).toBeGreaterThan(from.getTime());
  });
});
