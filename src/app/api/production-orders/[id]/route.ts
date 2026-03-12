import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { deleteProductionOrder } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const params = await context.params;
    const session = await requireApiSession(
      request,
      requestId,
      PERMISSIONS.PRODUCTION_ORDERS_DELETE
    );

    await deleteProductionOrder({
      id: params.id,
      actorUserId: session.userId,
      requestId
    });

    return NextResponse.json({ success: true });
  });
}
