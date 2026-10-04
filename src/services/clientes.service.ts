import type { Cliente } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClienteFormData } from '@/validations/cliente.schema';
import { buildClienteSearchFilters } from '@/lib/clientes/search';
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
    // Un grupo .or() por token → PostgREST los combina con AND (ver search.ts).
    for (const filter of buildClienteSearchFilters(search)) {
      query = query.or(filter);
    }
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

/**
 * fecha_nacimiento es una columna DATE opcional: un '' llegado del form rompe
 * Postgres (invalid input syntax for type date). Convertimos '' (o undefined) a
 * null, pero SOLO si la clave está presente, para no pisar el valor en updates
 * parciales.
 */
function normalizeClienteDates(data: Partial<ClienteFormData>): Partial<ClienteFormData> {
  const out: Partial<ClienteFormData> = { ...data };
  if ('fecha_nacimiento' in out && !out.fecha_nacimiento) out.fecha_nacimiento = null;
  return out;
}

/**
 * Un mismo DNI / CUIT no puede repetirse entre clientes activos. Se valida en la
 * app (no hay constraint única en la base) para dar un mensaje claro y no romper
 * por duplicados preexistentes. No hace nada si el DNI viene vacío/null.
 * `excludeId` evita que un cliente colisione consigo mismo al editar.
 */
export async function assertDniUnico(supabase: SupabaseClient, dni?: string | null, excludeId?: string) {
  const value = dni?.trim();
  if (!value) return;
  let query = supabase.from('clientes').select('id').eq('dni', value).is('deleted_at', null).limit(1);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw error;
  if (data && data.length > 0) throw new Error('Ya existe un cliente con ese DNI / CUIT');
}

export async function createCliente(supabase: SupabaseClient, data: ClienteFormData) {
  await assertDniUnico(supabase, data.dni);
  const { data: row, error } = await supabase
    .from('clientes')
    .insert(normalizeClienteDates(data))
    .select()
    .single();
  if (error) throw error;
  await logActividad(supabase, 'CREAR', 'CLIENTE', row.id);
  return row as Cliente;
}

export async function updateCliente(supabase: SupabaseClient, id: string, data: ClienteFormData) {
  if ('dni' in data) await assertDniUnico(supabase, data.dni, id);
  const { data: row, error } = await supabase
    .from('clientes')
    .update(normalizeClienteDates(data))
    .eq('id', id)
    .select()
    .single();
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
