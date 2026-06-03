'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set('redirect', redirect);
    const result = await loginAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red">{error}</p>}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Ingresando…' : 'Ingresar'}
      </Button>
      <div className="flex justify-between text-xs text-ink-faint">
        <Link href="/recuperar" className="hover:text-amber">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link href="/register" className="hover:text-amber">
          Registrarse
        </Link>
      </div>
    </form>
  );
}
