import type { SupabaseClient } from '@supabase/supabase-js';
import {
  calcularComisionMensual,
  type PolizaComision,
  type HistorialComision,
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

/** Se trae toda la cartera: una póliza anterior a la ventana puede seguir aportando. */
export async function fetchComisionMensual(
  supabase: SupabaseClient,
  now = new Date()
) {
  const polizas: PolizaComision[] = [];
  const historial: HistorialComision[] = [];
  const pageSize = 1000;

  // Evita truncar el cálculo al límite por defecto de Supabase.
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('polizas')
      .select('*')
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    polizas.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('poliza_historial')
      .select('*')
      .lte('created_at', now.toISOString())
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    historial.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return calcularComisionMensual(polizas, now, historial);
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
