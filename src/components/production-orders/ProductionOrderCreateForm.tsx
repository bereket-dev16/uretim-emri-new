'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  DEMAND_SOURCE_LABELS,
  DEMAND_SOURCE_VALUES,
  MARKET_SCOPE_LABELS,
  MARKET_SCOPE_VALUES,
  PACKAGING_TYPE_LABELS,
  PACKAGING_TYPE_VALUES
} from '@/modules/production-orders/constants';
import type { DemandSource, MarketScope, PackagingType, ProductionUnitDTO } from '@/shared/types/domain';
import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AttachmentList, buildOrderMetaRows, OrderNotePanel } from './order-view';

interface ProductionOrderCreateFormProps {
  rawUnits: ProductionUnitDTO[];
  machineUnits: ProductionUnitDTO[];
}

interface FormState {
  orderDate: string;
  orderNo: string;
  customerName: string;
  orderQuantity: string;
  deadlineDate: string;
  finalProductName: string;
  totalPackagingQuantity: string;
  color: string;
  moldText: string;
  hasProspectus: boolean;
  marketScope: MarketScope;
  demandSource: DemandSource;
  packagingType: PackagingType;
  noteText: string;
  plannedRawUnitCode: string;
  plannedMachineUnitCode: string;
}

const NO_MACHINE_UNIT = '__none__';
const ATTACHMENT_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.doc,.docx,application/pdf,image/png,image/jpeg,image/webp,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function createInitialForm(rawUnits: ProductionUnitDTO[]): FormState {
  return {
    orderDate: todayIso(),
    orderNo: '',
    customerName: '',
    orderQuantity: '',
    deadlineDate: todayIso(),
    finalProductName: '',
    totalPackagingQuantity: '',
    color: '',
    moldText: '',
    hasProspectus: true,
    marketScope: 'ihracat',
    demandSource: 'numune',
    packagingType: 'kapsul',
    noteText: '',
    plannedRawUnitCode: rawUnits[0]?.code ?? '',
    plannedMachineUnitCode: ''
  };
}

