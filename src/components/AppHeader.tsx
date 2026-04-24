'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LogoutButton } from '@/components/LogoutButton';
import { ROLE_LABELS } from '@/shared/constants/role-labels';
import { getDefaultHomePathForRole } from '@/shared/security/role-home';
import type { SessionDTO } from '@/shared/types/domain';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  session: SessionDTO;
}

function buildNavItems(role: SessionDTO['role']) {
  if (role === 'raw_preparation' || role === 'machine_operator') {
    return [
      { href: '/production-orders/incoming', label: 'Gelen Emirler' },
      { href: '/production-orders/tasks', label: 'Devam Eden Emirler' }
    ];
  }

  return [
    { href: '/dashboard', label: 'Anasayfa' },
    { href: '/production-orders/create', label: 'Üretim Emri Oluştur' },
    { href: '/production-orders', label: 'Devam Eden Emirler' },
    { href: '/production-orders/completed', label: 'Biten Emirler' }
  ];
}

export function AppHeader({ session }: AppHeaderProps) {
  const pathname = usePathname();
  const items = buildNavItems(session.role);
  const homePath = getDefaultHomePathForRole(session.role);
  const isAdmin = session.role === 'admin';
  const activeHref =
    [...items.map((item) => item.href), ...(isAdmin ? ['/admin/users'] : [])]
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((left, right) => right.length - left.length)[0] ?? null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-300 bg-white">
      <div className="flex flex-col gap-2 px-3 py-2 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <Link href={homePath} className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-slate-50">
              <Image
                src="/bereket-logo.png"
                alt="Bereket Logo"
                width={28}
                height={28}
                className="h-6 w-auto object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-950">Üretim Emri Sistemi</div>
              <div className="truncate text-[11px] text-slate-500">
                {ROLE_LABELS[session.role]}
                {session.hatUnitCode ? ` • ${session.hatUnitCode}` : ''}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Link
                href="/admin/users"
                className={cn(
                  'hidden rounded-md border px-2.5 py-1.5 text-xs font-medium sm:inline-flex',
                  activeHref === '/admin/users'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700'
                )}
              >
                Admin Paneli
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1.5">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-xs font-medium',
                activeHref === item.href
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700'
              )}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link
              href="/admin/users"
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-xs font-medium sm:hidden',
                activeHref === '/admin/users'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700'
              )}
            >
              Admin Paneli
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
