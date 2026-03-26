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
    <div className="page-shell space-y-6">
      <PageIntro
        badge="Anasayfa"
        title="Üretim Emri Yönetimi"
        description={`${session.username} hesabıyla giriş yaptınız. Güncel üretim emirlerini ve ana işlemleri bu ekrandan yönetin.`}
      />

      <SummaryCards summary={summary} />

      <SectionPanel title="Hızlı İşlemler" description="Sık kullanılan ekranlara buradan geçebilirsiniz.">
        <div className="grid gap-4 lg:grid-cols-3">
          <Link className="page-card rounded-2xl px-5 py-5" href="/production-orders/create">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-950">Üretim Emri Oluştur</h3>
              <p className="text-sm leading-7 text-slate-600">
                Yeni iş emri oluşturun, ilk hammadde birimine sevk açın ve ek dosya yükleyin.
              </p>
            </div>
          </Link>
          <Link className="page-card rounded-2xl px-5 py-5" href="/production-orders">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-950">Devam Eden Emirler</h3>
              <p className="text-sm leading-7 text-slate-600">
                Aktif emirleri açın, sonraki birime gönderin veya emir tamamlandıysa bitirin.
              </p>
            </div>
          </Link>
          <Link className="page-card rounded-2xl px-5 py-5" href="/production-orders/completed">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-950">Biten Emirler</h3>
              <p className="text-sm leading-7 text-slate-600">
                Tamamlanmış emir geçmişini sayfalı şekilde görüntüleyin.
              </p>
            </div>
          </Link>
        </div>

        {session.role === 'admin' ? (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" asChild>
              <Link href="/admin/users">Admin Paneli</Link>
            </Button>
          </div>
        ) : null}
      </SectionPanel>
    </div>
  );
}