export function ProductionOrderCreateForm({
  rawUnits,
  machineUnits
}: ProductionOrderCreateFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => createInitialForm(rawUnits));
  const [files, setFiles] = useState<File[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewOrder = useMemo(
    () => ({
      id: 'preview',
      orderDate: form.orderDate,
      orderNo: Number(form.orderNo || 0),
      customerName: form.customerName,
      orderQuantity: Number(form.orderQuantity || 0),
      deadlineDate: form.deadlineDate,
      finalProductName: form.finalProductName,
      totalPackagingQuantity: Number(form.totalPackagingQuantity || 0),
      color: form.color,
      moldText: form.moldText,
      hasProspectus: form.hasProspectus,
      marketScope: form.marketScope,
      demandSource: form.demandSource,
      packagingType: form.packagingType,
      noteText: form.noteText.trim() || null,
      plannedRawUnitCode: form.plannedRawUnitCode,
      plannedMachineUnitCode: form.plannedMachineUnitCode || null,
      status: 'active' as const,
      createdByUsername: '-',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: files.map((file, index) => ({
        id: `file-${index}`,
        originalFilename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        createdAt: new Date().toISOString(),
        uploadedByUsername: null
      })),
      dispatches: []
    }),
    [files, form]
  );

  function setField<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []));
  }

  function validateBeforePreview() {
    if (
      !form.orderDate ||
      !form.orderNo.trim() ||
      !form.customerName.trim() ||
      !form.orderQuantity.trim() ||
      !form.deadlineDate ||
      !form.finalProductName.trim() ||
      !form.totalPackagingQuantity.trim() ||
      !form.color.trim() ||
      !form.moldText.trim() ||
      !form.plannedRawUnitCode
    ) {
      setErrorMessage('Tüm zorunlu alanları doldurun.');
      return false;
    }

    setErrorMessage(null);
    return true;
  }

  async function createOrder() {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/production-orders', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          noteText: form.noteText.trim() || null,
          orderNo: Number(form.orderNo),
          orderQuantity: Number(form.orderQuantity),
          totalPackagingQuantity: Number(form.totalPackagingQuantity),
          plannedMachineUnitCode: form.plannedMachineUnitCode || null
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Üretim emri oluşturulamadı.');
        return;
      }

      const orderId = payload.item?.id as string | undefined;

      if (orderId && files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadResponse = await fetch(`/api/production-orders/${orderId}/attachments`, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
          });

          if (!uploadResponse.ok) {
            const uploadPayload = await uploadResponse.json().catch(() => ({}));
            setErrorMessage(uploadPayload.error?.message ?? 'Ek dosyalar yüklenemedi.');
            return;
          }
        }
      }

      setPreviewOpen(false);
      router.push('/production-orders');
      router.refresh();
    } catch {
      setErrorMessage('Sunucuya erişilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateBeforePreview()) {
      return;
    }

    setPreviewOpen(true);
  }

  return (
    <>
      <form className="space-y-6" onSubmit={handlePreview}>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="orderDate">İş Emri Tarihi</Label>
            <Input id="orderDate" type="date" value={form.orderDate} onChange={(event) => setField('orderDate', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orderNo">İş Emri No</Label>
            <Input id="orderNo" inputMode="numeric" value={form.orderNo} onChange={(event) => setField('orderNo', event.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerName">Müşteri Adı</Label>
            <Input id="customerName" value={form.customerName} onChange={(event) => setField('customerName', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orderQuantity">Sipariş Miktarı</Label>
            <Input id="orderQuantity" inputMode="numeric" value={form.orderQuantity} onChange={(event) => setField('orderQuantity', event.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadlineDate">Termin Tarihi</Label>
            <Input id="deadlineDate" type="date" value={form.deadlineDate} onChange={(event) => setField('deadlineDate', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finalProductName">Son Ürün Adı</Label>
            <Input id="finalProductName" value={form.finalProductName} onChange={(event) => setField('finalProductName', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalPackagingQuantity">Toplam Ambalaj Miktarı</Label>
            <Input id="totalPackagingQuantity" inputMode="numeric" value={form.totalPackagingQuantity} onChange={(event) => setField('totalPackagingQuantity', event.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Renk</Label>
            <Input id="color" value={form.color} onChange={(event) => setField('color', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="moldText">Kapsül/Tablet/Softjel Kalıbı</Label>
            <Input id="moldText" value={form.moldText} onChange={(event) => setField('moldText', event.target.value)} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Label>Prospektüs</Label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={form.hasProspectus ? 'default' : 'outline'} onClick={() => setField('hasProspectus', true)}>
                Var
              </Button>
              <Button type="button" variant={!form.hasProspectus ? 'default' : 'outline'} onClick={() => setField('hasProspectus', false)}>
                Yok
              </Button>
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Label>İhracat / İç Piyasa</Label>
            <div className="flex flex-wrap gap-2">
              {MARKET_SCOPE_VALUES.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={form.marketScope === value ? 'default' : 'outline'}
                  onClick={() => setField('marketScope', value)}
                >
                  {MARKET_SCOPE_LABELS[value]}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Label>Numune / Müşteri Talebi / Stok</Label>
            <div className="flex flex-wrap gap-2">
              {DEMAND_SOURCE_VALUES.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={form.demandSource === value ? 'default' : 'outline'}
                  onClick={() => setField('demandSource', value)}
                >
                  {DEMAND_SOURCE_LABELS[value]}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Label>Ambalaj Türü</Label>
            <div className="flex flex-wrap gap-2">
              {PACKAGING_TYPE_VALUES.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={form.packagingType === value ? 'default' : 'outline'}
                  onClick={() => setField('packagingType', value)}
                >
                  {PACKAGING_TYPE_LABELS[value]}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <Label htmlFor="noteText">Not</Label>
          <Textarea
            id="noteText"
            placeholder="Birimlerin görmesi gereken operasyon notunu buraya yazın."
            value={form.noteText}
            onChange={(event) => setField('noteText', event.target.value)}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3">
              <div className="text-sm font-semibold text-slate-950">Hammadde Hazırlama</div>
              <div className="mt-1 text-sm text-slate-600">İlk pending görev bu birimde açılır.</div>
            </div>
            <Select value={form.plannedRawUnitCode} onValueChange={(value) => setField('plannedRawUnitCode', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Birim seçin" />
              </SelectTrigger>
              <SelectContent>
                {rawUnits.map((unit) => (
                  <SelectItem key={unit.code} value={unit.code}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3">
              <div className="text-sm font-semibold text-slate-950">Makine Birimi</div>
              <div className="mt-1 text-sm text-slate-600">Seçilirse emir oluşturulurken aynı anda ilk makine görevi de açılır.</div>
            </div>
            <Select
              value={form.plannedMachineUnitCode || NO_MACHINE_UNIT}
              onValueChange={(value) =>
                setField('plannedMachineUnitCode', value === NO_MACHINE_UNIT ? '' : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seçilmedi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MACHINE_UNIT}>Seçilmedi</SelectItem>
                {machineUnits.map((unit) => (
                  <SelectItem key={unit.code} value={unit.code}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3">
              <div className="text-sm font-semibold text-slate-950">Dosya Ekle</div>
              <div className="mt-1 text-sm text-slate-600">PDF, görsel, Word ve Excel dosyaları yükleyebilirsiniz.</div>
            </div>
            <Input type="file" multiple accept={ATTACHMENT_ACCEPT} onChange={handleFileChange} />
            {files.length > 0 ? (
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {files.map((file) => (
                  <div key={`${file.name}-${file.size}`}>{file.name}</div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="submit">Önizle</Button>
        </div>
      </form>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Üretim Emri Önizleme</DialogTitle>
            <DialogDescription>Bilgileri kontrol edin. Onay sonrası emir oluşturulacak ve ek dosyalar yüklenecek.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {buildOrderMetaRows(previewOrder).map((row) => (
                <div key={row.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{row.label}</div>
                  <div className="mt-1 text-sm text-slate-900">{row.value}</div>
                </div>
              ))}
            </div>

            <OrderNotePanel order={previewOrder} />

            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-950">Ek Dosyalar</h3>
              <AttachmentList order={previewOrder} canDownload={false} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
              Geri Dön
            </Button>
            <Button type="button" onClick={() => void createOrder()} disabled={submitting}>
              {submitting ? 'Oluşturuluyor' : 'Emri Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
