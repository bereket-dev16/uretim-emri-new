import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { login } from '@/modules/auth/service';
import { getRequestClientMetadata } from '@/shared/security/auth-guards';
import { SESSION_COOKIE_NAME, sessionCookieSecure } from '@/shared/security/session';
import { loginInputSchema } from '@/shared/validation/auth';
import { AppError } from '@/shared/errors/app-error';
import { withApiHandler } from '@/shared/http/with-api-handler';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const body = await request.json();
    const parsed = loginInputSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Geçersiz giriş bilgileri.',
        details: parsed.error.flatten()
      });
    }

    const metadata = getRequestClientMetadata(request);
    const result = await login({
      ...parsed.data,
      requestId,
      ip: metadata.ip,
      userAgent: metadata.userAgent
    });

    const response = NextResponse.json({ session: result.session });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: result.sessionToken,
      httpOnly: true,
      secure: sessionCookieSecure(),
      sameSite: 'lax',
      expires: new Date(result.session.expiresAt),
      path: '/'
    });

    return response;
  });
}
