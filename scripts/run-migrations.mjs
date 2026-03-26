#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import pg from 'pg';

const { Client } = pg;

function loadDotEnv(filePath = '.env') {
  return readFile(filePath, 'utf8')
    .then((content) => {
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
    })
    .catch(() => {
      // .env missing is acceptable if variables are already exported
    });
}

async function run() {
  await loadDotEnv();

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  if (databaseUrl.includes('CHANGE_ME_DB_PASSWORD')) {
    throw new Error('DATABASE_URL still contains CHANGE_ME_DB_PASSWORD.');
  }

  const sslEnabled = process.env.DATABASE_SSL === 'true';

  const client = new Client({
    connectionString: databaseUrl,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
  });

  const migrationFiles = [
    path.join('db', 'migrations', '001_init_schema.sql'),
    path.join('db', 'migrations', '002_seed_rbac.sql'),
    path.join('db', 'migrations', '003_add_created_by_role_to_stocks.sql'),
    path.join('db', 'migrations', '004_add_stock_category_and_entry_date.sql'),
    path.join('db', 'migrations', '005_add_production_order_permissions.sql'),
    path.join('db', 'migrations', '006_remove_soft_delete_policy.sql'),
    path.join('db', 'migrations', '007_production_orders_workflow.sql'),
    path.join('db', 'migrations', '008_seed_tablet1_user.sql'),
    path.join('db', 'migrations', '009_hat_role_and_production_units.sql'),
    path.join('db', 'migrations', '010_seed_hat_role_permissions.sql'),
    path.join('db', 'migrations', '011_add_production_order_delete_permission.sql'),
    path.join('db', 'migrations', '012_production_orders_reset.sql')
  ];

  await client.connect();

  try {
    for (const file of migrationFiles) {
      const sql = await readFile(file, 'utf8');
      await client.query(sql);
      console.log(`Applied migration: ${file}`);
    }
  } finally {
    await client.end();
  }

  console.log('Migrations completed.');
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
