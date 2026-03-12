import { ClipboardPenLine } from 'lucide-react';
import Image from 'next/image';

import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { ProductionOrderCreateForm } from '@/components/production-orders/ProductionOrderCreateForm';
import { listActiveProductionUnits } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';
import type { Role } from '@/shared/types/domain';

function canCreateProductionOrder(role: Role): boolean {
  return role === 'admin' || role === 'production_manager' || role === 'warehouse_manager';
}

export default async function ProductionOrderCreatePage() {
  const session = await requirePageSession({
    permission: PERMISSIONS.PRODUCTION_ORDERS_CREATE
  });
  const productionUnits = await listActiveProductionUnits();

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageIntro
        badge="Üretim"
        title="Üretim emri oluştur"
        description="Detayları doldurun, önizleyin ve ardından kaydı tamamlayın."
        actions={
          <div className="flex h-12 items-center rounded-[18px] border border-border/70 bg-white/85 px-3 shadow-sm">
              <ClipboardPenLine className="mr-2 h-4 w-4 text-primary" />
              <Image
                src="/bereket-logo.png"
                alt="Bereket Logo"
                width={132}
                height={42}
                className="h-8 w-auto object-contain shrink-0"
                priority
              />
          </div>
        }
      />

      <SectionPanel title="Yeni emir" description="İş emri bilgilerini girin, önizleyin ve kaydedin.">
        <ProductionOrderCreateForm
          canCreate={canCreateProductionOrder(session.role)}
          productionUnits={productionUnits}
        />
      </SectionPanel>
    </div>
  );
}
