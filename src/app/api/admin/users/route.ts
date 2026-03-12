import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { PERMISSIONS } from '@/modules/rbac/constants';
import { createUser, listUsers } from '@/modules/users/service';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';
import { userCreateSchema } from '@/shared/validation/user';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    await requireApiSession(request, requestId, PERMISSIONS.ADMIN_USERS_VIEW);
    const users = await listUsers();

    return NextResponse.json({ users });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const session = await requireApiSession(request, requestId, PERMISSIONS.ADMIN_USERS_CREATE);

    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Kullanıcı verileri geçersiz.',
        details: parsed.error.flatten()
      });
    }

    const user = await createUser({
      ...parsed.data,
      actorUserId: session.userId,
      requestId
    });

    return NextResponse.json({ user }, { status: 201 });
  });
}
