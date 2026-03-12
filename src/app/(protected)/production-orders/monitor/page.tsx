import { ProductionOrderCardList } from '@/components/production-orders/ProductionOrderCardList';
import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { listProductionOrders, getUnitCodeByRole } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';
import type { Role } from '@/shared/types/domain';

function canDeleteProductionOrder(role: Role): boolean {
  return role === 'admin' || role === 'production_manager';
}

export default async function ProductionOrdersMonitorPage() {
  const session = await requirePageSession({
    permission: PERMISSIONS.PRODUCTION_ORDERS_MONITOR
  });

  const items = await listProductionOrders({
    scope: 'monitor',
    actorRole: session.role,
    actorUnitCode: session.hatUnitCode ?? getUnitCodeByRole(session.role)
  });

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageIntro
        badge="Üretim"
        title="Süreç takibi"
        description="Depo ve hat adımlarındaki güncel durumu bu ekrandan izleyin."
      />

      <SectionPanel title="İzleme listesi" description="Durumlar yalnızca görüntülenir.">
        <ProductionOrderCardList
          items={items}
          pollScope="monitor"
          canDelete={canDeleteProductionOrder(session.role)}
          showMonitorBadges
          emptyMessage="Takip edilecek üretim emri bulunmuyor."
        />
      </SectionPanel>
    </div>
  );
}
