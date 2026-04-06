import { CheckCircle2, ClipboardList, PlusSquare } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardSummary } from '@/shared/types/domain';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const items = [
    {
      title: 'Bugün Eklenen Emir',
      value: summary.ordersCreatedToday,
      icon: PlusSquare
    },
    {
      title: 'Devam Eden Emir',
      value: summary.activeOrders,
      icon: ClipboardList
    },
    {
      title: 'Biten Emir',
      value: summary.completedOrders,
      icon: CheckCircle2
    }
  ];

  return (
    <div className="grid gap-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-0.5">
                <CardTitle className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">{item.title}</CardTitle>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-600">
                <Icon className="h-3.5 w-3.5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-[1.8rem] font-semibold text-slate-950">
                {item.value.toLocaleString('tr-TR')}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
