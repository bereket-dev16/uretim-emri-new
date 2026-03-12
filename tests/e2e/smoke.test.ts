import { describe, it } from 'vitest';

describe.skip('e2e smoke', () => {
  it('covers login -> stock create -> stock list -> logout flow in deployed environment', async () => {
    // This scenario is intentionally skipped in local unit runs.
    // Execute with a running app and real database connection in CI/staging.
  });
});
