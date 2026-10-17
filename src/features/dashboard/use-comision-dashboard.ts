'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { fetchComisionMensual } from '@/services/dashboard.service';
import { createClient } from '@/lib/supabase/client';
import { periodoComision } from '@/lib/dashboard/comision';

export function useComisionDashboard() {
  return useQuery({
    queryKey: ['dashboard-comision', periodoComision().hoy],
    queryFn: () => fetchComisionMensual(createClient()),
  });
}

export async function invalidarMetricasPolizas(client: QueryClient) {
  await Promise.all([
    client.invalidateQueries({ queryKey: ['dashboard-comision'] }),
    client.invalidateQueries({ queryKey: ['dashboard-kpis'] }),
    client.invalidateQueries({ queryKey: ['polizas'] }),
    client.invalidateQueries({ queryKey: ['poliza'] }),
    client.invalidateQueries({ queryKey: ['poliza-historial'] }),
  ]);
}
