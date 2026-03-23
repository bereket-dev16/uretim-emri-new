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
  tone?: 'default' | 'highlight';
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
    items.push({ href: '/demo-print', label: 'İş Emri Formu', tone: 'highlight' });
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

  function getDesktopNavClass(item: NavItem): string {
    if (item.tone === 'highlight') {
      return isActivePath(item.href)
        ? 'border-[3px] border-foreground bg-[#ff6aa9] text-foreground shadow-[3px_3px_0_#161616]'
        : 'border-[3px] border-foreground bg-[#fff176] text-foreground shadow-[3px_3px_0_#161616] hover:bg-[#ffdf5f]';
    }

    return isActivePath(item.href)
      ? 'border-[3px] border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_#161616]'
      : 'border-[3px] border-foreground bg-card text-foreground shadow-[3px_3px_0_#161616] hover:bg-accent';
  }

  function getMobileNavClass(item: NavItem): string {
    if (item.tone === 'highlight') {
      return isActivePath(item.href)
        ? 'border-foreground bg-[#ff6aa9] text-foreground'
        : 'border-foreground bg-[#fff176] text-foreground hover:bg-[#ffdf5f]';
    }

    return isActivePath(item.href)
      ? 'border-foreground bg-primary text-primary-foreground'
      : 'border-foreground bg-card text-foreground hover:bg-accent';
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b-[4px] border-foreground bg-[#fff7ea]">
      <div className="w-full px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 lg:gap-4">
            <Link href={homePath} className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border-[3px] border-foreground bg-[#96b4ff] shadow-[4px_4px_0_#161616]">
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
                <div className="truncate text-lg font-black tracking-[-0.05em] text-foreground">Depo/Stok</div>
                <div className="mt-0.5 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Operasyon paneli</div>
              </div>
            </Link>
          </div>

          <nav className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-[24px] border-[4px] border-foreground bg-card px-3 py-3 shadow-[6px_6px_0_#161616]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn('rounded-xl px-3 py-2 text-sm font-medium transition-colors', getDesktopNavClass(item))}
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin/users"
                  className={cn(
                    'rounded-[18px] px-3 py-2 text-sm font-black transition-colors',
                    isActivePath('/admin/users')
                      ? 'border-[3px] border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_#161616]'
                      : 'border-[3px] border-foreground bg-[#fff176] text-foreground shadow-[3px_3px_0_#161616] hover:bg-accent'
                  )}
                >
                  Admin Paneli
                </Link>
              )}
            </div>
          </nav>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <div className="hidden rounded-[22px] border-[4px] border-foreground bg-card px-3 py-2 shadow-[5px_5px_0_#161616] sm:flex sm:items-center sm:gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-foreground bg-[#8bf1bd] text-foreground">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black leading-none tracking-[-0.03em] text-foreground">{session.username}</span>
                <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
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
              'whitespace-nowrap rounded-[18px] border-[3px] px-3 py-2 text-sm font-black shadow-[3px_3px_0_#161616] transition-colors',
              getMobileNavClass(item)
            )}
          >
            {item.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin/users"
            className={cn(
              'whitespace-nowrap rounded-[18px] border-[3px] px-3 py-2 text-sm font-black shadow-[3px_3px_0_#161616] transition-colors',
              isActivePath('/admin/users')
                ? 'border-foreground bg-primary text-primary-foreground'
                : 'border-foreground bg-[#fff176] text-foreground hover:bg-accent'
            )}
          >
            Admin Paneli
          </Link>
        )}
      </div>
    </header>
  );
}
