import type { Role } from '@/shared/types/domain';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  production_manager: 'Üretim Müdürü',
  warehouse_manager: 'Depo Sorumlusu',
  hat: 'Hat Operatörü',
  tablet1: 'Tablet1 Operatörü'
};
