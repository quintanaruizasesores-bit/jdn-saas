import type { SupabaseClient } from '@supabase/supabase-js';

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
  return supabase.from('v_produccion_mensual').select('*').order('mes', { ascending: true });
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

export async function fetchSiniestrosPorResponsabilidad(supabase: SupabaseClient) {
  return supabase.from('v_siniestros_por_responsabilidad').select('*');
}
