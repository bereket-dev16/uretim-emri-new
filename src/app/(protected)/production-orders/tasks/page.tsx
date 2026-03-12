import { ProductionUnitTasksPanel } from '@/components/production-orders/ProductionUnitTasksPanel';
import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { getProductionUnitLabel } from '@/modules/production-orders/constants';
import { getUnitCodeByRole, listProductionOrders } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';

export default async function ProductionUnitTasksPage() {
  const session = await requirePageSession({
    permission: PERMISSIONS.PRODUCTION_ORDERS_UNIT_TASK
  });

  const unitCode = session.hatUnitCode ?? getUnitCodeByRole(session.role);
  const items = await listProductionOrders({
    scope: 'unit',
    actorRole: session.role,
    actorUnitCode: unitCode
  });

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageIntro
        badge="Görev"
        title="Birim görevleri"
        description={
          unitCode
            ? `${getProductionUnitLabel(unitCode)} birimine gelen görevleri buradan yönetin.`
            : 'Bu kullanıcıya atanmış bir birim bulunamadı.'
        }
      />

      <SectionPanel title="Görev listesi" description="Önce kabul edin, ardından tamamlandı olarak işaretleyin.">
        <ProductionUnitTasksPanel initialItems={items} unitCode={unitCode} />
      </SectionPanel>
    </div>
  );
}
