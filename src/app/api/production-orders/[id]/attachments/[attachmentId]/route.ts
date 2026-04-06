import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getProductionOrderAttachmentDownload } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';

interface RouteContext {
  params: Promise<{
    id: string;
    attachmentId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    await requireApiSession(request, requestId, PERMISSIONS.PRODUCTION_ORDER_ATTACHMENTS_VIEW);
    const params = await context.params;
    const downloadMode = request.nextUrl.searchParams.get('download') === '1';
    const download = await getProductionOrderAttachmentDownload({
      orderId: params.id,
      attachmentId: params.attachmentId
    });

    return new NextResponse(download.response.body, {
      status: 200,
      headers: {
        'Content-Type': download.mimeType,
        'Content-Disposition': `${downloadMode ? 'attachment' : 'inline'}; filename="${encodeURIComponent(download.filename)}"`
      }
    });
  });
}
