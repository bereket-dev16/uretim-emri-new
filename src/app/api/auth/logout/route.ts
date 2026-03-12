import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logoutByToken } from '@/modules/auth/service';
import { SESSION_COOKIE_NAME, sessionCookieSecure } from '@/shared/security/session';
import { withApiHandler } from '@/shared/http/with-api-handler';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      await logoutByToken(sessionToken, requestId);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      path: '/',
      httpOnly: true,
      secure: sessionCookieSecure(),
      sameSite: 'lax',
      expires: new Date(0)
    });

    return response;
  });
}
