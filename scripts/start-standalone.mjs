import { spawn } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import nextEnv from '@next/env';

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const serverEntry = path.join(standaloneDir, 'server.js');
const { loadEnvConfig } = nextEnv;

loadEnvConfig(rootDir);

if (!existsSync(serverEntry)) {
  console.error('Standalone build bulunamadi. Once `corepack pnpm build` calistirin.');
  process.exit(1);
}

function syncDir(sourcePath, targetPath) {
  if (!existsSync(sourcePath)) {
    return;
  }

  rmSync(targetPath, { recursive: true, force: true });
  cpSync(sourcePath, targetPath, { recursive: true });
}

syncDir(path.join(rootDir, 'public'), path.join(standaloneDir, 'public'));
syncDir(path.join(rootDir, '.next', 'static'), path.join(standaloneDir, '.next', 'static'));

const child = spawn(process.execPath, ['server.js'], {
  cwd: standaloneDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? 'production'
  }
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
