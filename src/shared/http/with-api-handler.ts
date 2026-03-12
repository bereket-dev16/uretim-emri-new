import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { LOG_NOISY_POLLING_ENDPOINTS } from '@/shared/config/server-performance';
import { errorToResponse } from '@/shared/http/error-response';
import { logInfo } from '@/shared/logging/logger';
import { createRequestId } from '@/shared/logging/request-id';

export interface ApiHandlerContext {
  requestId: string;
}

const NOISY_POLLING_PATHS = new Set(['/api/audit/stream', '/api/stocks/recent']);

function isUuid(value: string | null): value is string {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function withApiHandler(
  request: NextRequest,
  handler: (context: ApiHandlerContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const incomingRequestId = request.headers.get('x-request-id');
  const requestId = isUuid(incomingRequestId) ? incomingRequestId : createRequestId();

  try {
    const response = await handler({ requestId });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return errorToResponse(error, requestId);
  } finally {
    const path = request.nextUrl.pathname;
    const isNoisyPollingPath = NOISY_POLLING_PATHS.has(path);

    if (!isNoisyPollingPath || LOG_NOISY_POLLING_ENDPOINTS) {
      logInfo('API request completed', requestId, {
        method: request.method,
        path
      });
    }
  }
}
