'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { EmptyState } from '@/components/ui/empty-state';
import { fetchEventosRecientes } from '@/services/crosssell.service';

const TIPO_LABEL: Record<string, string> = {
  ESTADO_CAMBIADO: 'Cambio de estado',
  EXCLUIDO: 'Cliente excluido',
  CORREO_PREPARADO: 'Correo preparado',
  CORREO_ENVIADO: 'Correo enviado',
};

export function HistorialPanel() {
  const clientesQuery = useQuery({
    queryKey: ['crosssell', 'clientes-min'],
    queryFn: async () => {
      const { data } = await createClient()
        .from('clientes')
        .select('id, nombre, apellido');
      return (data ?? []) as { id: string; nombre: string; apellido: string }[];
    },
  });
  const eventosQuery = useQuery({
    queryKey: ['crosssell', 'eventos-recientes'],
    queryFn: () => fetchEventosRecientes(createClient()),
  });

  const nombres = new Map(
    (clientesQuery.data ?? []).map((c) => [
      c.id,
      `${c.apellido} ${c.nombre}`.trim(),
    ])
  );
  const eventos = eventosQuery.data ?? [];

  if (eventos.length === 0)
    return (
      <EmptyState
        title="Sin actividad todavía"
        description="Acá vas a ver el historial comercial: contactos, correos y cambios de estado."
      />
    );

  return (
    <ul className="divide-line border-line divide-y rounded-xl border">
      {eventos.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
        >
          <div className="min-w-0">
            <span className="text-ink font-medium">
              {nombres.get(e.cliente_id) ?? 'Cliente'}
            </span>
            <span className="text-ink-dim ml-2 text-xs">
              {TIPO_LABEL[e.tipo] ?? e.tipo}
              {typeof e.detalle?.asunto === 'string'
                ? ` · ${e.detalle.asunto}`
                : ''}
            </span>
          </div>
          <span className="text-ink-faint shrink-0 text-xs">
            {new Date(e.created_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}
