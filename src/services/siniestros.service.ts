import type { Siniestro } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SiniestroFormData } from '@/validations/siniestro.schema';
import { logActividad } from './actividad.service';

export async function fetchSiniestros(supabase: SupabaseClient, filters: { cliente_id?: string; page?: number; pageSize?: number } = {}) {
  const { cliente_id, page = 0, pageSize = 50 } = filters;
  let query = supabase
    .from('siniestros')
    .select(`*, cliente:clientes(id, nombre, apellido), poliza:polizas(numero_poliza, detalle)`, { count: 'exact' })
    .order('fecha', { ascending: false, nullsFirst: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (cliente_id) query = query.eq('cliente_id', cliente_id);
  return query;
}

export async function fetchSiniestrosByCliente(supabase: SupabaseClient, clienteId: string) {
  return supabase
    .from('siniestros')
    .select(`*, poliza:polizas(numero_poliza, detalle, compania:companias(nombre))`)
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: false });
}

export async function createSiniestro(supabase: SupabaseClient, data: SiniestroFormData) {
  const { data: row, error } = await supabase.from('siniestros').insert(data).select().single();
  if (error) throw error;
  await logActividad(supabase, 'CREAR', 'SINIESTRO', row.id);
  return row as Siniestro;
}

export async function updateSiniestro(supabase: SupabaseClient, id: string, data: Partial<SiniestroFormData>) {
  const { data: row, error } = await supabase.from('siniestros').update(data).eq('id', id).select().single();
  if (error) throw error;
  await logActividad(supabase, 'ACTUALIZAR', 'SINIESTRO', id);
  return row as Siniestro;
}

export async function deleteSiniestro(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('siniestros').delete().eq('id', id);
  if (error) throw error;
  await logActividad(supabase, 'ELIMINAR', 'SINIESTRO', id);
}
