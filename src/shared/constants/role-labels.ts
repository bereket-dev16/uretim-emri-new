import type { Role } from '@/shared/types/domain';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  production_manager: 'Üretim Müdürü',
  raw_preparation: 'Hammadde Hazırlama',
  machine_operator: 'Makine Birimi'
};
