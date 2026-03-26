import { ProductionUnitTasksPanel } from '@/components/production-orders/ProductionUnitTasksPanel';
import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { getProductionUnitLabel } from '@/modules/production-orders/constants';
import { listProductionOrders } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';

interface ProductionUnitTasksPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function pickPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ProductionUnitTasksPage({ searchParams }: ProductionUnitTasksPageProps) {
  const session = await requirePageSession({
    permission: PERMISSIONS.PRODUCTION_ORDERS_UNIT_TASK
  });

  const unitCode = session.hatUnitCode;
  const page = pickPage((await searchParams)?.page);
  const pageSize = 10;
  const payload = await listProductionOrders({
    scope: 'unit',
    actorRole: session.role,
    actorUnitCode: unitCode,
    page,
    pageSize
  });
  const totalPages = Math.max(1, Math.ceil(payload.total / pageSize));

  return (
    <div className="page-shell space-y-6">
      <PageIntro
        badge="Görev"
        title="Devam Eden Emirler"
        description={
          unitCode
            ? `${getProductionUnitLabel(unitCode)} biriminde kabul edilmiş ve üzerinde çalışılan emirleri buradan tamamlayın.`
            : 'Bu kullanıcıya atanmış bir birim bulunamadı.'
        }
      />

      <SectionPanel
        title="Görev Listesi"
        description="Tamamlama sırasında son sipariş miktarını girmek zorunludur."
        action={<span className="text-sm text-slate-600">Sayfa {page} / {totalPages}</span>}
      >
        <ProductionUnitTasksPanel initialItems={payload.items} page={page} pageSize={pageSize} />
      </SectionPanel>
    </div>
  );
}
