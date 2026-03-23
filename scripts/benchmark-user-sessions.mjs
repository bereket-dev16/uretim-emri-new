#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

const ROLE_VALUES = ['admin', 'production_manager', 'warehouse_manager', 'hat'];
const DEFAULT_ROLE_WEIGHTS = {
  admin: 0.05,
  production_manager: 0.2,
  warehouse_manager: 0.3,
  hat: 0.45
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
const PACKAGING_TYPES = ['kapsul', 'tablet', 'sivi', 'sase', 'softjel'];
const MARKET_SCOPES = ['ihracat', 'ic_piyasa'];
const DEMAND_SOURCES = ['numune', 'musteri_talebi', 'stok'];
const STOCK_CATEGORIES = ['sarf', 'hammadde'];
const QUANTITY_UNITS = ['adet', 'gr'];

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
    // .env yoksa sessizce devam et
  }
}

function readMsEnv(rawValue, fallback, min, max) {
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

function safeParseJson(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function toInteger(rawValue, fallback) {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quantile(values, q) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * q) - 1));
  return sorted[index];
}

function formatMs(value) {
  return `${value.toFixed(1)}ms`;
}

function randomInt(min, max) {
  if (max <= min) {
    return min;
  }

  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickRandom(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return items[randomInt(0, items.length - 1)];
}

function shuffle(items) {
  const clone = [...items];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
}

function unique(items) {
  return Array.from(new Set(items));
}

function parseMix(rawValue) {
  if (!rawValue) {
    return null;
  }

  const parsed = {};

  for (const segment of rawValue.split(',')) {
    const [roleRaw, countRaw] = segment.split(':').map((item) => item.trim());
    if (!ROLE_VALUES.includes(roleRaw)) {
      throw new Error(`Gecersiz mix rolu: ${roleRaw}`);
    }

    const count = Number(countRaw);
    if (!Number.isFinite(count) || count < 0) {
      throw new Error(`Gecersiz mix degeri: ${segment}`);
    }

    parsed[roleRaw] = Math.trunc(count);
  }

  return parsed;
}

function normalizeRole(role) {
  if (role === 'tablet1') {
    return 'hat';
  }

  if (!ROLE_VALUES.includes(role)) {
    throw new Error(`Desteklenmeyen rol: ${role}`);
  }

  return role;
}

function normalizeUsersConfig(rawConfig) {
  const grouped = {
    admin: [],
    production_manager: [],
    warehouse_manager: [],
    hat: []
  };

  if (Array.isArray(rawConfig)) {
    for (const item of rawConfig) {
      const role = normalizeRole(item.role);
      grouped[role].push({
        username: String(item.username ?? '').trim(),
        password: String(item.password ?? '').trim(),
        role,
        label: item.label ? String(item.label) : undefined
      });
    }
  } else if (rawConfig && typeof rawConfig === 'object') {
    for (const roleKey of Object.keys(grouped)) {
      const entries = rawConfig[roleKey];
      if (!Array.isArray(entries)) {
        continue;
      }

      for (const item of entries) {
        grouped[roleKey].push({
          username: String(item.username ?? '').trim(),
          password: String(item.password ?? '').trim(),
          role: roleKey,
          label: item.label ? String(item.label) : undefined
        });
      }
    }

    if (Array.isArray(rawConfig.users)) {
      for (const item of rawConfig.users) {
        const role = normalizeRole(item.role);
        grouped[role].push({
          username: String(item.username ?? '').trim(),
          password: String(item.password ?? '').trim(),
          role,
          label: item.label ? String(item.label) : undefined
        });
      }
    }
  }

  for (const role of Object.keys(grouped)) {
    grouped[role] = grouped[role].filter((item) => item.username && item.password);
  }

  return grouped;
}

async function loadUsersConfig(usersFilePath) {
  if (usersFilePath) {
    const rawContent = await readFile(usersFilePath, 'utf8');
    return normalizeUsersConfig(safeParseJson(rawContent));
  }

  const grouped = {
    admin: [],
    production_manager: [],
    warehouse_manager: [],
    hat: []
  };

  if (process.env.BENCH_ADMIN_USERNAME && process.env.BENCH_ADMIN_PASSWORD) {
    grouped.admin.push({
      username: process.env.BENCH_ADMIN_USERNAME.trim(),
      password: process.env.BENCH_ADMIN_PASSWORD.trim(),
      role: 'admin'
    });
  }

  if (process.env.BENCH_PM_USERNAME && process.env.BENCH_PM_PASSWORD) {
    grouped.production_manager.push({
      username: process.env.BENCH_PM_USERNAME.trim(),
      password: process.env.BENCH_PM_PASSWORD.trim(),
      role: 'production_manager'
    });
  }

  if (process.env.BENCH_WH_USERNAME && process.env.BENCH_WH_PASSWORD) {
    grouped.warehouse_manager.push({
      username: process.env.BENCH_WH_USERNAME.trim(),
      password: process.env.BENCH_WH_PASSWORD.trim(),
      role: 'warehouse_manager'
    });
  }

  const hatUsers = (process.env.BENCH_HAT_USERNAMES ?? process.env.BENCH_HAT_USERNAME ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const hatPassword = process.env.BENCH_HAT_PASSWORD?.trim();

  if (hatPassword) {
    for (const username of hatUsers) {
      grouped.hat.push({
        username,
        password: hatPassword,
        role: 'hat'
      });
    }
  }

  return grouped;
}

function allocateRoleCounts(totalSessions, availableRoles) {
  const weights = availableRoles.map((role) => ({ role, weight: DEFAULT_ROLE_WEIGHTS[role] ?? 0 }));
  const weightSum = weights.reduce((sum, item) => sum + item.weight, 0);

  if (weightSum <= 0) {
    const equalCount = Math.floor(totalSessions / availableRoles.length);
    const counts = Object.fromEntries(availableRoles.map((role) => [role, equalCount]));
    let assigned = equalCount * availableRoles.length;

    for (const role of availableRoles) {
      if (assigned >= totalSessions) {
        break;
      }
      counts[role] += 1;
      assigned += 1;
    }

    return counts;
  }

  const provisional = weights.map((item) => {
    const exact = (item.weight / weightSum) * totalSessions;
    return {
      role: item.role,
      count: Math.floor(exact),
      remainder: exact - Math.floor(exact)
    };
  });

  let assigned = provisional.reduce((sum, item) => sum + item.count, 0);
  const sortedRemainders = [...provisional].sort((left, right) => right.remainder - left.remainder);
  let remainderIndex = 0;

  while (assigned < totalSessions) {
    provisional.find((item) => item.role === sortedRemainders[remainderIndex].role).count += 1;
    assigned += 1;
    remainderIndex = (remainderIndex + 1) % sortedRemainders.length;
  }

  return Object.fromEntries(provisional.map((item) => [item.role, item.count]));
}

function buildSessionPlan({ totalSessions, mix, usersByRole }) {
  const availableRoles = ROLE_VALUES.filter((role) => usersByRole[role]?.length > 0);

  if (availableRoles.length === 0) {
    throw new Error('Benchmark kullanicisi bulunamadi. --usersFile veya BENCH_* env degerlerini doldur.');
  }

  let roleCounts;
  if (mix) {
    roleCounts = {};
    for (const role of ROLE_VALUES) {
      roleCounts[role] = mix[role] ?? 0;
    }
  } else {
    roleCounts = allocateRoleCounts(totalSessions, availableRoles);
  }

  const plan = [];
  const counters = new Map();

  for (const role of ROLE_VALUES) {
    const count = roleCounts[role] ?? 0;
    const pool = usersByRole[role] ?? [];

    if (count > 0 && pool.length === 0) {
      throw new Error(`Rol icin benchmark kullanicisi yok: ${role}`);
    }

    for (let index = 0; index < count; index += 1) {
      const nextCounter = (counters.get(role) ?? 0) + 1;
      counters.set(role, nextCounter);

      plan.push({
        sessionId: `${role}-${String(nextCounter).padStart(2, '0')}`,
        role,
        credential: pool[index % pool.length],
        screen: role
      });
    }
  }

  return plan;
}

function createMetrics() {
  const endpoints = new Map();
  const actions = new Map();
  const errors = [];

  function ensureEndpoint(label) {
    if (!endpoints.has(label)) {
      endpoints.set(label, {
        label,
        count: 0,
        success: 0,
        failed: 0,
        latencies: [],
        statusCounts: new Map(),
        samples: []
      });
    }

    return endpoints.get(label);
  }

  return {
    recordRequest({ label, durationMs, ok, status, sample }) {
      const endpoint = ensureEndpoint(label);
      endpoint.count += 1;
      endpoint.latencies.push(durationMs);
      endpoint.statusCounts.set(status, (endpoint.statusCounts.get(status) ?? 0) + 1);

      if (ok) {
        endpoint.success += 1;
      } else {
        endpoint.failed += 1;
        if (sample && endpoint.samples.length < 5) {
          endpoint.samples.push(sample);
        }
        if (sample && errors.length < 20) {
          errors.push(`${label} -> ${sample}`);
        }
      }
    },
    recordAction(label) {
      actions.set(label, (actions.get(label) ?? 0) + 1);
    },
    snapshot() {
      const latencyPool = [];
      let total = 0;
      let failed = 0;

      for (const endpoint of endpoints.values()) {
        total += endpoint.count;
        failed += endpoint.failed;
        latencyPool.push(...endpoint.latencies);
      }

      return {
        total,
        failed,
        p50Ms: quantile(latencyPool, 0.5),
        p95Ms: quantile(latencyPool, 0.95),
        endpointCount: endpoints.size
      };
    },
    printFinalReport() {
      console.log('\n=== Kullanici Oturumu Benchmark Ozeti ===');
      const snapshot = this.snapshot();
      console.log(`Toplam istek: ${snapshot.total}`);
      console.log(`Hata: ${snapshot.failed}`);
      console.log(`Genel P50: ${formatMs(snapshot.p50Ms)}`);
      console.log(`Genel P95: ${formatMs(snapshot.p95Ms)}`);

      console.log('\n--- Endpointler ---');
      const sortedEndpoints = [...endpoints.values()].sort((left, right) => right.count - left.count);
      for (const endpoint of sortedEndpoints) {
        const statusText = [...endpoint.statusCounts.entries()]
          .sort((left, right) => Number(left[0]) - Number(right[0]))
          .map(([status, count]) => `${status}:${count}`)
          .join(', ');

        console.log(`\n[${endpoint.label}]`);
        console.log(`  Count: ${endpoint.count}`);
        console.log(`  Failed: ${endpoint.failed}`);
        console.log(`  P50: ${formatMs(quantile(endpoint.latencies, 0.5))}`);
        console.log(`  P95: ${formatMs(quantile(endpoint.latencies, 0.95))}`);
        console.log(`  Status: ${statusText}`);
        for (const sample of endpoint.samples) {
          console.log(`    - ${sample}`);
        }
      }

      console.log('\n--- Aksiyonlar ---');
      const sortedActions = [...actions.entries()].sort((left, right) => right[1] - left[1]);
      if (sortedActions.length === 0) {
        console.log('Aksiyon yok');
      } else {
        for (const [label, count] of sortedActions) {
          console.log(`- ${label}: ${count}`);
        }
      }

      if (errors.length > 0) {
        console.log('\n--- Hata Ornekleri ---');
        for (const error of errors.slice(0, 10)) {
          console.log(`- ${error}`);
        }
      }
    }
  };
}

async function parseResponse(response) {
  const text = await response.text();
  const parsed = safeParseJson(text);

  return {
    rawText: text,
    json: parsed
  };
}

async function loginVirtualUser(baseUrl, credential, metrics) {
  const start = performance.now();

  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        username: credential.username,
        password: credential.password
      })
    });

    const durationMs = performance.now() - start;
    const payload = await parseResponse(response);
    metrics.recordRequest({
      label: 'auth/login',
      durationMs,
      ok: response.ok,
      status: response.status,
      sample: response.ok ? null : payload.rawText.slice(0, 200)
    });

    if (!response.ok) {
      throw new Error(`Login basarisiz (${response.status}): ${payload.rawText.slice(0, 200)}`);
    }

    const rawCookie = response.headers.get('set-cookie');
    if (!rawCookie) {
      throw new Error('Set-Cookie header alinamadi.');
    }

    return {
      cookie: rawCookie.split(';')[0],
      session: payload.json?.session ?? null
    };
  } catch (error) {
    metrics.recordRequest({
      label: 'auth/login',
      durationMs: performance.now() - start,
      ok: false,
      status: 0,
      sample: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function logoutVirtualUser(baseUrl, cookie, metrics) {
  const start = performance.now();

  try {
    const response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        cookie
      }
    });

    metrics.recordRequest({
      label: 'auth/logout',
      durationMs: performance.now() - start,
      ok: response.ok,
      status: response.status,
      sample: response.ok ? null : (await response.text()).slice(0, 200)
    });
  } catch (error) {
    metrics.recordRequest({
      label: 'auth/logout',
      durationMs: performance.now() - start,
      ok: false,
      status: 0,
      sample: error instanceof Error ? error.message : String(error)
    });
  }
}

