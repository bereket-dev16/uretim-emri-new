import type { Role } from '@/shared/types/domain';

export function getDefaultHomePathForRole(role: Role): string {
  if (role === 'hat') {
    return '/production-orders/incoming';
  }

  return '/dashboard';
}
