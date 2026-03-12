import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { StockCreateForm } from '@/components/stocks/StockCreateForm';
import { RecentStocksTable } from '@/components/stocks/RecentStocksTable';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { listStocks } from '@/modules/stocks/service';
import type { Role } from '@/shared/types/domain';
import { requirePageSession } from '@/shared/security/auth-guards';
import { Button } from '@/components/ui/button';

const RECENT_STOCKS_LIMIT = 5;

function canCreateStock(role: Role): boolean {
  return role === 'admin' || role === 'production_manager' || role === 'warehouse_manager';
}

export default async function StockCreatePage() {
  const session = await requirePageSession({ permission: PERMISSIONS.STOCKS_VIEW });

  const canCreate = canCreateStock(session.role);
  const latestStocks = await listStocks({
    page: 1,
    pageSize: RECENT_STOCKS_LIMIT,
    sort: 'newest'
  });

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageIntro
        badge="Stok"
        title="Yeni stok girişi"
        description="Yeni kaydı ekleyin, barkodu oluşturun ve son hareketleri aynı ekranda izleyin."
        actions={
          <Button variant="outline" asChild>
            <Link href="/stocks" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Stok takibe dön
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <SectionPanel title="Kayıt formu" description="Zorunlu alanları doldurup kaydı tamamlayın.">
          <StockCreateForm canCreate={canCreate} />
        </SectionPanel>
        <SectionPanel title="Son eklenenler" description="En yeni 5 kayıt burada görünür.">
          <RecentStocksTable items={latestStocks.items} />
        </SectionPanel>
      </div>
    </div>
  );
}
