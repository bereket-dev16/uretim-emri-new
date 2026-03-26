import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { PERMISSIONS } from '@/modules/rbac/constants';
import { deleteUser, updateUser } from '@/modules/users/service';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';
import { userPatchSchema } from '@/shared/validation/user';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const params = await context.params;
    await requireApiSession(request, requestId, PERMISSIONS.ADMIN_USERS_UPDATE);

    const body = await request.json();
    const parsed = userPatchSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Güncelleme verileri geçersiz.',
        details: parsed.error.flatten()
      });
    }

    const user = await updateUser({
      id: params.id,
      ...parsed.data
    });

    return NextResponse.json({ user });
  });
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const params = await context.params;
    const session = await requireApiSession(request, requestId, PERMISSIONS.ADMIN_USERS_DELETE);

    await deleteUser({
      id: params.id,
      actorUserId: session.userId
    });

    return NextResponse.json({ success: true });
  });
}