async function issueRequest({ baseUrl, cookie, metrics, label, path, method = 'GET', body }) {
  const start = performance.now();

  try {
    const headers = {
      cookie
    };

    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const durationMs = performance.now() - start;
    const payload = await parseResponse(response);

    metrics.recordRequest({
      label,
      durationMs,
      ok: response.ok,
      status: response.status,
      sample: response.ok ? null : payload.rawText.slice(0, 220)
    });

    return {
      ok: response.ok,
      status: response.status,
      json: payload.json,
      rawText: payload.rawText
    };
  } catch (error) {
    metrics.recordRequest({
      label,
      durationMs: performance.now() - start,
      ok: false,
      status: 0,
      sample: error instanceof Error ? error.message : String(error)
    });

    return {
      ok: false,
      status: 0,
      json: null,
      rawText: error instanceof Error ? error.message : String(error)
    };
  }
}

function todayIso(offsetDays = 0) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() + offsetDays);
  return now.toISOString().slice(0, 10);
}

function createProductionOrderPayload(seedPrefix) {
  const suffix = `${Date.now()}-${randomInt(1000, 9999)}`;
  const materialCount = randomInt(3, 5);
  const materials = Array.from({ length: materialCount }, (_, index) => ({
    materialProductType: pickRandom(PRODUCT_TYPES),
    materialName: `${seedPrefix} Malzeme ${index + 1}`,
    materialQuantityText: `${randomInt(5, 250)} ${Math.random() > 0.4 ? 'adet' : 'kg'}`
  }));

  return {
    orderDate: todayIso(0),
    orderNo: `${seedPrefix}-EMIR-${suffix}`,
    customerName: `${seedPrefix} Musteri ${randomInt(1, 12)}`,
    marketScope: pickRandom(MARKET_SCOPES),
    demandSource: pickRandom(DEMAND_SOURCES),
    orderQuantity: `${randomInt(500, 25000)} kutu`,
    deadlineDate: todayIso(randomInt(3, 18)),
    finalProductName: `${seedPrefix} Son Urun ${randomInt(1, 18)}`,
    packagingType: pickRandom(PACKAGING_TYPES),
    totalAmountText: `${randomInt(1000, 95000)} ambalaj`,
    dispatchUnits: ['DEPO'],
    materials
  };
}

