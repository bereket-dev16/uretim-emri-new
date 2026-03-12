export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly publicMessage: string;
  public readonly details?: unknown;

  constructor(params: {
    status: number;
    code: string;
    publicMessage: string;
    details?: unknown;
    cause?: unknown;
  }) {
    super(params.publicMessage);
    this.name = 'AppError';
    this.status = params.status;
    this.code = params.code;
    this.publicMessage = params.publicMessage;
    this.details = params.details;

    if (params.cause) {
      (this as Error & { cause?: unknown }).cause = params.cause;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
