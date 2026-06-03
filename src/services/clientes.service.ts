import type { Cliente } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClienteFormData } from '@/validations/cliente.schema';
import { logActividad } from './actividad.service';

export interface ClientesFilters {
  search?: string;
  provincia?: string;
  localidad?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchClientes(supabase: SupabaseClient, filters: ClientesFilters = {}) {
  const { search, provincia, localidad, page = 0, pageSize = 50 } = filters;
  let query = supabase
    .from('clientes')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('apellido')
    .order('nombre')
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (search) {
    query = query.or(
      `nombre.ilike.%${search}%,apellido.ilike.%${search}%,dni.ilike.%${search}%,email.ilike.%${search}%`
    );
  }
  if (provincia) query = query.eq('provincia', provincia);
  if (localidad) query = query.eq('localidad', localidad);

  const result = await query;
  return {
    ...result,
    data: (result.data ?? null) as Cliente[] | null,
  };
}

export async function fetchClienteById(supabase: SupabaseClient, id: string) {
  return supabase.from('clientes').select('*').eq('id', id).single();
}

export async function createCliente(supabase: SupabaseClient, data: ClienteFormData) {
  const { data: row, error } = await supabase.from('clientes').insert(data).select().single();
  if (error) throw error;
  await logActividad(supabase, 'CREAR', 'CLIENTE', row.id);
  return row as Cliente;
}

export async function updateCliente(supabase: SupabaseClient, id: string, data: ClienteFormData) {
  const { data: row, error } = await supabase.from('clientes').update(data).eq('id', id).select().single();
  if (error) throw error;
  await logActividad(supabase, 'ACTUALIZAR', 'CLIENTE', id);
  return row as Cliente;
}

export async function softDeleteCliente(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('clientes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await logActividad(supabase, 'BAJA_LOGICA', 'CLIENTE', id);
}