function createStockPayload(seedPrefix) {
  return {
    irsaliyeNo: `${seedPrefix}-${Date.now()}-${randomInt(100, 999)}`,
    productName: `${seedPrefix} Stok ${randomInt(1, 40)}`,
    quantityNumeric: randomInt(10, 5000),
    quantityUnit: pickRandom(QUANTITY_UNITS),
    productType: pickRandom(PRODUCT_TYPES),
    stockEntryDate: todayIso(randomInt(-2, 0)),
    productCategory: pickRandom(STOCK_CATEGORIES)
  };
}

function nextWithJitter(baseMs, jitterMs) {
  return baseMs + randomInt(0, jitterMs);
}

function createSessionState(planEntry, runtime, sharedContext) {
  return {
    ...planEntry,
    sessionIndex: 0,
    cookie: null,
    session: null,
    startedAt: 0,
    cache: {
      monitorOrders: [],
      warehouseOrders: [],
      unitOrders: [],
      stocks: []
    },
    dispatchAcceptedAt: new Map(),
    tasks: [],
    runtime,
    sharedContext
  };
}

function createTask(key, baseMs, jitterMs, run) {
  return {
    key,
    baseMs,
    jitterMs,
    nextAt: Date.now() + randomInt(200, 1200),
    async run(sessionState) {
      await run(sessionState);
      this.nextAt = Date.now() + nextWithJitter(baseMs, jitterMs);
    }
  };
}

