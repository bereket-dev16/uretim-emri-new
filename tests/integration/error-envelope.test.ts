import { describe, expect, it } from 'vitest';

import { AppError } from '@/shared/errors/app-error';
import { errorToResponse } from '@/shared/http/error-response';

describe('error envelope', () => {
  it('returns standard envelope for AppError', async () => {
    const response = errorToResponse(
      new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        publicMessage: 'Hatalı istek.'
      }),
      '00000000-0000-0000-0000-000000000001'
    );

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.requestId).toBe('00000000-0000-0000-0000-000000000001');
  });
});
