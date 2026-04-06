import Link from 'next/link';

import { ProductionOrderCardList } from '@/components/production-orders/ProductionOrderCardList';
import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { Button } from '@/components/ui/button';
import { listProductionOrders } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';

interface CompletedOrdersPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function pickPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function CompletedOrdersPage({ searchParams }: CompletedOrdersPageProps) {
  const session = await requirePageSession({ permission: PERMISSIONS.PRODUCTION_ORDERS_VIEW });
  const page = pickPage((await searchParams)?.page);
  const pageSize = 10;
  const payload = await listProductionOrders({
    scope: 'completed',
    actorRole: session.role,
    actorUnitCode: session.hatUnitCode,
    page,
    pageSize
  });
  const totalPages = Math.max(1, Math.ceil(payload.total / pageSize));

  return (
    <div className="page-shell space-y-4">
      <PageIntro
        badge="Arşiv"
        title="Biten Emirler"
        description="Tamamlanmış üretim emirlerini sadece okunur biçimde inceleyin."
      />

      <SectionPanel
        title="Tamamlanan Liste"
        description="Kartı açarak form bilgilerini, ekleri ve geçmiş adımları görüntüleyebilirsiniz."
        action={
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Sayfa {page} / {totalPages}</span>
            <Button variant="outline" size="sm" asChild disabled={page <= 1}>
              <Link href={`/production-orders/completed?page=${Math.max(1, page - 1)}`}>Önceki</Link>
            </Button>
            <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
              <Link href={`/production-orders/completed?page=${Math.min(totalPages, page + 1)}`}>Sonraki</Link>
            </Button>
          </div>
        }
      >
        <ProductionOrderCardList initialItems={payload.items} scope="completed" page={page} pageSize={pageSize} />
      </SectionPanel>
    </div>
  );
}
