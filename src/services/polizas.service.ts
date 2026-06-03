import type { Poliza } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PolizaFormData } from '@/validations/poliza.schema';
import { logActividad } from './actividad.service';

export interface PolizasFilters {
  search?: string;
  compania_id?: string;
  ramo_id?: string;
  estado?: string;
  con_prima?: 'con' | 'sin';
  page?: number;
  pageSize?: number;
}

export async function fetchPolizas(supabase: SupabaseClient, filters: PolizasFilters = {}) {
  const { search, compania_id, ramo_id, estado, con_prima, page = 0, pageSize = 50 } = filters;

  let query = supabase
    .from('polizas')
    .select(
      `*, cliente:clientes(id, nombre, apellido, email, telefono), compania:companias(id, nombre), ramo:ramos(id, nombre)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (compania_id) query = query.eq('compania_id', compania_id);
  if (ramo_id) query = query.eq('ramo_id', ramo_id);
  if (estado) query = query.eq('estado', estado);
  if (con_prima === 'con') query = query.gt('prima', 0);
  if (con_prima === 'sin') query = query.eq('prima', 0);

  const result = await query;
  if (result.error) return result;

  if (search && result.data) {
    const s = search.toLowerCase();
    result.data = result.data.filter((p) => {
      const c = p.cliente as { nombre: string; apellido: string } | null;
      const nombre = c ? `${c.nombre} ${c.apellido}`.toLowerCase() : '';
      return (
        nombre.includes(s) ||
        (p.detalle?.toLowerCase().includes(s) ?? false) ||
        (p.numero_poliza?.toLowerCase().includes(s) ?? false)
      );
    });
  }

  return result;
}

export async function fetchPolizaById(supabase: SupabaseClient, id: string) {
  return supabase
    .from('polizas')
    .select(`*, cliente:clientes(*), compania:companias(*), ramo:ramos(*)`)
    .eq('id', id)
    .single();
}

export async function fetchPolizasByCliente(supabase: SupabaseClient, clienteId: string) {
  return supabase
    .from('polizas')
    .select(`*, compania:companias(nombre), ramo:ramos(nombre)`)
    .eq('cliente_id', clienteId)
    .order('fecha_inicio', { ascending: false });
}

export async function fetchPolizaHistorial(supabase: SupabaseClient, polizaId: string) {
  return supabase
    .from('poliza_historial')
    .select('*')
    .eq('poliza_id', polizaId)
    .order('created_at', { ascending: false });
}

export async function createPoliza(supabase: SupabaseClient, data: PolizaFormData) {
  const { data: row, error } = await supabase.from('polizas').insert(data).select().single();
  if (error) throw error;
  await logActividad(supabase, 'CREAR', 'POLIZA', row.id);
  return row as Poliza;
}

export async function updatePoliza(supabase: SupabaseClient, id: string, data: Partial<PolizaFormData>) {
  const { data: row, error } = await supabase.from('polizas').update(data).eq('id', id).select().single();
  if (error) throw error;
  await logActividad(supabase, 'ACTUALIZAR', 'POLIZA', id);
  return row as Poliza;
}

export async function renovarPoliza(
  supabase: SupabaseClient,
  id: string,
  data: { fecha_inicio: string; fecha_fin: string; prima: number }
) {
  return updatePoliza(supabase, id, {
    ...data,
    estado: 'VIGENTE',
  });
}

export async function darBajaPoliza(supabase: SupabaseClient, id: string) {
  return updatePoliza(supabase, id, { estado: 'BAJA' });
}
