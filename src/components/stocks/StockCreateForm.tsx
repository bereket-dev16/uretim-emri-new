'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

import {
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPE_VALUES
} from '@/modules/stocks/constants';
import type { ProductCategory, ProductType } from '@/shared/types/domain';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface StockCreateFormProps {
  canCreate: boolean;
}

interface FormState {
  irsaliyeNo: string;
  productName: string;
  quantityNumeric: string;
  quantityUnit: 'gr' | 'adet';
  productType: ProductType;
  stockEntryDate: string;
  productCategory: ProductCategory;
}

const INITIAL_FORM: FormState = {
  irsaliyeNo: '',
  productName: '',
  quantityNumeric: '',
  quantityUnit: 'adet',
  productType: 'kutu',
  stockEntryDate: new Date().toISOString().slice(0, 10),
  productCategory: 'hammadde'
};

export function StockCreateForm({ canCreate }: StockCreateFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/stocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          quantityNumeric: Number(form.quantityNumeric)
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error?.message ?? 'Stok kaydı oluşturulamadı.');
        return;
      }

      const barcode = payload.item?.barcodeNo;
      const warning = payload.warning ? ` (${payload.warning})` : '';

      setSuccessMessage(`Stok kaydı başarıyla oluşturuldu. Barkod: ${barcode}${warning}`);
      setForm(INITIAL_FORM);
      router.refresh();
    } catch {
      setError('Sunucuya erişilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div>
        {!canCreate ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            Bu işlem için yetkiniz bulunmuyor.
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="irsaliyeNo">Gelen İrsaliye No</Label>
              <Input
                id="irsaliyeNo"
                aria-label="Gelen irsaliye no"
                placeholder="Örn: IRS-2023-001"
                required
                value={form.irsaliyeNo}
                onChange={(event) => setForm({ ...form, irsaliyeNo: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName">Malzeme / Hammadde Adı</Label>
              <Input
                id="productName"
                aria-label="Sarf malzeme veya hammadde adı"
                placeholder="Örn: Parasetamol"
                required
                value={form.productName}
                onChange={(event) => setForm({ ...form, productName: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantityNumeric">Miktar ve Birim</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="quantityNumeric"
                  aria-label="Sarf malzeme veya hammadde miktarı"
                  required
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="0.00"
                  value={form.quantityNumeric}
                  onChange={(event) => setForm({ ...form, quantityNumeric: event.target.value })}
                />
                <Select
                  value={form.quantityUnit}
                  onValueChange={(value) => setForm({ ...form, quantityUnit: value as FormState['quantityUnit'] })}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adet">adet</SelectItem>
                    <SelectItem value="gr">gr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productType">Ürün Tipi</Label>
              <Select
                value={form.productType}
                onValueChange={(value) => setForm({ ...form, productType: value as FormState['productType'] })}
              >
                <SelectTrigger id="productType">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockEntryDate">Stok Giriş Tarihi</Label>
              <Input
                id="stockEntryDate"
                aria-label="Stok giriş tarihi"
                required
                type="date"
                value={form.stockEntryDate}
                onChange={(event) => setForm({ ...form, stockEntryDate: event.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Kategori</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: 'hammadde' as const, label: 'Hammadde' },
                  { value: 'sarf' as const, label: 'Sarf malzemesi' }
                ].map((option) => {
                  const isSelected = form.productCategory === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm({ ...form, productCategory: option.value })}
                      className={[
                        'flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                        isSelected
                          ? 'border-primary/30 bg-sky-50 text-foreground'
                          : 'border-border/70 bg-slate-50 text-muted-foreground hover:bg-slate-100'
                      ].join(' ')}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      <Checkbox
                        checked={isSelected}
                        aria-label={`${option.label} kategori seçimi`}
                        className="pointer-events-none"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error ? (
            <div className="p-3 bg-destructive/10 text-destructive text-sm font-medium rounded-md border border-destructive/20">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Kaydı tamamladığınızda barkod otomatik oluşur.
            </p>
            <Button
              className="w-full md:w-auto"
              disabled={!canCreate || isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Oluşturuluyor...' : 'Kaydı oluştur'}
            </Button>
          </div>
        </form>
      </div>

      <Dialog open={Boolean(successMessage)} onOpenChange={() => setSuccessMessage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              İşlem Başarılı
            </DialogTitle>
            <DialogDescription className="pt-2 text-base">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end mt-4">
            <Button type="button" onClick={() => setSuccessMessage(null)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
