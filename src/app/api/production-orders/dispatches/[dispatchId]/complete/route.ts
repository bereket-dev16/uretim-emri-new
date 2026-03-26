import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { completeProductionOrderDispatch } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';
import { productionOrderCompleteSchema } from '@/shared/validation/production-order';

interface RouteContext {
  params: Promise<{
    dispatchId: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const session = await requireApiSession(request, requestId, PERMISSIONS.PRODUCTION_ORDERS_UNIT_TASK);
    const params = await context.params;
    const body = await request.json();
    const parsed = productionOrderCompleteSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Son sipariş miktarı doğrulanamadı.',
        details: parsed.error.flatten()
      });
    }

    const item = await completeProductionOrderDispatch({
      dispatchId: params.dispatchId,
      actorUserId: session.userId,
      actorUnitCode: session.hatUnitCode,
      reportedOutputQuantity: parsed.data.reportedOutputQuantity
    });

    return NextResponse.json({ item });
  });
}
