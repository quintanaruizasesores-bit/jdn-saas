import type { Poliza } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PolizaFormData } from '@/validations/poliza.schema';
import { logActividad } from './actividad.service';
import { buildClienteSearchFilters, sanitizeSearchTerm } from '@/lib/clientes/search';

/** Tope de clientes que resuelve la búsqueda por nombre antes de filtrar pólizas. */
const SEARCH_CLIENTE_LIMIT = 500;

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

  // Búsqueda server-side: el nombre vive en la tabla `clientes` (join), así que
  // primero resolvemos los cliente_id que matchean el término y después filtramos
  // pólizas por (cliente_id IN ...) OR detalle ILIKE. Así la búsqueda alcanza
  // TODA la cartera y no solo la página traída. Ver lib/clientes/search.ts.
  const cleanSearch = search ? sanitizeSearchTerm(search) : '';
  let clienteIds: string[] = [];
  if (cleanSearch) {
    let cq = supabase.from('clientes').select('id');
    for (const filter of buildClienteSearchFilters(cleanSearch)) cq = cq.or(filter);
    const { data: cRows, error: cErr } = await cq.limit(SEARCH_CLIENTE_LIMIT);
    if (cErr) return { data: null, error: cErr, count: null, status: 0, statusText: '' };
    clienteIds = (cRows ?? []).map((c) => c.id as string);
  }

  let query = supabase
    .from('polizas')
    .select(
      `*, cliente:clientes(id, nombre, apellido, email, telefono), compania:companias(id, nombre), ramo:ramos(id, nombre)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (compania_id) query = query.eq('compania_id', compania_id);
  if (ramo_id) query = query.eq('ramo_id', ramo_id);
  if (estado) query = query.eq('estado', estado);
  if (con_prima === 'con') query = query.gt('prima', 0);
  if (con_prima === 'sin') query = query.eq('prima', 0);

  if (cleanSearch) {
    const orParts = [`detalle.ilike.%${cleanSearch}%`];
    if (clienteIds.length) orParts.push(`cliente_id.in.(${clienteIds.join(',')})`);
    query = query.or(orParts.join(','));
  }

  return query.range(page * pageSize, (page + 1) * pageSize - 1);
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

/**
 * Las columnas de fecha son DATE nullable: un string vacío ('') no es válido en
 * Postgres. Convertimos '' (o undefined) a null, pero SOLO en las claves presentes,
 * para no pisar fechas existentes en updates parciales (p. ej. dar de baja).
 */
function normalizePolizaDates(data: Partial<PolizaFormData>): Partial<PolizaFormData> {
  const out: Partial<PolizaFormData> = { ...data };
  if ('fecha_inicio' in out && !out.fecha_inicio) out.fecha_inicio = null;
  if ('fecha_fin' in out && !out.fecha_fin) out.fecha_fin = null;
  return out;
}

export async function createPoliza(supabase: SupabaseClient, data: PolizaFormData) {
  const { data: row, error } = await supabase
    .from('polizas')
    .insert(normalizePolizaDates(data))
    .select()
    .single();
  if (error) throw error;
  await logActividad(supabase, 'CREAR', 'POLIZA', row.id);
  return row as Poliza;
}

export async function updatePoliza(supabase: SupabaseClient, id: string, data: Partial<PolizaFormData>) {
  const { data: row, error } = await supabase
    .from('polizas')
    .update(normalizePolizaDates(data))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await logActividad(supabase, 'ACTUALIZAR', 'POLIZA', id);
  return row as Poliza;
}

export async function renovarPoliza(
  supabase: SupabaseClient,
  id: string,
  data: { fecha_inicio: string; fecha_fin?: string | null; prima: number }
) {
  return updatePoliza(supabase, id, {
    ...data,
    estado: 'VIGENTE',
  });
}

export async function darBajaPoliza(supabase: SupabaseClient, id: string) {
  return updatePoliza(supabase, id, { estado: 'BAJA' });
}
