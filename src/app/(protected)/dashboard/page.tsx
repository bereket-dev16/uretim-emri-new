import Link from 'next/link';
import {
  ArrowUpRight,
  ClipboardList,
  ClipboardPenLine,
  FileOutput,
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
  variant?: 'solid' | 'outline' | 'highlight';
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
    actions.push({
      href: '/demo-print',
      title: 'Üretim İş Emri Formu',
      description: 'Alanları doldur, önizle ve anında PDF çıktısı al.',
      icon: FileOutput,
      variant: 'highlight'
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
      <section className="ops-panel neo-dot-grid rounded-[30px] px-6 py-7 sm:px-8 sm:py-8">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="ops-kicker">Dashboard</span>
            <span className="ops-chip">{ROLE_LABELS[session.role]}</span>
            <span className="rounded-full border-[3px] border-foreground bg-[#8bf1bd] px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-foreground shadow-[3px_3px_0_#161616]">
              Canlı Merkez
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div className="space-y-4">
              <h1 className="max-w-4xl text-[3rem] leading-[0.9] text-foreground sm:text-[4.7rem]">
              Operasyonu tek bakışta yönetin.
              </h1>
              <p className="max-w-3xl text-base font-medium leading-8 text-muted-foreground">
                Hoş geldiniz, <span className="font-black text-foreground">{session.username}</span>. Bugün yapılacak ana işlemler ve özetler burada.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[26px] border-[4px] border-foreground bg-[#96b4ff] px-5 py-4 shadow-[6px_6px_0_#161616]">
                <div className="text-xs font-black uppercase tracking-[0.12em] text-foreground/70">Bugün</div>
                <div className="mt-2 text-2xl font-black tracking-[-0.06em] text-foreground">Hızlı operasyon paneli</div>
                <p className="mt-2 text-sm font-medium leading-6 text-foreground/80">
                  Stok, emir ve akışlara doğrudan bu ekrandan geçiş yapın.
                </p>
              </div>
              <div className="rounded-[26px] border-[4px] border-foreground bg-[#fff176] px-5 py-4 shadow-[6px_6px_0_#161616]">
                <div className="text-xs font-black uppercase tracking-[0.12em] text-foreground/70">Not</div>
                <div className="mt-2 text-2xl font-black tracking-[-0.06em] text-foreground">En çok kullanılan kısayollar aşağıda.</div>
              </div>
            </div>
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
                    : action.variant === 'highlight'
                      ? 'h-auto min-h-[160px] justify-start rounded-[26px] border-[4px] border-foreground bg-[#ff9dd0] px-5 py-5 text-left text-foreground shadow-[7px_7px_0_#161616] hover:-translate-y-[2px] hover:translate-x-[2px] hover:shadow-[4px_4px_0_#161616]'
                      : 'h-auto min-h-[160px] justify-start rounded-[26px] border-[4px] border-foreground bg-card px-5 py-5 text-left shadow-[7px_7px_0_#161616] hover:-translate-y-[2px] hover:translate-x-[2px] hover:bg-[#fff7e6] hover:shadow-[4px_4px_0_#161616]'
                }
              >
                <Link className="flex h-full w-full flex-col items-start gap-5" href={action.href}>
                  <div className="flex w-full items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border-[3px] border-foreground bg-white shadow-[3px_3px_0_#161616]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-5 w-5 opacity-70" />
                  </div>
                  <div>
                      <div className="text-[1.35rem] font-black tracking-[-0.05em]">{action.title}</div>
                      <div
                        className={
                          action.variant === 'solid'
                            ? 'mt-2 text-sm font-medium leading-7 text-primary-foreground/80'
                            : action.variant === 'highlight'
                              ? 'mt-2 text-sm font-medium leading-7 text-foreground/82'
                          : 'mt-2 text-sm font-medium leading-7 text-muted-foreground'
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