async function pollDashboard(sessionState) {
  await issueRequest({
    baseUrl: sessionState.runtime.baseUrl,
    cookie: sessionState.cookie,
    metrics: sessionState.runtime.metrics,
    label: 'dashboard/summary',
    path: '/api/dashboard/summary'
  });
}

async function pollAudit(sessionState) {
  await issueRequest({
    baseUrl: sessionState.runtime.baseUrl,
    cookie: sessionState.cookie,
    metrics: sessionState.runtime.metrics,
    label: 'audit/stream',
    path: '/api/audit/stream?limit=12'
  });
}

async function pollStocks(sessionState) {
  const response = await issueRequest({
    baseUrl: sessionState.runtime.baseUrl,
    cookie: sessionState.cookie,
    metrics: sessionState.runtime.metrics,
    label: 'stocks/list',
    path: '/api/stocks?page=1&pageSize=10&sort=newest'
  });

  if (response.ok && response.json?.items) {
    sessionState.cache.stocks = response.json.items;
  }
}

async function pollRecentStocks(sessionState) {
  await issueRequest({
    baseUrl: sessionState.runtime.baseUrl,
    cookie: sessionState.cookie,
    metrics: sessionState.runtime.metrics,
    label: 'stocks/recent',
    path: '/api/stocks/recent'
  });
}

