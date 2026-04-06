import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { ProductionUnitIncomingPanel } from '@/components/production-orders/ProductionUnitIncomingPanel';
import { getProductionUnitLabel } from '@/modules/production-orders/constants';
import { listProductionOrders } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';

interface ProductionUnitIncomingPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function pickPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ProductionUnitIncomingPage({
  searchParams
}: ProductionUnitIncomingPageProps) {
  const session = await requirePageSession({
    permission: PERMISSIONS.PRODUCTION_ORDERS_INCOMING
  });

  const unitCode = session.hatUnitCode;
  const canViewAttachments = session.role !== 'machine_operator';
  const page = pickPage((await searchParams)?.page);
  const pageSize = 10;
  const payload = await listProductionOrders({
    scope: 'incoming',
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
        title="Gelen Emirler"
        description={
          unitCode
            ? `${getProductionUnitLabel(unitCode)} birimine gönderilen yeni emirleri buradan kabul edin.`
            : 'Bu kullanıcıya atanmış bir birim bulunamadı.'
        }
      />

      <SectionPanel
        title="Bekleyen Liste"
        description={
          canViewAttachments
            ? 'Detayı açıp notları ve ekleri inceleyebilir, ardından emri kabul ederek çalışma adımına taşıyabilirsiniz.'
            : 'Detayı açıp form ve not bilgilerini inceleyebilir, ardından emri kabul ederek çalışma adımına taşıyabilirsiniz.'
        }
        action={<span className="text-sm text-slate-600">Sayfa {page} / {totalPages}</span>}
      >
        <ProductionUnitIncomingPanel
          initialItems={payload.items}
          page={page}
          pageSize={pageSize}
          actorUnitCode={unitCode}
          canViewAttachments={canViewAttachments}
          canDownloadAttachments={canViewAttachments}
        />
      </SectionPanel>
    </div>
  );
}
