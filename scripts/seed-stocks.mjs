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
    // .env missing is acceptable
  }
}

function formatDateForPrefix(date) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${min}${sec}`;
}

async function run() {
  await loadDotEnv();
  const args = parseArgs();

  const count = Number(args.count ?? process.env.SEED_STOCK_COUNT ?? '1000');
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error('Geçerli bir --count değeri gerekli. Örn: --count 1000');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL bulunamadı.');
  }

  const sslEnabled = process.env.DATABASE_SSL === 'true';
  const prefix =
    args.prefix ??
    process.env.SEED_STOCK_PREFIX ??
    `PERF-${formatDateForPrefix(new Date())}`;

  const client = new Client({
    connectionString: databaseUrl,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
  });

  const startedAt = Date.now();
  await client.connect();

  try {
    const actorResult = await client.query(
      `
        SELECT id, role
        FROM users
        WHERE is_active = TRUE
        ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, created_at ASC
        LIMIT 1
      `
    );

    const actor = actorResult.rows[0];
    if (!actor) {
      throw new Error('Aktif kullanıcı bulunamadı. Seed öncesi bir kullanıcı olmalı.');
    }

    const insertedAuditResult = await client.query(
      `
        WITH seq AS (
          SELECT gs::int AS n, nextval('barcode_serial_seq') AS serial
          FROM generate_series(1, $1::int) gs
        ),
        prepared AS (
          SELECT
            $2::text || '-' || LPAD(seq.n::text, 6, '0') AS irsaliye_no,
            'Perf Urun ' || ((seq.n % 40) + 1)::text AS product_name,
            ((seq.n % 5000) + 1)::numeric(14, 3) AS quantity_numeric,
            CASE WHEN seq.n % 2 = 0 THEN 'adet' ELSE 'gr' END::varchar(16) AS quantity_unit,
            CASE seq.n % 8
              WHEN 0 THEN 'kutu'
              WHEN 1 THEN 'blister_folyo'
              WHEN 2 THEN 'sase_folyo'
              WHEN 3 THEN 'prospektus'
              WHEN 4 THEN 'sise'
              WHEN 5 THEN 'etiket'
              WHEN 6 THEN 'kapak'
              ELSE 'sleeve'
            END::varchar(32) AS product_type,
            CASE WHEN seq.n % 2 = 0 THEN 'sarf' ELSE 'hammadde' END::varchar(16) AS product_category,
            (CURRENT_DATE - ((seq.n % 90) * INTERVAL '1 day'))::date AS stock_entry_date,
            seq.serial
          FROM seq
        ),
        inserted AS (
          INSERT INTO stocks (
            irsaliye_no,
            product_name,
            quantity_numeric,
            quantity_unit,
            product_type,
            product_category,
            stock_entry_date,
            pvc_unlimited,
            barcode_serial,
            barcode_no,
            combined_code,
            created_by,
            created_by_role
          )
          SELECT
            prepared.irsaliye_no,
            prepared.product_name,
            prepared.quantity_numeric,
            prepared.quantity_unit,
            prepared.product_type,
            prepared.product_category,
            prepared.stock_entry_date,
            FALSE,
            prepared.serial,
            'B' || LPAD(prepared.serial::text, 10, '0'),
            prepared.irsaliye_no || '-' || ('B' || LPAD(prepared.serial::text, 10, '0')),
            $3::uuid,
            $4::role_type
          FROM prepared
          RETURNING id, irsaliye_no, product_name, barcode_no
        )
        INSERT INTO audit_logs (
          actor_user_id,
          action_type,
          entity_type,
          entity_id,
          payload_json,
          request_id
        )
        SELECT
          $3::uuid,
          'STOCK_CREATED',
          'stock',
          inserted.id,
          jsonb_build_object(
            'irsaliyeNo', inserted.irsaliye_no,
            'productName', inserted.product_name,
            'barcodeNo', inserted.barcode_no,
            'seed', true,
            'seedPrefix', $2::text
          ),
          gen_random_uuid()
        FROM inserted
      `,
      [count, prefix, actor.id, actor.role]
    );

    const durationMs = Date.now() - startedAt;

    console.log('Seed tamamlandı.');
    console.log(`Prefix: ${prefix}`);
    console.log(`Eklenen stok sayısı: ${insertedAuditResult.rowCount}`);
    console.log(`Süre: ${durationMs} ms`);
    console.log('');
    console.log('Not: Temizleme için bu prefix değerini saklayın.');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
