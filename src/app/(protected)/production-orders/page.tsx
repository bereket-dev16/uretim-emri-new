import Link from 'next/link';

import { ProductionOrderCardList } from '@/components/production-orders/ProductionOrderCardList';
import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { Button } from '@/components/ui/button';
import { listProductionOrders, getUnitCodeByRole } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';
import type { Role } from '@/shared/types/domain';

function canDeleteProductionOrder(role: Role): boolean {
  return role === 'admin' || role === 'production_manager' || role === 'warehouse_manager';
}

export default async function ProductionOrdersListPage() {
  const session = await requirePageSession({ permission: PERMISSIONS.PRODUCTION_ORDERS_VIEW });
  const items = await listProductionOrders({
    scope: 'all',
    actorRole: session.role,
    actorUnitCode: session.hatUnitCode ?? getUnitCodeByRole(session.role)
  });

  const canCreate =
    session.role === 'admin' || session.role === 'production_manager' || session.role === 'warehouse_manager';

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageIntro
        badge="Üretim"
        title="Üretim emirleri"
        description="Oluşturulan emirleri kart görünümünde açın ve süreci buradan izleyin."
        actions={
          <>
            {canCreate && (
              <Button asChild>
                <Link href="/production-orders/create">Yeni emir</Link>
              </Button>
            )}
            {(session.role === 'admin' || session.role === 'warehouse_manager') && (
              <Button variant="outline" asChild>
                <Link href="/production-orders/warehouse">Gelen emirler</Link>
              </Button>
            )}
            {(session.role === 'admin' || session.role === 'production_manager') && (
              <Button variant="outline" asChild>
                <Link href="/production-orders/monitor">Süreç takibi</Link>
              </Button>
            )}
          </>
        }
      />

      <SectionPanel title="Liste" description="Kartı açarak detayları görebilirsiniz.">
        <ProductionOrderCardList
          items={items}
          pollScope="all"
          canDelete={canDeleteProductionOrder(session.role)}
          emptyMessage="Henüz oluşturulmuş üretim emri bulunmuyor."
        />
      </SectionPanel>
    </div>
  );
}
