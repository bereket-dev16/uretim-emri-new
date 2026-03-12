import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Depo/Stok Yönetimi',
  description: 'LAN ortamı için performans odaklı depo ve stok yönetimi uygulaması.'
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
