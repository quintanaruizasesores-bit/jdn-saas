'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function RenewalAlertsBanner() {
  const { data } = useQuery({
    queryKey: ['renewal-alerts-banner'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: rows } = await supabase
        .from('v_renovaciones_proximas')
        .select('*')
        .lte('dias_restantes', 15)
        .order('fecha_fin', { ascending: true })
        .limit(5);
      return (rows ?? []) as import('@/types/database').RenovacionProxima[];
    },
  });

  if (!data?.length) return null;

  return (
    <div className="mb-4 rounded-[3px] border border-amber/40 bg-amber/8 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber">
        Renovaciones próximas ({data.length})
      </p>
      <ul className="mt-2 space-y-1 text-xs text-ink-dim">
        {data.map((r) => (
          <li key={r.poliza_id}>
            <Link href={`/polizas/${r.poliza_id}`} className="hover:text-amber">
              {r.cliente_nombre} — {r.numero_poliza} vence en {r.dias_restantes} días
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
