'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleLogout} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Çıkış
    </Button>
  );
}
