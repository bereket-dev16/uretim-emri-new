import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { addProductionOrderAttachment } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const session = await requireApiSession(request, requestId, PERMISSIONS.PRODUCTION_ORDERS_CREATE);
    const params = await context.params;
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Yüklenecek dosya bulunamadı.'
      });
    }

    const attachment = await addProductionOrderAttachment({
      orderId: params.id,
      file,
      actorUserId: session.userId
    });

    return NextResponse.json({ attachment }, { status: 201 });
  });
}