async function pollAdminUsers(sessionState) {
  await issueRequest({
    baseUrl: sessionState.runtime.baseUrl,
    cookie: sessionState.cookie,
    metrics: sessionState.runtime.metrics,
    label: 'admin/users',
    path: '/api/admin/users'
  });
}

async function pollMonitorOrders(sessionState) {
  const response = await issueRequest({
    baseUrl: sessionState.runtime.baseUrl,
    cookie: sessionState.cookie,
    metrics: sessionState.runtime.metrics,
    label: 'production-orders/monitor',
    path: '/api/production-orders?scope=monitor'
  });

  if (response.ok && Array.isArray(response.json?.items)) {
    sessionState.cache.monitorOrders = response.json.items;
  }
}

async function pollWarehouseOrders(sessionState) {
  const response = await issueRequest({
    baseUrl: sessionState.runtime.baseUrl,
    cookie: sessionState.cookie,
    metrics: sessionState.runtime.metrics,
    label: 'production-orders/warehouse',
    path: '/api/production-orders?scope=warehouse'
  });

  if (response.ok && Array.isArray(response.json?.items)) {
    sessionState.cache.warehouseOrders = response.json.items;
  }
}

async function pollUnitOrders(sessionState) {
  const response = await issueRequest({
    baseUrl: sessionState.runtime.baseUrl,
    cookie: sessionState.cookie,
    metrics: sessionState.runtime.metrics,
    label: 'production-orders/unit',
    path: '/api/production-orders?scope=unit'
  });

  if (response.ok && Array.isArray(response.json?.items)) {
    sessionState.cache.unitOrders = response.json.items;
  }
}

async function createRareProductionOrder(sessionState) {
  const response = await issueRequest({
    baseUrl: sessionState.runtime.baseUrl,
    cookie: sessionState.cookie,
    metrics: sessionState.runtime.metrics,
    label: 'production-orders/create',
    path: '/api/production-orders',
    method: 'POST',
    body: createProductionOrderPayload(sessionState.runtime.seedPrefix)
  });

  if (response.ok) {
    sessionState.runtime.metrics.recordAction('production-order:create');
  }
}

async function createRareStock(sessionState) {
  const response = await issueRequest({
    baseUrl: sessionState.runtime.baseUrl,
    cookie: sessionState.cookie,
    metrics: sessionState.runtime.metrics,
    label: 'stocks/create',
    path: '/api/stocks',
    method: 'POST',
    body: createStockPayload(sessionState.runtime.seedPrefix)
  });

  if (response.ok) {
    sessionState.runtime.metrics.recordAction('stock:create');
  }
}

