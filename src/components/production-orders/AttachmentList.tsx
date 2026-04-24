'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { ProductionOrderListItemDTO } from '@/shared/types/domain';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AttachmentListFallback } from './order-view';

function isPreviewableAttachment(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function getAttachmentPreviewLabel(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return 'Görsel önizleme';
  }

  return 'Ek dosya önizleme';
}

function AttachmentPreviewDialog({
  open,
  onOpenChange,
  orderId,
  attachment
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  attachment: ProductionOrderListItemDTO['attachments'][number] | null;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (!open || !attachment || !isPreviewableAttachment(attachment.mimeType)) {
      setBlobUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      setStatus('idle');
      return;
    }

    let disposed = false;
    setStatus('loading');

    void fetch(`/api/production-orders/${orderId}/attachments/${attachment.id}`, {
      credentials: 'same-origin'
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('preview-failed');
        }

        return response.blob();
      })
      .then((blob) => {
        if (disposed) {
          return;
        }

        const nextUrl = URL.createObjectURL(blob);
        setBlobUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return nextUrl;
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!disposed) {
          setStatus('error');
        }
      });

    return () => {
      disposed = true;
    };
  }, [attachment, open, orderId]);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{attachment?.originalFilename ?? 'Ek Dosya'}</DialogTitle>
          <DialogDescription>
            {attachment
              ? `${Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB • ${getAttachmentPreviewLabel(attachment.mimeType)}`
              : 'Ek dosya önizlemesi'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[360px] overflow-hidden rounded-md border border-slate-300 bg-slate-50">
          {status === 'loading' ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-500">
              Önizleme hazırlanıyor...
            </div>
          ) : status === 'error' || !blobUrl ? (
            <div className="flex min-h-[360px] items-center justify-center px-6 text-center text-sm text-slate-500">
              Önizleme açılamadı. Dosyayı indirerek görüntüleyebilirsiniz.
            </div>
          ) : attachment?.mimeType.startsWith('image/') ? (
            <div className="flex min-h-[360px] items-center justify-center bg-white p-4">
              <img
                src={blobUrl}
                alt={attachment.originalFilename}
                className="max-h-[65vh] max-w-full rounded-md object-contain"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          {attachment ? (
            <Button asChild type="button">
              <Link href={`/api/production-orders/${orderId}/attachments/${attachment.id}?download=1`}>İndir</Link>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AttachmentList({
  order,
  canDownload
}: {
  order: ProductionOrderListItemDTO;
  canDownload: boolean;
}) {
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | null>(null);

  if (order.attachments.length === 0) {
    return <AttachmentListFallback order={order} />;
  }

  const previewAttachment =
    order.attachments.find((attachment) => attachment.id === previewAttachmentId) ?? null;

  return (
    <>
      <div className="space-y-2">
        {order.attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex flex-col gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="text-sm font-medium text-slate-900">{attachment.originalFilename}</div>
              <div className="mt-1 text-xs text-slate-500">
                {Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB • {attachment.mimeType} •{' '}
                {new Date(attachment.createdAt).toLocaleString('tr-TR')}
              </div>
            </div>
            {canDownload ? (
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPreviewAttachmentId(attachment.id)}>
                  Aç
                </Button>
                <Button asChild type="button" size="sm">
                  <Link href={`/api/production-orders/${order.id}/attachments/${attachment.id}?download=1`}>
                    İndir
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <AttachmentPreviewDialog
        open={Boolean(previewAttachment)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachmentId(null);
          }
        }}
        orderId={order.id}
        attachment={previewAttachment}
      />
    </>
  );
}
