import Link from 'next/link';
import {
  ArrowUpRight,
  ClipboardList,
  ClipboardPenLine,
  List,
  PlusCircle,
  Send
} from 'lucide-react';

import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { PERMISSIONS } from '@/modules/rbac/constants';
import { getDashboardSummary } from '@/modules/dashboard/service';
import { requirePageSession } from '@/shared/security/auth-guards';
import { Button } from '@/components/ui/button';
import type { Role } from '@/shared/types/domain';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  production_manager: 'Üretim Müdürü',
  warehouse_manager: 'Depo Sorumlusu',
  hat: 'Hat Operatörü',
  tablet1: 'Tablet1'
};

interface ActionItem {
  href: string;
  title: string;
  description: string;
  icon: typeof PlusCircle;
  variant?: 'solid' | 'outline';
}

export default async function DashboardPage() {
  const session = await requirePageSession({ permission: PERMISSIONS.DASHBOARD_VIEW });
  const summary = await getDashboardSummary();
  const canManageStocks =
    session.role === 'admin' || session.role === 'production_manager' || session.role === 'warehouse_manager';
  const canCreateProductionOrder =
    session.role === 'admin' || session.role === 'production_manager' || session.role === 'warehouse_manager';
  const canViewProductionOrders =
    session.role === 'admin' || session.role === 'production_manager' || session.role === 'warehouse_manager';
  const canViewWarehousePanel = session.role === 'admin' || session.role === 'warehouse_manager';
  const canViewMonitorPanel = session.role === 'admin' || session.role === 'production_manager';
  const actions: ActionItem[] = [];

  if (canManageStocks) {
    actions.push({
      href: '/stocks/create',
      title: 'Barkod Oluştur / Stok Giriş',
      description: 'Yeni stok hareketi aç, giriş formunu yönet ve son kayıtları izle.',
      icon: PlusCircle,
      variant: 'solid'
    });
    actions.push({
      href: '/stocks',
      title: 'Stok Takip',
      description: 'Filtreli tabloyla mevcut stok kayıtlarını tarayıp düzenleme akışını yönet.',
      icon: List
    });
  }

  if (canCreateProductionOrder) {
    actions.push({
      href: '/production-orders/create',
      title: 'Üretim Emri Oluştur',
      description: 'Hatlara gidecek yeni emri hazırlayıp önizleme ile doğrula.',
      icon: ClipboardPenLine
    });
  }

  if (canViewProductionOrders) {
    actions.push({
      href: '/production-orders',
      title: 'Üretim Emirleri',
      description: 'Tüm emirleri kart düzeninde aç, detayları ve sevk durumunu incele.',
      icon: ClipboardList
    });
  }

  if (canViewWarehousePanel) {
    actions.push({
      href: '/production-orders/warehouse',
      title: 'Gelen Üretim Emirleri',
      description: 'Depo uygunluğunu kontrol et ve malzeme sevk akışını başlat.',
      icon: Send
    });
  }

  if (canViewMonitorPanel) {
    actions.push({
      href: '/production-orders/monitor',
      title: 'Süreç Takibi',
      description: 'Hatların durumunu tek ekrandan izleyip darboğazları erken gör.',
      icon: ClipboardList
    });
  }

  return (
    <div className="flex-1 w-full px-4 pb-12 sm:px-6 lg:px-8">
      <section className="ops-panel rounded-[20px] px-6 py-7 sm:px-8 sm:py-8">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="ops-kicker">Dashboard</span>
            <span className="ops-chip">{ROLE_LABELS[session.role]}</span>
          </div>

          <div className="space-y-2">
            <h1 className="max-w-4xl text-3xl leading-tight text-foreground sm:text-[2.25rem]">
              Gunluk kontrol paneli
            </h1>
            <p className="max-w-3xl text-base leading-8 text-muted-foreground">
              Hos geldiniz, <span className="font-semibold text-foreground">{session.username}</span>. Bugun yapilacak ana islemler ve ozetler burada.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <SummaryCards summary={summary} />
      </section>

      <section className="mt-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Button
                key={action.href}
                asChild
                variant={action.variant === 'solid' ? 'default' : 'outline'}
                size="lg"
                className={
                  action.variant === 'solid'
                    ? 'h-auto min-h-[160px] justify-start rounded-[18px] px-5 py-5 text-left shadow-sm'
                    : 'h-auto min-h-[160px] justify-start rounded-[18px] border-border/70 bg-white px-5 py-5 text-left shadow-sm'
                }
              >
                <Link className="flex h-full w-full flex-col items-start gap-5" href={action.href}>
                  <div className="flex w-full items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-current/10 bg-white/15">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-5 w-5 opacity-70" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{action.title}</div>
                    <div
                      className={
                        action.variant === 'solid'
                          ? 'mt-2 text-sm leading-7 text-primary-foreground/80'
                          : 'mt-2 text-sm leading-7 text-muted-foreground'
                      }
                    >
                      {action.description}
                    </div>
                  </div>
                </Link>
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
