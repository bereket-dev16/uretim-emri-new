'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';

import type { SessionDTO } from '@/shared/types/domain';
import { getDefaultHomePathForRole } from '@/shared/security/role-home';
import { cn } from '@/lib/utils';
import { LogoutButton } from './LogoutButton';

interface AppHeaderProps {
  session: SessionDTO;
}

const ROLE_LABELS: Record<SessionDTO['role'], string> = {
  admin: 'Admin',
  production_manager: 'Üretim Müdürü',
  warehouse_manager: 'Depo Sorumlusu',
  hat: 'Hat Operatörü',
  tablet1: 'Tablet1 Operatörü'
};

interface NavItem {
  href: string;
  label: string;
}

function buildNavItems(role: SessionDTO['role']): NavItem[] {
  const items: NavItem[] = [];

  if (role !== 'tablet1' && role !== 'hat') {
    items.push({ href: '/dashboard', label: 'Dashboard' });
  }

  if (role === 'admin' || role === 'production_manager' || role === 'warehouse_manager') {
    items.push({ href: '/stocks/create', label: 'Stok Giriş' });
    items.push({ href: '/stocks', label: 'Stok Takip' });
    items.push({ href: '/production-orders/create', label: 'Üretim Emri Oluştur' });
    items.push({ href: '/production-orders', label: 'Üretim Emirleri' });
  }

  if (role === 'admin' || role === 'warehouse_manager') {
    items.push({ href: '/production-orders/warehouse', label: 'Gelen Üretim Emirleri' });
  }

  if (role === 'admin' || role === 'production_manager') {
    items.push({ href: '/production-orders/monitor', label: 'Süreç Takibi' });
  }

  if (role === 'tablet1' || role === 'hat') {
    items.push({ href: '/production-orders/tasks', label: 'Birim Görevleri' });
  }

  return items;
}

export function AppHeader({ session }: AppHeaderProps) {
  const pathname = usePathname();
  const navItems = buildNavItems(session.role);
  const isAdmin = session.role === 'admin';
  const homePath = getDefaultHomePathForRole(session.role);
  const navTargets = [...navItems.map((item) => item.href), ...(isAdmin ? ['/admin/users'] : [])];
  const activeHref =
    navTargets
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((left, right) => right.length - left.length)[0] ?? null;

  function isActivePath(href: string): boolean {
    return activeHref === href;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/78">
      <div className="w-full px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 lg:gap-4">
            <Link href={homePath} className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-white shadow-sm">
                <Image
                  src="/bereket-logo.png"
                  alt="Bereket"
                  width={34}
                  height={34}
                  className="h-8 w-auto object-contain"
                  priority
                />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-foreground">Depo/Stok</div>
                <div className="mt-0.5 text-xs text-muted-foreground">Operasyon paneli</div>
              </div>
            </Link>
          </div>

          <nav className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
            <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-border/70 bg-white px-2 py-2 shadow-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    isActivePath(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin/users"
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    isActivePath('/admin/users')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  Admin Paneli
                </Link>
              )}
            </div>
          </nav>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <div className="hidden rounded-2xl border border-border/70 bg-white px-3 py-2 shadow-sm sm:flex sm:items-center sm:gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-none text-foreground">{session.username}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {ROLE_LABELS[session.role]}
                  {session.hatUnitCode ? ` • ${session.hatUnitCode}` : ''}
                </span>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition-colors',
              isActivePath(item.href)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border/70 bg-white text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin/users"
            className={cn(
              'whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition-colors',
              isActivePath('/admin/users')
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border/70 bg-white text-muted-foreground hover:text-foreground'
            )}
          >
            Admin Paneli
          </Link>
        )}
      </div>
    </header>
  );
}
