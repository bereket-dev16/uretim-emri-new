#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

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

function quantile(values, q) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * q) - 1));
  return sorted[index];
}

async function loginAndGetCookie(baseUrl, username, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Login başarısız (${response.status}): ${text}`);
  }

  const rawCookie = response.headers.get('set-cookie');
  if (!rawCookie) {
    throw new Error('Login başarılı ama Set-Cookie header alınamadı.');
  }

  return rawCookie.split(';')[0];
}

async function runScenario({
  name,
  baseUrl,
  path,
  cookie,
  iterations,
  concurrency
}) {
  const latencies = [];
  let success = 0;
  let failed = 0;
  const errors = [];

  let nextIndex = 0;

  async function worker() {
    while (true) {
      const idx = nextIndex;
      nextIndex += 1;

      if (idx >= iterations) {
        return;
      }

      const start = performance.now();
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method: 'GET',
          headers: {
            cookie
          }
        });
        const duration = performance.now() - start;
        latencies.push(duration);

        if (response.ok) {
          success += 1;
        } else {
          failed += 1;
          if (errors.length < 5) {
            const body = await response.text();
            errors.push(`HTTP ${response.status}: ${body.slice(0, 180)}`);
          }
        }
      } catch (error) {
        const duration = performance.now() - start;
        latencies.push(duration);
        failed += 1;
        if (errors.length < 5) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const total = latencies.reduce((sum, ms) => sum + ms, 0);

  return {
    name,
    path,
    success,
    failed,
    avgMs: latencies.length ? total / latencies.length : 0,
    p50Ms: quantile(latencies, 0.5),
    p95Ms: quantile(latencies, 0.95),
    p99Ms: quantile(latencies, 0.99),
    errors
  };
}

function printScenarioResult(result) {
  console.log(`\n[${result.name}] ${result.path}`);
  console.log(`  Success: ${result.success}`);
  console.log(`  Failed: ${result.failed}`);
  console.log(`  Avg: ${result.avgMs.toFixed(2)} ms`);
  console.log(`  P50: ${result.p50Ms.toFixed(2)} ms`);
  console.log(`  P95: ${result.p95Ms.toFixed(2)} ms`);
  console.log(`  P99: ${result.p99Ms.toFixed(2)} ms`);

  if (result.errors.length > 0) {
    console.log('  Errors:');
    for (const err of result.errors) {
      console.log(`    - ${err}`);
    }
  }
}

async function run() {
  await loadDotEnv();
  const args = parseArgs();

  const baseUrl = args.baseUrl ?? process.env.BENCH_BASE_URL ?? 'http://localhost:3000';
  const username = args.username ?? process.env.BENCH_USERNAME ?? 'admin';
  const password = args.password ?? process.env.BENCH_PASSWORD;
  const prefix = args.prefix ?? process.env.BENCH_PREFIX ?? 'PERF-';
  const iterations = Number(args.iterations ?? process.env.BENCH_ITERATIONS ?? '60');
  const concurrency = Number(args.concurrency ?? process.env.BENCH_CONCURRENCY ?? '10');

  if (!password) {
    throw new Error('Benchmark için --password ya da BENCH_PASSWORD gerekli.');
  }

  if (!Number.isFinite(iterations) || iterations <= 0) {
    throw new Error('Geçerli iterations değeri gerekli. Örn: --iterations 60');
  }

  if (!Number.isFinite(concurrency) || concurrency <= 0) {
    throw new Error('Geçerli concurrency değeri gerekli. Örn: --concurrency 10');
  }

  console.log(`Benchmark başlıyor: ${baseUrl}`);
  console.log(`User: ${username}`);
  console.log(`Iterations: ${iterations}, Concurrency: ${concurrency}`);

  const cookie = await loginAndGetCookie(baseUrl, username, password);

  const scenarios = [
    {
      name: 'Stocks Page 1',
      path: '/api/stocks?page=1&pageSize=10&sort=newest'
    },
    {
      name: 'Stocks Page 50',
      path: '/api/stocks?page=50&pageSize=10&sort=newest'
    },
    {
      name: 'Stocks Search Prefix',
      path: `/api/stocks?page=1&pageSize=10&sort=newest&query=${encodeURIComponent(prefix)}`
    },
    {
      name: 'Stocks Filter Type+Category',
      path: '/api/stocks?page=1&pageSize=10&sort=newest&productType=kutu&productCategory=sarf'
    },
    {
      name: 'Dashboard Summary',
      path: '/api/dashboard/summary'
    }
  ];

  for (const scenario of scenarios) {
    const result = await runScenario({
      ...scenario,
      baseUrl,
      cookie,
      iterations,
      concurrency
    });
    printScenarioResult(result);
  }

  console.log('\nBenchmark tamamlandı.');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
