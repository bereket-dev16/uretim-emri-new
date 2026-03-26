import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Üretim Emri Sistemi',
  description: 'Üretim emri oluşturma, sevk ve birim tamamlama akışı için iç operasyon uygulaması.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
