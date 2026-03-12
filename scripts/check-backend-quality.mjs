#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

/** @typedef {{ level: 'error' | 'warning'; code: string; file: string; detail: string }} Issue */

/**
 * @param {string} dirPath
 * @returns {Promise<string[]>}
 */
async function walkFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(absolutePath)));
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

/**
 * @param {string} filePath
 */
async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

/**
 * @param {Issue[]} issues
 * @param {'error' | 'warning'} level
 * @param {string} code
 * @param {string} file
 * @param {string} detail
 */
function pushIssue(issues, level, code, file, detail) {
  issues.push({ level, code, file, detail });
}

/**
 * @param {Issue[]} issues
 * @param {string[]} routeFiles
 */
async function checkApiHandlers(issues, routeFiles) {
  const sessionOptionalRoutes = new Set([
    'src/app/api/auth/login/route.ts',
    'src/app/api/auth/logout/route.ts',
    'src/app/api/auth/session/route.ts'
  ]);

  for (const filePath of routeFiles) {
    const content = await readText(filePath);
    const relativeFile = path.relative(ROOT, filePath);

    if (!content.includes('withApiHandler(')) {
      pushIssue(
        issues,
        'error',
        'api-with-api-handler',
        relativeFile,
        'Route handler must be wrapped by withApiHandler for error envelope + requestId.'
      );
    }

    if (!sessionOptionalRoutes.has(relativeFile) && !content.includes('requireApiSession(')) {
      pushIssue(
        issues,
        'error',
        'api-require-session',
        relativeFile,
        'Protected API route should enforce requireApiSession.'
      );
    }
  }
}

/**
 * @param {Issue[]} issues
 * @param {string[]} sqlFiles
 */
async function checkMigrationSafety(issues, sqlFiles) {
  const migrationNumbers = [];

  for (const filePath of sqlFiles) {
    const fileName = path.basename(filePath);
    const relativeFile = path.relative(ROOT, filePath);
    const content = await readText(filePath);

    const prefix = fileName.match(/^(\d+)_/);
    if (prefix) {
      migrationNumbers.push(Number(prefix[1]));
    }

    if (/\bDROP\s+TABLE\b/i.test(content)) {
      pushIssue(
        issues,
        'error',
        'migration-drop-table',
        relativeFile,
        'DROP TABLE is blocked in this project. Use additive migration strategy.'
      );
    }

    if (/\bTRUNCATE\b/i.test(content)) {
      pushIssue(
        issues,
        'error',
        'migration-truncate',
        relativeFile,
        'TRUNCATE is blocked in this project to avoid destructive operations.'
      );
    }

  }

  if (migrationNumbers.length > 0) {
    const sorted = [...migrationNumbers].sort((a, b) => a - b);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const expectedLength = last - first + 1;

    if (expectedLength !== sorted.length) {
      pushIssue(
        issues,
        'warning',
        'migration-sequence-gap',
        'db/migrations',
        `Migration numbers contain gaps: ${sorted.join(', ')}`
      );
    }
  }
}

/**
 * @param {Issue[]} issues
 * @param {string[]} serverTsFiles
 */
async function checkSqlQuality(issues, serverTsFiles) {
  for (const filePath of serverTsFiles) {
    const content = await readText(filePath);
    const relativeFile = path.relative(ROOT, filePath);

    if (/\bSELECT\s+\*/i.test(content)) {
      pushIssue(
        issues,
        'warning',
        'sql-select-star',
        relativeFile,
        'Avoid SELECT * for predictable payload and better query planning.'
      );
    }

    if (/queryDb\s*<[\s\S]*?>?\s*\(\s*`[\s\S]*\$\{[\s\S]*\}[\s\S]*`/m.test(content)) {
      pushIssue(
        issues,
        'warning',
        'sql-template-interpolation',
        relativeFile,
        'Interpolated SQL template detected. Verify user-controlled values are never interpolated directly.'
      );
    }
  }
}

function printSummary(issues) {
  const errors = issues.filter((issue) => issue.level === 'error');
  const warnings = issues.filter((issue) => issue.level === 'warning');

  console.log('Backend Quality Report');
  console.log('----------------------');
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (issues.length === 0) {
    console.log('No issues found.');
    return;
  }

  for (const issue of issues) {
    const marker = issue.level === 'error' ? '✗' : '⚠';
    console.log(`${marker} [${issue.code}] ${issue.file}`);
    console.log(`  ${issue.detail}`);
  }
}

async function run() {
  /** @type {Issue[]} */
  const issues = [];

  const routeFiles = (await walkFiles(path.join(ROOT, 'src', 'app', 'api'))).filter((file) =>
    file.endsWith(`${path.sep}route.ts`)
  );

  const serverTsFiles = [
    ...(await walkFiles(path.join(ROOT, 'src', 'modules'))),
    ...(await walkFiles(path.join(ROOT, 'src', 'shared')))
  ].filter((file) => file.endsWith('.ts'));

  const sqlFiles = (await walkFiles(path.join(ROOT, 'db', 'migrations'))).filter((file) =>
    file.endsWith('.sql')
  );

  await checkApiHandlers(issues, routeFiles);
  await checkMigrationSafety(issues, sqlFiles);
  await checkSqlQuality(issues, serverTsFiles);

  printSummary(issues);

  const hasErrors = issues.some((issue) => issue.level === 'error');
  process.exit(hasErrors ? 1 : 0);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
