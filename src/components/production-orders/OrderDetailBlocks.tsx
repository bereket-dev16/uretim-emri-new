'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { getProductionUnitLabel } from '@/modules/production-orders/constants';
import type {
  ProductionOrderDispatchDTO,
  ProductionOrderMaterialDTO
} from '@/shared/types/domain';
import { materialTypeLabel, formatDateTime, statusClass, statusLabel } from './utils';

interface DetailFieldGridProps {
  rows: Array<{ label: string; value: string }>;
}

interface MaterialsListProps {
  materials: ProductionOrderMaterialDTO[];
  mode: 'readonly' | 'warehouse' | 'unit';
  busyMaterialId?: string | null;
  onToggleMaterial?: (materialId: string, nextValue: boolean) => void;
}

interface DispatchStatusGridProps {
  dispatches: ProductionOrderDispatchDTO[];
  emptyMessage?: string;
}

interface ResponsiveDetailSectionProps {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function ResponsiveDetailSection({
  title,
  summary,
  defaultOpen = false,
  children
}: ResponsiveDetailSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-[18px] border border-border/70 bg-slate-50 p-4">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left md:hidden"
        onClick={() => setIsOpen((current) => !current)}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {summary ? <p className="mt-1 text-xs leading-6 text-muted-foreground">{summary}</p> : null}
        </div>
        {isOpen ? (
          <ChevronUp className="mt-0.5 h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="mt-0.5 h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <div className="hidden md:block">
        <div className="mb-3">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {summary ? <p className="mt-1 text-xs leading-6 text-muted-foreground">{summary}</p> : null}
        </div>
        {children}
      </div>

      {isOpen ? <div className="mt-4 md:hidden">{children}</div> : null}
    </section>
  );
}

export function DetailFieldGrid({ rows }: DetailFieldGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="rounded-[16px] border border-border/70 bg-white px-4 py-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {row.label}
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">{row.value || '-'}</p>
        </div>
      ))}
    </div>
  );
}

function buildMaterialStatus(material: ProductionOrderMaterialDTO, mode: MaterialsListProps['mode']) {
  if (!material.isAvailable) {
    return {
      label: mode === 'unit' ? 'Eksik' : 'Kontrol bekliyor',
      className: 'bg-slate-100 text-slate-700 border-slate-200',
      note: null as string | null
    };
  }

  if (mode === 'readonly') {
    return {
      label: 'Var',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      note: `${material.checkedByUsername ?? 'depo'} • ${formatDateTime(material.checkedAt)}`
    };
  }

  if (mode === 'unit') {
    return {
      label: 'Hazır',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      note: `${material.checkedByUsername ?? 'depo'} tarafından onaylandı`
    };
  }

  return {
    label: 'Var',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    note: `${material.checkedByUsername ?? 'depo'} • ${formatDateTime(material.checkedAt)}`
  };
}

export function MaterialsList({
  materials,
  mode,
  busyMaterialId,
  onToggleMaterial
}: MaterialsListProps) {
  return (
    <div className="space-y-3">
      {materials.map((material) => {
        const status = buildMaterialStatus(material, mode);

        return (
          <div
            key={material.id}
            className="flex flex-col gap-3 rounded-[16px] border border-border/70 bg-white px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              {mode === 'warehouse' ? (
                <Checkbox
                  checked={material.isAvailable}
                  disabled={busyMaterialId === material.id}
                  onCheckedChange={(checked) => onToggleMaterial?.(material.id, Boolean(checked))}
                  aria-label={`${material.materialName} malzemesi depoda var`}
                  className="mt-0.5"
                />
              ) : null}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{material.materialName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-lg bg-secondary px-2 py-1 font-medium text-secondary-foreground">
                    {material.materialQuantityText}
                  </span>
                  <span className="rounded-lg border border-border/70 px-2 py-1">
                    {materialTypeLabel(material.materialProductType)}
                  </span>
                </div>
              </div>
            </div>
            <div className="sm:text-right">
              <span
                className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${status.className}`}
              >
                {status.label}
              </span>
              {status.note ? (
                <p className="mt-2 text-xs leading-6 text-muted-foreground">{status.note}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DispatchStatusGrid({
  dispatches,
  emptyMessage = 'Henüz sevk kaydı yok.'
}: DispatchStatusGridProps) {
  if (dispatches.length === 0) {
    return (
      <div className="rounded-[16px] border border-border/70 bg-white px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {dispatches.map((dispatch) => (
        <div
          key={dispatch.id}
          className="rounded-[16px] border border-border/70 bg-white px-4 py-4"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              {getProductionUnitLabel(dispatch.unitCode, dispatch.unitName)}
            </p>
            <span
              className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass(dispatch.status)}`}
            >
              {statusLabel(dispatch.status)}
            </span>
          </div>
          <div className="mt-4 space-y-2 text-xs leading-6 text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>Sevk</span>
              <span>{formatDateTime(dispatch.dispatchedAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Kabul</span>
              <span>{formatDateTime(dispatch.acceptedAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Bitiş</span>
              <span>{formatDateTime(dispatch.completedAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
