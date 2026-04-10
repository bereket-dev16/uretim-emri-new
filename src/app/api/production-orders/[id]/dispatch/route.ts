import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { dispatchProductionOrder } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';
import { productionOrderDispatchCreateSchema } from '@/shared/validation/production-order';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const session = await requireApiSession(request, requestId, PERMISSIONS.PRODUCTION_ORDERS_MANAGE);
    const params = await context.params;
    const body = await request.json();
    const parsed = productionOrderDispatchCreateSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Sevk bilgisi doğrulanamadı.',
        details: parsed.error.flatten()
      });
    }

    const item = await dispatchProductionOrder({
      id: params.id,
      unitCodes: parsed.data.unitCodes,
      actorUserId: session.userId
    });

    return NextResponse.json({ item });
  });
}
