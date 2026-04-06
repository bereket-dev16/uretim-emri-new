import Image from 'next/image';

import { PageIntro } from '@/components/layout/PageIntro';
import { SectionPanel } from '@/components/layout/SectionPanel';
import { PdfConvertTool } from '@/components/tools/PdfConvertTool';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { requirePageSession } from '@/shared/security/auth-guards';

export default async function PdfConvertPage() {
  await requirePageSession({
    permission: PERMISSIONS.TOOLS_PDF_CONVERT
  });

  return (
    <div className="page-shell space-y-6">
      <PageIntro
        badge="Araç"
        title="Belgeyi PDF'e Çevir"
        description="Word ve Excel dosyalarını PDF'e dönüştürün. Oluşan PDF kaydedilmez; indirip daha sonra üretim emrine ekleyin."
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

      <SectionPanel
        title="PDF Dönüştürme"
        description="Bu ekran yalnız geçici dönüşüm içindir. Dönüştürülen PDF'i indirip üretim emri formuna manuel olarak yükleyin."
      >
        <PdfConvertTool />
      </SectionPanel>
    </div>
  );
}
