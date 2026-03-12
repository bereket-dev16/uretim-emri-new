'use client';

import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORY_VALUES,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPE_VALUES
} from '@/modules/stocks/constants';
import { ROLE_LABELS } from '@/shared/constants/role-labels';
import type {
  ProductCategory,
  ProductType,
  QuantityUnit,
  StockListItem
} from '@/shared/types/domain';
import type { EditableRow } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StocksMobileCardProps {
  item: StockListItem;
  isEditing: boolean;
  isBusy: boolean;
  canManage: boolean;
  draft: EditableRow | null;
  onDraftChange: (patch: Partial<EditableRow>) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onOpenDeleteModal: () => void;
}

export function StocksMobileCard({
  item,
  isEditing,
  isBusy,
  canManage,
  draft,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onOpenDeleteModal
}: StocksMobileCardProps) {
  return (
    <article className="rounded-[18px] border border-border/70 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{item.productName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            İrsaliye: <span className="font-medium text-foreground">{item.irsaliyeNo}</span>
          </p>
        </div>
        <span className="rounded-xl bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground">
          {PRODUCT_CATEGORY_LABELS[item.productCategory]}
        </span>
      </div>

      {isEditing ? (
        <div className="mt-4 grid gap-3">
          <Input
            aria-label={`${item.irsaliyeNo} irsaliye no düzenle`}
            value={draft?.irsaliyeNo ?? ''}
            onChange={(event) => onDraftChange({ irsaliyeNo: event.target.value })}
          />
          <Input
            aria-label={`${item.irsaliyeNo} ürün adı düzenle`}
            value={draft?.productName ?? ''}
            onChange={(event) => onDraftChange({ productName: event.target.value })}
          />
          <div className="grid grid-cols-[1fr_92px] gap-2">
            <Input
              aria-label={`${item.irsaliyeNo} miktar düzenle`}
              type="number"
              min="0.001"
              step="0.001"
              value={draft?.quantityNumeric ?? ''}
              onChange={(event) => onDraftChange({ quantityNumeric: event.target.value })}
            />
            <Select
              value={draft?.quantityUnit ?? 'adet'}
              onValueChange={(value) => onDraftChange({ quantityUnit: value as QuantityUnit })}
            >
              <SelectTrigger className="bg-slate-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adet">adet</SelectItem>
                <SelectItem value="gr">gr</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select
            value={draft?.productType ?? 'kutu'}
            onValueChange={(value) => onDraftChange({ productType: value as ProductType })}
          >
            <SelectTrigger className="bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_TYPE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {PRODUCT_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={draft?.productCategory ?? 'hammadde'}
            onValueChange={(value) => onDraftChange({ productCategory: value as ProductCategory })}
          >
            <SelectTrigger className="bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_CATEGORY_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {PRODUCT_CATEGORY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label={`${item.irsaliyeNo} stok giriş tarihi düzenle`}
            type="date"
            value={draft?.stockEntryDate ?? ''}
            onChange={(event) => onDraftChange({ stockEntryDate: event.target.value })}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Miktar</span>
            <span className="font-medium text-foreground">
              {item.quantityNumeric} {item.quantityUnit}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Tip</span>
            <span className="font-medium text-foreground">{PRODUCT_TYPE_LABELS[item.productType]}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Tarih</span>
            <span className="font-medium text-foreground">{item.stockEntryDate}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Ekleyen</span>
            <span className="font-medium text-foreground">{ROLE_LABELS[item.createdByRole]}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Barkod</span>
            <span className="font-mono text-xs text-muted-foreground">{item.barcodeNo}</span>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canManage ? (
          isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={onCancelEdit} disabled={isBusy}>
                Vazgeç
              </Button>
              <Button size="sm" onClick={onSaveEdit} disabled={isBusy}>
                Kaydet
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onStartEdit} disabled={isBusy}>
                Düzenle
              </Button>
              <Button variant="destructive" size="sm" onClick={onOpenDeleteModal} disabled={isBusy}>
                Sil
              </Button>
            </>
          )
        ) : (
          <span className="text-sm text-muted-foreground">İşlem yok</span>
        )}
      </div>
    </article>
  );
}
