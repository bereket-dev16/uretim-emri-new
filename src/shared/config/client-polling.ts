function readMsEnv(rawValue: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const normalized = Math.trunc(parsed);
  if (normalized < min) {
    return min;
  }
  if (normalized > max) {
    return max;
  }

  return normalized;
}

export const CLIENT_POLL_INTERVAL_MS = readMsEnv(
  process.env.NEXT_PUBLIC_CLIENT_POLL_INTERVAL_MS,
  15000,
  5000,
  60000
);

export const CLIENT_POLL_JITTER_MS = Math.max(500, Math.floor(CLIENT_POLL_INTERVAL_MS * 0.2));

export const PRODUCTION_ORDERS_POLL_INTERVAL_MS = readMsEnv(
  process.env.NEXT_PUBLIC_PRODUCTION_ORDERS_POLL_INTERVAL_MS,
  Math.min(CLIENT_POLL_INTERVAL_MS, 5000),
  2000,
  30000
);

export const PRODUCTION_ORDERS_POLL_JITTER_MS = Math.max(
  300,
  Math.floor(PRODUCTION_ORDERS_POLL_INTERVAL_MS * 0.2)
);
