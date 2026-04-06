#!/usr/bin/env node

import argon2 from 'argon2';

import {
  benchmarkMarker,
  clampNumber,
  createDbClient,
  ensureAbsolutePath,
  loadDotEnv,
  parseArgs,
  printHeading,
  randomInt,
  writeJsonFile
} from './benchmark-lib.mjs';

const RAW_UNIT_ORDER = ['SIVI_KARISIM', 'TOZ_KARISIM', 'SOFTJEL'];
const MACHINE_UNIT_ORDER = ['DEPO', 'TABLET1', 'TABLET2', 'BOYA', 'KAPSUL', 'BLISTER1', 'BLISTER2', 'PAKET'];
const EXTRA_UNIT_SEQUENCE = [
  'SIVI_KARISIM',
  'TOZ_KARISIM',
  'SOFTJEL',
  'DEPO',
  'TABLET1',
  'TABLET2',
  'KAPSUL',
  'BLISTER1',
  'BLISTER2',
  'PAKET',
  'BOYA',
  'TABLET1',
  'PAKET',
  'BLISTER1',
  'DEPO',
  'TABLET2',
  'SIVI_KARISIM',
  'KAPSUL',
  'BLISTER2',
  'TOZ_KARISIM'
];
const COLORS = ['Beyaz', 'Mavi', 'Yesil', 'Kirmizi', 'Sari'];
const PACKAGING_TYPES = ['kapsul', 'tablet', 'sivi', 'sase', 'softjel'];
const DEMAND_SOURCES = ['numune', 'musteri_talebi', 'stok'];
const MARKET_SCOPES = ['ihracat', 'ic_piyasa'];

function printHelp() {
  console.log(`
Benchmark kullanici ve backlog verisi hazirlar.

Kullanim:
  node scripts/prepare-benchmark-users.mjs [--prefix BENCH] [--password bench1234]
    [--totalUsers 30] [--backlogOrders 24]
    [--output scripts/benchmark-user-sessions.sample.json]
`);
}

function slugForUnit(code) {
  return code.toLowerCase();
}

function managerCountFor(totalUsers) {
  if (totalUsers >= 24) {
    return 3;
  }

  if (totalUsers >= 12) {
    return 2;
  }

  return 1;
}

function buildUserPlans({ prefix, password, totalUsers, units }) {
  const usernamePrefix = prefix.toLowerCase().replace(/[^\w]+/g, '_');
  const users = [];
  const unitCounters = new Map();
  const managerCount = managerCountFor(totalUsers);
  let priority = 1;

  for (let index = 0; index < managerCount; index += 1) {
    users.push({
      username: `${usernamePrefix}_pm_${String(index + 1).padStart(2, '0')}`,
      password,
      role: 'production_manager',
      hatUnitCode: null,
      unitGroup: null,
      kind: 'manager',
      priority
    });
    priority += 1;
  }

  const orderedBaseUnits = [
    ...RAW_UNIT_ORDER.map((code) => units.get(code)).filter(Boolean),
    ...MACHINE_UNIT_ORDER.map((code) => units.get(code)).filter(Boolean)
  ];

  for (const unit of orderedBaseUnits) {
    const unitGroup = unit.unitGroup ?? unit.unit_group;
    unitCounters.set(unit.code, 1);
    users.push({
      username: `${usernamePrefix}_${unitGroup === 'HAMMADDE' ? 'raw' : 'machine'}_${slugForUnit(unit.code)}_01`,
      password,
      role: unitGroup === 'HAMMADDE' ? 'raw_preparation' : 'machine_operator',
      hatUnitCode: unit.code,
      unitGroup,
      kind: 'operator',
      priority
    });
    priority += 1;
  }

  let extraIndex = 0;
  while (users.length < totalUsers) {
    const unitCode = EXTRA_UNIT_SEQUENCE[extraIndex % EXTRA_UNIT_SEQUENCE.length];
    const unit = units.get(unitCode);

    if (!unit) {
      extraIndex += 1;
      continue;
    }

    const nextCount = (unitCounters.get(unit.code) ?? 1) + 1;
    const unitGroup = unit.unitGroup ?? unit.unit_group;
    unitCounters.set(unit.code, nextCount);
    users.push({
      username: `${usernamePrefix}_${unitGroup === 'HAMMADDE' ? 'raw' : 'machine'}_${slugForUnit(unit.code)}_${String(nextCount).padStart(2, '0')}`,
      password,
      role: unitGroup === 'HAMMADDE' ? 'raw_preparation' : 'machine_operator',
      hatUnitCode: unit.code,
      unitGroup,
      kind: 'operator',
      priority
    });
    priority += 1;
    extraIndex += 1;
  }

  return users;
}

