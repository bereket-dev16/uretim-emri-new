import Link from 'next/link';

import { ProductionOrderCardList } from '@/components/production-orders/ProductionOrderCardList';
import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { Button } from '@/components/ui/button';
import { listProductionOrders, listProductionUnits } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';

interface ProductionOrdersListPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function pickPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ProductionOrdersListPage({
  searchParams
}: ProductionOrdersListPageProps) {
  const session = await requirePageSession({ permission: PERMISSIONS.PRODUCTION_ORDERS_VIEW });
  const page = pickPage((await searchParams)?.page);
  const pageSize = 10;
  const [payload, productionUnits] = await Promise.all([
    listProductionOrders({
      scope: 'active',
      actorRole: session.role,
      actorUnitCode: session.hatUnitCode,
      page,
      pageSize
    }),
    listProductionUnits()
  ]);

  const totalPages = Math.max(1, Math.ceil(payload.total / pageSize));

  return (
    <div className="page-shell space-y-6">
      <PageIntro
        badge="Üretim"
        title="Devam Eden Emirler"
        description="Aktif emirleri açın, hammadde ve makine süreçlerini ayrı ayrı izleyin ve boşta olan gruplara yeni sevk açın."
        actions={
          <Button asChild>
            <Link href="/production-orders/create">Yeni Emir</Link>
          </Button>
        }
      />

      <SectionPanel
        title="Aktif Liste"
        description="Kapalı görünümde iki grup özeti, açık görünümde form alanları, not, ekler ve grup bazlı yönetim alanları yer alır."
        action={
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Sayfa {page} / {totalPages}</span>
            <Button variant="outline" size="sm" asChild disabled={page <= 1}>
              <Link href={`/production-orders?page=${Math.max(1, page - 1)}`}>Önceki</Link>
            </Button>
            <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
              <Link href={`/production-orders?page=${Math.min(totalPages, page + 1)}`}>Sonraki</Link>
            </Button>
          </div>
        }
      >
        <ProductionOrderCardList
          initialItems={payload.items}
          scope="active"
          page={page}
          pageSize={pageSize}
          productionUnits={productionUnits}
        />
      </SectionPanel>
    </div>
  );
}
