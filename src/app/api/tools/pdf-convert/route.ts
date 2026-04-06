import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { PERMISSIONS } from '@/modules/rbac/constants';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { buildPdfFilename, convertOfficeFileToPdf } from '@/shared/pdf-converter/client';
import { requireApiSession } from '@/shared/security/auth-guards';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    await requireApiSession(request, requestId, PERMISSIONS.TOOLS_PDF_CONVERT);

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Dönüştürülecek dosya bulunamadı.'
      });
    }

    if (file.size <= 0) {
      throw new AppError({
        status: 400,
        code: 'EMPTY_FILE',
        publicMessage: 'Boş dosya dönüştürülemez.'
      });
    }

    const response = await convertOfficeFileToPdf(file);

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(buildPdfFilename(file.name || 'dosya'))}"`
      }
    });
  });
}
