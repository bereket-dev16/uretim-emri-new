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
      badge: 'Stok',
      tint: 'bg-[#96b4ff]'
    },
    {
      title: 'Bugun Eklenen Kayit',
      value: summary.stockRecordsToday,
      hint: 'Gunluk hareket',
      icon: <CalendarPlus className="h-5 w-5 text-emerald-600" />,
      badge: 'Bugun',
      tint: 'bg-[#8bf1bd]'
    },
    {
      title: 'Aktif Kullanici',
      value: summary.activeUserCount,
      hint: 'Oturum açabilen',
      icon: <Users className="h-5 w-5 text-sky-700" />,
      badge: 'Kullanıcı',
      tint: 'bg-[#ffd54f]'
    }
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="ops-panel overflow-hidden rounded-[26px] border-foreground bg-card"
        >
          <div className="absolute right-5 top-5 rounded-full border-[3px] border-foreground bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-foreground shadow-[3px_3px_0_#161616]">
            {card.badge}
          </div>
          <CardHeader className="relative z-10 flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-[0.08em] text-muted-foreground">
                {card.title}
              </CardTitle>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] border-[3px] border-foreground shadow-[4px_4px_0_#161616] ${card.tint}`}>
              {card.icon}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-[2.8rem] font-black tracking-[-0.06em] text-foreground">
              {card.value.toLocaleString('tr-TR')}
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {card.hint}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
