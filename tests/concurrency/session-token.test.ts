import { describe, expect, it } from 'vitest';

import { generateSessionToken } from '@/shared/security/session';

describe('session token concurrency', () => {
  it('generates unique tokens under concurrent calls', async () => {
    const calls = 1000;

    const tokens = await Promise.all(
      Array.from({ length: calls }, async () => generateSessionToken())
    );

    expect(new Set(tokens).size).toBe(calls);
  });
});