async function warehouseProcessOrder(sessionState) {
  const orders = sessionState.cache.warehouseOrders;
  if (!Array.isArray(orders) || orders.length === 0) {
    return;
  }

  const order = orders.find((item) =>
    Array.isArray(item.materials) && item.materials.some((material) => !material.isAvailable)
  ) ?? orders.find((item) => {
    const dispatches = Array.isArray(item.dispatches) ? item.dispatches : [];
    const depoDispatch = dispatches.find((dispatch) => dispatch.unitCode === 'DEPO');
    const nonDepoDispatches = dispatches.filter((dispatch) => dispatch.unitCode !== 'DEPO');
    return depoDispatch && depoDispatch.status !== 'completed' && nonDepoDispatches.length === 0;
  });

  if (!order) {
    return;
  }

  const unavailableMaterials = order.materials.filter((material) => !material.isAvailable);
  if (unavailableMaterials.length > 0) {
    const material = pickRandom(unavailableMaterials);
    const response = await issueRequest({
      baseUrl: sessionState.runtime.baseUrl,
      cookie: sessionState.cookie,
      metrics: sessionState.runtime.metrics,
      label: 'production-orders/material-check',
      path: `/api/production-orders/${order.id}/materials/${material.id}`,
      method: 'PATCH',
      body: { isAvailable: true }
    });

    if (response.ok) {
      sessionState.runtime.metrics.recordAction('warehouse:material-check');
    }
    return;
  }

  const targets = sessionState.sharedContext.getDispatchTargets();
  if (targets.length === 0) {
    return;
  }

  const activeTargets = unique(
    shuffle(targets).slice(0, clamp(randomInt(1, 2), 1, Math.max(1, targets.length)))
  );

  const response = await issueRequest({
    baseUrl: sessionState.runtime.baseUrl,
    cookie: sessionState.cookie,
    metrics: sessionState.runtime.metrics,
    label: 'production-orders/dispatch',
    path: `/api/production-orders/${order.id}/dispatch`,
    method: 'POST',
    body: { unitCodes: activeTargets }
  });

  if (response.ok) {
    sessionState.runtime.metrics.recordAction('warehouse:dispatch');
  }
}

async function hatProcessTask(sessionState) {
  const unitCode = sessionState.session?.hatUnitCode;
  if (!unitCode) {
    return;
  }

  const orders = sessionState.cache.unitOrders;
  if (!Array.isArray(orders) || orders.length === 0) {
    return;
  }

  const candidate = orders.find((item) =>
    item.dispatches.some((dispatch) => dispatch.unitCode === unitCode && dispatch.status === 'pending')
  ) ?? orders.find((item) =>
    item.dispatches.some((dispatch) => dispatch.unitCode === unitCode && dispatch.status === 'in_progress')
  );

  if (!candidate) {
    return;
  }

  const dispatch = candidate.dispatches.find((item) => item.unitCode === unitCode);
  if (!dispatch) {
    return;
  }

  if (dispatch.status === 'pending') {
    const response = await issueRequest({
      baseUrl: sessionState.runtime.baseUrl,
      cookie: sessionState.cookie,
      metrics: sessionState.runtime.metrics,
      label: 'production-orders/accept',
      path: `/api/production-orders/dispatches/${dispatch.id}/accept`,
      method: 'POST'
    });

    if (response.ok) {
      sessionState.runtime.metrics.recordAction('hat:accept');
      sessionState.dispatchAcceptedAt.set(dispatch.id, Date.now());
    }
    return;
  }

  if (dispatch.status === 'in_progress') {
    const acceptedAt = dispatch.acceptedAt ? new Date(dispatch.acceptedAt).getTime() : null;
    const localAcceptedAt = sessionState.dispatchAcceptedAt.get(dispatch.id) ?? acceptedAt ?? Date.now();
    const elapsedMs = Date.now() - localAcceptedAt;

    if (elapsedMs < randomInt(15000, 45000)) {
      return;
    }

    const response = await issueRequest({
      baseUrl: sessionState.runtime.baseUrl,
      cookie: sessionState.cookie,
      metrics: sessionState.runtime.metrics,
      label: 'production-orders/complete',
      path: `/api/production-orders/dispatches/${dispatch.id}/complete`,
      method: 'POST'
    });

    if (response.ok) {
      sessionState.runtime.metrics.recordAction('hat:complete');
      sessionState.dispatchAcceptedAt.delete(dispatch.id);
    }
  }
}

