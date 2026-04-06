import { AppError } from '@/shared/errors/app-error';

const OFFICE_TO_PDF_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

const OFFICE_EXTENSION_MIME_TYPES: Record<string, string> = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

export const OFFICE_TO_PDF_ACCEPT =
  '.doc,.docx,.xls,.xlsx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function getConverterConfig(): {
  baseUrl: string;
  timeoutMs: number;
} {
  return {
    baseUrl: (process.env.CONVERTER_BASE_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, ''),
    timeoutMs: Number(process.env.CONVERTER_TIMEOUT_MS ?? 45000)
  };
}

export function resolveOfficeMimeType(file: File): string | null {
  if (file.type && OFFICE_TO_PDF_MIME_TYPES.has(file.type)) {
    return file.type;
  }

  const filename = file.name || '';
  const extension = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() ?? '' : '';
  return OFFICE_EXTENSION_MIME_TYPES[extension] ?? null;
}

export function buildPdfFilename(filename: string): string {
  const trimmed = filename.trim() || 'dosya';
  const base = trimmed.replace(/\.[^./\\]+$/, '');
  return `${base}.pdf`;
}

export async function convertOfficeFileToPdf(file: File): Promise<Response> {
  const mimeType = resolveOfficeMimeType(file);

  if (!mimeType) {
    throw new AppError({
      status: 400,
      code: 'UNSUPPORTED_CONVERT_FILE',
      publicMessage: 'Yalnız Word ve Excel dosyaları PDF dönüştürme aracında kullanılabilir.'
    });
  }

  const { baseUrl, timeoutMs } = getConverterConfig();
  const formData = new FormData();
  formData.append('file', file, file.name);

  let response: Response;

  try {
    response = await fetch(`${baseUrl}/convert`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new AppError({
        status: 504,
        code: 'CONVERSION_TIMEOUT',
        publicMessage: 'PDF dönüştürme zaman aşımına uğradı. Dosyayı sadeleştirip tekrar deneyin.'
      });
    }

    throw new AppError({
      status: 502,
      code: 'CONVERTER_UNAVAILABLE',
      publicMessage: 'PDF dönüştürme servisine ulaşılamadı.'
    });
  }

  if (!response.ok) {
    const rawDetail = await response.text().catch(() => '');
    let parsedMessage = '';

    try {
      parsedMessage = JSON.parse(rawDetail).message ?? '';
    } catch {
      parsedMessage = '';
    }

    const detail = parsedMessage || rawDetail;
    const status = response.status === 400 ? 400 : response.status === 504 ? 504 : 502;
    const publicMessage =
      response.status === 400
        ? 'Bu dosya türü PDF dönüştürme için uygun değil.'
        : response.status === 504
          ? 'PDF dönüştürme zaman aşımına uğradı.'
          : detail || 'Dosya PDF formatına dönüştürülemedi.';

    throw new AppError({
      status,
      code: status === 400 ? 'CONVERSION_INVALID_FILE' : status === 504 ? 'CONVERSION_TIMEOUT' : 'CONVERSION_FAILED',
      publicMessage,
      details: detail
    });
  }

  return response;
}
