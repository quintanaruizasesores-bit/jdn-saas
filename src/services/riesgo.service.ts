import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateRiskScore } from '@/lib/riesgo/calculate-risk-score';
import type { Siniestro } from '@/types/database';

export async function fetchClientRiskRanking(supabase: SupabaseClient) {
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nombre, apellido')
    .is('deleted_at', null);

  if (!clientes?.length) return [];

  const results = await Promise.all(
    clientes.map(async (c) => {
      const [{ count: polizasCount }, { data: siniestros }] = await Promise.all([
        supabase
          .from('polizas')
          .select('*', { count: 'exact', head: true })
          .eq('cliente_id', c.id),
        supabase
          .from('siniestros')
          .select('tipo, responsabilidad, monto_estimado')
          .eq('cliente_id', c.id),
      ]);

      const sinList = (siniestros ?? []) as Pick<
        Siniestro,
        'tipo' | 'responsabilidad' | 'monto_estimado'
      >[];
      const risk = calculateRiskScore({
        siniestros: sinList,
        totalPolizas: polizasCount ?? 0,
      });

      return {
        cliente_id: c.id,
        cliente_nombre: `${c.nombre} ${c.apellido}`.trim(),
        polizas_count: polizasCount ?? 0,
        siniestros_count: sinList.length,
        ...risk,
      };
    })
  );

  return results
    .filter((r) => r.siniestros_count > 0 || r.score > 0)
    .sort((a, b) => b.score - a.score);
}

export async function fetchClienteRisk(supabase: SupabaseClient, clienteId: string) {
  const [{ count: polizasCount }, { data: siniestros }] = await Promise.all([
    supabase
      .from('polizas')
      .select('*', { count: 'exact', head: true })
      .eq('cliente_id', clienteId),
    supabase
      .from('siniestros')
      .select('tipo, responsabilidad, monto_estimado')
      .eq('cliente_id', clienteId),
  ]);

  const sinList = (siniestros ?? []) as Pick<Siniestro, 'tipo' | 'responsabilidad' | 'monto_estimado'>[];
  return calculateRiskScore({
    siniestros: sinList,
    totalPolizas: polizasCount ?? 0,
  });
}
