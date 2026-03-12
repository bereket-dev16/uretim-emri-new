import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { PERMISSIONS } from '@/modules/rbac/constants';
import { listStocks } from '@/modules/stocks/service';
import { getOrSetMemoryCache } from '@/shared/cache/memory-cache';
import { API_READ_CACHE_TTL_MS } from '@/shared/config/server-performance';
import { withApiHandler } from '@/shared/http/with-api-handler';
import { requireApiSession } from '@/shared/security/auth-guards';

const RECENT_STOCKS_LIMIT = 5;

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiHandler(request, async ({ requestId }) => {
    await requireApiSession(request, requestId, PERMISSIONS.STOCKS_VIEW);

    const latestStocks = await getOrSetMemoryCache(
      `stocks:recent:${RECENT_STOCKS_LIMIT}`,
      API_READ_CACHE_TTL_MS,
      () =>
        listStocks({
          page: 1,
          pageSize: RECENT_STOCKS_LIMIT,
          sort: 'newest'
        })
    );

    const response = NextResponse.json({ items: latestStocks.items });
    response.headers.set('cache-control', 'no-store');

    return response;
  });
}
