import type { ReactNode } from 'react';

import { AppHeader } from '@/components/AppHeader';
import { requirePageSession } from '@/shared/security/auth-guards';
import styles from './layout.module.css';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await requirePageSession();

  return (
    <>
      <AppHeader session={session} />
      <main className={styles.main}>{children}</main>
    </>
  );
}
