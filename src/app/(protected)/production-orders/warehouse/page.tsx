import { WarehouseIncomingPanel } from '@/components/production-orders/WarehouseIncomingPanel';
import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { listProductionOrders, getUnitCodeByRole } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';

export default async function WarehouseIncomingOrdersPage() {
  const session = await requirePageSession({
    permission: PERMISSIONS.PRODUCTION_ORDERS_WAREHOUSE
  });

  const items = await listProductionOrders({
    scope: 'warehouse',
    actorRole: session.role,
    actorUnitCode: session.hatUnitCode ?? getUnitCodeByRole(session.role)
  });

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageIntro
        badge="Üretim"
        title="Gelen üretim emirleri"
        description="Malzeme durumunu kontrol edin ve uygun birimlere sevk edin."
      />

      <SectionPanel title="Bekleyen emirler" description="Kartı açıp kontrol ve sevk işlemini tamamlayın.">
        <WarehouseIncomingPanel initialItems={items} />
      </SectionPanel>
    </div>
  );
}
