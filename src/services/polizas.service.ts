import type { Poliza } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PolizaFormData } from '@/validations/poliza.schema';
import { logActividad } from './actividad.service';
import {
  buildClienteSearchFilters,
  sanitizeSearchTerm,
} from '@/lib/clientes/search';
import { periodoComision } from '@/lib/dashboard/comision';
import {
  distanciaPatente,
  fragmentosPatente,
  patenteBuscada,
  patentesEnDetalle,
} from '@/lib/polizas/patentes';

/** Tope de clientes que resuelve la búsqueda por nombre antes de filtrar pólizas. */
const SEARCH_CLIENTE_LIMIT = 500;
const PATENTE_BATCH_SIZE = 1000;
const POLIZA_SELECT =
  '*, cliente:clientes(id, nombre, apellido, email, telefono), compania:companias(*), ramo:ramos(id, nombre)';

export interface PolizasFilters {
  search?: string;
  compania_id?: string;
  ramo_id?: string;
  estado?: string;
  con_prima?: 'con' | 'sin';
  page?: number;
  pageSize?: number;
}

export async function fetchPolizas(
  supabase: SupabaseClient,
  filters: PolizasFilters = {}
) {
  const {
    search,
    compania_id,
    ramo_id,
    estado,
    con_prima,
    page = 0,
    pageSize = 50,
  } = filters;

  const patente = search ? patenteBuscada(search.trim()) : null;
  if (patente) return fetchPolizasPorPatente(supabase, patente, filters);

  // Búsqueda server-side: el nombre vive en la tabla `clientes` (join), así que
  // primero resolvemos los cliente_id que matchean el término y después filtramos
  // pólizas por (cliente_id IN ...) OR detalle ILIKE. Así la búsqueda alcanza
  // TODA la cartera y no solo la página traída. Ver lib/clientes/search.ts.
  const cleanSearch = search ? sanitizeSearchTerm(search) : '';
  let clienteIds: string[] = [];
  if (cleanSearch) {
    let cq = supabase.from('clientes').select('id');
    for (const filter of buildClienteSearchFilters(cleanSearch))
      cq = cq.or(filter);
    const { data: cRows, error: cErr } = await cq.limit(SEARCH_CLIENTE_LIMIT);
    if (cErr)
      return {
        data: null,
        error: cErr,
        count: null,
        status: 0,
        statusText: '',
      };
    clienteIds = (cRows ?? []).map((c) => c.id as string);
  }

  let query = supabase
    .from('polizas')
    .select(POLIZA_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (compania_id) query = query.eq('compania_id', compania_id);
  if (ramo_id) query = query.eq('ramo_id', ramo_id);
  if (estado) query = query.eq('estado', estado);
  if (con_prima === 'con') query = query.gt('prima', 0);
  if (con_prima === 'sin') query = query.eq('prima', 0);

  if (cleanSearch) {
    const orParts = [`detalle.ilike.%${cleanSearch}%`];
    if (clienteIds.length)
      orParts.push(`cliente_id.in.(${clienteIds.join(',')})`);
    query = query.or(orParts.join(','));
  }

  return query.range(page * pageSize, (page + 1) * pageSize - 1);
}

async function fetchPolizasPorPatente(
  supabase: SupabaseClient,
  patente: string,
  filters: PolizasFilters
) {
  const [letras, numeros] = fragmentosPatente(patente);
  const coincidencias: { id: string; created_at: string; distancia: number }[] =
    [];

  // Primero se buscan patentes completas, incluso si se escribieron con guiones
  // o espacios. Sólo cuando no hay una exacta se admiten variantes de un carácter.
  for (const aproximada of [false, true]) {
    for (let offset = 0; ; offset += PATENTE_BATCH_SIZE) {
      let query = supabase
        .from('polizas')
        .select('id, detalle, created_at')
        .order('created_at', { ascending: false });
      if (filters.compania_id)
        query = query.eq('compania_id', filters.compania_id);
      if (filters.ramo_id) query = query.eq('ramo_id', filters.ramo_id);
      if (filters.estado) query = query.eq('estado', filters.estado);
      if (filters.con_prima === 'con') query = query.gt('prima', 0);
      if (filters.con_prima === 'sin') query = query.eq('prima', 0);

      query = aproximada
        ? query.or(`detalle.ilike.%${letras}%,detalle.ilike.%${numeros}%`)
        : query.ilike('detalle', `%${letras}%${numeros}%`);
      const { data, error } = await query.range(
        offset,
        offset + PATENTE_BATCH_SIZE - 1
      );
      if (error)
        return { data: null, error, count: null, status: 0, statusText: '' };

      for (const row of data ?? []) {
        const distancia = Math.min(
          ...patentesEnDetalle(row.detalle).map((valor) =>
            distanciaPatente(patente, valor)
          )
        );
        if (distancia === (aproximada ? 1 : 0)) {
          coincidencias.push({
            id: row.id,
            created_at: row.created_at,
            distancia,
          });
        }
      }
      if ((data ?? []).length < PATENTE_BATCH_SIZE) break;
    }
    if (coincidencias.length) break;
  }

  coincidencias.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? 50;
  const ids = coincidencias
    .slice(page * pageSize, (page + 1) * pageSize)
    .map((row) => row.id);
  if (!ids.length)
    return {
      data: [],
      error: null,
      count: coincidencias.length,
      status: 200,
      statusText: 'OK',
      coincidenciaPatente: coincidencias.length
        ? aproximacionPatente(coincidencias)
        : null,
    };

  const result = await supabase
    .from('polizas')
    .select(POLIZA_SELECT)
    .in('id', ids);
  if (result.error) return result;
  const byId = new Map((result.data ?? []).map((row) => [row.id, row]));
  return {
    ...result,
    data: ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    }),
    count: coincidencias.length,
    coincidenciaPatente: aproximacionPatente(coincidencias),
  };
}

