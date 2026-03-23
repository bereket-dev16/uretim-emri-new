import { FileOutput } from 'lucide-react';
import Image from 'next/image';

import { DemoPrintForm } from '@/components/demo-print/DemoPrintForm';
import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';
import type { Role } from '@/shared/types/domain';

function canUseDemoPrint(role: Role): boolean {
  return role === 'admin' || role === 'production_manager' || role === 'warehouse_manager';
}

export default async function DemoPrintPage() {
  const session = await requirePageSession({
    permission: PERMISSIONS.PRODUCTION_ORDERS_CREATE
  });

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-4 py-8 pb-40 sm:px-6 sm:pb-44 lg:px-8 lg:pb-28">
      <PageIntro
        badge="Form"
        title="Üretim İş Emri Formu"
        description="Hızlı önizleme ve PDF çıktısı için özel hazırlanmış form ekranı."
        actions={
          <div className="flex items-center gap-3 rounded-[18px] border border-amber-200/80 bg-white/90 px-3 py-2 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <FileOutput className="h-4 w-4" />
            </div>
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

      <SectionPanel
        title="İş emri bilgileri"
        description="Alanları doldurun, önizleyin ve PDF çıktısı alın."
        className="border border-amber-200/70"
      >
        {canUseDemoPrint(session.role) ? <DemoPrintForm /> : null}
      </SectionPanel>
    </div>
  );
}
