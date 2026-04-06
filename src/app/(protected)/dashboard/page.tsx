import Link from 'next/link';

import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { Button } from '@/components/ui/button';
import { getDashboardSummary } from '@/modules/dashboard/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';

export default async function DashboardPage() {
  const session = await requirePageSession({ permission: PERMISSIONS.DASHBOARD_VIEW });
  const summary = await getDashboardSummary();

  return (
    <div className="page-shell space-y-4">
      <PageIntro
        badge="Anasayfa"
        title="Üretim Emri Yönetimi"
        description={`${session.username} hesabıyla giriş yaptınız. Güncel emir sayıları ve ana işlemler bu ekranda.`}
      />

      <SummaryCards summary={summary} />

      <SectionPanel title="Hızlı İşlemler" description="Sık kullanılan ekranlar">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <Link className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800" href="/production-orders/create">
            Üretim Emri Oluştur
          </Link>
          <Link className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800" href="/production-orders">
            Devam Eden Emirler
          </Link>
          <Link className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800" href="/production-orders/completed">
            Biten Emirler
          </Link>
        </div>

        {session.role === 'admin' ? (
          <div className="mt-3 flex justify-end">
            <Button variant="outline" asChild>
              <Link href="/admin/users">Admin Paneli</Link>
            </Button>
          </div>
        ) : null}
      </SectionPanel>
    </div>
  );
}
