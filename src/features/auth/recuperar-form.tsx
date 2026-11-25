'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { recoverAction } from './actions';

export function RecuperarForm() {
  const [state, action, pending] = useActionState(recoverAction, {});

  if (state.success) {
    return (
      <p role="status" className="text-green text-sm">
        Si el email está registrado, te va a llegar un enlace. Abrilo en este
        mismo navegador.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p role="alert" className="text-red text-sm">
          {state.error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Solicitando enlace…' : 'Enviar enlace'}
      </Button>
    </form>
  );
}
