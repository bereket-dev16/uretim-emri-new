import type { Role } from '@/shared/types/domain';

export function getDefaultHomePathForRole(role: Role): string {
  if (role === 'tablet1' || role === 'hat') {
    return '/production-orders/tasks';
  }

  return '/dashboard';
}
