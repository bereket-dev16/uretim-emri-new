'use client';

import { memo } from 'react';

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
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StocksTableRowProps {
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

function StocksTableRowComponent({
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
}: StocksTableRowProps) {
  return (
    <TableRow className={`${isEditing ? 'bg-slate-50' : ''}`}>
      <TableCell className="font-medium">
        {isEditing ? (
          <Input
            aria-label={`${item.irsaliyeNo} irsaliye no düzenle`}
            value={draft?.irsaliyeNo ?? ''}
            onChange={(event) => onDraftChange({ irsaliyeNo: event.target.value })}
            className="h-9 min-w-[120px] bg-white"
          />
        ) : (
          item.irsaliyeNo
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            aria-label={`${item.irsaliyeNo} ürün adı düzenle`}
            value={draft?.productName ?? ''}
            onChange={(event) => onDraftChange({ productName: event.target.value })}
            className="h-9 min-w-[200px] bg-white"
          />
        ) : (
          item.productName
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              aria-label={`${item.irsaliyeNo} miktar düzenle`}
              type="number"
              min="0.001"
              step="0.001"
              value={draft?.quantityNumeric ?? ''}
              onChange={(event) => onDraftChange({ quantityNumeric: event.target.value })}
              className="h-9 w-20 bg-white"
            />
            <Select
              value={draft?.quantityUnit ?? 'adet'}
              onValueChange={(value) => onDraftChange({ quantityUnit: value as QuantityUnit })}
            >
              <SelectTrigger className="h-9 w-16 bg-white px-2 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adet">adet</SelectItem>
                <SelectItem value="gr">gr</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          `${item.quantityNumeric} ${item.quantityUnit}`
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Select
            value={draft?.productType ?? 'kutu'}
            onValueChange={(value) => onDraftChange({ productType: value as ProductType })}
          >
            <SelectTrigger className="h-9 min-w-[120px] bg-white">
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
        ) : (
          PRODUCT_TYPE_LABELS[item.productType]
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Select
            value={draft?.productCategory ?? 'hammadde'}
            onValueChange={(value) => onDraftChange({ productCategory: value as ProductCategory })}
          >
            <SelectTrigger className="h-9 min-w-[140px] bg-white">
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
        ) : (
          <span className="inline-flex items-center rounded-lg bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
            {PRODUCT_CATEGORY_LABELS[item.productCategory]}
          </span>
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            aria-label={`${item.irsaliyeNo} stok giriş tarihi düzenle`}
            type="date"
            value={draft?.stockEntryDate ?? ''}
            onChange={(event) => onDraftChange({ stockEntryDate: event.target.value })}
            className="h-9 min-w-[140px] bg-white"
          />
        ) : (
          item.stockEntryDate
        )}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{item.barcodeNo}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{ROLE_LABELS[item.createdByRole]}</TableCell>
      <TableCell className="text-right">
        {canManage ? (
          <div className="flex items-center justify-end gap-2">
            {isEditing ? (
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
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export const StocksTableRow = memo(StocksTableRowComponent);
