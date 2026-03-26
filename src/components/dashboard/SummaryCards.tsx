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
    <div className="grid gap-4 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold text-slate-600">{item.title}</CardTitle>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600">
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-[2.2rem] font-semibold text-slate-950">
                {item.value.toLocaleString('tr-TR')}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
