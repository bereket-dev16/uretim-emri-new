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
    // optional
  }
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function main() {
  await loadDotEnv();
  const args = parseArgs();
  const prefix = args.prefix ?? process.env.SEED_WORKLOAD_PREFIX;

  if (!prefix) {
    throw new Error('Temizleme icin --prefix gerekli.');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL bulunamadi.');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  const usernamePrefix = `wl_${slugify(prefix)}`;

  await client.connect();

  try {
    await client.query('BEGIN');

    const auditResult = await client.query(
      `
        DELETE FROM audit_logs
        WHERE payload_json ->> 'seedPrefix' = $1::text
      `,
      [prefix]
    );

    const sessionResult = await client.query(
      `
        DELETE FROM sessions
        WHERE user_id IN (
          SELECT id
          FROM users
          WHERE username LIKE $1::text
        )
      `,
      [`${usernamePrefix}%`]
    );

    const orderResult = await client.query(
      `
        DELETE FROM production_orders
        WHERE order_no LIKE $1::text
      `,
      [`${prefix}-IE-%`]
    );

    const stockResult = await client.query(
      `
        DELETE FROM stocks
        WHERE irsaliye_no LIKE $1::text
      `,
      [`${prefix}-IRS-%`]
    );

    const userResult = await client.query(
      `
        DELETE FROM users
        WHERE username LIKE $1::text
      `,
      [`${usernamePrefix}%`]
    );

    await client.query('COMMIT');

    console.log('Workload temizligi tamamlandi.');
    console.log(`Prefix: ${prefix}`);
    console.log(`Silinen audit_logs: ${auditResult.rowCount}`);
    console.log(`Silinen sessions: ${sessionResult.rowCount}`);
    console.log(`Silinen production_orders: ${orderResult.rowCount}`);
    console.log(`Silinen stocks: ${stockResult.rowCount}`);
    console.log(`Silinen users: ${userResult.rowCount}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
