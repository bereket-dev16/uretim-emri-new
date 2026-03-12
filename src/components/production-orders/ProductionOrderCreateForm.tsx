'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronDown, Plus, Printer, Trash2 } from 'lucide-react';

import {
  DEMAND_SOURCE_LABELS,
  DEMAND_SOURCE_VALUES,
  MARKET_SCOPE_LABELS,
  MARKET_SCOPE_VALUES,
  PACKAGING_TYPE_LABELS,
  PACKAGING_TYPE_VALUES
} from '@/modules/production-orders/constants';
import { PRODUCT_TYPE_LABELS, PRODUCT_TYPE_VALUES } from '@/modules/stocks/constants';
import type {
  DemandSource,
  MarketScope,
  PackagingType,
  ProductType,
  ProductionUnit,
  ProductionUnitDTO
} from '@/shared/types/domain';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ProductionOrderCreateFormProps {
  canCreate: boolean;
  productionUnits: ProductionUnitDTO[];
}

interface MainFormState {
  orderDate: string;
  orderNo: string;
  customerName: string;
  marketScope: MarketScope;
  demandSource: DemandSource;
  orderQuantity: string;
  deadlineDate: string;
  finalProductName: string;
  packagingType: PackagingType;
  totalAmountText: string;
}

interface MaterialRowFormState {
  id: string;
  materialProductType: ProductType;
  materialName: string;
  materialQuantityText: string;
}

