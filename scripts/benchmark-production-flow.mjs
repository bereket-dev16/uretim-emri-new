#!/usr/bin/env node

import {
  clampNumber,
  ensureAbsolutePath,
  formatMs,
  formatSeconds,
  getJsonContentType,
  loadDotEnv,
  parseArgs,
  parseSetCookie,
  percentile,
  pickRandom,
  printHeading,
  randomInt,
  readJsonFile,
  shuffle,
  sleep
} from './benchmark-lib.mjs';

const RAW_UNIT_CODES = ['SIVI_KARISIM', 'TOZ_KARISIM', 'SOFTJEL'];
const MACHINE_UNIT_CODES = ['DEPO', 'TABLET1', 'TABLET2', 'BOYA', 'KAPSUL', 'BLISTER1', 'BLISTER2', 'PAKET'];
const COLORS = ['Beyaz', 'Mavi', 'Yesil', 'Kirmizi', 'Sari'];
const PACKAGING_TYPES = ['kapsul', 'tablet', 'sivi', 'sase', 'softjel'];
const DEMAND_SOURCES = ['numune', 'musteri_talebi', 'stok'];
const MARKET_SCOPES = ['ihracat', 'ic_piyasa'];

function printHelp() {
  console.log(`
Gercekci, kuyruklu benchmark akisini calistirir.

Kullanim:
  node scripts/benchmark-production-flow.mjs
    --usersFile scripts/benchmark-user-sessions.sample.json
    --baseUrl http://127.0.0.1:3000
    [--sessions 30]
    [--durationSec 300]
    [--rampUpSec 20]
`);
}

function endpointLabel(method, path) {
  if (method === 'GET' && path.startsWith('/api/production-orders?scope=active')) {
    return 'orders/active';
  }
  if (method === 'GET' && path.startsWith('/api/production-orders?scope=completed')) {
    return 'orders/completed';
  }
  if (method === 'GET' && path.startsWith('/api/production-orders?scope=incoming')) {
    return 'orders/incoming';
  }
  if (method === 'GET' && path.startsWith('/api/production-orders?scope=unit')) {
    return 'orders/unit';
  }
  if (method === 'GET' && path.startsWith('/api/dashboard/summary')) {
    return 'dashboard/summary';
  }
  if (method === 'POST' && path === '/api/production-orders') {
    return 'orders/create';
  }
  if (method === 'POST' && path.endsWith('/dispatch')) {
    return 'orders/dispatch';
  }
  if (method === 'POST' && path.includes('/dispatches/') && path.endsWith('/accept')) {
    return 'dispatch/accept';
  }
  if (method === 'POST' && path.includes('/dispatches/') && path.endsWith('/complete')) {
    return 'dispatch/complete';
  }
  if (method === 'POST' && path.endsWith('/finish')) {
    return 'orders/finish';
  }
  if (method === 'POST' && path === '/api/auth/login') {
    return 'auth/login';
  }
  if (method === 'POST' && path === '/api/auth/logout') {
    return 'auth/logout';
  }

  return `${method} ${path}`;
}

function createMetrics() {
  return {
    startedAtMs: Date.now(),
    requestLatencies: [],
    requestCount: 0,
    errorCount: 0,
    loginCount: 0,
    endpointStats: new Map(),
    workflowState: new Map(),
    workflowMetrics: {
      firstAcceptMs: [],
      firstAcceptUnderBacklogMs: [],
      workStepMs: [],
      managerFinishLagMs: []
    },
    errorSamples: []
  };
}

function getEndpointBucket(metrics, label) {
  const existing = metrics.endpointStats.get(label);

  if (existing) {
    return existing;
  }

  const next = {
    count: 0,
    failed: 0,
    latencies: [],
    statuses: new Map()
  };

  metrics.endpointStats.set(label, next);
  return next;
}

function recordRequest(metrics, params) {
  const bucket = getEndpointBucket(metrics, params.label);

  metrics.requestCount += 1;
  metrics.requestLatencies.push(params.durationMs);
  bucket.count += 1;
  bucket.latencies.push(params.durationMs);
  bucket.statuses.set(params.status, (bucket.statuses.get(params.status) ?? 0) + 1);

  if (params.failed) {
    metrics.errorCount += 1;
    bucket.failed += 1;

    if (metrics.errorSamples.length < 12) {
      metrics.errorSamples.push(`${params.label} -> ${params.errorMessage ?? `HTTP ${params.status}`}`);
    }
  }
}

