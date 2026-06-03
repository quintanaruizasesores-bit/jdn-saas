'use client';

import { useState } from 'react';
import Link from 'next/link';
import { registerAction } from '@/features/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await registerAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="mb-6 font-serif text-xl">Crear cuenta</h2>
      <form action={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" required minLength={8} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creando…' : 'Registrarse'}
        </Button>
        <Link href="/login" className="block text-center text-xs text-ink-faint hover:text-amber">
          Ya tengo cuenta
        </Link>
      </form>
    </>
  );
}
