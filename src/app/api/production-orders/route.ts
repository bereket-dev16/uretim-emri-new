import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  createProductionOrder,
  listProductionOrders
} from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';
import {
  productionOrderCreateSchema,
  productionOrderListQuerySchema
} from '@/shared/validation/production-order';

function getScopePermission(scope: 'active' | 'completed' | 'incoming' | 'unit'): string {
  switch (scope) {
    case 'incoming':
      return PERMISSIONS.PRODUCTION_ORDERS_INCOMING;
    case 'unit':
      return PERMISSIONS.PRODUCTION_ORDERS_UNIT_TASK;
    default:
      return PERMISSIONS.PRODUCTION_ORDERS_VIEW;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = productionOrderListQuerySchema.safeParse(queryParams);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Listeleme parametreleri geçersiz.',
        details: parsed.error.flatten()
      });
    }

    const session = await requireApiSession(
      request,
      requestId,
      getScopePermission(parsed.data.scope)
    );

    const payload = await listProductionOrders({
      scope: parsed.data.scope,
      actorRole: session.role,
      actorUnitCode: session.hatUnitCode,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize
    });

    return NextResponse.json(payload);
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const session = await requireApiSession(request, requestId, PERMISSIONS.PRODUCTION_ORDERS_CREATE);
    const body = await request.json();
    const parsed = productionOrderCreateSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Üretim emri formu doğrulanamadı.',
        details: parsed.error.flatten()
      });
    }

    const item = await createProductionOrder({
      input: parsed.data,
      actorUserId: session.userId
    });

    return NextResponse.json({ item }, { status: 201 });
  });
}
