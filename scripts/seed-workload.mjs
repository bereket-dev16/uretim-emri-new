#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

import argon2 from 'argon2';
import pg from 'pg';

const { Pool } = pg;

const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
};

const PRODUCT_TYPES = [
  'kutu',
  'blister_folyo',
  'sase_folyo',
  'prospektus',
  'sise',
  'etiket',
  'kapak',
  'sleeve'
];

const CUSTOMER_NAMES = [
  'Artemis Pharma',
  'Nova İlaç',
  'Selin Medikal',
  'Marmara Health',
  'VitaNex',
  'Orion Biyotek',
  'Aden Kozmetik',
  'Lina Export',
  'Bosphorus Life',
  'NaturaMed',
  'Anka Sağlık',
  'Aksu Laboratuvar',
  'MediCore',
  'Helios Farma',
  'Aspera Trade'
];

const STOCK_CATALOG = [
  {
    name: 'Parasetamol Hammadde',
    productType: 'kutu',
    productCategory: 'hammadde',
    quantityUnit: 'gr',
    minQty: 2500,
    maxQty: 25000
  },
  {
    name: 'MCC PH102',
    productType: 'kutu',
    productCategory: 'hammadde',
    quantityUnit: 'gr',
    minQty: 5000,
    maxQty: 40000
  },
  {
    name: 'Magnezyum Stearat',
    productType: 'kutu',
    productCategory: 'hammadde',
    quantityUnit: 'gr',
    minQty: 500,
    maxQty: 5000
  },
  {
    name: 'Vitamin C Premiksi',
    productType: 'kutu',
    productCategory: 'hammadde',
    quantityUnit: 'gr',
    minQty: 1500,
    maxQty: 12000
  },
  {
    name: 'Omega 3 Yağ Fazı',
    productType: 'sise',
    productCategory: 'hammadde',
    quantityUnit: 'gr',
    minQty: 2000,
    maxQty: 18000
  },
  {
    name: 'Jelatin Kapsül Kabuğu',
    productType: 'kutu',
    productCategory: 'sarf',
    quantityUnit: 'adet',
    minQty: 10000,
    maxQty: 180000
  },
  {
    name: 'Blister Folyo Alu PVC 250mm',
    productType: 'blister_folyo',
    productCategory: 'sarf',
    quantityUnit: 'adet',
    minQty: 500,
    maxQty: 6000
  },
  {
    name: 'Saşe Folyo Triplex 120mm',
    productType: 'sase_folyo',
    productCategory: 'sarf',
    quantityUnit: 'adet',
    minQty: 800,
    maxQty: 8000
  },
  {
    name: 'Prospektüs A5 Tek Renk',
    productType: 'prospektus',
    productCategory: 'sarf',
    quantityUnit: 'adet',
    minQty: 5000,
    maxQty: 120000
  },
  {
    name: 'Amber Şişe 150 ml',
    productType: 'sise',
    productCategory: 'sarf',
    quantityUnit: 'adet',
    minQty: 1000,
    maxQty: 15000
  },
  {
    name: 'Etiket 60x40',
    productType: 'etiket',
    productCategory: 'sarf',
    quantityUnit: 'adet',
    minQty: 5000,
    maxQty: 100000
  },
  {
    name: 'Kapak 28 mm Child Lock',
    productType: 'kapak',
    productCategory: 'sarf',
    quantityUnit: 'adet',
    minQty: 1000,
    maxQty: 25000
  },
  {
    name: 'Sleeve 150 ml Parlak',
    productType: 'sleeve',
    productCategory: 'sarf',
    quantityUnit: 'adet',
    minQty: 1000,
    maxQty: 12000
  },
  {
    name: 'Kutu 20\'li Tablet',
    productType: 'kutu',
    productCategory: 'sarf',
    quantityUnit: 'adet',
    minQty: 2500,
    maxQty: 40000
  },
  {
    name: 'Kutu 30\'lu Softjel',
    productType: 'kutu',
    productCategory: 'sarf',
    quantityUnit: 'adet',
    minQty: 2000,
    maxQty: 30000
  }
];

const STOCK_ITEM_BY_NAME = new Map(STOCK_CATALOG.map((item) => [item.name, item]));

const PRODUCT_RECIPES = [
  {
    name: 'Parol Plus 500',
    packagingType: 'tablet',
    totalUnit: 'tablet',
    preferredUnits: ['HMMD_KARISIM', 'TABLET1', 'BLISTER1', 'PAKET'],
    materialNames: [
      'Parasetamol Hammadde',
      'MCC PH102',
      'Magnezyum Stearat',
      'Blister Folyo Alu PVC 250mm',
      'Prospektüs A5 Tek Renk',
      'Kutu 20\'li Tablet'
    ]
  },
  {
    name: 'MagnoFlex Forte',
    packagingType: 'tablet',
    totalUnit: 'tablet',
    preferredUnits: ['HMMD_KARISIM', 'TABLET2', 'BLISTER2', 'PAKET'],
    materialNames: [
      'Vitamin C Premiksi',
      'MCC PH102',
      'Magnezyum Stearat',
      'Blister Folyo Alu PVC 250mm',
      'Prospektüs A5 Tek Renk',
      'Kutu 20\'li Tablet'
    ]
  },
  {
    name: 'OmegaNova Softjel',
    packagingType: 'softjel',
    totalUnit: 'softjel',
    preferredUnits: ['HMMD_KARISIM', 'KAPSUL', 'BLISTER1', 'PAKET'],
    materialNames: [
      'Omega 3 Yağ Fazı',
      'Jelatin Kapsül Kabuğu',
      'Prospektüs A5 Tek Renk',
      'Kutu 30\'lu Softjel',
      'Etiket 60x40'
    ]
  },
  {
    name: 'Respira Syrup',
    packagingType: 'sivi',
    totalUnit: 'ml',
    preferredUnits: ['HMMD_KARISIM', 'BOYA', 'PAKET'],
    materialNames: [
      'Omega 3 Yağ Fazı',
      'Amber Şişe 150 ml',
      'Kapak 28 mm Child Lock',
      'Etiket 60x40',
      'Sleeve 150 ml Parlak'
    ]
  },
  {
    name: 'Daily Sachet C',
    packagingType: 'sase',
    totalUnit: 'sase',
    preferredUnits: ['HMMD_KARISIM', 'BLISTER2', 'PAKET'],
    materialNames: [
      'Vitamin C Premiksi',
      'Saşe Folyo Triplex 120mm',
      'Prospektüs A5 Tek Renk',
      'Kutu 20\'li Tablet'
    ]
  },
  {
    name: 'KapsuWell Max',
    packagingType: 'kapsul',
    totalUnit: 'kapsul',
    preferredUnits: ['HMMD_KARISIM', 'KAPSUL', 'BLISTER1', 'PAKET'],
    materialNames: [
      'Jelatin Kapsül Kabuğu',
      'Parasetamol Hammadde',
      'Magnezyum Stearat',
      'Blister Folyo Alu PVC 250mm',
      'Prospektüs A5 Tek Renk',
      'Kutu 20\'li Tablet'
    ]
  }
];

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

