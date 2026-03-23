#!/usr/bin/env node
import argon2 from 'argon2';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;

const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
};

const DEFAULT_PASSWORD = '123456';
const SAMPLE_OUTPUT_PATH = 'scripts/benchmark-user-sessions.sample.json';

const BENCHMARK_USERS = {
  admin: [
    { username: 'bench_adm_01', password: DEFAULT_PASSWORD },
    { username: 'bench_adm_02', password: DEFAULT_PASSWORD }
  ],
  production_manager: [
    { username: 'bench_pm_01', password: DEFAULT_PASSWORD },
    { username: 'bench_pm_02', password: DEFAULT_PASSWORD },
    { username: 'bench_pm_03', password: DEFAULT_PASSWORD },
    { username: 'bench_pm_04', password: DEFAULT_PASSWORD }
  ],
  warehouse_manager: [
    { username: 'bench_wh_01', password: DEFAULT_PASSWORD },
    { username: 'bench_wh_02', password: DEFAULT_PASSWORD },
    { username: 'bench_wh_03', password: DEFAULT_PASSWORD },
    { username: 'bench_wh_04', password: DEFAULT_PASSWORD },
    { username: 'bench_wh_05', password: DEFAULT_PASSWORD },
    { username: 'bench_wh_06', password: DEFAULT_PASSWORD }
  ],
  hat: [
    { username: 'bench_tablet1_01', password: DEFAULT_PASSWORD, hatUnitCode: 'TABLET1' },
    { username: 'bench_tablet1_02', password: DEFAULT_PASSWORD, hatUnitCode: 'TABLET1' },
    { username: 'bench_tablet1_03', password: DEFAULT_PASSWORD, hatUnitCode: 'TABLET1' },
    { username: 'bench_tablet2_01', password: DEFAULT_PASSWORD, hatUnitCode: 'TABLET2' },
    { username: 'bench_tablet2_02', password: DEFAULT_PASSWORD, hatUnitCode: 'TABLET2' },
    { username: 'bench_tablet2_03', password: DEFAULT_PASSWORD, hatUnitCode: 'TABLET2' },
    { username: 'bench_boya_01', password: DEFAULT_PASSWORD, hatUnitCode: 'BOYA' },
    { username: 'bench_boya_02', password: DEFAULT_PASSWORD, hatUnitCode: 'BOYA' },
    { username: 'bench_kapsul_01', password: DEFAULT_PASSWORD, hatUnitCode: 'KAPSUL' },
    { username: 'bench_kapsul_02', password: DEFAULT_PASSWORD, hatUnitCode: 'KAPSUL' },
    { username: 'bench_blister1_01', password: DEFAULT_PASSWORD, hatUnitCode: 'BLISTER1' },
    { username: 'bench_blister1_02', password: DEFAULT_PASSWORD, hatUnitCode: 'BLISTER1' },
    { username: 'bench_blister2_01', password: DEFAULT_PASSWORD, hatUnitCode: 'BLISTER2' },
    { username: 'bench_blister2_02', password: DEFAULT_PASSWORD, hatUnitCode: 'BLISTER2' },
    { username: 'bench_paket_01', password: DEFAULT_PASSWORD, hatUnitCode: 'PAKET' },
    { username: 'bench_paket_02', password: DEFAULT_PASSWORD, hatUnitCode: 'PAKET' },
    { username: 'bench_hmmd_01', password: DEFAULT_PASSWORD, hatUnitCode: 'HMMD_KARISIM' },
    { username: 'bench_hmmd_02', password: DEFAULT_PASSWORD, hatUnitCode: 'HMMD_KARISIM' }
  ]
};

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--') {
      continue;
    }

    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const next = args[index + 1];

    if (!next || next.startsWith('--')) {
      result[key] = 'true';
      continue;
    }

    result[key] = next;
    index += 1;
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
    // ignore
  }
}

function buildOutputConfig() {
  return BENCHMARK_USERS;
}

