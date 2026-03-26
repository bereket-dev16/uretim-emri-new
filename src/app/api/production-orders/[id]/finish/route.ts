import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { finishProductionOrder } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const session = await requireApiSession(request, requestId, PERMISSIONS.PRODUCTION_ORDERS_MANAGE);
    const params = await context.params;
    const item = await finishProductionOrder({
      id: params.id,
      actorUserId: session.userId
    });

    return NextResponse.json({ item });
  });
}