function formatDateToken(date) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function addHours(date, hours) {
  return addMinutes(date, hours * 60);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60_000);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function xmur3(value) {
  let hash = 1779033703 ^ value.length;

  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return function next() {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

function mulberry32(seed) {
  return function random() {
    let next = (seed += 0x6d2b79f5);
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seedText) {
  const seedFactory = xmur3(seedText);
  return mulberry32(seedFactory());
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomNumber(rng, min, max, fractionDigits = 3) {
  const value = min + rng() * (max - min);
  return Number(value.toFixed(fractionDigits));
}

function chance(rng, probability) {
  return rng() < probability;
}

function pickOne(rng, items) {
  return items[randomInt(rng, 0, items.length - 1)];
}

function pickUnique(rng, items, minCount, maxCount) {
  const count = clamp(randomInt(rng, minCount, maxCount), 1, items.length);
  const pool = [...items];
  const picked = [];

  for (let index = 0; index < count; index += 1) {
    const itemIndex = randomInt(rng, 0, pool.length - 1);
    picked.push(pool.splice(itemIndex, 1)[0]);
  }

  return picked;
}

function shuffle(rng, items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(rng, 0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL bulunamadı.');
  }

  return new Pool({
    connectionString,
    max: Number(process.env.SEED_WORKLOAD_DB_POOL_MAX ?? '24'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });
}

async function withTransaction(pool, fn) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function insertAuditLog(client, params) {
  await client.query(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        action_type,
        entity_type,
        entity_id,
        payload_json,
        request_id,
        created_at
      )
      VALUES ($1::uuid, $2, $3, $4::uuid, $5::jsonb, $6::uuid, $7::timestamptz)
    `,
    [
      params.actorUserId,
      params.actionType,
      params.entityType,
      params.entityId ?? null,
      JSON.stringify(params.payload),
      params.requestId,
      params.createdAt
    ]
  );
}

class PhaseProgress {
  constructor(label, total) {
    this.label = label;
    this.total = total;
    this.completed = 0;
    this.errors = 0;
    this.timer = null;
    this.errorSamples = [];
    this.startedAt = Date.now();
  }

  start() {
    this.render();
    this.timer = setInterval(() => this.render(), 1000);
  }

  success() {
    this.completed += 1;
  }

  failure(message) {
    this.completed += 1;
    this.errors += 1;

    if (this.errorSamples.length < 12) {
      this.errorSamples.push(message);
    }

    process.stdout.write(`\n[ERR] ${message}\n`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.render(true);
    process.stdout.write('\n');
  }

  render(final = false) {
    const elapsedSeconds = ((Date.now() - this.startedAt) / 1000).toFixed(1);
    const prefix = final ? '[DONE]' : '[RUN ]';
    const line = `${prefix} ${this.label}: ${this.completed}/${this.total} | hata: ${this.errors} | sure: ${elapsedSeconds}s`;
    process.stdout.write(`\r${line.padEnd(110, ' ')}`);
  }
}

function buildRoleCounts(userCount) {
  if (userCount < 4) {
    throw new Error('En az 4 kullanıcı gerekli.');
  }

  const counts = {
    admin: 1,
    production_manager: 1,
    warehouse_manager: 1,
    hat: 1
  };

  const weightedRoles = [
    'hat',
    'hat',
    'hat',
    'hat',
    'production_manager',
    'production_manager',
    'production_manager',
    'warehouse_manager',
    'warehouse_manager',
    'admin'
  ];

  let remaining = userCount - 4;
  let cursor = 0;

  while (remaining > 0) {
    const role = weightedRoles[cursor % weightedRoles.length];
    counts[role] += 1;
    cursor += 1;
    remaining -= 1;
  }

  return counts;
}

async function ensureRootAdmin(pool, passwordHash) {
  const adminResult = await pool.query(
    `
      SELECT id, username, role
      FROM users
      WHERE role = 'admin'::role_type
        AND is_active = TRUE
      ORDER BY created_at ASC
      LIMIT 1
    `
  );

  const existing = adminResult.rows[0];
  if (existing) {
    return existing;
  }

  const username = 'seed_admin_root';
  const createdAt = new Date();
  const requestId = randomUUID();

  return withTransaction(pool, async (client) => {
    const insertResult = await client.query(
      `
        INSERT INTO users (
          username,
          password_hash,
          role,
          is_active,
          last_login_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, 'admin'::role_type, TRUE, $3::timestamptz, $3::timestamptz, $3::timestamptz)
        RETURNING id, username, role
      `,
      [username, passwordHash, createdAt]
    );

    const admin = insertResult.rows[0];

    await insertAuditLog(client, {
      actorUserId: admin.id,
      actionType: 'USER_CREATED',
      entityType: 'user',
      entityId: admin.id,
      payload: {
        username,
        role: 'admin',
        seed: true,
        seedPrefix: 'SYSTEM'
      },
      requestId,
      createdAt
    });

    return admin;
  });
}

async function listActiveHatUnits(pool) {
  const result = await pool.query(
    `
      SELECT code, name
      FROM production_units
      WHERE is_active = TRUE
        AND code <> 'DEPO'
      ORDER BY code ASC
    `
  );

  if (result.rows.length === 0) {
    throw new Error('Aktif hat birimi bulunamadı. production_units tablosunu kontrol edin.');
  }

  return result.rows;
}

function buildUserDefinitions({ userCount, prefix, unitRows }) {
  const counts = buildRoleCounts(userCount);
  const usernamePrefix = `wl_${slugify(prefix)}`;
  const definitions = [];
  let sequence = 1;

  for (let index = 0; index < counts.admin; index += 1) {
    definitions.push({
      username: `${usernamePrefix}_adm_${String(index + 1).padStart(2, '0')}`,
      role: 'admin',
      hatUnitCode: null,
      sequence: sequence++
    });
  }

  for (let index = 0; index < counts.production_manager; index += 1) {
    definitions.push({
      username: `${usernamePrefix}_pm_${String(index + 1).padStart(2, '0')}`,
      role: 'production_manager',
      hatUnitCode: null,
      sequence: sequence++
    });
  }

  for (let index = 0; index < counts.warehouse_manager; index += 1) {
    definitions.push({
      username: `${usernamePrefix}_wh_${String(index + 1).padStart(2, '0')}`,
      role: 'warehouse_manager',
      hatUnitCode: null,
      sequence: sequence++
    });
  }

  for (let index = 0; index < counts.hat; index += 1) {
    const unit = unitRows[index % unitRows.length];
    definitions.push({
      username: `${usernamePrefix}_${slugify(unit.code)}_${String(index + 1).padStart(2, '0')}`,
      role: 'hat',
      hatUnitCode: unit.code,
      sequence: sequence++
    });
  }

  return {
    counts,
    usernamePrefix,
    definitions
  };
}

function createCounters() {
  return {
    userCreates: 0,
    stockCreates: 0,
    stockUpdates: 0,
    orderCreates: 0,
    materialChecks: 0,
    warehouseDispatches: 0,
    taskAccepts: 0,
    taskCompletes: 0
  };
}

function incrementUserAction(activity, username, role, key, amount = 1) {
  if (!activity.byUser.has(username)) {
    activity.byUser.set(username, { role, ...createCounters() });
  }

  if (!activity.byRole.has(role)) {
    activity.byRole.set(role, createCounters());
  }

  activity.byUser.get(username)[key] += amount;
  activity.byRole.get(role)[key] += amount;
}

function createActivityStore() {
  return {
    byUser: new Map(),
    byRole: new Map()
  };
}

async function createSeedUsers({ pool, definitions, passwordHash, actorAdmin, prefix, rng, concurrency, activity }) {
  const tasks = definitions.map((definition) => ({
    label: `kullanici:${definition.username}`,
    run: async () =>
      withTransaction(pool, async (client) => {
        const createdAt = addHours(new Date(), -randomInt(rng, 24, 240));
        const loginAt = addMinutes(createdAt, randomInt(rng, 30, 720));
        const requestId = randomUUID();
        const insertResult = await client.query(
          `
            INSERT INTO users (
              username,
              password_hash,
              role,
              hat_unit_code,
              is_active,
              last_login_at,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3::role_type, $4, TRUE, $5::timestamptz, $6::timestamptz, $6::timestamptz)
            RETURNING id, username, role, hat_unit_code
          `,
          [
            definition.username,
            passwordHash,
            definition.role,
            definition.hatUnitCode,
            loginAt,
            createdAt
          ]
        );

        const user = insertResult.rows[0];

        await insertAuditLog(client, {
          actorUserId: actorAdmin.id,
          actionType: 'USER_CREATED',
          entityType: 'user',
          entityId: user.id,
          payload: {
            username: user.username,
            role: user.role,
            hatUnitCode: user.hat_unit_code,
            seed: true,
            seedPrefix: prefix
          },
          requestId,
          createdAt
        });

        await insertAuditLog(client, {
          actorUserId: user.id,
          actionType: 'LOGIN_SUCCESS',
          entityType: 'auth',
          entityId: null,
          payload: {
            username: user.username,
            seed: true,
            seedPrefix: prefix
          },
          requestId: randomUUID(),
          createdAt: loginAt
        });

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          hatUnitCode: user.hat_unit_code
        };
      })
  }));

  const createdUsers = await runTasks({
    label: 'Kullanıcı hazırlığı',
    tasks,
    concurrency: Math.min(concurrency, 12),
    onSuccess: (user) => {
      incrementUserAction(activity, actorAdmin.username, actorAdmin.role, 'userCreates', 1);
      return user;
    }
  });

  return createdUsers;
}

function buildStockDraft(prefix, index, actor, rng) {
  const item = pickOne(rng, STOCK_CATALOG);
  const createdAt = randomRecentTimestamp(rng, 40);
  const stockEntryDate = toIsoDate(addDays(createdAt, -randomInt(rng, 0, 4)));
  const quantityNumeric =
    item.quantityUnit === 'gr'
      ? randomNumber(rng, item.minQty, item.maxQty, 3)
      : randomInt(rng, item.minQty, item.maxQty);

  return {
    actor,
    createdAt,
    requestId: randomUUID(),
    irsaliyeNo: `${prefix}-IRS-${String(index + 1).padStart(5, '0')}`,
    productName: item.name,
    quantityNumeric,
    quantityUnit: item.quantityUnit,
    productType: item.productType,
    productCategory: item.productCategory,
    stockEntryDate
  };
}

function randomRecentTimestamp(rng, daysBack) {
  const now = new Date();
  const earliest = addDays(now, -daysBack);
  const offset = Math.floor(rng() * (now.getTime() - earliest.getTime()));
  return new Date(earliest.getTime() + offset);
}

async function createStockRecord(pool, draft, prefix) {
  return withTransaction(pool, async (client) => {
    const insertResult = await client.query(
      `
        WITH next_serial AS (
          SELECT nextval('barcode_serial_seq') AS serial
        )
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
          created_by_role,
          created_at
        )
        SELECT
          $1::varchar(64),
          $2::varchar(120),
          $3::numeric,
          $4::varchar(16),
          $5::varchar(32),
          $6::varchar(16),
          $7::date,
          FALSE,
          next_serial.serial,
          'B' || LPAD(next_serial.serial::text, 10, '0'),
          $1::text || '-' || ('B' || LPAD(next_serial.serial::text, 10, '0')),
          $8::uuid,
          $9::role_type,
          $10::timestamptz
        FROM next_serial
        RETURNING id, barcode_no, created_at
      `,
      [
        draft.irsaliyeNo,
        draft.productName,
        draft.quantityNumeric,
        draft.quantityUnit,
        draft.productType,
        draft.productCategory,
        draft.stockEntryDate,
        draft.actor.id,
        draft.actor.role,
        draft.createdAt
      ]
    );

    const inserted = insertResult.rows[0];

    await insertAuditLog(client, {
      actorUserId: draft.actor.id,
      actionType: 'STOCK_CREATED',
      entityType: 'stock',
      entityId: inserted.id,
      payload: {
        irsaliyeNo: draft.irsaliyeNo,
        productName: draft.productName,
        barcodeNo: inserted.barcode_no,
        productCategory: draft.productCategory,
        stockEntryDate: draft.stockEntryDate,
        seed: true,
        seedPrefix: prefix
      },
      requestId: draft.requestId,
      createdAt: draft.createdAt
    });

    return {
      id: inserted.id,
      createdAt: draft.createdAt,
      actor: draft.actor,
      irsaliyeNo: draft.irsaliyeNo,
      productName: draft.productName,
      quantityNumeric: draft.quantityNumeric,
      quantityUnit: draft.quantityUnit,
      productType: draft.productType,
      productCategory: draft.productCategory,
      stockEntryDate: draft.stockEntryDate,
      barcodeNo: inserted.barcode_no
    };
  });
}

function buildOrderDraft(prefix, index, actor, unitCodes, rng) {
  const recipe = pickOne(rng, PRODUCT_RECIPES);
  const createdAt = randomRecentTimestamp(rng, 35);
  const orderDate = toIsoDate(addDays(createdAt, -randomInt(rng, 0, 3)));
  const deadlineDate = toIsoDate(addDays(new Date(orderDate), randomInt(rng, 5, 25)));
  const orderCount = randomInt(rng, 5000, 65000);
  const totalAmount = randomInt(rng, orderCount * 8, orderCount * 24);
  const demandSource = chance(rng, 0.18)
    ? 'numune'
    : chance(rng, 0.45)
      ? 'musteri_talebi'
      : 'stok';
  const marketScope = chance(rng, 0.32) ? 'ihracat' : 'ic_piyasa';
  const availableTargetUnits = recipe.preferredUnits.filter((unitCode) => unitCodes.includes(unitCode));
  const targetPool = availableTargetUnits.length > 0 ? availableTargetUnits : unitCodes;
  const dispatchTargets = pickUnique(
    rng,
    targetPool,
    1,
    Math.min(3, targetPool.length)
  );

  const materialNames = shuffle(rng, recipe.materialNames).slice(0, randomInt(rng, 3, recipe.materialNames.length));
  const materials = materialNames.map((name) => {
    const catalogItem = STOCK_ITEM_BY_NAME.get(name);
    const amount = catalogItem?.quantityUnit === 'gr'
      ? `${randomInt(rng, 25, 900)} kg`
      : `${randomInt(rng, 2000, 70000)} adet`;

    return {
      materialProductType: catalogItem?.productType ?? pickOne(rng, PRODUCT_TYPES),
      materialName: name,
      materialQuantityText: amount
    };
  });

  return {
    actor,
    createdAt,
    requestId: randomUUID(),
    orderDate,
    orderNo: `${prefix}-IE-${String(index + 1).padStart(5, '0')}`,
    customerName: pickOne(rng, CUSTOMER_NAMES),
    marketScope,
    demandSource,
    orderQuantity: `${orderCount} kutu`,
    deadlineDate,
    finalProductName: recipe.name,
    packagingType: recipe.packagingType,
    totalAmountText: `${totalAmount} ${recipe.totalUnit}`,
    dispatchTargets,
    materials
  };
}

async function createProductionOrderRecord(pool, draft, prefix) {
  return withTransaction(pool, async (client) => {
    const orderResult = await client.query(
      `
        INSERT INTO production_orders (
          order_date,
          order_no,
          customer_name,
          market_scope,
          demand_source,
          order_quantity,
          deadline_date,
          final_product_name,
          packaging_type,
          total_amount_text,
          dispatch_unit_code,
          created_by,
          created_by_role,
          created_at,
          updated_at
        )
        VALUES (
          $1::date,
          $2::varchar(64),
          $3::varchar(120),
          $4::varchar(16),
          $5::varchar(32),
          $6::varchar(64),
          $7::date,
          $8::varchar(120),
          $9::varchar(16),
          $10::varchar(120),
          'DEPO',
          $11::uuid,
          $12::role_type,
          $13::timestamptz,
          $13::timestamptz
        )
        RETURNING id
      `,
      [
        draft.orderDate,
        draft.orderNo,
        draft.customerName,
        draft.marketScope,
        draft.demandSource,
        draft.orderQuantity,
        draft.deadlineDate,
        draft.finalProductName,
        draft.packagingType,
        draft.totalAmountText,
        draft.actor.id,
        draft.actor.role,
        draft.createdAt
      ]
    );

    const orderId = orderResult.rows[0].id;

    const materialIds = [];
    for (const material of draft.materials) {
      const materialCreatedAt = addMinutes(
        draft.createdAt,
        randomInt(createRng(`${draft.orderNo}:${material.materialName}`), 1, 40)
      );
      const materialResult = await client.query(
        `
          INSERT INTO production_order_materials (
            production_order_id,
            material_product_type,
            material_name,
            material_quantity_text,
            created_at,
            updated_at
          )
          VALUES ($1::uuid, $2::varchar(32), $3::varchar(120), $4::varchar(120), $5::timestamptz, $5::timestamptz)
          RETURNING id
        `,
        [
          orderId,
          material.materialProductType,
          material.materialName,
          material.materialQuantityText,
          materialCreatedAt
        ]
      );
      materialIds.push(materialResult.rows[0].id);
    }

    const depoDispatchTime = addMinutes(draft.createdAt, randomInt(createRng(draft.orderNo), 10, 90));

    await client.query(
      `
        INSERT INTO production_order_dispatches (
          production_order_id,
          unit_code,
          status,
          dispatched_by,
          dispatched_at,
          created_at,
          updated_at
        )
        VALUES ($1::uuid, 'DEPO', 'pending', $2::uuid, $3::timestamptz, $3::timestamptz, $3::timestamptz)
      `,
      [orderId, draft.actor.id, depoDispatchTime]
    );

    await insertAuditLog(client, {
      actorUserId: draft.actor.id,
      actionType: 'PRODUCTION_ORDER_CREATED',
      entityType: 'production_order',
      entityId: orderId,
      payload: {
        orderNo: draft.orderNo,
        dispatchUnits: ['DEPO'],
        plannedUnits: draft.dispatchTargets,
        materialCount: draft.materials.length,
        seed: true,
        seedPrefix: prefix
      },
      requestId: draft.requestId,
      createdAt: draft.createdAt
    });

    return {
      id: orderId,
      actor: draft.actor,
      orderNo: draft.orderNo,
      createdAt: draft.createdAt,
      dispatchTargets: draft.dispatchTargets,
      materialIds,
      materialCount: draft.materials.length
    };
  });
}

async function updateMaterialAvailability(client, { orderId, materialId, actor, checkedAt, requestId, prefix }) {
  await client.query(
    `
      UPDATE production_order_materials
      SET
        is_available = TRUE,
        checked_by = $2::uuid,
        checked_at = $3::timestamptz,
        updated_at = $3::timestamptz
      WHERE id = $1::uuid
        AND production_order_id = $4::uuid
    `,
    [materialId, actor.id, checkedAt, orderId]
  );

  await insertAuditLog(client, {
    actorUserId: actor.id,
    actionType: 'PRODUCTION_ORDER_MATERIAL_CHECKED',
    entityType: 'production_order',
    entityId: orderId,
    payload: {
      materialId,
      isAvailable: true,
      seed: true,
      seedPrefix: prefix
    },
    requestId,
    createdAt: checkedAt
  });
}

async function processWarehouseOrder(pool, order, actor, rng, prefix) {
  return withTransaction(pool, async (client) => {
    const materialResult = await client.query(
      `
        SELECT id
        FROM production_order_materials
        WHERE production_order_id = $1::uuid
        ORDER BY created_at ASC
      `,
      [order.id]
    );

    const materials = materialResult.rows;
    const workStartedAt = addHours(order.createdAt, randomInt(rng, 4, 72));
    const mode = chance(rng, 0.08)
      ? 'partial'
      : chance(rng, 0.14)
        ? 'ready_waiting'
        : 'dispatch';

    const checkCount = mode === 'partial'
      ? Math.max(1, Math.floor(materials.length / 2))
      : materials.length;

    for (let index = 0; index < checkCount; index += 1) {
      await updateMaterialAvailability(client, {
        orderId: order.id,
        materialId: materials[index].id,
        actor,
        checkedAt: addMinutes(workStartedAt, index * 4),
        requestId: randomUUID(),
        prefix
      });
    }

    if (mode !== 'dispatch') {
      return {
        actor,
        orderId: order.id,
        dispatched: false,
        materialsChecked: checkCount,
        dispatchCount: 0,
        mode
      };
    }

    const depoCompletedAt = addMinutes(workStartedAt, checkCount * 5 + randomInt(rng, 5, 20));
    await client.query(
      `
        UPDATE production_order_dispatches
        SET
          status = 'completed',
          accepted_by = $2::uuid,
          accepted_at = $3::timestamptz,
          completed_by = $2::uuid,
          completed_at = $4::timestamptz,
          updated_at = $4::timestamptz
        WHERE production_order_id = $1::uuid
          AND unit_code = 'DEPO'
      `,
      [order.id, actor.id, addMinutes(depoCompletedAt, -8), depoCompletedAt]
    );

    await insertAuditLog(client, {
      actorUserId: actor.id,
      actionType: 'PRODUCTION_ORDER_TASK_COMPLETED',
      entityType: 'production_order',
      entityId: order.id,
      payload: {
        unitCode: 'DEPO',
        source: 'warehouse',
        seed: true,
        seedPrefix: prefix
      },
      requestId: randomUUID(),
      createdAt: depoCompletedAt
    });

    let dispatchCursor = 0;
    for (const unitCode of order.dispatchTargets) {
      const dispatchedAt = addMinutes(depoCompletedAt, 4 + dispatchCursor * 3);
      await client.query(
        `
          INSERT INTO production_order_dispatches (
            production_order_id,
            unit_code,
            status,
            dispatched_by,
            dispatched_at,
            created_at,
            updated_at
          )
          VALUES ($1::uuid, $2::varchar(32), 'pending', $3::uuid, $4::timestamptz, $4::timestamptz, $4::timestamptz)
          ON CONFLICT (production_order_id, unit_code)
          DO UPDATE
            SET status = 'pending',
                dispatched_by = EXCLUDED.dispatched_by,
                dispatched_at = EXCLUDED.dispatched_at,
                accepted_by = NULL,
                accepted_at = NULL,
                completed_by = NULL,
                completed_at = NULL,
                updated_at = EXCLUDED.updated_at
        `,
        [order.id, unitCode, actor.id, dispatchedAt]
      );
      dispatchCursor += 1;
    }

    await insertAuditLog(client, {
      actorUserId: actor.id,
      actionType: 'PRODUCTION_ORDER_DISPATCHED',
      entityType: 'production_order',
      entityId: order.id,
      payload: {
        unitCodes: order.dispatchTargets,
        seed: true,
        seedPrefix: prefix
      },
      requestId: randomUUID(),
      createdAt: addMinutes(depoCompletedAt, 1)
    });

    return {
      actor,
      orderId: order.id,
      dispatched: true,
      materialsChecked: checkCount,
      dispatchCount: order.dispatchTargets.length,
      mode
    };
  });
}

async function acceptDispatchTask(pool, dispatch, actor, acceptedAt, prefix) {
  return withTransaction(pool, async (client) => {
    await client.query(
      `
        UPDATE production_order_dispatches
        SET
          status = 'in_progress',
          accepted_by = $2::uuid,
          accepted_at = COALESCE(accepted_at, $3::timestamptz),
          updated_at = $3::timestamptz
        WHERE id = $1::uuid
          AND status = 'pending'
      `,
      [dispatch.id, actor.id, acceptedAt]
    );

    await insertAuditLog(client, {
      actorUserId: actor.id,
      actionType: 'PRODUCTION_ORDER_TASK_ACCEPTED',
      entityType: 'production_order',
      entityId: dispatch.productionOrderId,
      payload: {
        dispatchId: dispatch.id,
        unitCode: dispatch.unitCode,
        seed: true,
        seedPrefix: prefix
      },
      requestId: randomUUID(),
      createdAt: acceptedAt
    });
  });
}

async function completeDispatchTask(pool, dispatch, actor, completedAt, prefix) {
  return withTransaction(pool, async (client) => {
    await client.query(
      `
        UPDATE production_order_dispatches
        SET
          status = 'completed',
          accepted_by = COALESCE(accepted_by, $2::uuid),
          accepted_at = COALESCE(accepted_at, $3::timestamptz),
          completed_by = $2::uuid,
          completed_at = $4::timestamptz,
          updated_at = $4::timestamptz
        WHERE id = $1::uuid
      `,
      [dispatch.id, actor.id, addMinutes(completedAt, -randomInt(createRng(dispatch.id), 30, 360)), completedAt]
    );

    await insertAuditLog(client, {
      actorUserId: actor.id,
      actionType: 'PRODUCTION_ORDER_TASK_COMPLETED',
      entityType: 'production_order',
      entityId: dispatch.productionOrderId,
      payload: {
        dispatchId: dispatch.id,
        unitCode: dispatch.unitCode,
        seed: true,
        seedPrefix: prefix
      },
      requestId: randomUUID(),
      createdAt: completedAt
    });
  });
}

async function updateStockRecord(pool, stock, actor, rng, prefix) {
  return withTransaction(pool, async (client) => {
    const updatedAt = addHours(stock.createdAt, randomInt(rng, 2, 96));
    const nextQuantity =
      stock.quantityUnit === 'gr'
        ? Number((stock.quantityNumeric * (0.9 + rng() * 0.25)).toFixed(3))
        : Math.max(1, Math.round(stock.quantityNumeric * (0.9 + rng() * 0.25)));

    await client.query(
      `
        UPDATE stocks
        SET
          quantity_numeric = $1::numeric,
          stock_entry_date = $2::date
        WHERE id = $3::uuid
      `,
      [nextQuantity, stock.stockEntryDate, stock.id]
    );

    await insertAuditLog(client, {
      actorUserId: actor.id,
      actionType: 'STOCK_UPDATED',
      entityType: 'stock',
      entityId: stock.id,
      payload: {
        updatedFields: ['quantityNumeric'],
        seed: true,
        seedPrefix: prefix
      },
      requestId: randomUUID(),
      createdAt: updatedAt
    });
  });
}

async function runTasks({ label, tasks, concurrency, onSuccess }) {
  if (tasks.length === 0) {
    return [];
  }

  const progress = new PhaseProgress(label, tasks.length);
  const results = [];
  let cursor = 0;
  progress.start();

  async function worker() {
    while (true) {
      const taskIndex = cursor;
      cursor += 1;

      if (taskIndex >= tasks.length) {
        return;
      }

      const task = tasks[taskIndex];

      try {
        const result = await task.run();
        progress.success();

        if (result !== undefined && result !== null) {
          const mapped = onSuccess ? onSuccess(result, task) : result;
          if (mapped !== undefined && mapped !== null) {
            if (Array.isArray(mapped)) {
              results.push(...mapped);
            } else {
              results.push(mapped);
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        progress.failure(`${task.label} -> ${message}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  progress.stop();

  return results;
}

async function loadDispatchesForPrefix(pool, prefix) {
  const result = await pool.query(
    `
      SELECT
        d.id,
        d.production_order_id,
        d.unit_code,
        d.status,
        d.dispatched_at
      FROM production_order_dispatches d
      JOIN production_orders o ON o.id = d.production_order_id
      WHERE o.order_no LIKE $1::text
        AND d.unit_code <> 'DEPO'
      ORDER BY d.dispatched_at ASC
    `,
    [`${prefix}-IE-%`]
  );

  return result.rows.map((row) => ({
    id: row.id,
    productionOrderId: row.production_order_id,
    unitCode: row.unit_code,
    status: row.status,
    dispatchedAt: new Date(row.dispatched_at)
  }));
}

function createSummaryRows(activityMap) {
  return Array.from(activityMap.entries())
    .map(([key, counters]) => ({ key, ...counters }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

async function fetchDatabaseSummary(pool, prefix, usernamePrefix) {
  const [userResult, stockResult, orderResult, materialResult, dispatchResult, auditResult] = await Promise.all([
    pool.query(
      `
        SELECT role, COUNT(*)::int AS count
        FROM users
        WHERE username LIKE $1::text
        GROUP BY role
        ORDER BY role
      `,
      [`${usernamePrefix}%`]
    ),
    pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM stocks
        WHERE irsaliye_no LIKE $1::text
      `,
      [`${prefix}-IRS-%`]
    ),
    pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM production_orders
        WHERE order_no LIKE $1::text
      `,
      [`${prefix}-IE-%`]
    ),
    pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM production_order_materials m
        JOIN production_orders o ON o.id = m.production_order_id
        WHERE o.order_no LIKE $1::text
      `,
      [`${prefix}-IE-%`]
    ),
    pool.query(
      `
        SELECT status, COUNT(*)::int AS count
        FROM production_order_dispatches d
        JOIN production_orders o ON o.id = d.production_order_id
        WHERE o.order_no LIKE $1::text
        GROUP BY status
        ORDER BY status
      `,
      [`${prefix}-IE-%`]
    ),
    pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM audit_logs
        WHERE payload_json ->> 'seedPrefix' = $1::text
      `,
      [prefix]
    )
  ]);

  return {
    usersByRole: userResult.rows,
    stocks: stockResult.rows[0]?.count ?? 0,
    orders: orderResult.rows[0]?.count ?? 0,
    materials: materialResult.rows[0]?.count ?? 0,
    dispatchesByStatus: dispatchResult.rows,
    audits: auditResult.rows[0]?.count ?? 0
  };
}

function createHeader(title) {
  console.log(`\n=== ${title} ===`);
}

function printRoleSummary(title, rows) {
  createHeader(title);
  for (const row of rows) {
    const { key, role, ...counters } = row;
    const label = key ?? role;
    console.log(
      `${label}: user=${counters.userCreates ?? 0}, stok=${counters.stockCreates ?? 0}, stok-gunc=${counters.stockUpdates ?? 0}, emir=${counters.orderCreates ?? 0}, malzeme=${counters.materialChecks ?? 0}, sevk=${counters.warehouseDispatches ?? 0}, kabul=${counters.taskAccepts ?? 0}, bitti=${counters.taskCompletes ?? 0}`
    );
  }
}

async function main() {
  await loadDotEnv();
  const args = parseArgs();

  const userCount = Number(args.users ?? process.env.SEED_WORKLOAD_USER_COUNT ?? '50');
  const totalRecordCount = Number(args.records ?? process.env.SEED_WORKLOAD_RECORD_COUNT ?? '2000');
  const concurrency = Number(args.concurrency ?? process.env.SEED_WORKLOAD_CONCURRENCY ?? '50');
  const stockRatio = Number(args['stock-ratio'] ?? process.env.SEED_WORKLOAD_STOCK_RATIO ?? '0.7');
  const password = args.password ?? process.env.SEED_WORKLOAD_PASSWORD ?? '123456';
  const prefix = args.prefix ?? process.env.SEED_WORKLOAD_PREFIX ?? `WL-${formatDateToken(new Date())}`;
  const seedText = args.seed ?? prefix;
  const rng = createRng(seedText);

  if (!Number.isFinite(userCount) || userCount <= 0) {
    throw new Error('Geçerli bir --users değeri gerekli.');
  }

  if (!Number.isFinite(totalRecordCount) || totalRecordCount <= 0) {
    throw new Error('Geçerli bir --records değeri gerekli.');
  }

  if (!Number.isFinite(concurrency) || concurrency <= 0) {
    throw new Error('Geçerli bir --concurrency değeri gerekli.');
  }

  const stockCount = Math.round(totalRecordCount * clamp(stockRatio, 0.1, 0.9));
  const orderCount = totalRecordCount - stockCount;

  const pool = createPool();
  const activity = createActivityStore();

  console.log('Concurrent workload seed basliyor.');
  console.log(`Prefix: ${prefix}`);
  console.log(`Seed: ${seedText}`);
  console.log(`Kullanici: ${userCount}`);
  console.log(`Ana kayit hedefi: ${totalRecordCount} (stok=${stockCount}, emir=${orderCount})`);
  console.log(`Concurrency: ${concurrency}`);

  try {
    const passwordHash = await argon2.hash(password, HASH_OPTIONS);
    const rootAdmin = await ensureRootAdmin(pool, passwordHash);
    const unitRows = await listActiveHatUnits(pool);
    const { usernamePrefix, definitions, counts } = buildUserDefinitions({
      userCount,
      prefix,
      unitRows
    });

    console.log(`Rol dagilimi: admin=${counts.admin}, production_manager=${counts.production_manager}, warehouse_manager=${counts.warehouse_manager}, hat=${counts.hat}`);

    const createdUsers = await createSeedUsers({
      pool,
      definitions,
      passwordHash,
      actorAdmin: rootAdmin,
      prefix,
      rng,
      concurrency,
      activity
    });

    const admins = createdUsers.filter((user) => user.role === 'admin');
    const productionManagers = createdUsers.filter((user) => user.role === 'production_manager');
    const warehouseManagers = createdUsers.filter((user) => user.role === 'warehouse_manager');
    const hats = createdUsers.filter((user) => user.role === 'hat');
    const activeHatUnits = [...new Set(hats.map((user) => user.hatUnitCode).filter(Boolean))];

    if (productionManagers.length === 0 || warehouseManagers.length === 0 || hats.length === 0) {
      throw new Error('Role dagilimi yeterli degil. Seed icin production/warehouse/hat kullanicilari olusmadi.');
    }

    const rootTasks = [];

    for (let index = 0; index < stockCount; index += 1) {
      const actor = warehouseManagers[index % warehouseManagers.length];
      rootTasks.push({
        label: `stok:${index + 1}:${actor.username}`,
        run: async () => createStockRecord(pool, buildStockDraft(prefix, index, actor, rng), prefix)
      });
    }

    for (let index = 0; index < orderCount; index += 1) {
      const actor = productionManagers[index % productionManagers.length];
      rootTasks.push({
        label: `emir:${index + 1}:${actor.username}`,
        run: async () =>
          createProductionOrderRecord(
            pool,
            buildOrderDraft(prefix, index, actor, activeHatUnits, rng),
            prefix
          )
      });
    }

    const createdStocks = [];
    const createdOrders = [];

    await runTasks({
      label: 'Ana kayitlar (stok + emir)',
      tasks: shuffle(rng, rootTasks),
      concurrency,
      onSuccess: (result) => {
        if ('barcodeNo' in result) {
          createdStocks.push(result);
          incrementUserAction(activity, result.actor.username, result.actor.role, 'stockCreates', 1);
        } else {
          createdOrders.push(result);
          incrementUserAction(activity, result.actor.username, result.actor.role, 'orderCreates', 1);
        }

        return null;
      }
    });

    const warehouseTasks = createdOrders.map((order, index) => {
      const actor = warehouseManagers[index % warehouseManagers.length];
      return {
        label: `depo:${order.orderNo}:${actor.username}`,
        run: async () => processWarehouseOrder(pool, order, actor, rng, prefix)
      };
    });

    const warehouseResults = await runTasks({
      label: 'Depo is akisi',
      tasks: warehouseTasks,
      concurrency: Math.min(concurrency, warehouseManagers.length),
      onSuccess: (result) => {
        incrementUserAction(activity, result.actor.username, result.actor.role, 'materialChecks', result.materialsChecked);
        if (result.dispatched) {
          incrementUserAction(activity, result.actor.username, result.actor.role, 'warehouseDispatches', result.dispatchCount);
        }
        return result;
      }
    });

    const dispatchedOrders = warehouseResults.filter((item) => item.dispatched);
    console.log(`Depo sevki tamamlanan emir: ${dispatchedOrders.length}/${createdOrders.length}`);

    const dispatchRows = await loadDispatchesForPrefix(pool, prefix);
    const hatsByUnit = hats.reduce((map, user) => {
      if (!user.hatUnitCode) {
        return map;
      }

      if (!map.has(user.hatUnitCode)) {
        map.set(user.hatUnitCode, []);
      }

      map.get(user.hatUnitCode).push(user);
      return map;
    }, new Map());

    const acceptTasks = [];
    const completeTasks = [];
    const unitRoundRobin = new Map();

    for (const dispatch of dispatchRows) {
      if (!chance(rng, 0.9)) {
        continue;
      }

      const actors = hatsByUnit.get(dispatch.unitCode) ?? [];
      if (actors.length === 0) {
        continue;
      }

      const cursor = unitRoundRobin.get(dispatch.unitCode) ?? 0;
      const actor = actors[cursor % actors.length];
      unitRoundRobin.set(dispatch.unitCode, cursor + 1);

      const acceptedAt = addHours(dispatch.dispatchedAt, randomInt(rng, 1, 48));
      acceptTasks.push({
        label: `kabul:${dispatch.id}:${actor.username}`,
        run: async () => {
          await acceptDispatchTask(pool, dispatch, actor, acceptedAt, prefix);
          return { actor, dispatch, acceptedAt };
        }
      });

      if (chance(rng, 0.76)) {
        const completedAt = addHours(acceptedAt, randomInt(rng, 1, 36));
        completeTasks.push({
          label: `bitti:${dispatch.id}:${actor.username}`,
          run: async () => {
            await completeDispatchTask(pool, dispatch, actor, completedAt, prefix);
            return { actor, dispatch };
          }
        });
      }
    }

    await runTasks({
      label: 'Hat gorev kabul',
      tasks: acceptTasks,
      concurrency: Math.min(concurrency, hats.length),
      onSuccess: ({ actor }) => {
        incrementUserAction(activity, actor.username, actor.role, 'taskAccepts', 1);
        return null;
      }
    });

    await runTasks({
      label: 'Hat gorev tamamlama',
      tasks: completeTasks,
      concurrency: Math.min(concurrency, hats.length),
      onSuccess: ({ actor }) => {
        incrementUserAction(activity, actor.username, actor.role, 'taskCompletes', 1);
        return null;
      }
    });

    const stockUpdateCount = Math.min(Math.max(Math.floor(createdStocks.length * 0.06), 20), 180);
    const updateTasks = createdStocks.slice(0, stockUpdateCount).map((stock, index) => {
      const actor = admins[index % Math.max(admins.length, 1)] ?? rootAdmin;
      return {
        label: `stok-guncelle:${stock.id}:${actor.username}`,
        run: async () => {
          await updateStockRecord(pool, stock, actor, rng, prefix);
          return { actor };
        }
      };
    });

    await runTasks({
      label: 'Yonetici stok duzeltmeleri',
      tasks: updateTasks,
      concurrency: Math.min(concurrency, Math.max(admins.length, 1)),
      onSuccess: ({ actor }) => {
        incrementUserAction(activity, actor.username, actor.role, 'stockUpdates', 1);
        return null;
      }
    });

    const summary = await fetchDatabaseSummary(pool, prefix, usernamePrefix);

    createHeader('Seed Ozeti');
    console.log(`Prefix: ${prefix}`);
    console.log(`Ortak sifre: ${password}`);
    console.log(`Olusan kullanici prefixi: ${usernamePrefix}`);
    console.log(`Stok kaydi: ${summary.stocks}`);
    console.log(`Uretim emri: ${summary.orders}`);
    console.log(`Malzeme satiri: ${summary.materials}`);
    console.log(`Audit log: ${summary.audits}`);
    console.log('Dispatch durumlari:');
    for (const row of summary.dispatchesByStatus) {
      console.log(`- ${row.status}: ${row.count}`);
    }
    console.log('Kullanici sayisi (DB):');
    for (const row of summary.usersByRole) {
      console.log(`- ${row.role}: ${row.count}`);
    }

    printRoleSummary('Role Gore Aksiyonlar', createSummaryRows(activity.byRole));
    printRoleSummary('Ilk 12 Kullanici Ozet', createSummaryRows(activity.byUser).slice(0, 12));

    console.log(`\nCalistirma tamamlandi. Temizlemek icin: corepack pnpm cleanup:workload -- --prefix ${prefix}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
