import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { PERMISSIONS } from '@/modules/rbac/constants';
import { createStock, listStocks } from '@/modules/stocks/service';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';
import { stockCreateSchema, stockListQuerySchema } from '@/shared/validation/stock';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    await requireApiSession(request, requestId, PERMISSIONS.STOCKS_VIEW);

    const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = stockListQuerySchema.safeParse(queryParams);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Listeleme parametreleri geçersiz.',
        details: parsed.error.flatten()
      });
    }

    const result = await listStocks(parsed.data);

    return NextResponse.json(result);
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const session = await requireApiSession(request, requestId, PERMISSIONS.STOCKS_CREATE);

    const body = await request.json();
    const parsed = stockCreateSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Stok formu doğrulanamadı.',
        details: parsed.error.flatten()
      });
    }

    const created = await createStock({
      input: parsed.data,
      actorUserId: session.userId,
      actorRole: session.role,
      requestId
    });

    return NextResponse.json(created, { status: 201 });
  });
}
