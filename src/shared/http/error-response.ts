import { NextResponse } from 'next/server';

import { AppError, isAppError } from '@/shared/errors/app-error';
import { logError } from '@/shared/logging/logger';

export function errorToResponse(error: unknown, requestId: string): NextResponse {
  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.publicMessage,
          requestId
        }
      },
      {
        status: error.status,
        headers: {
          'x-request-id': requestId
        }
      }
    );
  }

  logError('Unhandled API error', requestId, {
    error: error instanceof Error ? error.message : 'unknown'
  });

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Beklenmeyen bir hata oluştu.',
        requestId
      }
    },
    {
      status: 500,
      headers: {
        'x-request-id': requestId
      }
    }
  );
}

export function unauthorizedError(): AppError {
  return new AppError({
    status: 401,
    code: 'UNAUTHORIZED',
    publicMessage: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.'
  });
}

export function forbiddenError(): AppError {
  return new AppError({
    status: 403,
    code: 'FORBIDDEN',
    publicMessage: 'Bu işlem için yetkiniz bulunmuyor.'
  });
}

export function badRequestError(message: string, details?: unknown): AppError {
  return new AppError({
    status: 400,
    code: 'BAD_REQUEST',
    publicMessage: message,
    details
  });
}
