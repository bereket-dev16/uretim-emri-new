'use client';

import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_TYPE_LABELS
} from '@/modules/stocks/constants';
import { ROLE_LABELS } from '@/shared/constants/role-labels';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StockListItem } from '@/shared/types/domain';

import { CLIENT_POLL_INTERVAL_MS, CLIENT_POLL_JITTER_MS } from '@/shared/config/client-polling';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RecentStocksTableProps {
  items: StockListItem[];
}

interface RecentStocksResponse {
  items: StockListItem[];
}

function isSameItem(left: StockListItem, right: StockListItem): boolean {
  return (
    left.id === right.id &&
    left.irsaliyeNo === right.irsaliyeNo &&
    left.productName === right.productName &&
    left.quantityNumeric === right.quantityNumeric &&
    left.quantityUnit === right.quantityUnit &&
    left.productType === right.productType &&
    left.productCategory === right.productCategory &&
    left.stockEntryDate === right.stockEntryDate &&
    left.barcodeNo === right.barcodeNo &&
    left.createdByRole === right.createdByRole &&
    left.createdAt === right.createdAt
  );
}

function isSameSnapshot(currentItems: StockListItem[], nextItems: StockListItem[]): boolean {
  if (currentItems.length !== nextItems.length) {
    return false;
  }

  for (let index = 0; index < currentItems.length; index += 1) {
    if (!isSameItem(currentItems[index], nextItems[index])) {
      return false;
    }
  }

  return true;
}

export function RecentStocksTable({ items }: RecentStocksTableProps) {
  const [rows, setRows] = useState(items);
  const pollIntervalMs = useMemo(
    () => CLIENT_POLL_INTERVAL_MS + Math.floor(Math.random() * (CLIENT_POLL_JITTER_MS + 1)),
    []
  );
  const rowsRef = useRef(rows);

  useEffect(() => {
    setRows(items);
  }, [items]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    let isDisposed = false;
    let inFlight = false;

    async function syncRecentStocks(): Promise<void> {
      if (isDisposed || inFlight || document.visibilityState === 'hidden') {
        return;
      }

      inFlight = true;

      try {
        const response = await fetch('/api/stocks/recent', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store'
        });

        if (!response.ok || isDisposed) {
          return;
        }

        const payload = (await response.json()) as RecentStocksResponse;

        if (!isSameSnapshot(rowsRef.current, payload.items)) {
          setRows(payload.items);
        }
      } catch {
        // Polling hataları kullanıcı akışını kesmemeli.
      } finally {
        inFlight = false;
      }
    }

    const intervalId = window.setInterval(syncRecentStocks, pollIntervalMs);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void syncRecentStocks();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    void syncRecentStocks();

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollIntervalMs]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="whitespace-nowrap font-semibold">Tarih</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">İrsaliye No</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Ürün</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Miktar</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Tip</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Kategori</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Ekleyen</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Barkod</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                Henüz stok kaydı bulunmuyor.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.stockEntryDate}</TableCell>
                <TableCell className="font-medium">{item.irsaliyeNo}</TableCell>
                <TableCell>{item.productName}</TableCell>
                <TableCell>
                  {item.quantityNumeric} {item.quantityUnit}
                </TableCell>
                <TableCell>{PRODUCT_TYPE_LABELS[item.productType]}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {PRODUCT_CATEGORY_LABELS[item.productCategory]}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{ROLE_LABELS[item.createdByRole]}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{item.barcodeNo}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