function buildTasks(sessionState) {
  const tasks = [];
  const generalBase = sessionState.runtime.generalPollMs;
  const generalJitter = sessionState.runtime.generalJitterMs;
  const ordersBase = sessionState.runtime.ordersPollMs;
  const ordersJitter = sessionState.runtime.ordersJitterMs;

  if (sessionState.role === 'admin') {
    tasks.push(createTask('dashboard', generalBase, generalJitter, pollDashboard));
    tasks.push(createTask('audit', generalBase, generalJitter, pollAudit));
    tasks.push(createTask('users', 45000, 20000, pollAdminUsers));
    tasks.push(createTask('stocks', generalBase, generalJitter, pollStocks));
  }

  if (sessionState.role === 'production_manager') {
    tasks.push(createTask('monitor', ordersBase, ordersJitter, pollMonitorOrders));
    tasks.push(createTask('stocks', generalBase, generalJitter, pollStocks));
    tasks.push(createTask('recent', generalBase, generalJitter, pollRecentStocks));
    tasks.push(createTask('create-order', 180000, 90000, createRareProductionOrder));
  }

  if (sessionState.role === 'warehouse_manager') {
    tasks.push(createTask('warehouse', ordersBase, ordersJitter, pollWarehouseOrders));
    tasks.push(createTask('stocks', generalBase, generalJitter, pollStocks));
    tasks.push(createTask('recent', generalBase, generalJitter, pollRecentStocks));
    tasks.push(createTask('warehouse-action', 25000, 15000, warehouseProcessOrder));
    tasks.push(createTask('stock-create', 120000, 60000, createRareStock));
  }

  if (sessionState.role === 'hat') {
    tasks.push(createTask('unit', ordersBase, ordersJitter, pollUnitOrders));
    tasks.push(createTask('hat-action', 12000, 8000, hatProcessTask));
  }

  return tasks;
}

