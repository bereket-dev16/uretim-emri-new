'use client';

import { FormEvent, useMemo, useState } from 'react';
import { CheckCircle2, Printer } from 'lucide-react';

import {
  DEMAND_SOURCE_LABELS,
  DEMAND_SOURCE_VALUES,
  MARKET_SCOPE_LABELS,
  MARKET_SCOPE_VALUES,
  PACKAGING_TYPE_LABELS,
  PACKAGING_TYPE_VALUES
} from '@/modules/production-orders/constants';
import type { DemandSource, MarketScope, PackagingType } from '@/shared/types/domain';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

type ProspectusOption = 'var' | 'yok';

const PROSPECTUS_OPTIONS = ['var', 'yok'] as const satisfies ReadonlyArray<ProspectusOption>;

const PROSPECTUS_LABELS: Record<ProspectusOption, string> = {
  var: 'Var',
  yok: 'Yok'
};

interface DemoPrintFormState {
  orderDate: string;
  orderNo: string;
  customerName: string;
  orderQuantity: string;
  deadlineDate: string;
  finalProductName: string;
  totalPackageAmount: string;
  color: string;
  moldName: string;
  prospectus: ProspectusOption;
  marketScope: MarketScope;
  demandSource: DemandSource;
  packagingType: PackagingType;
}

interface DemoPrintPreview extends DemoPrintFormState {}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function createInitialFormState(): DemoPrintFormState {
  const today = getTodayDate();

  return {
    orderDate: today,
    orderNo: '',
    customerName: '',
    orderQuantity: '',
    deadlineDate: today,
    finalProductName: '',
    totalPackageAmount: '',
    color: '',
    moldName: '',
    prospectus: 'var',
    marketScope: 'ihracat',
    demandSource: 'numune',
    packagingType: 'kapsul'
  };
}

