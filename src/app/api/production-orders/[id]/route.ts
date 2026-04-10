import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { deleteProductionOrder, getProductionOrderById } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';
import { productionOrderDeleteSchema } from '@/shared/validation/production-order';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    await requireApiSession(request, requestId, PERMISSIONS.PRODUCTION_ORDERS_VIEW);
    const params = await context.params;
    const item = await getProductionOrderById(params.id);

    return NextResponse.json({ item });
  });
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    await requireApiSession(request, requestId, PERMISSIONS.PRODUCTION_ORDERS_MANAGE);
    const params = await context.params;
    const body = await request.json();
    const parsed = productionOrderDeleteSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Silme onayı doğrulanamadı.',
        details: parsed.error.flatten()
      });
    }

    const deleted = await deleteProductionOrder({
      id: params.id,
      orderNo: parsed.data.orderNo
    });

    return NextResponse.json({ deleted, success: true });
  });
}