function getOrderWorkflowState(metrics, orderId) {
  const existing = metrics.workflowState.get(orderId);

  if (existing) {
    return existing;
  }

  const next = {
    createdAtMs: Date.now(),
    firstAcceptedAtMs: null,
    lastDispatchClosedAtMs: null
  };

  metrics.workflowState.set(orderId, next);
  return next;
}

function parseBenchmarkMeta(noteText, prefix) {
  if (typeof noteText !== 'string') {
    return null;
  }

  if (!noteText.includes(`[BENCH:${prefix}]`)) {
    return null;
  }

  const ownerMatch = noteText.match(/\[OWNER:([^\]]+)\]/);
  const machineSequenceMatch = noteText.match(/\[MSEQ:([^\]]+)\]/);
  const managerHoldMatch = noteText.match(/\[MGRHOLD:(\d+)\]/);

  return {
    owner: ownerMatch?.[1] ?? null,
    machineSequence:
      machineSequenceMatch?.[1] && machineSequenceMatch[1] !== 'NONE'
        ? machineSequenceMatch[1].split(',').filter(Boolean)
        : [],
    hold: noteText.includes('[HOLD]'),
    managerHoldSec: managerHoldMatch ? Number(managerHoldMatch[1]) : 0
  };
}

function buildSelectedUsers(payload, sessions) {
  const ordered = [...payload.users].sort((left, right) => left.priority - right.priority);
  return ordered.slice(0, sessions);
}

