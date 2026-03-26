import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { PERMISSIONS } from '@/modules/rbac/constants';
import { resetUserPassword } from '@/modules/users/service';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';
import { resetPasswordSchema } from '@/shared/validation/user';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const params = await context.params;
    await requireApiSession(request, requestId, PERMISSIONS.ADMIN_USERS_RESET_PASSWORD);

    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Şifre formatı geçersiz.',
        details: parsed.error.flatten()
      });
    }

    await resetUserPassword({
      id: params.id,
      password: parsed.data.password
    });

    return NextResponse.json({ success: true });
  });
}
