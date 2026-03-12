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
    const params = await context.params;
    const session = await requireApiSession(
      request,
      requestId,
      PERMISSIONS.PRODUCTION_ORDERS_WAREHOUSE
    );

    const body = await request.json();
    const parsed = productionOrderDispatchCreateSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Sevk verileri geçersiz.',
        details: parsed.error.flatten()
      });
    }

    await dispatchProductionOrder({
      orderId: params.id,
      unitCodes: parsed.data.unitCodes,
      actorUserId: session.userId,
      requestId
    });

    return NextResponse.json({ success: true });
  });
}
