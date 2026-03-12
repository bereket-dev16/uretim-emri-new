#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';

import pg from 'pg';

const { Client } = pg;

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const next = args[i + 1];

    if (!next || next.startsWith('--')) {
      result[key] = 'true';
      continue;
    }

    result[key] = next;
    i += 1;
  }

  return result;
}

async function loadDotEnv(filePath = '.env') {
  try {
    const content = await readFile(filePath, 'utf8');

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith('#')) {
        continue;
      }

      const separator = line.indexOf('=');
      if (separator <= 0) {
        continue;
      }

      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore if missing
  }
}

async function run() {
  await loadDotEnv();
  const args = parseArgs();

  const prefix = args.prefix ?? process.env.SEED_STOCK_PREFIX;
  if (!prefix) {
    throw new Error('Temizleme için --prefix gerekli. Örn: --prefix PERF-20260302183000');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL bulunamadı.');
  }

  const sslEnabled = process.env.DATABASE_SSL === 'true';

  const client = new Client({
    connectionString: databaseUrl,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    await client.query('BEGIN');

    const stocksResult = await client.query(
      `
        DELETE FROM stocks
        WHERE irsaliye_no LIKE $1::text
      `,
      [`${prefix}-%`]
    );

    const auditsResult = await client.query(
      `
        DELETE FROM audit_logs
        WHERE payload_json ->> 'seedPrefix' LIKE $1::text
      `,
      [`${prefix}%`]
    );

    await client.query('COMMIT');

    console.log('Temizleme tamamlandı.');
    console.log(`Prefix: ${prefix}`);
    console.log(`Fiziksel silinen stok kaydı: ${stocksResult.rowCount}`);
    console.log(`Fiziksel silinen audit kaydı: ${auditsResult.rowCount}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
