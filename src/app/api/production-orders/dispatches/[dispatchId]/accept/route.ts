import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { acceptProductionOrderDispatch } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';

interface RouteContext {
  params: Promise<{
    dispatchId: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const session = await requireApiSession(request, requestId, PERMISSIONS.PRODUCTION_ORDERS_INCOMING);
    const params = await context.params;
    const item = await acceptProductionOrderDispatch({
      dispatchId: params.dispatchId,
      actorUserId: session.userId,
      actorRole: session.role,
      actorUnitCode: session.hatUnitCode
    });

    return NextResponse.json({ item });
  });
}
