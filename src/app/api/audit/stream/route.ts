import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuditTempoSummary, listRecentAuditStream } from '@/modules/audit/service';
import { getOrSetMemoryCache } from '@/shared/cache/memory-cache';
import { API_READ_CACHE_TTL_MS } from '@/shared/config/server-performance';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    await requireApiSession(request, requestId);

    const limitRaw = request.nextUrl.searchParams.get('limit');
    const limit = Number(limitRaw ?? '10');
    const safeLimit = Number.isFinite(limit) ? limit : 10;

    const cached = await getOrSetMemoryCache(
      `audit:stream:${safeLimit}`,
      API_READ_CACHE_TTL_MS,
      async () => {
        const [items, tempo] = await Promise.all([
          listRecentAuditStream(safeLimit),
          getAuditTempoSummary()
        ]);
        return { items, tempo };
      }
    );

    const response = NextResponse.json({
      items: cached.items,
      tempo: cached.tempo,
      serverTime: new Date().toISOString()
    });
    response.headers.set('cache-control', 'no-store');

    return response;
  });
}
