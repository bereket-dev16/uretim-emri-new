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

export const API_READ_CACHE_TTL_MS = readMsEnv(
  process.env.API_READ_CACHE_TTL_MS,
  2000,
  0,
  60000
);

export const LOG_NOISY_POLLING_ENDPOINTS =
  String(process.env.LOG_NOISY_POLLING_ENDPOINTS ?? 'false').toLowerCase() === 'true';
