import type { SupabaseClient } from '@supabase/supabase-js';
import {
  calcularComisionMensual,
  periodoComision,
  type PolizaComision,
} from '@/lib/dashboard/comision';

export async function fetchDashboardKpis(supabase: SupabaseClient) {
  return supabase.from('v_dashboard_kpis').select('*').single();
}

export async function fetchPolizasPorCompania(supabase: SupabaseClient) {
  return supabase.from('v_polizas_por_compania').select('*').limit(10);
}

export async function fetchPolizasPorRamo(supabase: SupabaseClient) {
  return supabase.from('v_polizas_por_ramo').select('*');
}

export async function fetchProduccionMensual(supabase: SupabaseClient) {
  return supabase
    .from('v_produccion_mensual')
    .select('*')
    .order('mes', { ascending: true });
}

/** Consulta independiente de la vista legacy que recurre a created_at sin vigencia. */
export async function fetchComisionMensual(
  supabase: SupabaseClient,
  now = new Date()
) {
  const { desde, hoy } = periodoComision(now);
  const polizas: PolizaComision[] = [];
  const pageSize = 1000;

  // Evita truncar el cálculo al límite por defecto de Supabase.
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('polizas')
      .select('fecha_inicio, prima')
      .gte('fecha_inicio', desde)
      .lte('fecha_inicio', hoy)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    polizas.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return calcularComisionMensual(polizas, now);
}

export async function fetchClientesTop(supabase: SupabaseClient) {
  return supabase.from('v_clientes_top').select('*').limit(10);
}

export async function fetchRenovacionesProximas(supabase: SupabaseClient) {
  return supabase.from('v_renovaciones_proximas').select('*');
}

export async function fetchSiniestrosPorTipo(supabase: SupabaseClient) {
  return supabase.from('v_siniestros_por_tipo').select('*');
}

export async function fetchSiniestrosPorResponsabilidad(
  supabase: SupabaseClient
) {
  return supabase.from('v_siniestros_por_responsabilidad').select('*');
}
