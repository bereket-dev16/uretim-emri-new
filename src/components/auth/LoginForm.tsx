'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Role } from '@/shared/types/domain';
import { getDefaultHomePathForRole } from '@/shared/security/role-home';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message ?? 'Giriş başarısız.');
        return;
      }

      const nextPath = getDefaultHomePathForRole((data.session?.role as Role | undefined) ?? 'admin');
      router.push(nextPath);
      router.refresh();
    } catch {
      setError('Sunucuya erişilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="ops-panel w-full rounded-[28px] border-foreground bg-card shadow-[10px_10px_0_#161616]">
      <CardHeader className="space-y-3 px-6 pb-2 sm:px-8 sm:pt-8">
        <div className="ops-kicker w-fit">Giris</div>
        <div className="space-y-2">
          <CardTitle className="text-[2.2rem] font-black tracking-[-0.06em] text-foreground">Panele giris yap</CardTitle>
          <CardDescription className="max-w-sm text-base font-medium leading-7 text-muted-foreground">
            Kullanici adi ve sifrenizle devam edin.
          </CardDescription>
        </div>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-5 px-6 sm:px-8">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-foreground">
              Kullanici adi
            </Label>
            <Input
              id="username"
              name="username"
              placeholder="admin"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="min-h-12 rounded-[18px] bg-[#fff7e6] px-4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Sifre
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="min-h-12 rounded-[18px] bg-[#fff7e6] px-4"
            />
          </div>

          {error && (
            <div className="rounded-[18px] border-[3px] border-foreground bg-[#ffd7d7] p-3 text-sm font-bold text-destructive shadow-[4px_4px_0_#161616]">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
          <Button
            type="submit"
            className="min-h-12 w-full rounded-[18px] text-sm font-black"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Giris yapiliyor...
              </>
            ) : (
              <>
                Giris Yap
                <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
