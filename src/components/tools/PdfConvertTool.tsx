'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildPdfFilename, OFFICE_TO_PDF_ACCEPT } from '@/shared/pdf-converter/client';

export function PdfConvertTool() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const pdfFilename = useMemo(() => (file ? buildPdfFilename(file.name) : 'donusturulmus-dosya.pdf'), [file]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setErrorMessage('Önce Word veya Excel dosyası seçin.');
      return;
    }

    setBusy(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/tools/pdf-convert', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setErrorMessage(payload?.error?.message ?? 'Dosya PDF formatına dönüştürülemedi.');
        return;
      }

      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);

      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return nextUrl;
      });
    } catch {
      setErrorMessage('PDF dönüştürme servisine ulaşılamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-950">Word / Excel Yükle</div>
          <div className="mb-3 text-sm leading-6 text-slate-600">
            Bu araç yüklediğiniz dosyayı geçici olarak PDF'e çevirir. Dönüştürülen dosya kaydedilmez; PDF'i indirip sonra üretim emrine eklemeniz gerekir.
          </div>
          <Input
            type="file"
            accept={OFFICE_TO_PDF_ACCEPT}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="mt-3 text-sm text-slate-600">
              Seçilen dosya: <span className="font-medium text-slate-900">{file.name}</span>
            </div>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">Desteklenen dosyalar: DOC, DOCX, XLS, XLSX</div>
          <Button type="submit" disabled={busy || !file}>
            {busy ? 'PDF oluşturuluyor' : "PDF'e Çevir"}
          </Button>
        </div>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-950">PDF Önizleme</div>
            <div className="mt-1 text-sm text-slate-600">
              Dönüştürme tamamlandığında burada PDF çıktısını göreceksiniz.
            </div>
          </div>
          {previewUrl ? (
            <Button asChild type="button">
              <a href={previewUrl} download={pdfFilename}>
                PDF İndir
              </a>
            </Button>
          ) : null}
        </div>

        {previewUrl ? (
          <iframe
            title="PDF Önizleme"
            src={previewUrl}
            className="h-[70vh] w-full rounded-lg border border-slate-200 bg-slate-50"
          />
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
            Henüz önizlenecek PDF yok. Önce Word veya Excel dosyasını seçip PDF'e çevirin.
          </div>
        )}
      </section>
    </div>
  );
}
