'use client';

import { useState } from 'react';
import Link from 'next/link';
import { recoverAction } from '@/features/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RecuperarPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await recoverAction(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <>
      <h2 className="mb-6 font-serif text-xl">Recuperar contraseña</h2>
      {success ? (
        <p className="text-sm text-green">
          Revisá tu email para restablecer la contraseña.
        </p>
      ) : (
        <form action={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            Enviar enlace
          </Button>
        </form>
      )}
      <Link href="/login" className="mt-4 block text-center text-xs text-ink-faint hover:text-amber">
        Volver al login
      </Link>
    </>
  );
}
