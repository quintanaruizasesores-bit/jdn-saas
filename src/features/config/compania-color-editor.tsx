'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CompaniaBadge } from '@/components/ui/compania-badge';
import { getCompaniaColor } from '@/lib/companias/colores';
import { createClient } from '@/lib/supabase/client';
import { updateCompaniaColor } from '@/services/companias.service';

export function CompaniaColorEditor({
  compania,
}: {
  compania: { id: string; nombre: string; color?: string | null };
}) {
  const qc = useQueryClient();
  const guardado = getCompaniaColor(compania.nombre, compania.color).accent;
  const [color, setColor] = useState(guardado);
  useEffect(() => setColor(guardado), [guardado]);
  const mutation = useMutation({
    mutationFn: (value: string | null) =>
      updateCompaniaColor(createClient(), compania.id, value),
    onSuccess: async (saved) => {
      qc.setQueryData<Record<string, unknown>[]>(['companias'], (prev) =>
        prev?.map((c) =>
          c.id === compania.id ? { ...c, color: saved.color } : c
        )
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['companias'] }),
        qc.invalidateQueries({ queryKey: ['polizas'] }),
        qc.invalidateQueries({ queryKey: ['poliza'] }),
        qc.invalidateQueries({ queryKey: ['dashboard-compania'] }),
      ]);
      toast.success('Color de compañía guardado');
    },
    onError: () => toast.error('No se pudo guardar el color de la compañía'),
  });

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1 basis-40">
        <CompaniaBadge nombre={compania.nombre} color={color} />
      </div>
      <label className="text-ink-dim inline-flex items-center gap-2 text-xs">
        <span>Color</span>
        <input
          type="color"
          aria-label={`Color de ${compania.nombre}`}
          value={color}
          onChange={(e) => setColor(e.target.value.toUpperCase())}
          disabled={mutation.isPending}
          className="border-line bg-panel h-9 w-11 cursor-pointer rounded-lg border p-1"
        />
      </label>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => mutation.mutate(color)}
        disabled={mutation.isPending || color === guardado}
        aria-label={`Guardar color de ${compania.nombre}`}
      >
        Guardar
      </Button>
      {compania.color && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => mutation.mutate(null)}
          disabled={mutation.isPending}
          aria-label={`Restablecer color de ${compania.nombre}`}
        >
          Restablecer
        </Button>
      )}
    </div>
  );
}
