'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { restablecerContrasenaAction } from './actions';

export function NuevaContrasenaForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(
    restablecerContrasenaAction.bind(null, userId),
    { error: '' }
  );

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p role="alert" className="text-red text-sm">
          {state.error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-describedby="password-requisitos"
          minLength={8}
          required
        />
        <p id="password-requisitos" className="text-ink-dim text-xs">
          Usá al menos 8 caracteres.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Repetí la nueva contraseña</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar contraseña'}
      </Button>
    </form>
  );
}
