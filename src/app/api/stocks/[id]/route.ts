import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { PERMISSIONS } from '@/modules/rbac/constants';
import { deleteStock, updateStock } from '@/modules/stocks/service';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';
import { stockUpdateSchema } from '@/shared/validation/stock';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const params = await context.params;
    const session = await requireApiSession(request, requestId, PERMISSIONS.STOCKS_CREATE);

    const body = await request.json();
    const parsed = stockUpdateSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Stok güncelleme verileri geçersiz.',
        details: parsed.error.flatten()
      });
    }

    const item = await updateStock({
      id: params.id,
      input: parsed.data,
      actorUserId: session.userId,
      requestId
    });

    return NextResponse.json({ item });
  });
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const params = await context.params;
    const session = await requireApiSession(request, requestId, PERMISSIONS.STOCKS_CREATE);

    await deleteStock({
      id: params.id,
      actorUserId: session.userId,
      requestId
    });

    return NextResponse.json({ success: true });
  });
}
