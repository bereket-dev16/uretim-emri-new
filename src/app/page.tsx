import { redirect } from 'next/navigation';

import { requirePageSession } from '@/shared/security/auth-guards';
import { getDefaultHomePathForRole } from '@/shared/security/role-home';

export default async function HomePage(): Promise<never> {
  const session = await requirePageSession();
  redirect(getDefaultHomePathForRole(session.role));
}
