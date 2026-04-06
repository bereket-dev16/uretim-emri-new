import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-slate-100 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative hidden items-center justify-center bg-white lg:flex">
        {/* Plain img avoids false-negative local image validation from next/image in some runtime modes. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bereket-logo.png"
          alt="Bereket Logo"
          className="h-full w-full object-contain p-16"
        />
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-6 space-y-2">
            <div className="page-kicker">Üretim Emri Sistemi</div>
            <h1 className="text-[2.4rem] font-semibold text-slate-950">Oturum Aç</h1>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