async function assertUnitsExist(client) {
  const requiredUnits = BENCHMARK_USERS.hat.map((item) => item.hatUnitCode);
  const result = await client.query(
    'SELECT code FROM production_units WHERE code = ANY($1::varchar[])',
    [requiredUnits]
  );
  const existing = new Set(result.rows.map((row) => row.code));
  const missing = requiredUnits.filter((code) => !existing.has(code));

  if (missing.length > 0) {
    throw new Error(`Eksik production_units kaydi: ${missing.join(', ')}`);
  }
}

async function hashPassword(password) {
  return argon2.hash(password, HASH_OPTIONS);
}

async function upsertUser(client, user, actorUserId) {
  const existing = await client.query(
    'SELECT id FROM users WHERE username = $1 LIMIT 1',
    [user.username]
  );
  const requestId = randomUUID();
  const passwordHash = await hashPassword(user.password);

  if (existing.rows[0]) {
    const updated = await client.query(
      `
        UPDATE users
        SET password_hash = $2,
            role = $3::role_type,
            hat_unit_code = $4,
            is_active = TRUE,
            updated_at = NOW()
        WHERE username = $1
        RETURNING id, username
      `,
      [user.username, passwordHash, user.role, user.hatUnitCode ?? null]
    );

    await client.query(
      `
        INSERT INTO audit_logs (
          actor_user_id,
          action_type,
          entity_type,
          entity_id,
          payload_json,
          request_id
        )
        VALUES ($1::uuid, 'USER_UPDATED', 'user', $2::uuid, $3::jsonb, $4::uuid)
      `,
      [
        actorUserId,
        updated.rows[0].id,
        JSON.stringify({
          username: user.username,
          role: user.role,
          hatUnitCode: user.hatUnitCode ?? null,
          benchmark: true
        }),
        requestId
      ]
    );

    return 'updated';
  }

  const inserted = await client.query(
    `
      INSERT INTO users (
        username,
        password_hash,
        role,
        hat_unit_code,
        is_active
      )
      VALUES ($1, $2, $3::role_type, $4, TRUE)
      RETURNING id, username
    `,
    [user.username, passwordHash, user.role, user.hatUnitCode ?? null]
  );

  await client.query(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        action_type,
        entity_type,
        entity_id,
        payload_json,
        request_id
      )
      VALUES ($1::uuid, 'USER_CREATED', 'user', $2::uuid, $3::jsonb, $4::uuid)
    `,
    [
      actorUserId,
      inserted.rows[0].id,
      JSON.stringify({
        username: user.username,
        role: user.role,
        hatUnitCode: user.hatUnitCode ?? null,
        benchmark: true
      }),
      requestId
    ]
  );

  return 'created';
}

async function main() {
  await loadDotEnv();
  const args = parseArgs();
  const outputPath = args.output ?? SAMPLE_OUTPUT_PATH;
  const dryRun = args['dry-run'] === 'true';

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL gerekli.');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    const adminResult = await client.query(
      `
        SELECT id, username
        FROM users
        WHERE role = 'admin'::role_type
          AND is_active = TRUE
        ORDER BY created_at ASC
        LIMIT 1
      `
    );

    const admin = adminResult.rows[0];
    if (!admin) {
      throw new Error('Aktif admin kullanicisi bulunamadi.');
    }

    await assertUnitsExist(client);

    const users = Object.entries(BENCHMARK_USERS).flatMap(([role, items]) =>
      items.map((item) => ({
        ...item,
        role
      }))
    );

    console.log(`Benchmark kullanici hazirlaniyor. Toplam: ${users.length}`);
    console.log(`Actor admin: ${admin.username}`);

    let created = 0;
    let updated = 0;

    if (!dryRun) {
      await client.query('BEGIN');
      for (const user of users) {
        const result = await upsertUser(client, user, admin.id);
        if (result === 'created') {
          created += 1;
        } else {
          updated += 1;
        }
      }
      await client.query('COMMIT');
    }

    const output = JSON.stringify(buildOutputConfig(), null, 2);
    await writeFile(outputPath, `${output}\n`, 'utf8');

    console.log(`Olusan/gncellenen dosya: ${outputPath}`);
    if (dryRun) {
      console.log('Dry-run modunda DB degisikligi yapilmadi.');
    } else {
      console.log(`Created: ${created}`);
      console.log(`Updated: ${updated}`);
    }
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
