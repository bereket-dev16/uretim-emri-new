interface LogParams {
  level: 'info' | 'warn' | 'error';
  message: string;
  requestId?: string;
  data?: Record<string, unknown>;
}

function serialize(params: LogParams): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level: params.level,
    message: params.message,
    requestId: params.requestId,
    ...params.data
  });
}

export function logInfo(message: string, requestId?: string, data?: Record<string, unknown>): void {
  console.info(serialize({ level: 'info', message, requestId, data }));
}

export function logWarn(message: string, requestId?: string, data?: Record<string, unknown>): void {
  console.warn(serialize({ level: 'warn', message, requestId, data }));
}

export function logError(message: string, requestId?: string, data?: Record<string, unknown>): void {
  console.error(serialize({ level: 'error', message, requestId, data }));
}
