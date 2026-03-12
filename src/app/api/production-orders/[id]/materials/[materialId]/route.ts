import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { updateProductionOrderMaterialAvailability } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';
import { productionOrderMaterialAvailabilitySchema } from '@/shared/validation/production-order';

interface RouteContext {
  params: Promise<{
    id: string;
    materialId: string;
  }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const params = await context.params;
    const session = await requireApiSession(
      request,
      requestId,
      PERMISSIONS.PRODUCTION_ORDERS_WAREHOUSE
    );

    const body = await request.json();
    const parsed = productionOrderMaterialAvailabilitySchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Malzeme uygunluk verisi geçersiz.',
        details: parsed.error.flatten()
      });
    }

    await updateProductionOrderMaterialAvailability({
      orderId: params.id,
      materialId: params.materialId,
      isAvailable: parsed.data.isAvailable,
      actorUserId: session.userId,
      requestId
    });

    return NextResponse.json({ success: true });
  });
}
