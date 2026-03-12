import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireApiSession } from '@/shared/security/auth-guards';
import { withApiHandler } from '@/shared/http/with-api-handler';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    const session = await requireApiSession(request, requestId);

    return NextResponse.json({
      session: {
        userId: session.userId,
        username: session.username,
        role: session.role,
        hatUnitCode: session.hatUnitCode,
        expiresAt: session.expiresAt
      }
    });
  });
}
