import Image from 'next/image';
import { LoginForm } from '@/components/auth/LoginForm';
import { Package, ClipboardList, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-transparent px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1380px] overflow-hidden rounded-[34px] border-[4px] border-foreground bg-[#fffdf7] shadow-[12px_12px_0_#161616] lg:grid-cols-[1.08fr_460px]">
        <section className="neo-dot-grid hidden border-r-[4px] border-foreground px-12 py-14 lg:block lg:px-14 xl:px-16">
          <div className="flex h-full flex-col justify-between">
            <div className="space-y-8">
              <div className="ops-kicker">Bereket</div>

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border-[4px] border-foreground bg-[#96b4ff] shadow-[6px_6px_0_#161616]">
                  <Image
                    src="/bereket-logo.png"
                    alt="Bereket Logo"
                    width={48}
                    height={48}
                    className="h-10 w-auto object-contain"
                    priority
                  />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Bereket</p>
                  <p className="mt-1 text-xl font-black tracking-[-0.05em] text-foreground">Depo ve Uretim Paneli</p>
                </div>
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-[4.4rem] leading-[0.9] text-foreground xl:text-[5.8rem]">
                  Gunluk isleri tek duzende yonetin.
                </h1>
                <p className="max-w-2xl text-base font-medium leading-8 text-muted-foreground">
                  Stok hareketleri, uretim emirleri ve birim akislari ayni panelde bir araya gelir.
                </p>
              </div>

              <div className="ops-rule max-w-xl" />

              <div className="grid max-w-2xl gap-3 md:grid-cols-3">
                {[
                  { label: 'Stok', icon: Package, tint: 'bg-[#96b4ff]' },
                  { label: 'Emir', icon: ClipboardList, tint: 'bg-[#ff9dd0]' },
                  { label: 'Kontrol', icon: ShieldCheck, tint: 'bg-[#8bf1bd]' }
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="rounded-[24px] border-[4px] border-foreground bg-card px-4 py-4 shadow-[6px_6px_0_#161616]"
                    >
                      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-[16px] border-[3px] border-foreground shadow-[3px_3px_0_#161616] ${item.tint}`}>
                        <Icon className="h-4 w-4 text-foreground" />
                      </div>
                      <p className="mt-3 text-base font-black tracking-[-0.04em] text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm font-medium text-muted-foreground">Tek ekranda net akis.</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <div className="ops-kicker">Bereket</div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border-[3px] border-foreground bg-[#96b4ff] shadow-[4px_4px_0_#161616]">
                <Image
                  src="/bereket-logo.png"
                  alt="Bereket Logo"
                  width={34}
                  height={34}
                  className="h-8 w-auto object-contain"
                  priority
                />
              </div>
            </div>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
