'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDefaultHomePathForRole } from '@/shared/security/role-home';
import type { Role } from '@/shared/types/domain';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error?.message ?? 'Giriş yapılamadı.');
        return;
      }

      const nextPath = getDefaultHomePathForRole((payload.session?.role as Role | undefined) ?? 'admin');
      router.push(nextPath);
      router.refresh();
    } catch {
      setError('Sunucuya erişilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md rounded-[24px] border-slate-200 shadow-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-[1.9rem] font-semibold text-slate-950">Giriş Yap</CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600">
          Kullanıcı adı ve şifrenizi girerek devam edin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">Kullanıcı Adı</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="kullanici"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••"
              required
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Giriş yapılıyor' : 'Giriş Yap'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
