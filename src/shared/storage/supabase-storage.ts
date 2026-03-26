import { AppError } from '@/shared/errors/app-error';

interface StorageConfig {
  baseUrl: string;
  serviceKey: string;
  bucket: string;
}

function getStorageConfig(): StorageConfig {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'production-order-attachments';

  if (!baseUrl || !serviceKey) {
    throw new AppError({
      status: 500,
      code: 'STORAGE_NOT_CONFIGURED',
      publicMessage: 'Dosya yükleme altyapısı yapılandırılmadı.'
    });
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    serviceKey,
    bucket
  };
}

function buildObjectUrl(path: string): string {
  const config = getStorageConfig();
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${config.baseUrl}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodedPath}`;
}

function buildHeaders(contentType?: string): HeadersInit {
  const config = getStorageConfig();

  return {
    Authorization: `Bearer ${config.serviceKey}`,
    apikey: config.serviceKey,
    ...(contentType ? { 'Content-Type': contentType } : {})
  };
}

export async function uploadStorageObject(params: {
  path: string;
  file: File;
}): Promise<void> {
  const arrayBuffer = await params.file.arrayBuffer();
  const response = await fetch(buildObjectUrl(params.path), {
    method: 'POST',
    headers: {
      ...buildHeaders(params.file.type || 'application/octet-stream'),
      'x-upsert': 'false'
    },
    body: Buffer.from(arrayBuffer)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new AppError({
      status: 502,
      code: 'STORAGE_UPLOAD_FAILED',
      publicMessage: 'Ek dosya yüklenemedi.',
      details: detail
    });
  }
}

export async function deleteStorageObject(path: string): Promise<void> {
  const response = await fetch(buildObjectUrl(path), {
    method: 'DELETE',
    headers: buildHeaders()
  });

  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => '');
    throw new AppError({
      status: 502,
      code: 'STORAGE_DELETE_FAILED',
      publicMessage: 'Ek dosya temizlenemedi.',
      details: detail
    });
  }
}

export async function downloadStorageObject(path: string): Promise<Response> {
  const response = await fetch(buildObjectUrl(path), {
    method: 'GET',
    headers: buildHeaders()
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new AppError({
      status: response.status === 404 ? 404 : 502,
      code: response.status === 404 ? 'ATTACHMENT_NOT_FOUND' : 'STORAGE_DOWNLOAD_FAILED',
      publicMessage:
        response.status === 404 ? 'Ek dosya bulunamadı.' : 'Ek dosya indirilemedi.',
      details: detail
    });
  }

  return response;
}
