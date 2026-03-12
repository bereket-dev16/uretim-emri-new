import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSessionByToken } from '@/modules/auth/service';
import { ensurePermission } from '@/modules/rbac/service';
import { AppError } from '@/shared/errors/app-error';
import { getDefaultHomePathForRole } from '@/shared/security/role-home';
import { SESSION_COOKIE_NAME } from '@/shared/security/session';

export function getRequestClientMetadata(request: NextRequest): {
  ip: string | null;
  userAgent: string | null;
} {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null;

  return {
    ip,
    userAgent: request.headers.get('user-agent')
  };
}

export async function requireApiSession(
  request: NextRequest,
  requestId: string,
  permission?: string
) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    throw new AppError({
      status: 401,
      code: 'UNAUTHORIZED',
      publicMessage: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.'
    });
  }

  const session = await getSessionByToken(sessionToken, { requestId, touch: true });

  if (!session) {
    throw new AppError({
      status: 401,
      code: 'UNAUTHORIZED',
      publicMessage: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.'
    });
  }

  if (permission) {
    await ensurePermission(session.role, permission);
  }

  return session;
}

interface RequirePageSessionOptions {
  permission?: string;
  fallbackPath?: string;
}

export async function requirePageSession(options?: RequirePageSessionOptions) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect('/login');
  }

  const session = await getSessionByToken(sessionToken!, {
    requestId: `page-${Date.now()}`,
    touch: true
  });

  if (!session) {
    redirect('/login');
  }

  if (options?.permission) {
    try {
      await ensurePermission(session.role, options.permission);
    } catch {
      redirect(options?.fallbackPath ?? getDefaultHomePathForRole(session.role));
    }
  }

  return session;
}