function formatDate(value: string): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('tr-TR');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPrintHtml(
  previewRows: Array<{ label: string; value: string }>,
  logoUrl: string
): string {
  const mainRowsHtml = previewRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.label)}</td>
          <td>${escapeHtml(row.value)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <!doctype html>
    <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <title>Üretim İş Emri Formu</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111827;
            margin: 24px;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 18px;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 10px;
          }
          .header img {
            height: 48px;
            width: auto;
            object-fit: contain;
          }
          h1 {
            margin: 0;
            font-size: 22px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          td {
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            text-align: left;
            font-size: 13px;
            vertical-align: top;
          }
          td:first-child {
            width: 34%;
            background: #f3f4f6;
            font-weight: 600;
          }
          @media print {
            body {
              margin: 12mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Üretim İş Emri Formu</h1>
          </div>
          <img src="${logoUrl}" alt="Bereket Logo" />
        </div>
        <table>
          <tbody>
            ${mainRowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function () {
            setTimeout(function () {
              window.print();
            }, 300);
          };
          window.onafterprint = function () {
            window.close();
          };
        </script>
      </body>
    </html>
  `;
}

export function DemoPrintForm() {
  const [form, setForm] = useState<DemoPrintFormState>(() => createInitialFormState());
  const [preview, setPreview] = useState<DemoPrintPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewRows = useMemo(
    () =>
      preview
        ? [
            { label: 'İş Emri Tarihi', value: formatDate(preview.orderDate) },
            { label: 'İş Emri No', value: preview.orderNo },
            { label: 'Müşteri Adı', value: preview.customerName },
            { label: 'Sipariş Miktarı', value: preview.orderQuantity },
            { label: 'Termin Tarihi', value: formatDate(preview.deadlineDate) },
            { label: 'Son Ürün Adı', value: preview.finalProductName },
            { label: 'Toplam Ambalaj Miktarı', value: preview.totalPackageAmount },
            { label: 'Renk', value: preview.color },
            { label: 'Kapsül/Tablet/Softjel Kalıbı', value: preview.moldName },
            { label: 'Prospektüs', value: PROSPECTUS_LABELS[preview.prospectus] },
            { label: 'İhracat / İç Piyasa', value: MARKET_SCOPE_LABELS[preview.marketScope] },
            { label: 'Numune / Müşteri Talebi / Stok', value: DEMAND_SOURCE_LABELS[preview.demandSource] },
            { label: 'Ambalaj Türü', value: PACKAGING_TYPE_LABELS[preview.packagingType] }
          ]
        : [],
    [preview]
  );

  function setField<K extends keyof DemoPrintFormState>(key: K, value: DemoPrintFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildPreviewFromForm(): DemoPrintPreview | null {
    const normalizedPreview: DemoPrintPreview = {
      ...form,
      orderNo: form.orderNo.trim(),
      customerName: form.customerName.trim(),
      orderQuantity: form.orderQuantity.trim(),
      finalProductName: form.finalProductName.trim(),
      totalPackageAmount: form.totalPackageAmount.trim(),
      color: form.color.trim(),
      moldName: form.moldName.trim()
    };

    const requiredFields = [
      normalizedPreview.orderDate,
      normalizedPreview.orderNo,
      normalizedPreview.customerName,
      normalizedPreview.orderQuantity,
      normalizedPreview.deadlineDate,
      normalizedPreview.finalProductName,
      normalizedPreview.totalPackageAmount,
      normalizedPreview.color,
      normalizedPreview.moldName
    ];

    if (requiredFields.some((value) => !value)) {
      setErrorMessage('Lütfen formdaki zorunlu alanları doldurun.');
      return null;
    }

    return normalizedPreview;
  }

  function openPrint(previewData: DemoPrintPreview) {
    const printRows = [
      { label: 'İş Emri Tarihi', value: formatDate(previewData.orderDate) },
      { label: 'İş Emri No', value: previewData.orderNo },
      { label: 'Müşteri Adı', value: previewData.customerName },
      { label: 'Sipariş Miktarı', value: previewData.orderQuantity },
      { label: 'Termin Tarihi', value: formatDate(previewData.deadlineDate) },
      { label: 'Son Ürün Adı', value: previewData.finalProductName },
      { label: 'Toplam Ambalaj Miktarı', value: previewData.totalPackageAmount },
      { label: 'Renk', value: previewData.color },
      { label: 'Kapsül/Tablet/Softjel Kalıbı', value: previewData.moldName },
      { label: 'Prospektüs', value: PROSPECTUS_LABELS[previewData.prospectus] },
      { label: 'İhracat / İç Piyasa', value: MARKET_SCOPE_LABELS[previewData.marketScope] },
      { label: 'Numune / Müşteri Talebi / Stok', value: DEMAND_SOURCE_LABELS[previewData.demandSource] },
      { label: 'Ambalaj Türü', value: PACKAGING_TYPE_LABELS[previewData.packagingType] }
    ];

    const html = buildPrintHtml(printRows, `${window.location.origin}/bereket-logo.png`);
    const blob = new Blob([html], { type: 'text/html' });
    const printUrl = URL.createObjectURL(blob);
    const printWindow = window.open(printUrl, '_blank');

    if (!printWindow) {
      URL.revokeObjectURL(printUrl);
      setErrorMessage('Yazdırma penceresi açılamadı. Tarayıcı popup engelini kontrol edin.');
      return;
    }

    window.setTimeout(() => {
      URL.revokeObjectURL(printUrl);
    }, 60_000);
  }

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const previewData = buildPreviewFromForm();

    if (!previewData) {
      return;
    }

    setPreview(previewData);
    setIsPreviewOpen(true);
  }

  function handleDirectPrint() {
    setErrorMessage(null);
    const previewData = buildPreviewFromForm();

    if (!previewData) {
      return;
    }

    setPreview(previewData);
    openPrint(previewData);
  }

  return (
    <>
      <form className="space-y-6" onSubmit={handlePreview}>
        <section className="rounded-[18px] border border-amber-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-foreground">İş emri bilgileri</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Çıktı için gerekli alanları doldurun, önizleyin ve PDF olarak yazdırın.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="demoOrderDate">İş Emri Tarihi</Label>
              <Input
                id="demoOrderDate"
                type="date"
                value={form.orderDate}
                onChange={(event) => setField('orderDate', event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demoOrderNo">İş Emri No</Label>
              <Input
                id="demoOrderNo"
                value={form.orderNo}
                onChange={(event) => setField('orderNo', event.target.value)}
                placeholder="Örn: DEMO-IE-2026-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demoCustomerName">Müşteri Adı</Label>
              <Input
                id="demoCustomerName"
                value={form.customerName}
                onChange={(event) => setField('customerName', event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demoOrderQuantity">Sipariş Miktarı</Label>
              <Input
                id="demoOrderQuantity"
                value={form.orderQuantity}
                onChange={(event) => setField('orderQuantity', event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demoDeadlineDate">Termin Tarihi</Label>
              <Input
                id="demoDeadlineDate"
                type="date"
                value={form.deadlineDate}
                onChange={(event) => setField('deadlineDate', event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demoFinalProductName">Son Ürün Adı</Label>
              <Input
                id="demoFinalProductName"
                value={form.finalProductName}
                onChange={(event) => setField('finalProductName', event.target.value)}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <Label htmlFor="demoTotalPackageAmount">Toplam Ambalaj Miktarı</Label>
              <Input
                id="demoTotalPackageAmount"
                value={form.totalPackageAmount}
                onChange={(event) => setField('totalPackageAmount', event.target.value)}
                placeholder="Örn: 24.000 kutu"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demoColor">Renk</Label>
              <Input
                id="demoColor"
                value={form.color}
                onChange={(event) => setField('color', event.target.value)}
                placeholder="Örn: Krem / Mavi"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demoMoldName">Kapsül/Tablet/Softjel Kalıbı</Label>
              <Input
                id="demoMoldName"
                value={form.moldName}
                onChange={(event) => setField('moldName', event.target.value)}
                placeholder="Örn: S4 Softjel Kalıbı"
                required
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
            <fieldset className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
              <legend className="px-1 text-sm font-medium">Prospektüs</legend>
              <div className="space-y-2">
                {PROSPECTUS_OPTIONS.map((value) => (
                  <div className="flex items-center gap-2" key={value}>
                    <Checkbox
                      id={`demoProspectus-${value}`}
                      checked={form.prospectus === value}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setField('prospectus', value);
                        }
                      }}
                    />
                    <Label className="cursor-pointer" htmlFor={`demoProspectus-${value}`}>
                      {PROSPECTUS_LABELS[value]}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
              <legend className="px-1 text-sm font-medium">İhracat / İç Piyasa</legend>
              <div className="space-y-2">
                {MARKET_SCOPE_VALUES.map((value) => (
                  <div className="flex items-center gap-2" key={value}>
                    <Checkbox
                      id={`demoMarketScope-${value}`}
                      checked={form.marketScope === value}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setField('marketScope', value);
                        }
                      }}
                    />
                    <Label className="cursor-pointer" htmlFor={`demoMarketScope-${value}`}>
                      {MARKET_SCOPE_LABELS[value]}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
              <legend className="px-1 text-sm font-medium">Numune / Müşteri Talebi / Stok</legend>
              <div className="space-y-2">
                {DEMAND_SOURCE_VALUES.map((value) => (
                  <div className="flex items-center gap-2" key={value}>
                    <Checkbox
                      id={`demoDemandSource-${value}`}
                      checked={form.demandSource === value}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setField('demandSource', value);
                        }
                      }}
                    />
                    <Label className="cursor-pointer" htmlFor={`demoDemandSource-${value}`}>
                      {DEMAND_SOURCE_LABELS[value]}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
              <legend className="px-1 text-sm font-medium">Ambalaj Türü</legend>
              <div className="space-y-2">
                {PACKAGING_TYPE_VALUES.map((value) => (
                  <div className="flex items-center gap-2" key={value}>
                    <Checkbox
                      id={`demoPackagingType-${value}`}
                      checked={form.packagingType === value}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setField('packagingType', value);
                        }
                      }}
                    />
                    <Label className="cursor-pointer" htmlFor={`demoPackagingType-${value}`}>
                      {PACKAGING_TYPE_LABELS[value]}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Önce önizleme alın ya da doğrudan yazdırın.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleDirectPrint}
              className="w-full border-amber-300 text-amber-900 hover:bg-amber-100 sm:w-auto"
            >
              <Printer className="mr-2 h-4 w-4" />
              Yazdır (PDF)
            </Button>
            <Button type="submit" className="w-full bg-amber-600 text-white hover:bg-amber-700 sm:w-auto">
              Önizle
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[18px] border-amber-200 bg-white sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <CheckCircle2 className="h-5 w-5" />
              Üretim İş Emri Formu Önizleme
            </DialogTitle>
            <DialogDescription>
              Girilen bilgiler yazdırma öncesi tablo görünümünde listelendi.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/30">
            <Table>
              <TableBody>
                {previewRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="w-[34%] bg-amber-50/80 font-medium">{row.label}</TableCell>
                    <TableCell>{row.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (preview) {
                  openPrint(preview);
                }
              }}
              className="border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              <Printer className="mr-2 h-4 w-4" />
              Yazdır (PDF)
            </Button>
            <Button type="button" onClick={() => setIsPreviewOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
