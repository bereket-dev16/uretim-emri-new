import { randomUUID } from 'node:crypto';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const HOST = process.env.CONVERTER_HOST ?? '0.0.0.0';
const PORT = Number(process.env.CONVERTER_PORT ?? 4000);
const PROCESS_TIMEOUT_MS = Number(process.env.CONVERTER_PROCESS_TIMEOUT_MS ?? 60000);

const OFFICE_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

const EXTENSION_MIME_TYPES = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_') || `office-${randomUUID()}`;
}

function resolveMimeType(file) {
  if (file.type && OFFICE_MIME_TYPES.has(file.type)) {
    return file.type;
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';
  return EXTENSION_MIME_TYPES[extension] ?? null;
}

function buildPdfFilename(filename) {
  const safe = sanitizeFilename(filename);
  return `${safe.replace(/\.[^./\\]+$/, '')}.pdf`;
}

async function resolveSofficeBinary() {
  const explicit = process.env.SOFFICE_BIN;

  const candidates = [
    explicit,
    process.platform === 'darwin' ? '/Applications/LibreOffice.app/Contents/MacOS/soffice' : null,
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
    '/snap/bin/soffice',
    'soffice'
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'soffice') {
      return candidate;
    }

    try {
      await access(candidate);
      return candidate;
    } catch {}
  }

  return 'soffice';
}

async function runSofficeConversion(inputPath, outputDir, profileDir) {
  const sofficeBinary = await resolveSofficeBinary();

  return new Promise((resolve, reject) => {
    const args = [
      '--headless',
      '--nologo',
      '--nolockcheck',
      '--nodefault',
      '--nofirststartwizard',
      '--invisible',
      `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
      '--convert-to',
      'pdf',
      '--outdir',
      outputDir,
      inputPath
    ];

    const child = spawn(sofficeBinary, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, PROCESS_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timeout);

      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        reject(new Error('soffice-not-found'));
        return;
      }

      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);

      if (timedOut) {
        reject(new Error('conversion-timeout'));
        return;
      }

      if (code !== 0) {
        reject(new Error(stderr || stdout || `LibreOffice exited with code ${code}`));
        return;
      }

      resolve();
    });
  });
}

async function parseMultipartFile(request) {
  const webRequest = new Request(`http://${request.headers.host || 'converter.local'}${request.url || '/convert'}`, {
    method: request.method,
    headers: request.headers,
    body: request,
    duplex: 'half'
  });

  const formData = await webRequest.formData();
  const file = formData.get('file');

  if (!(file instanceof File) || file.size <= 0) {
    return null;
  }

  return file;
}

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 404, { error: 'not-found' });
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method !== 'POST' || request.url !== '/convert') {
    sendJson(response, 404, { error: 'not-found' });
    return;
  }

  let workspaceDir = null;

  try {
    const file = await parseMultipartFile(request);

    if (!file) {
      sendJson(response, 400, {
        error: 'invalid-file',
        message: 'Word veya Excel dosyasi bulunamadi.'
      });
      return;
    }

    const mimeType = resolveMimeType(file);

    if (!mimeType) {
      sendJson(response, 400, {
        error: 'unsupported-file',
        message: 'Yalniz Word ve Excel dosyalari donusturulebilir.'
      });
      return;
    }

    workspaceDir = await mkdtemp(path.join(os.tmpdir(), 'office-to-pdf-'));
    const inputDir = path.join(workspaceDir, 'input');
    const outputDir = path.join(workspaceDir, 'output');
    const profileDir = path.join(workspaceDir, 'profile');

    await Promise.all([mkdir(inputDir), mkdir(outputDir), mkdir(profileDir)]);

    const inputFilename = sanitizeFilename(file.name || `office-${randomUUID()}`);
    const inputPath = path.join(inputDir, inputFilename);
    const outputFilename = buildPdfFilename(inputFilename);
    const outputPath = path.join(outputDir, outputFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);
    await runSofficeConversion(inputPath, outputDir, profileDir);

    const pdfBuffer = await readFile(outputPath);

    response.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(outputFilename)}"`
    });
    response.end(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'conversion-failed';
    const status = message === 'conversion-timeout' ? 504 : 502;

    sendJson(response, status, {
      error:
        status === 504
          ? 'conversion-timeout'
          : message === 'soffice-not-found'
            ? 'converter-missing-libreoffice'
            : 'conversion-failed',
      message:
        status === 504
          ? 'PDF donusturme zaman asimina ugradi.'
          : message === 'soffice-not-found'
            ? 'Converter servisinde LibreOffice bulunamadi.'
            : 'Dosya PDF formatina donusturulemedi.'
    });
  } finally {
    if (workspaceDir) {
      await rm(workspaceDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`converter listening on http://${HOST}:${PORT}`);
});