async function runVirtualSession(sessionState) {
  const { runtime } = sessionState;
  const startDelayMs = Math.floor((runtime.rampUpMs / Math.max(1, runtime.sessionCount)) * sessionState.sessionIndex);
  await sleep(startDelayMs + randomInt(0, Math.max(250, Math.floor(runtime.rampUpMs * 0.1))));

  try {
    const loginResult = await loginVirtualUser(runtime.baseUrl, sessionState.credential, runtime.metrics);
    sessionState.cookie = loginResult.cookie;
    sessionState.session = loginResult.session;
    sessionState.startedAt = Date.now();
    runtime.loggedInCount += 1;

    if (sessionState.role === 'hat' && sessionState.session?.hatUnitCode) {
      runtime.sharedContext.registerTargetUnit(sessionState.session.hatUnitCode);
    }

    sessionState.tasks = buildTasks(sessionState);

    while (Date.now() < runtime.endsAt) {
      const nextTask = sessionState.tasks.reduce((current, task) =>
        !current || task.nextAt < current.nextAt ? task : current,
      null);

      if (!nextTask) {
        break;
      }

      const waitMs = nextTask.nextAt - Date.now();
      if (waitMs > 0) {
        await sleep(Math.min(waitMs, 500));
        continue;
      }

      await nextTask.run(sessionState);
      await sleep(randomInt(100, 350));
    }
  } catch (error) {
    runtime.metrics.recordAction(`session-error:${sessionState.role}`);
    runtime.errorSamples.push(
      `${sessionState.sessionId} (${sessionState.credential.username}) -> ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    if (sessionState.cookie) {
      await logoutVirtualUser(runtime.baseUrl, sessionState.cookie, runtime.metrics);
    }
  }
}

function createSharedContext() {
  const targetUnits = new Set();

  return {
    registerTargetUnit(unitCode) {
      if (unitCode && unitCode !== 'DEPO') {
        targetUnits.add(unitCode);
      }
    },
    getDispatchTargets() {
      return targetUnits.size > 0 ? [...targetUnits] : ['TABLET1'];
    }
  };
}

function printPlan(plan) {
  const counts = plan.reduce((accumulator, item) => {
    accumulator[item.role] = (accumulator[item.role] ?? 0) + 1;
    return accumulator;
  }, {});

  console.log('\n--- Session Plani ---');
  for (const role of ROLE_VALUES) {
    console.log(`- ${role}: ${counts[role] ?? 0}`);
  }

  const sampleUsers = ROLE_VALUES.flatMap((role) => {
    const sessions = plan.filter((item) => item.role === role).slice(0, 3);
    return sessions.map((item) => `${item.sessionId} -> ${item.credential.username}`);
  });

  if (sampleUsers.length > 0) {
    console.log('Ornek oturumlar:');
    for (const line of sampleUsers) {
      console.log(`  ${line}`);
    }
  }
}

async function run() {
  await loadDotEnv();
  const args = parseArgs();

  const baseUrl = args.baseUrl ?? process.env.BENCH_BASE_URL ?? 'http://localhost:3000';
  const usersFile = args.usersFile ?? process.env.BENCH_USERS_FILE;
  const totalSessions = clamp(toInteger(args.sessions ?? process.env.BENCH_SESSIONS, 40), 1, 200);
  const durationSec = clamp(toInteger(args.durationSec ?? process.env.BENCH_DURATION_SEC, 300), 30, 7200);
  const rampUpSec = clamp(toInteger(args.rampUpSec ?? process.env.BENCH_RAMP_UP_SEC, 20), 0, 600);
  const progressEverySec = clamp(
    toInteger(args.progressEverySec ?? process.env.BENCH_PROGRESS_EVERY_SEC, 10),
    5,
    120
  );
  const mix = parseMix(args.mix ?? process.env.BENCH_MIX ?? '');
  const dryRun = args['dry-run'] === 'true';
  const seedPrefix = args.seedPrefix ?? process.env.BENCH_SEED_PREFIX ?? 'BENCH';

  const generalPollMs = readMsEnv(
    args.generalPollMs ?? process.env.NEXT_PUBLIC_CLIENT_POLL_INTERVAL_MS,
    15000,
    5000,
    60000
  );
  const generalJitterMs = Math.max(500, Math.floor(generalPollMs * 0.2));
  const ordersPollMs = readMsEnv(
    args.ordersPollMs ?? process.env.NEXT_PUBLIC_PRODUCTION_ORDERS_POLL_INTERVAL_MS,
    Math.min(generalPollMs, 5000),
    2000,
    30000
  );
  const ordersJitterMs = Math.max(300, Math.floor(ordersPollMs * 0.2));

  const usersByRole = await loadUsersConfig(usersFile);
  const plan = buildSessionPlan({
    totalSessions,
    mix,
    usersByRole
  });

  console.log('Kuyruklu kullanici oturumu benchmark basliyor.');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Sure: ${durationSec}s`);
  console.log(`Toplam oturum: ${plan.length}`);
  console.log(`Ramp-up: ${rampUpSec}s`);
  console.log(`Genel polling: ${generalPollMs}ms (+${generalJitterMs}ms jitter)`);
  console.log(`Emir polling: ${ordersPollMs}ms (+${ordersJitterMs}ms jitter)`);
  printPlan(plan);

  if (dryRun) {
    console.log('\nDry-run tamamlandi. Gercek trafik uretilmedi.');
    return;
  }

  const metrics = createMetrics();
  const sharedContext = createSharedContext();
  const runtime = {
    baseUrl,
    metrics,
    sharedContext,
    generalPollMs,
    generalJitterMs,
    ordersPollMs,
    ordersJitterMs,
    rampUpMs: rampUpSec * 1000,
    sessionCount: plan.length,
    endsAt: Date.now() + durationSec * 1000,
    loggedInCount: 0,
    errorSamples: [],
    seedPrefix
  };

  const progressTimer = setInterval(() => {
    const snapshot = metrics.snapshot();
    console.log(
      `[PROGRESS] login:${runtime.loggedInCount}/${plan.length} req:${snapshot.total} hata:${snapshot.failed} p95:${formatMs(snapshot.p95Ms)}`
    );
  }, progressEverySec * 1000);

  try {
    const sessions = plan.map((entry, sessionIndex) =>
      runVirtualSession(
        Object.assign(createSessionState(entry, runtime, sharedContext), {
          sessionIndex
        })
      )
    );

    await Promise.all(sessions);
  } finally {
    clearInterval(progressTimer);
  }

  metrics.printFinalReport();

  if (runtime.errorSamples.length > 0) {
    console.log('\n--- Session Error Samples ---');
    for (const sample of runtime.errorSamples.slice(0, 10)) {
      console.log(`- ${sample}`);
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
