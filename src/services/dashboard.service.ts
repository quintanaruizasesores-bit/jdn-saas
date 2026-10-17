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
  const polizas: (PolizaComision & {
    detalle?: string | null;
    cliente?: { nombre: string; apellido: string } | null;
    compania?: { nombre: string; color?: string | null } | null;
  })[] = [];
  const historial: HistorialComision[] = [];
  const pageSize = 1000;

  // Evita truncar el cálculo al límite por defecto de Supabase.
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('polizas')
      .select('*, cliente:clientes(nombre, apellido), compania:companias(*)')
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

  const calculo = calcularComisionMensual(polizas, now, historial);
  const porId = new Map(polizas.map((p) => [p.id, p]));
  return {
    ...calculo,
    pendientes: calculo.pendientes.map((pendiente) => {
      const poliza = porId.get(pendiente.polizaId)!;
      return {
        ...pendiente,
        cliente: poliza.cliente ?? null,
        compania: poliza.compania ?? null,
        detalle: poliza.detalle ?? null,
      };
    }),
  };
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
