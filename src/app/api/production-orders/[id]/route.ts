import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getProductionOrderById } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';

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
