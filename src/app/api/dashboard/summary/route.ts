import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getDashboardSummary } from '@/modules/dashboard/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requireApiSession } from '@/shared/security/auth-guards';
import { withApiHandler } from '@/shared/http/with-api-handler';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    await requireApiSession(request, requestId, PERMISSIONS.DASHBOARD_VIEW);
    const summary = await getDashboardSummary();

    return NextResponse.json({ summary });
  });
}
