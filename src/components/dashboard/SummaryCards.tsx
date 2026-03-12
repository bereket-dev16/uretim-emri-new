import { CalendarPlus, Package, Users } from 'lucide-react';
import type { DashboardSummary } from '@/shared/types/domain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      title: 'Toplam Stok Kaydı',
      value: summary.totalStockRecords,
      hint: 'Tum kayitlar',
      icon: <Package className="h-5 w-5 text-primary" />,
      badge: 'Stok'
    },
    {
      title: 'Bugun Eklenen Kayit',
      value: summary.stockRecordsToday,
      hint: 'Gunluk hareket',
      icon: <CalendarPlus className="h-5 w-5 text-emerald-600" />,
      badge: 'Bugun'
    },
    {
      title: 'Aktif Kullanici',
      value: summary.activeUserCount,
      hint: 'Oturum açabilen',
      icon: <Users className="h-5 w-5 text-sky-700" />,
      badge: 'Kullanıcı'
    }
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="ops-panel overflow-hidden rounded-[18px] border-border/70 bg-card"
        >
          <div className="absolute right-5 top-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {card.badge}
          </div>
          <CardHeader className="relative z-10 flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-slate-50">
              {card.icon}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-semibold tracking-tight text-foreground">
              {card.value.toLocaleString('tr-TR')}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {card.hint}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
