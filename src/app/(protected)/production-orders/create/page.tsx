import Image from 'next/image';

import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { ProductionOrderCreateForm } from '@/components/production-orders/ProductionOrderCreateForm';
import { listProductionUnits } from '@/modules/production-orders/service';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';

export default async function ProductionOrderCreatePage() {
  await requirePageSession({
    permission: PERMISSIONS.PRODUCTION_ORDERS_CREATE
  });
  const [rawUnits, machineUnits] = await Promise.all([
    listProductionUnits({ unitGroup: 'HAMMADDE' }),
    listProductionUnits({ unitGroup: 'MAKINE' })
  ]);

  return (
    <div className="page-shell space-y-6">
      <PageIntro
        badge="Üretim"
        title="Üretim Emri Oluştur"
        description="İş emri bilgilerini girin, operasyon notunu ekleyin ve gerekiyorsa hammadde ile makine görevlerini birlikte başlatın."
        actions={
          <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-white px-3">
            <Image
              src="/bereket-logo.png"
              alt="Bereket Logo"
              width={132}
              height={42}
              className="h-8 w-auto shrink-0 object-contain"
              priority
            />
          </div>
        }
      />

      <SectionPanel title="Yeni Emir" description="Önizleme onayından sonra hammadde görevi açılır; makine seçildiyse aynı anda ilk makine görevi de başlatılır.">
        <ProductionOrderCreateForm rawUnits={rawUnits} machineUnits={machineUnits} />
      </SectionPanel>
    </div>
  );
}