function hashString(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function buildOperatorProfile(user) {
  const seed = hashString(user.username) % 3;
  const isRaw = user.role === 'raw_preparation';

  if (seed === 0) {
    return {
      acceptDelayMs: randomInt(5000, 20000),
      workDurationMs: randomInt(isRaw ? 30000 : 45000, isRaw ? 90000 : 120000),
      maxActive: 2
    };
  }

  if (seed === 1) {
    return {
      acceptDelayMs: randomInt(20000, 60000),
      workDurationMs: randomInt(isRaw ? 60000 : 90000, isRaw ? 150000 : 210000),
      maxActive: 1
    };
  }

  return {
    acceptDelayMs: randomInt(60000, 150000),
    workDurationMs: randomInt(isRaw ? 90000 : 120000, isRaw ? 240000 : 300000),
    maxActive: 1
  };
}

function buildManagerProfile(username) {
  const seed = hashString(username) % 3;

  if (seed === 0) {
    return {
      createEveryMs: randomInt(20000, 30000),
      maxOwnedActive: 5,
      completedPollEveryMs: 25000,
      dashboardPollEveryMs: 20000
    };
  }

  if (seed === 1) {
    return {
      createEveryMs: randomInt(25000, 40000),
      maxOwnedActive: 4,
      completedPollEveryMs: 30000,
      dashboardPollEveryMs: 25000
    };
  }

  return {
    createEveryMs: randomInt(35000, 50000),
    maxOwnedActive: 3,
    completedPollEveryMs: 35000,
    dashboardPollEveryMs: 30000
  };
}

class BenchClient {
  constructor({ baseUrl, metrics, user, timeoutMs }) {
    this.baseUrl = new URL(baseUrl);
    this.metrics = metrics;
    this.user = user;
    this.timeoutMs = timeoutMs;
    this.cookie = null;
  }

  async login() {
    const response = await this.request('POST', '/api/auth/login', {
      label: 'auth/login',
      json: {
        username: this.user.username,
        password: this.user.password
      }
    });

    if (!response.ok) {
      return false;
    }

    this.metrics.loginCount += 1;
    return true;
  }

  async request(method, path, options = {}) {
    const label = options.label ?? endpointLabel(method, path);
    const url = new URL(path, this.baseUrl);
    const headers = new Headers(options.headers ?? {});
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = performance.now();

    if (this.cookie) {
      headers.set('cookie', `${this.cookie.name}=${this.cookie.value}`);
    }

    if (options.json !== undefined) {
      headers.set('content-type', 'application/json');
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
        signal: controller.signal
      });
      const durationMs = performance.now() - startedAt;
      const cookie = parseSetCookie(response.headers.get('set-cookie'));

      if (cookie) {
        this.cookie = cookie;
      }

      let payload = null;

      if (getJsonContentType(response.headers)) {
        payload = await response.json().catch(() => null);
      }

      recordRequest(this.metrics, {
        label,
        durationMs,
        status: response.status,
        failed: !response.ok,
        errorMessage: payload?.error?.message ?? null
      });

      return {
        ok: response.ok,
        status: response.status,
        payload
      };
    } catch (error) {
      const durationMs = performance.now() - startedAt;
      const message = error instanceof Error ? error.message : 'request-failed';

      recordRequest(this.metrics, {
        label,
        durationMs,
        status: 0,
        failed: true,
        errorMessage: message
      });

      return {
        ok: false,
        status: 0,
        payload: {
          error: {
            message
          }
        }
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function hasOpenDispatches(order, group = null) {
  return order.dispatches.some((dispatch) => {
    if (group && dispatch.unitGroup !== group) {
      return false;
    }

    return dispatch.status === 'pending' || dispatch.status === 'in_progress';
  });
}

function getDispatchByUnitAndStatus(order, unitCode, status) {
  return order.dispatches.find((dispatch) => dispatch.unitCode === unitCode && dispatch.status === status) ?? null;
}

function nextUnusedMachine(order, machineSequence) {
  const used = new Set(order.dispatches.map((dispatch) => dispatch.unitCode));
  return machineSequence.find((unitCode) => !used.has(unitCode)) ?? null;
}

function buildCreatePayload({ prefix, username, orderNo }) {
  const rawUnit = pickRandom(RAW_UNIT_CODES);
  const machineSequence = Math.random() < 0.72
    ? shuffle(MACHINE_UNIT_CODES).slice(0, randomInt(1, 3))
    : [];
  const managerHoldSec = randomInt(20, 90);
  const orderDate = new Date();
  const deadline = new Date(Date.now() + randomInt(1, 3) * 24 * 60 * 60 * 1000);

  return {
    payload: {
      orderDate: orderDate.toISOString().slice(0, 10),
      orderNo,
      customerName: `${prefix}-FLOW-${username}-${orderNo}`,
      orderQuantity: randomInt(500, 6000),
      deadlineDate: deadline.toISOString().slice(0, 10),
      finalProductName: `${prefix}-URUN-${orderNo}`,
      totalPackagingQuantity: randomInt(100, 2000),
      color: pickRandom(COLORS),
      moldText: `KALIP-${orderNo}`,
      hasProspectus: Math.random() < 0.6,
      marketScope: pickRandom(MARKET_SCOPES),
      demandSource: pickRandom(DEMAND_SOURCES),
      packagingType: pickRandom(PACKAGING_TYPES),
      noteText: `[BENCH:${prefix}] [OWNER:${username}] [MSEQ:${machineSequence.length > 0 ? machineSequence.join(',') : 'NONE'}] [MGRHOLD:${managerHoldSec}] Kuyruklu benchmark emri`,
      plannedRawUnitCode: rawUnit,
      plannedMachineUnitCode: machineSequence[0] ?? null
    },
    machineSequence
  };
}

function makeManagerSession(params) {
  const profile = buildManagerProfile(params.user.username);
  const ownedOrders = new Set();
  let nextCreateAtMs = Date.now() + randomInt(5000, 15000);
  let nextCompletedPollAtMs = Date.now() + randomInt(8000, 14000);
  let nextDashboardPollAtMs = Date.now() + randomInt(3000, 10000);

  return async function runManagerSession() {
    const client = new BenchClient({
      baseUrl: params.baseUrl,
      metrics: params.metrics,
      user: params.user,
      timeoutMs: params.timeoutMs
    });
    const loggedIn = await client.login();

    if (!loggedIn) {
      return;
    }

    while (Date.now() < params.endsAtMs) {
      const activeResponse = await client.request(
        'GET',
        '/api/production-orders?scope=active&page=1&pageSize=10',
        { label: 'orders/active' }
      );

      const activeItems = Array.isArray(activeResponse.payload?.items)
        ? activeResponse.payload.items
        : [];

      const ownedVisibleOrders = activeItems.filter((order) => {
        const meta = parseBenchmarkMeta(order.noteText, params.prefix);
        return meta?.owner === params.user.username;
      });

      for (const order of ownedVisibleOrders) {
        ownedOrders.add(order.id);
      }

      for (const order of ownedVisibleOrders) {
        const meta = parseBenchmarkMeta(order.noteText, params.prefix);

        if (!meta) {
          continue;
        }

        const rawCompleted = order.dispatches.some(
          (dispatch) => dispatch.unitGroup === 'HAMMADDE' && dispatch.status === 'completed'
        );
        const machineNextUnit = nextUnusedMachine(order, meta.machineSequence);
        const hasOpenRaw = hasOpenDispatches(order, 'HAMMADDE');
        const hasOpenMachine = hasOpenDispatches(order, 'MAKINE');

        if (!hasOpenMachine && rawCompleted && machineNextUnit) {
          const dispatchResponse = await client.request(
            'POST',
            `/api/production-orders/${order.id}/dispatch`,
            {
              label: 'orders/dispatch',
              json: {
                unitCode: machineNextUnit
              }
            }
          );

          if (dispatchResponse.ok && dispatchResponse.payload?.item) {
            continue;
          }
        }

        if (!hasOpenRaw && !hasOpenMachine) {
          const state = getOrderWorkflowState(params.metrics, order.id);

          if (!state.lastDispatchClosedAtMs) {
            state.lastDispatchClosedAtMs = Date.now();
          }

          if (Date.now() - state.lastDispatchClosedAtMs >= meta.managerHoldSec * 1000) {
            const finishResponse = await client.request(
              'POST',
              `/api/production-orders/${order.id}/finish`,
              { label: 'orders/finish' }
            );

            if (finishResponse.ok) {
              const lagMs = Date.now() - state.lastDispatchClosedAtMs;
              params.metrics.workflowMetrics.managerFinishLagMs.push(lagMs);
              ownedOrders.delete(order.id);
            }
          }
        }
      }

      if (Date.now() >= nextCompletedPollAtMs) {
        await client.request(
          'GET',
          '/api/production-orders?scope=completed&page=1&pageSize=10',
          { label: 'orders/completed' }
        );
        nextCompletedPollAtMs = Date.now() + profile.completedPollEveryMs;
      }

      if (Date.now() >= nextDashboardPollAtMs) {
        await client.request('GET', '/api/dashboard/summary', { label: 'dashboard/summary' });
        nextDashboardPollAtMs = Date.now() + profile.dashboardPollEveryMs;
      }

      const ownedOpenCount = ownedVisibleOrders.filter((order) => order.status === 'active').length;

      if (Date.now() >= nextCreateAtMs && ownedOpenCount < profile.maxOwnedActive) {
        const nextOrderNo = params.nextOrderNoRef.value;
        params.nextOrderNoRef.value += 1;
        const { payload } = buildCreatePayload({
          prefix: params.prefix,
          username: params.user.username,
          orderNo: nextOrderNo
        });
        const createResponse = await client.request('POST', '/api/production-orders', {
          label: 'orders/create',
          json: payload
        });

        if (createResponse.ok && createResponse.payload?.item?.id) {
          const state = getOrderWorkflowState(params.metrics, createResponse.payload.item.id);
          state.createdAtMs = Date.now();
          ownedOrders.add(createResponse.payload.item.id);
        }

        nextCreateAtMs = Date.now() + profile.createEveryMs + randomInt(1000, 8000);
      }

      await sleep(randomInt(3500, 6500));
    }
  };
}

function makeOperatorSession(params) {
  const profile = buildOperatorProfile(params.user);
  const activeTasks = new Map();
  const seenPendingAt = new Map();

  return async function runOperatorSession() {
    const client = new BenchClient({
      baseUrl: params.baseUrl,
      metrics: params.metrics,
      user: params.user,
      timeoutMs: params.timeoutMs
    });
    const loggedIn = await client.login();

    if (!loggedIn) {
      return;
    }

    while (Date.now() < params.endsAtMs) {
      const incomingResponse = await client.request(
        'GET',
        '/api/production-orders?scope=incoming&page=1&pageSize=10',
        { label: 'orders/incoming' }
      );

      const incomingItems = Array.isArray(incomingResponse.payload?.items)
        ? incomingResponse.payload.items
        : [];

      for (const order of incomingItems) {
        const meta = parseBenchmarkMeta(order.noteText, params.prefix);
        if (!meta || meta.hold) {
          continue;
        }

        const pendingDispatch = getDispatchByUnitAndStatus(order, params.user.hatUnitCode, 'pending');

        if (!pendingDispatch) {
          continue;
        }

        if (!seenPendingAt.has(pendingDispatch.id)) {
          seenPendingAt.set(pendingDispatch.id, Date.now());
        }

        if (activeTasks.size >= profile.maxActive) {
          continue;
        }

        const firstSeenAt = seenPendingAt.get(pendingDispatch.id) ?? Date.now();

        if (Date.now() - firstSeenAt < profile.acceptDelayMs) {
          continue;
        }

        const acceptResponse = await client.request(
          'POST',
          `/api/production-orders/dispatches/${pendingDispatch.id}/accept`,
          { label: 'dispatch/accept' }
        );

        if (!acceptResponse.ok) {
          continue;
        }

        const nowMs = Date.now();
        activeTasks.set(pendingDispatch.id, {
          orderId: order.id,
          acceptedAtMs: nowMs,
          completeAtMs: nowMs + profile.workDurationMs + randomInt(1000, 20000),
          quantity: Math.max(1, Number(order.totalPackagingQuantity) || Number(order.orderQuantity) || 1)
        });
        seenPendingAt.delete(pendingDispatch.id);

        const state = params.metrics.workflowState.get(order.id);
        if (state && !state.firstAcceptedAtMs) {
          state.firstAcceptedAtMs = nowMs;
          params.metrics.workflowMetrics.firstAcceptMs.push(nowMs - state.createdAtMs);
          if (incomingItems.length > 1) {
            params.metrics.workflowMetrics.firstAcceptUnderBacklogMs.push(nowMs - state.createdAtMs);
          }
        }
      }

      const unitResponse = await client.request(
        'GET',
        '/api/production-orders?scope=unit&page=1&pageSize=10',
        { label: 'orders/unit' }
      );

      const unitItems = Array.isArray(unitResponse.payload?.items) ? unitResponse.payload.items : [];
      const activeDispatchIds = new Set();

      for (const order of unitItems) {
        const meta = parseBenchmarkMeta(order.noteText, params.prefix);

        if (!meta || meta.hold) {
          continue;
        }

        const activeDispatch = getDispatchByUnitAndStatus(order, params.user.hatUnitCode, 'in_progress');

        if (!activeDispatch) {
          continue;
        }

        activeDispatchIds.add(activeDispatch.id);

        if (!activeTasks.has(activeDispatch.id)) {
          const nowMs = Date.now();
          activeTasks.set(activeDispatch.id, {
            orderId: order.id,
            acceptedAtMs: nowMs,
            completeAtMs: nowMs + profile.workDurationMs,
            quantity: Math.max(1, Number(order.totalPackagingQuantity) || Number(order.orderQuantity) || 1)
          });
        }

        const task = activeTasks.get(activeDispatch.id);

        if (!task || task.completeAtMs > Date.now()) {
          continue;
        }

        const completeResponse = await client.request(
          'POST',
          `/api/production-orders/dispatches/${activeDispatch.id}/complete`,
          {
            label: 'dispatch/complete',
            json: {
              reportedOutputQuantity: task.quantity
            }
          }
        );

        if (!completeResponse.ok) {
          continue;
        }

        params.metrics.workflowMetrics.workStepMs.push(Date.now() - task.acceptedAtMs);
        activeTasks.delete(activeDispatch.id);

        const updatedOrder = completeResponse.payload?.item;
        if (updatedOrder && !hasOpenDispatches(updatedOrder)) {
          const state = params.metrics.workflowState.get(updatedOrder.id);
          if (state) {
            state.lastDispatchClosedAtMs = Date.now();
          }
        }
      }

      for (const dispatchId of [...activeTasks.keys()]) {
        if (!activeDispatchIds.has(dispatchId)) {
          activeTasks.delete(dispatchId);
        }
      }

      await sleep(randomInt(3500, 6500));
    }
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  await loadDotEnv();

  const usersFile = ensureAbsolutePath(
    String(args.usersFile ?? 'scripts/benchmark-user-sessions.sample.json')
  );
  const baseUrl = String(args.baseUrl ?? 'http://127.0.0.1:3000');
  const durationSec = clampNumber(args.durationSec, 300, 30, 7200);
  const rampUpSec = clampNumber(args.rampUpSec, 20, 0, 600);
  const timeoutMs = clampNumber(args.timeoutMs, 20000, 2000, 120000);
  const payload = await readJsonFile(usersFile);
  const requestedSessions = clampNumber(args.sessions, 30, 1, payload.users.length);
  const selectedUsers = buildSelectedUsers(payload, requestedSessions);
  const endsAtMs = Date.now() + durationSec * 1000;
  const metrics = createMetrics();
  const nextOrderNoRef = {
    value: Date.now()
  };

  printHeading('Kuyruklu Kullanici Oturumu Benchmark Basliyor');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Sure: ${durationSec}s`);
  console.log(`Toplam oturum: ${selectedUsers.length}`);
  console.log(`Ramp-up: ${rampUpSec}s`);
  console.log(`Genel polling: 15000ms (+3000ms jitter)`);
  console.log(`Emir polling: 5000ms (+1000ms jitter)`);

  const roleCounts = selectedUsers.reduce((accumulator, user) => {
    accumulator[user.role] = (accumulator[user.role] ?? 0) + 1;
    return accumulator;
  }, {});

  console.log('\n--- Session Plani ---');
  for (const [role, count] of Object.entries(roleCounts)) {
    console.log(`- ${role}: ${count}`);
  }

  console.log('Ornek oturumlar:');
  for (const user of selectedUsers.slice(0, Math.min(12, selectedUsers.length))) {
    console.log(`  ${user.role}${user.hatUnitCode ? `:${user.hatUnitCode}` : ''} -> ${user.username}`);
  }

  const progressTimer = setInterval(() => {
    console.log(
      `[PROGRESS] login:${metrics.loginCount}/${selectedUsers.length} req:${metrics.requestCount} hata:${metrics.errorCount} p95:${formatMs(percentile(metrics.requestLatencies, 95))}`
    );
  }, 10000);

  try {
    const sessions = selectedUsers.map((user, index) => {
      const runner =
        user.role === 'production_manager'
          ? makeManagerSession({
              user,
              baseUrl,
              metrics,
              prefix: payload.prefix,
              endsAtMs,
              timeoutMs,
              nextOrderNoRef
            })
          : makeOperatorSession({
              user,
              baseUrl,
              metrics,
              prefix: payload.prefix,
              endsAtMs,
              timeoutMs
            });

      return (async () => {
        const rampDelayMs = selectedUsers.length > 1
          ? Math.floor((index / (selectedUsers.length - 1)) * rampUpSec * 1000)
          : 0;

        if (rampDelayMs > 0) {
          await sleep(rampDelayMs);
        }

        await runner();
      })();
    });

    await Promise.all(sessions);
  } finally {
    clearInterval(progressTimer);
  }

  printHeading('Kullanici Oturumu Benchmark Ozeti');
  console.log(`Toplam istek: ${metrics.requestCount}`);
  console.log(`Hata: ${metrics.errorCount}`);
  console.log(`Genel P50: ${formatMs(percentile(metrics.requestLatencies, 50))}`);
  console.log(`Genel P95: ${formatMs(percentile(metrics.requestLatencies, 95))}`);
  console.log(`Genel P99: ${formatMs(percentile(metrics.requestLatencies, 99))}`);

  printHeading('Endpointler');
  const endpointEntries = [...metrics.endpointStats.entries()].sort(
    (left, right) => right[1].count - left[1].count
  );

  for (const [label, stat] of endpointEntries) {
    const statusSummary = [...stat.statuses.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([status, count]) => `${status}:${count}`)
      .join(', ');

    console.log(`\n[${label}]`);
    console.log(`  Count: ${stat.count}`);
    console.log(`  Failed: ${stat.failed}`);
    console.log(`  P50: ${formatMs(percentile(stat.latencies, 50))}`);
    console.log(`  P95: ${formatMs(percentile(stat.latencies, 95))}`);
    console.log(`  P99: ${formatMs(percentile(stat.latencies, 99))}`);
    console.log(`  Status: ${statusSummary}`);
  }

  printHeading('Akis Metrikleri');
  console.log(`Ilk kabul suresi P50: ${formatSeconds(percentile(metrics.workflowMetrics.firstAcceptMs, 50) / 1000)}`);
  console.log(`Ilk kabul suresi P95: ${formatSeconds(percentile(metrics.workflowMetrics.firstAcceptMs, 95) / 1000)}`);
  console.log(`Backlog altinda ilk kabul P50: ${formatSeconds(percentile(metrics.workflowMetrics.firstAcceptUnderBacklogMs, 50) / 1000)}`);
  console.log(`Calisma adimi P50: ${formatSeconds(percentile(metrics.workflowMetrics.workStepMs, 50) / 1000)}`);
  console.log(`Calisma adimi P95: ${formatSeconds(percentile(metrics.workflowMetrics.workStepMs, 95) / 1000)}`);
  console.log(`Son kapanis -> finish P50: ${formatSeconds(percentile(metrics.workflowMetrics.managerFinishLagMs, 50) / 1000)}`);

  if (metrics.errorSamples.length > 0) {
    printHeading('Hata Ornekleri');
    for (const sample of metrics.errorSamples) {
      console.log(`- ${sample}`);
    }
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
