import type { ReactNode } from 'react';

import { AppHeader } from '@/components/AppHeader';
import { AuditLiveFeed } from '@/components/live/AuditLiveFeed';
import { requirePageSession } from '@/shared/security/auth-guards';
import styles from './layout.module.css';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await requirePageSession();

  return (
    <>
      <AppHeader session={session} />
      <main className={styles.main}>{children}</main>
      <AuditLiveFeed currentUsername={session.username} />
    </>
  );
}
