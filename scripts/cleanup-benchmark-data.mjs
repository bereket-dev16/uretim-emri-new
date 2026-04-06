#!/usr/bin/env node

import {
  benchmarkMarker,
  createDbClient,
  ensureAbsolutePath,
  loadDotEnv,
  parseArgs,
  printHeading,
  readJsonFile
} from './benchmark-lib.mjs';

function printHelp() {
  console.log(`
Benchmark kullanici ve emir verisini temizler.

Kullanim:
  node scripts/cleanup-benchmark-data.mjs [--prefix BENCH]
  node scripts/cleanup-benchmark-data.mjs --usersFile scripts/benchmark-user-sessions.sample.json
`);
}

async function resolvePrefix(args) {
  if (args.prefix) {
    return String(args.prefix).trim().toUpperCase();
  }

  if (args.usersFile) {
    const payload = await readJsonFile(ensureAbsolutePath(String(args.usersFile)));
    if (payload?.prefix) {
      return String(payload.prefix).trim().toUpperCase();
    }
  }

  return 'BENCH';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  await loadDotEnv();

  const prefix = await resolvePrefix(args);
  const usernamePrefix = `${prefix.toLowerCase().replace(/[^\w]+/g, '_')}%`;
  const orderMarker = `${benchmarkMarker(prefix)}%`;

  const client = createDbClient();
  await client.connect();

  try {
    await client.query('BEGIN');

    const orderDeleteResult = await client.query(
      `
        DELETE FROM production_orders
        WHERE note_text LIKE $1
           OR customer_name LIKE $2
      `,
      [orderMarker, `${prefix}-%`]
    );

    await client.query(
      `
        DELETE FROM sessions
        WHERE user_id IN (
          SELECT id
          FROM users
          WHERE username LIKE $1
        )
      `,
      [usernamePrefix]
    );

    const userDeleteResult = await client.query(
      `
        DELETE FROM users
        WHERE username LIKE $1
      `,
      [usernamePrefix]
    );

    await client.query('COMMIT');

    printHeading('Benchmark Temizligi Tamamlandi');
    console.log(`Prefix: ${prefix}`);
    console.log(`Silinen emir: ${orderDeleteResult.rowCount}`);
    console.log(`Silinen kullanici: ${userDeleteResult.rowCount}`);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // noop
    }

    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void main();
