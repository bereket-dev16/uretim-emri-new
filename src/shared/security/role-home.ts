import type { Role } from '@/shared/types/domain';

export function getDefaultHomePathForRole(role: Role): string {
  if (role === 'raw_preparation' || role === 'machine_operator') {
    return '/production-orders/incoming';
  }

  return '/dashboard';
}
