import fs from 'node:fs/promises';
import path from 'node:path';

import { Client } from 'pg';

export function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--') {
      continue;
    }

    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

export async function loadDotEnv(filePath = '.env') {
  try {
    const raw = await fs.readFile(filePath, 'utf8');

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmed.indexOf('=');

      if (separatorIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return;
    }

    throw error;
  }
}

export function createDbClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required.');
  }

  const sslEnabled = process.env.DATABASE_SSL === 'true';

  return new Client({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
  });
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandom(list) {
  return list[randomInt(0, list.length - 1)];
}

export function shuffle(list) {
  const next = [...list];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    const temp = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = temp;
  }

  return next;
}

export function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

export function percentile(values, target) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((target / 100) * sorted.length) - 1)
  );

  return sorted[index];
}

export function formatMs(value) {
  if (!Number.isFinite(value)) {
    return '0.0ms';
  }

  return `${value.toFixed(1)}ms`;
}

export function formatSeconds(value) {
  if (!Number.isFinite(value)) {
    return '0.0s';
  }

  return `${value.toFixed(1)}s`;
}

export async function writeJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export function ensureAbsolutePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

export function benchmarkMarker(prefix) {
  return `[BENCH:${prefix}]`;
}

export function parseSetCookie(setCookieHeader) {
  if (!setCookieHeader) {
    return null;
  }

  const firstSegment = setCookieHeader.split(';')[0] ?? '';
  const separatorIndex = firstSegment.indexOf('=');

  if (separatorIndex <= 0) {
    return null;
  }

  return {
    name: firstSegment.slice(0, separatorIndex),
    value: firstSegment.slice(separatorIndex + 1)
  };
}

export function getJsonContentType(headers) {
  return headers.get('content-type')?.toLowerCase().includes('application/json') ?? false;
}

export function printHeading(title) {
  console.log(`\n=== ${title} ===`);
}