interface ProductionOrderPreview {
  main: MainFormState;
  dispatchUnits: ProductionUnit[];
  materials: Array<{
    materialProductType: ProductType;
    materialName: string;
    materialQuantityText: string;
  }>;
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function createInitialMainForm(): MainFormState {
  const today = getTodayDate();

  return {
    orderDate: today,
    orderNo: '',
    customerName: '',
    marketScope: 'ihracat',
    demandSource: 'numune',
    orderQuantity: '',
    deadlineDate: today,
    finalProductName: '',
    packagingType: 'kapsul',
    totalAmountText: ''
  };
}

function createMaterialRow(rowIndex: number): MaterialRowFormState {
  return {
    id: `material-row-${rowIndex}`,
    materialProductType: PRODUCT_TYPE_VALUES[0],
    materialName: '',
    materialQuantityText: ''
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
  preview: ProductionOrderPreview,
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

  const materialRowsHtml = preview.materials
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.materialName)}</td>
          <td>${escapeHtml(row.materialQuantityText)}</td>
          <td>${escapeHtml(PRODUCT_TYPE_LABELS[row.materialProductType])}</td>
        </tr>
      `
    )
    .join('');

  return `
    <!doctype html>
    <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <title>Üretim Emri Çıktısı</title>
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
            margin-bottom: 18px;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 10px;
          }
          .header img {
            height: 46px;
            width: auto;
            object-fit: contain;
          }
          h1 {
            margin: 0;
            font-size: 22px;
          }
          h2 {
            margin: 18px 0 10px;
            font-size: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            text-align: left;
            font-size: 13px;
            vertical-align: top;
          }
          th {
            background: #f3f4f6;
            font-weight: 600;
          }
          .meta {
            color: #4b5563;
            font-size: 12px;
            margin-top: 8px;
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
          <h1>Üretim Emri</h1>
          <img src="${logoUrl}" alt="Bereket Logo" />
        </div>
        <h2>İş Emri Bilgileri</h2>
        <table>
          <tbody>
            ${mainRowsHtml}
          </tbody>
        </table>
        <h2>Malzeme Satırları</h2>
        <table>
          <thead>
            <tr>
              <th>Malzeme Adı</th>
              <th>Miktar</th>
              <th>Ürün Tipi</th>
            </tr>
          </thead>
          <tbody>
            ${materialRowsHtml}
          </tbody>
        </table>
        <p class="meta">Oluşturma zamanı: ${new Date().toLocaleString('tr-TR')}</p>
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

export function ProductionOrderCreateForm({
  canCreate,
  productionUnits
}: ProductionOrderCreateFormProps) {
  const router = useRouter();
  const rowCounterRef = useRef(1);
  const dispatchDropdownRef = useRef<HTMLDivElement | null>(null);
  const [mainForm, setMainForm] = useState<MainFormState>(() => createInitialMainForm());
  const [dispatchUnits, setDispatchUnits] = useState<ProductionUnit[]>([]);
  const [isDispatchDropdownOpen, setIsDispatchDropdownOpen] = useState(false);
  const [materialRows, setMaterialRows] = useState<MaterialRowFormState[]>(() => [
    createMaterialRow(rowCounterRef.current)
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<ProductionOrderPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const dispatchUnitOptions = useMemo(
    () =>
      productionUnits
        .filter((unit) => unit.isActive)
        .map((unit) => ({
          code: unit.code,
          name: unit.name
        })),
    [productionUnits]
  );

  const dispatchUnitNameMap = useMemo(
    () => new Map(dispatchUnitOptions.map((unit) => [unit.code, unit.name] as const)),
    [dispatchUnitOptions]
  );

  const selectedDispatchUnitNames = useMemo(
    () => dispatchUnits.map((unitCode) => dispatchUnitNameMap.get(unitCode) ?? unitCode),
    [dispatchUnits, dispatchUnitNameMap]
  );

  const dispatchDropdownLabel = useMemo(() => {
    if (selectedDispatchUnitNames.length === 0) {
      return 'Birim seçin';
    }

    if (selectedDispatchUnitNames.length <= 2) {
      return selectedDispatchUnitNames.join(', ');
    }

    return `${selectedDispatchUnitNames.length} birim seçildi`;
  }, [selectedDispatchUnitNames]);

  useEffect(() => {
    if (!isDispatchDropdownOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!dispatchDropdownRef.current) {
        return;
      }

      if (!dispatchDropdownRef.current.contains(event.target as Node)) {
        setIsDispatchDropdownOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDispatchDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDispatchDropdownOpen]);

  const previewMainRows = useMemo(
    () =>
      preview
        ? [
            { label: 'İş Emri Tarihi', value: formatDate(preview.main.orderDate) },
            { label: 'İş Emri No', value: preview.main.orderNo },
            { label: 'Müşteri Adı', value: preview.main.customerName },
            { label: 'Pazar', value: MARKET_SCOPE_LABELS[preview.main.marketScope] },
            { label: 'Talep Tipi', value: DEMAND_SOURCE_LABELS[preview.main.demandSource] },
            { label: 'Sipariş Miktarı', value: preview.main.orderQuantity },
            { label: 'Termin', value: formatDate(preview.main.deadlineDate) },
            { label: 'Son Ürün Adı', value: preview.main.finalProductName },
            { label: 'Ambalaj Türü', value: PACKAGING_TYPE_LABELS[preview.main.packagingType] },
            { label: 'Toplam Ambalaj Miktarı', value: preview.main.totalAmountText },
            {
              label: 'Sevkedilecek Birimler',
              value: preview.dispatchUnits
                .map((unitCode) => dispatchUnitNameMap.get(unitCode) ?? unitCode)
                .join(', ')
            }
          ]
        : [],
    [preview, dispatchUnitNameMap]
  );

  function setMainField<K extends keyof MainFormState>(key: K, value: MainFormState[K]) {
    setMainForm((prev) => ({ ...prev, [key]: value }));
  }

  function setMaterialField<K extends keyof MaterialRowFormState>(
    rowId: string,
    key: K,
    value: MaterialRowFormState[K]
  ) {
    setMaterialRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [key]: value } : row))
    );
  }

  function addMaterialRow() {
    rowCounterRef.current += 1;
    setMaterialRows((prev) => [...prev, createMaterialRow(rowCounterRef.current)]);
  }

  function resetFormState() {
    rowCounterRef.current = 1;
    setMainForm(createInitialMainForm());
    setDispatchUnits([]);
    setIsDispatchDropdownOpen(false);
    setMaterialRows([createMaterialRow(rowCounterRef.current)]);
  }

  function toggleDispatchUnit(unitCode: ProductionUnit) {
    setDispatchUnits((prev) => {
      if (prev.includes(unitCode)) {
        return prev.filter((item) => item !== unitCode);
      }

      return [...prev, unitCode];
    });
  }

  function removeMaterialRow(rowId: string) {
    setMaterialRows((prev) => {
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter((row) => row.id !== rowId);
    });
  }

  function validateBeforePreview() {
    const requiredMainFields = [
      mainForm.orderDate,
      mainForm.orderNo.trim(),
      mainForm.customerName.trim(),
      mainForm.orderQuantity.trim(),
      mainForm.deadlineDate,
      mainForm.finalProductName.trim(),
      mainForm.totalAmountText.trim()
    ];

    if (requiredMainFields.some((value) => !value)) {
      setErrorMessage('Lütfen iş emri formundaki zorunlu alanları doldurun.');
      return null;
    }

    if (dispatchUnits.length === 0) {
      setErrorMessage('En az bir sevkedilecek birim seçmelisiniz.');
      return null;
    }

    const normalizedMaterials = materialRows.map((row) => ({
      materialProductType: row.materialProductType,
      materialName: row.materialName.trim(),
      materialQuantityText: row.materialQuantityText.trim()
    }));

    if (normalizedMaterials.length === 0) {
      setErrorMessage('En az bir malzeme satırı zorunludur.');
      return null;
    }

    const invalidMaterial = normalizedMaterials.find(
      (row) => !row.materialName || !row.materialQuantityText
    );

    if (invalidMaterial) {
      setErrorMessage('Her malzeme satırında malzeme adı, miktar ve ürün tipi zorunludur.');
      return null;
    }

    return normalizedMaterials;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreate) {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);
    const normalizedMaterials = validateBeforePreview();

    if (!normalizedMaterials) {
      return;
    }

    setPreview({
      main: {
        ...mainForm,
        orderNo: mainForm.orderNo.trim(),
        customerName: mainForm.customerName.trim(),
        orderQuantity: mainForm.orderQuantity.trim(),
        finalProductName: mainForm.finalProductName.trim(),
        totalAmountText: mainForm.totalAmountText.trim()
      },
      dispatchUnits: [...dispatchUnits],
      materials: normalizedMaterials
    });
    setIsPreviewOpen(true);
  }

  function handlePrintPdf() {
    if (!preview) {
      return;
    }

    const html = buildPrintHtml(
      preview,
      previewMainRows,
      `${window.location.origin}/bereket-logo.png`
    );
    const blob = new Blob([html], { type: 'text/html' });
    const printUrl = URL.createObjectURL(blob);
    const printWindow = window.open(printUrl, '_blank');

    if (!printWindow) {
      URL.revokeObjectURL(printUrl);
      setErrorMessage('Yazdırma penceresi açılamadı. Tarayıcı popup engelini kontrol edin.');
      return;
    }

    const cleanup = () => {
      URL.revokeObjectURL(printUrl);
    };

    window.setTimeout(cleanup, 60_000);
  }

  async function handleCreateFromPreview() {
    if (!preview) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/production-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderDate: preview.main.orderDate,
          orderNo: preview.main.orderNo,
          customerName: preview.main.customerName,
          marketScope: preview.main.marketScope,
          demandSource: preview.main.demandSource,
          orderQuantity: preview.main.orderQuantity,
          deadlineDate: preview.main.deadlineDate,
          finalProductName: preview.main.finalProductName,
          packagingType: preview.main.packagingType,
          totalAmountText: preview.main.totalAmountText,
          dispatchUnits: preview.dispatchUnits,
          materials: preview.materials
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Üretim emri kaydedilemedi.');
        return;
      }

      setStatusMessage(`Üretim emri kaydedildi: ${payload.item?.orderNo ?? preview.main.orderNo}`);
      setIsPreviewOpen(false);
      setPreview(null);
      resetFormState();
      router.refresh();
    } catch {
      setErrorMessage('Sunucuya erişilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="rounded-[18px] border border-border/70 bg-white p-5 sm:p-6">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-foreground">İş emri bilgileri</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Temel sipariş bilgilerini girin.
            </p>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderDate">İş Emri Tarihi</Label>
                <Input
                  id="orderDate"
                  aria-label="İş emri tarihi"
                  type="date"
                  value={mainForm.orderDate}
                  onChange={(event) => setMainField('orderDate', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderNo">İş Emri No</Label>
                <Input
                  id="orderNo"
                  aria-label="İş emri no"
                  value={mainForm.orderNo}
                  onChange={(event) => setMainField('orderNo', event.target.value)}
                  placeholder="Örn: IE-2026-0042"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerName">Müşteri Adı</Label>
                <Input
                  id="customerName"
                  aria-label="Müşteri adı"
                  value={mainForm.customerName}
                  onChange={(event) => setMainField('customerName', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderQuantity">Sipariş Miktarı</Label>
                <Input
                  id="orderQuantity"
                  aria-label="Sipariş miktarı"
                  value={mainForm.orderQuantity}
                  onChange={(event) => setMainField('orderQuantity', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadlineDate">Termin</Label>
                <Input
                  id="deadlineDate"
                  aria-label="Termin tarihi"
                  type="date"
                  value={mainForm.deadlineDate}
                  onChange={(event) => setMainField('deadlineDate', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finalProductName">Son Ürün Adı</Label>
                <Input
                  id="finalProductName"
                  aria-label="Son ürün adı"
                  value={mainForm.finalProductName}
                  onChange={(event) => setMainField('finalProductName', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="totalAmountText">Toplam Ambalaj Miktarı</Label>
                <Input
                  id="totalAmountText"
                  aria-label="Toplam miktar"
                  value={mainForm.totalAmountText}
                  onChange={(event) => setMainField('totalAmountText', event.target.value)}
                  placeholder="Örn: 250000 kapsül"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <fieldset className="space-y-2 rounded-xl border border-border/70 bg-slate-50 p-4">
                <legend className="px-1 text-sm font-medium">İhracat / İç Piyasa</legend>
                <div className="space-y-2">
                  {MARKET_SCOPE_VALUES.map((value) => (
                    <div className="flex items-center gap-2" key={value}>
                      <Checkbox
                        id={`marketScope-${value}`}
                        checked={mainForm.marketScope === value}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setMainField('marketScope', value);
                          }
                        }}
                      />
                      <Label className="cursor-pointer" htmlFor={`marketScope-${value}`}>
                        {MARKET_SCOPE_LABELS[value]}
                      </Label>
                    </div>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2 rounded-xl border border-border/70 bg-slate-50 p-4">
                <legend className="px-1 text-sm font-medium">Numune / Müşteri Talebi / Stok</legend>
                <div className="space-y-2">
                  {DEMAND_SOURCE_VALUES.map((value) => (
                    <div className="flex items-center gap-2" key={value}>
                      <Checkbox
                        id={`demandSource-${value}`}
                        checked={mainForm.demandSource === value}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setMainField('demandSource', value);
                          }
                        }}
                      />
                      <Label className="cursor-pointer" htmlFor={`demandSource-${value}`}>
                        {DEMAND_SOURCE_LABELS[value]}
                      </Label>
                    </div>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2 rounded-xl border border-border/70 bg-slate-50 p-4">
                <legend className="px-1 text-sm font-medium">Ambalaj Türü</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PACKAGING_TYPE_VALUES.map((value) => (
                    <div className="flex items-center gap-2" key={value}>
                      <Checkbox
                        id={`packagingType-${value}`}
                        checked={mainForm.packagingType === value}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setMainField('packagingType', value);
                          }
                        }}
                      />
                      <Label className="cursor-pointer" htmlFor={`packagingType-${value}`}>
                        {PACKAGING_TYPE_LABELS[value]}
                      </Label>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </section>

        <section className="rounded-[18px] border border-border/70 bg-white p-5 sm:p-6">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Malzemeler</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Malzeme adı, miktar ve ürün tipini sırayla ekleyin.
            </p>
          </div>

          <div className="space-y-3">
            {materialRows.map((row, index) => (
              <div
                className="grid grid-cols-1 items-end gap-3 rounded-xl border border-border/70 bg-slate-50 p-4 md:grid-cols-12"
                key={row.id}
              >
                <div className="space-y-2 md:col-span-5">
                  <Label htmlFor={`materialName-${row.id}`}>Malzeme Adı</Label>
                  <Input
                    id={`materialName-${row.id}`}
                    aria-label={`Malzeme satırı ${index + 1} malzeme adı`}
                    value={row.materialName}
                    onChange={(event) => setMaterialField(row.id, 'materialName', event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor={`materialQuantity-${row.id}`}>Miktar</Label>
                  <Input
                    id={`materialQuantity-${row.id}`}
                    aria-label={`Malzeme satırı ${index + 1} miktar`}
                    value={row.materialQuantityText}
                    onChange={(event) =>
                      setMaterialField(row.id, 'materialQuantityText', event.target.value)
                    }
                    placeholder="Örn: 25 kg"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor={`materialType-${row.id}`}>Ürün Tipi</Label>
                  <select
                    id={`materialType-${row.id}`}
                    aria-label={`Malzeme satırı ${index + 1} ürün tipi`}
                    className="flex h-10 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={row.materialProductType}
                    onChange={(event) =>
                      setMaterialField(
                        row.id,
                        'materialProductType',
                        event.target.value as ProductType
                      )
                    }
                  >
                    {PRODUCT_TYPE_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {PRODUCT_TYPE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1 flex md:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeMaterialRow(row.id)}
                    disabled={materialRows.length === 1}
                    aria-label={`Malzeme satırı ${index + 1} sil`}
                    className="border-destructive/20 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addMaterialRow}>
              <Plus className="w-4 h-4 mr-2" />
              Malzeme Satırı Ekle
            </Button>
          </div>
        </section>

        <section className="rounded-[18px] border border-border/70 bg-white p-5 sm:p-6">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Sevkedilecek birimler</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Emrin gideceği birimleri seçin. Birden fazla seçim yapabilirsiniz.
            </p>
          </div>

          <div className="max-w-sm space-y-2">
              <Label htmlFor="dispatchUnitsDropdown">Sevkedilecek Birimler</Label>
              <div className="relative" ref={dispatchDropdownRef}>
                <button
                  id="dispatchUnitsDropdown"
                  type="button"
                  aria-label="Sevkedilecek birimler seçimi"
                  aria-expanded={isDispatchDropdownOpen}
                  aria-haspopup="listbox"
                  onClick={() => setIsDispatchDropdownOpen((prev) => !prev)}
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-slate-50 px-3 py-2 text-left text-sm ring-offset-background transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className={dispatchUnits.length === 0 ? 'text-muted-foreground' : ''}>
                    {dispatchDropdownLabel}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isDispatchDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isDispatchDropdownOpen ? (
                  <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-input bg-popover p-2 shadow-md">
                    {dispatchUnitOptions.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-muted-foreground">
                        Aktif sevk birimi bulunamadı.
                      </p>
                    ) : (
                      dispatchUnitOptions.map((unit) => {
                        const checkboxId = `dispatch-unit-${unit.code}`;

                        return (
                          <div
                            key={unit.code}
                            className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                          >
                            <Checkbox
                              id={checkboxId}
                              checked={dispatchUnits.includes(unit.code)}
                              onCheckedChange={() => toggleDispatchUnit(unit.code)}
                            />
                            <Label className="cursor-pointer text-sm" htmlFor={checkboxId}>
                              {unit.name}
                            </Label>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>

              {selectedDispatchUnitNames.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedDispatchUnitNames.map((unitName) => (
                    <span
                      key={unitName}
                      className="inline-flex rounded-xl border border-border/70 bg-slate-50 px-3 py-1 text-sm text-foreground"
                    >
                      {unitName}
                    </span>
                  ))}
                </div>
              ) : null}
          </div>
        </section>

        {statusMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Önce önizleme açılır, onay sonrası kayıt tamamlanır.
          </p>
          <Button disabled={!canCreate} type="submit" size="lg" className="w-full sm:w-auto">
            Oluştur
          </Button>
        </div>
      </form>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[18px] border-border/70 bg-white sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              Üretim Emri Önizleme
            </DialogTitle>
            <DialogDescription>
              Girdiğiniz bilgiler tablo görünümünde aşağıda listelendi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                İş Emri Bilgileri
              </h3>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-slate-50">
                <Table>
                  <TableBody>
                    {previewMainRows.map((row) => (
                      <TableRow key={row.label}>
                        <TableCell className="w-1/3 bg-slate-100 font-medium">{row.label}</TableCell>
                        <TableCell>{row.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Malzeme Satırları
              </h3>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-slate-50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Malzeme Adı</TableHead>
                      <TableHead>Miktar</TableHead>
                      <TableHead>Ürün Tipi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview?.materials.map((row, index) => (
                      <TableRow key={`${row.materialName}-${index}`}>
                        <TableCell>{row.materialName}</TableCell>
                        <TableCell>{row.materialQuantityText}</TableCell>
                        <TableCell>{PRODUCT_TYPE_LABELS[row.materialProductType]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handlePrintPdf}>
              <Printer className="w-4 h-4 mr-2" />
              Yazdır (PDF)
            </Button>
            <Button type="button" onClick={handleCreateFromPreview} disabled={isCreating}>
              {isCreating ? 'Kaydediliyor...' : 'Kaydet ve Oluştur'}
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