function buildBacklogSpecs({ count, prefix }) {
  const marker = benchmarkMarker(prefix);
  const now = Date.now();

  return Array.from({ length: count }, (_, index) => {
    const mode = index % 6;
    const createdAtMs = now - randomInt(2, 7) * 24 * 60 * 60 * 1000 - index * 60 * 1000;
    const deadlineOffsetDays = randomInt(20, 40);
    const metadataBase = `${marker} [OWNER:BACKLOG]`;

    if (mode <= 2) {
      return {
        backlogMode: 'HOLD_RAW',
        createdAtMs,
        deadlineOffsetDays,
        noteText: `${metadataBase} [MODE:HOLD_RAW] [HOLD]`
      };
    }

    if (mode <= 4) {
      return {
        backlogMode: 'HOLD_PARALLEL',
        createdAtMs,
        deadlineOffsetDays,
        noteText: `${metadataBase} [MODE:HOLD_PARALLEL] [HOLD]`
      };
    }

    return {
      backlogMode: 'READY_FOR_MANAGER',
      createdAtMs,
      deadlineOffsetDays,
      noteText: `${metadataBase} [MODE:READY_FOR_MANAGER]`
    };
  });
}

async function deleteExistingBenchmarkData(client, prefix) {
  const usernamePrefix = `${prefix.toLowerCase().replace(/[^\w]+/g, '_')}%`;
  const marker = `${benchmarkMarker(prefix)}%`;

  await client.query(
    `
      DELETE FROM production_orders
      WHERE note_text LIKE $1
         OR customer_name LIKE $2
    `,
    [marker, `${prefix}-%`]
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
}

async function upsertUsers(client, users) {
  const passwordHash = await argon2.hash(users[0]?.password ?? 'bench1234');
  const results = [];

  for (const user of users) {
    const result = await client.query(
      `
        INSERT INTO users (
          username,
          password_hash,
          role,
          hat_unit_code,
          is_active
        )
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (username) DO UPDATE
        SET
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          hat_unit_code = EXCLUDED.hat_unit_code,
          is_active = TRUE,
          updated_at = NOW()
        RETURNING id, username, role, hat_unit_code
      `,
      [user.username, passwordHash, user.role, user.hatUnitCode]
    );

    results.push({
      ...user,
      id: result.rows[0]?.id ?? null
    });
  }

  return results;
}

async function getNextOrderNo(client) {
  const result = await client.query(`
    SELECT COALESCE(MAX(order_no), 100000)::bigint AS max_order_no
    FROM production_orders
  `);

  return Number(result.rows[0]?.max_order_no ?? 100000) + 1;
}

async function insertBacklogOrders(client, params) {
  const {
    prefix,
    backlogOrders,
    creatorUserId,
    rawUnits,
    machineUnits,
    nextOrderNoStart
  } = params;

  let nextOrderNo = nextOrderNoStart;
  const specs = buildBacklogSpecs({ count: backlogOrders, prefix });

  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index];
    const rawUnit = RAW_UNIT_ORDER[index % RAW_UNIT_ORDER.length];
    const machineUnit = MACHINE_UNIT_ORDER[index % MACHINE_UNIT_ORDER.length];
    const createdAt = new Date(spec.createdAtMs);
    const deadlineDate = new Date(spec.createdAtMs + spec.deadlineOffsetDays * 24 * 60 * 60 * 1000);
    const orderDate = createdAt.toISOString().slice(0, 10);
    const deadlineIso = deadlineDate.toISOString().slice(0, 10);
    const noteText = `${spec.noteText} [SEED_INDEX:${index + 1}]`;
    const customerName = `${prefix}-BACKLOG-${String(index + 1).padStart(3, '0')}`;
    const plannedMachineUnitCode = spec.backlogMode === 'HOLD_RAW' ? null : machineUnit;

    const orderResult = await client.query(
      `
        INSERT INTO production_orders (
          order_date,
          order_no,
          customer_name,
          order_quantity,
          deadline_date,
          final_product_name,
          total_packaging_quantity,
          color,
          mold_text,
          has_prospectus,
          market_scope,
          demand_source,
          packaging_type,
          note_text,
          planned_raw_unit_code,
          planned_machine_unit_code,
          status,
          created_by,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, 'active', $17, $18, $19
        )
        RETURNING id
      `,
      [
        orderDate,
        nextOrderNo,
        customerName,
        randomInt(5000, 15000),
        deadlineIso,
        `${prefix}-URUN-${String(index + 1).padStart(3, '0')}`,
        randomInt(1000, 8000),
        COLORS[index % COLORS.length],
        `KALIP-${String(index + 1).padStart(3, '0')}`,
        index % 2 === 0,
        MARKET_SCOPES[index % MARKET_SCOPES.length],
        DEMAND_SOURCES[index % DEMAND_SOURCES.length],
        PACKAGING_TYPES[index % PACKAGING_TYPES.length],
        noteText,
        rawUnit,
        plannedMachineUnitCode,
        creatorUserId,
        createdAt,
        createdAt
      ]
    );

    const orderId = orderResult.rows[0]?.id;
    const rawDispatchAt = new Date(spec.createdAtMs + 5 * 60 * 1000);

    if (!orderId) {
      throw new Error('Backlog order insert failed.');
    }

    if (spec.backlogMode === 'READY_FOR_MANAGER') {
      const rawAcceptedAt = new Date(spec.createdAtMs + 30 * 60 * 1000);
      const rawCompletedAt = new Date(spec.createdAtMs + 2 * 60 * 60 * 1000);

      await client.query(
        `
          INSERT INTO production_order_dispatches (
            production_order_id,
            unit_code,
            status,
            dispatched_by,
            accepted_by,
            completed_by,
            dispatched_at,
            accepted_at,
            completed_at,
            reported_output_quantity,
            created_at,
            updated_at
          )
          VALUES (
            $1::uuid, $2, 'completed', $3::uuid, $3::uuid, $3::uuid, $4, $5, $6, $7, $4, $6
          )
        `,
        [orderId, rawUnit, creatorUserId, rawDispatchAt, rawAcceptedAt, rawCompletedAt, randomInt(800, 5000)]
      );

      if (plannedMachineUnitCode) {
        const machineAcceptedAt = new Date(spec.createdAtMs + 3 * 60 * 60 * 1000);
        const machineCompletedAt = new Date(spec.createdAtMs + 6 * 60 * 60 * 1000);

        await client.query(
          `
            INSERT INTO production_order_dispatches (
              production_order_id,
              unit_code,
              status,
              dispatched_by,
              accepted_by,
              completed_by,
              dispatched_at,
              accepted_at,
              completed_at,
              reported_output_quantity,
              created_at,
              updated_at
            )
            VALUES (
              $1::uuid, $2, 'completed', $3::uuid, $3::uuid, $3::uuid, $4, $5, $6, $7, $4, $6
            )
          `,
          [orderId, plannedMachineUnitCode, creatorUserId, rawCompletedAt, machineAcceptedAt, machineCompletedAt, randomInt(800, 5000)]
        );
      }
    } else {
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
          VALUES ($1::uuid, $2, 'pending', $3::uuid, $4, $4, $4)
        `,
        [orderId, rawUnit, creatorUserId, rawDispatchAt]
      );

      if (plannedMachineUnitCode) {
        const machineDispatchAt = new Date(spec.createdAtMs + 10 * 60 * 1000);
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
            VALUES ($1::uuid, $2, 'pending', $3::uuid, $4, $4, $4)
          `,
          [orderId, plannedMachineUnitCode, creatorUserId, machineDispatchAt]
        );
      }
    }

    nextOrderNo += 1;
  }

  return {
    created: specs.length,
    nextOrderNo
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  await loadDotEnv();

  const prefix = String(args.prefix ?? 'BENCH').trim().toUpperCase();
  const password = String(args.password ?? 'bench1234');
  const totalUsers = clampNumber(args.totalUsers, 30, 14, 60);
  const backlogOrders = clampNumber(args.backlogOrders, 24, 0, 500);
  const outputPath = ensureAbsolutePath(
    String(args.output ?? 'scripts/benchmark-user-sessions.sample.json')
  );

  const client = createDbClient();
  await client.connect();

  try {
    const unitsResult = await client.query(
      `
        SELECT code, name, unit_group AS "unitGroup", is_active AS "isActive"
        FROM production_units
        WHERE is_active = TRUE
        ORDER BY unit_group ASC, name ASC
      `
    );
    const units = new Map(unitsResult.rows.map((row) => [row.code, row]));
    const userPlans = buildUserPlans({
      prefix,
      password,
      totalUsers,
      units
    });

    await client.query('BEGIN');
    await deleteExistingBenchmarkData(client, prefix);
    const users = await upsertUsers(client, userPlans);
    const manager = users.find((user) => user.role === 'production_manager');

    if (!manager?.id) {
      throw new Error('Benchmark manager user could not be created.');
    }

    const nextOrderNoStart = await getNextOrderNo(client);
    const backlog = await insertBacklogOrders(client, {
      prefix,
      backlogOrders,
      creatorUserId: manager.id,
      rawUnits: RAW_UNIT_ORDER,
      machineUnits: MACHINE_UNIT_ORDER,
      nextOrderNoStart
    });
    await client.query('COMMIT');

    const payload = {
      prefix,
      generatedAt: new Date().toISOString(),
      defaultPassword: password,
      backlogOrders,
      users: users
        .map(({ id, ...rest }) => rest)
        .sort((left, right) => left.priority - right.priority)
    };

    await writeJsonFile(outputPath, payload);

    printHeading('Benchmark Hazirligi Tamamlandi');
    console.log(`Prefix: ${prefix}`);
    console.log(`Toplam kullanici: ${users.length}`);
    console.log(`Backlog emri: ${backlog.created}`);
    console.log(`Cikti dosyasi: ${outputPath}`);
    console.log('\nRol dagilimi:');

    const roleCounts = payload.users.reduce((accumulator, user) => {
      accumulator[user.role] = (accumulator[user.role] ?? 0) + 1;
      return accumulator;
    }, {});

    for (const [role, count] of Object.entries(roleCounts)) {
      console.log(`- ${role}: ${count}`);
    }
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
