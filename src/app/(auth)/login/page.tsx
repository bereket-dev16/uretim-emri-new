import Image from 'next/image';
import { LoginForm } from '@/components/auth/LoginForm';
import { Package, ClipboardList, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-transparent px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1320px] overflow-hidden rounded-[24px] border border-border/70 bg-white shadow-[0_24px_48px_rgba(20,31,43,0.08)] lg:grid-cols-[1fr_460px]">
        <section className="hidden border-r border-border/70 px-12 py-14 lg:block lg:px-14 xl:px-16">
          <div className="flex h-full flex-col justify-between">
            <div className="space-y-8">
              <div className="ops-kicker">Bereket</div>

              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-white shadow-sm">
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
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bereket</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">Depo ve Uretim Paneli</p>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl leading-tight text-foreground xl:text-[3.5rem]">
                  Gunluk isleri tek duzende yonetin.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                  Stok hareketleri, uretim emirleri ve birim akislari ayni panelde bir araya gelir.
                </p>
              </div>

              <div className="ops-rule max-w-xl" />

              <div className="grid max-w-2xl gap-3 md:grid-cols-3">
                {[
                  { label: 'Stok', icon: Package },
                  { label: 'Emir', icon: ClipboardList },
                  { label: 'Kontrol', icon: ShieldCheck }
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-border/70 bg-slate-50 px-4 py-4"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <p className="mt-3 text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Tek ekranda net akis.</p>
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
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-border/70 bg-white shadow-sm">
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