function aproximacionPatente(
  coincidencias: { distancia: number }[]
): 'exacta' | 'similar' {
  return coincidencias[0].distancia === 0 ? 'exacta' : 'similar';
}

export async function fetchPolizaById(supabase: SupabaseClient, id: string) {
  return supabase
    .from('polizas')
    .select(`*, cliente:clientes(*), compania:companias(*), ramo:ramos(*)`)
    .eq('id', id)
    .single();
}

export async function fetchPolizasByCliente(
  supabase: SupabaseClient,
  clienteId: string
) {
  return supabase
    .from('polizas')
    .select(`*, compania:companias(nombre), ramo:ramos(nombre)`)
    .eq('cliente_id', clienteId)
    .order('fecha_inicio', { ascending: false });
}

export async function fetchPolizaHistorial(
  supabase: SupabaseClient,
  polizaId: string
) {
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
function normalizePolizaDates(
  data: Partial<PolizaFormData>
): Partial<PolizaFormData> {
  const out: Partial<PolizaFormData> = { ...data };
  if ('fecha_inicio' in out && !out.fecha_inicio) out.fecha_inicio = null;
  if ('fecha_fin' in out && !out.fecha_fin) out.fecha_fin = null;
  if ('fecha_baja' in out && !out.fecha_baja) out.fecha_baja = null;
  if ('comision_desde' in out && !out.comision_desde) out.comision_desde = null;
  return out;
}

export async function createPoliza(
  supabase: SupabaseClient,
  data: PolizaFormData
) {
  const { data: row, error } = await supabase
    .from('polizas')
    .insert(normalizePolizaDates(data))
    .select()
    .single();
  if (error) throw error;
  await logActividad(supabase, 'CREAR', 'POLIZA', row.id);
  return row as Poliza;
}

export async function updatePoliza(
  supabase: SupabaseClient,
  id: string,
  data: Partial<PolizaFormData>
) {
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
    fecha_baja: null,
    comision_desde: data.fecha_inicio,
  });
}

export async function darBajaPoliza(
  supabase: SupabaseClient,
  id: string,
  fechaBaja = periodoComision().hoy
) {
  return updatePoliza(supabase, id, {
    estado: 'BAJA',
    fecha_baja: fechaBaja,
    comision_desde: fechaBaja,
  });
}
