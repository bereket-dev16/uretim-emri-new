'use client';

import type { ReactNode } from 'react';

interface ProductionOrderCardHeaderProps {
  customerName: string;
  finalProductName: string;
  orderNo: string;
  deadlineLabel: string;
  summaryItems?: string[];
  statusBadge?: ReactNode;
  actions: ReactNode;
}

function HeaderChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-xl border border-border/70 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

export function ProductionOrderCardHeader({
  customerName,
  finalProductName,
  orderNo,
  deadlineLabel,
  summaryItems = [],
  statusBadge,
  actions
}: ProductionOrderCardHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground sm:text-xl">{customerName}</h3>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">{finalProductName}</p>
        </div>
        {statusBadge ? <div className="shrink-0">{statusBadge}</div> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <HeaderChip>İş Emri {orderNo}</HeaderChip>
        <HeaderChip>Termin {deadlineLabel}</HeaderChip>
        {summaryItems.filter(Boolean).map((item) => (
          <HeaderChip key={item}>{item}</HeaderChip>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">{actions}</div>
    </div>
  );
}
