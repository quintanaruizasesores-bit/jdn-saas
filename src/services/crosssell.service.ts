import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Cliente,
  Compania,
  CrossSellCategoria,
  CrossSellCorreo,
  CrossSellEvento,
  CrossSellExclusion,
  CrossSellOportunidad,
  CrossSellOportunidadEstado,
  CrossSellPlantilla,
  CrossSellRamoMap,
  CrossSellRegla,
  CrossSellSupresion,
  CrossSellSupresionMotivo,
  Poliza,
  Ramo,
  Siniestro,
} from '@/types/database';
import {
  CATEGORIAS_SUGERIDAS,
  sugerirCategoriaSlug,
} from '@/lib/crosssell/normalizar';
import {
  detectarOportunidades,
  coberturasVigentesPorCliente,
  type MotorEntrada,
  type MotorPoliza,
} from '@/lib/crosssell/motor';
import { leerTodas } from '@/services/inteligencia.service';
import type {
  CrossSellCategoriaInput,
  CrossSellReglaInput,
  CrossSellExclusionInput,
} from '@/validations/crosssell.schema';

/** Código de Postgres "la relación no existe" (migración 016 sin aplicar). */
const UNDEFINED_TABLE = '42P01';

export const CATEGORIA_TABLE = 'crosssell_categoria';
export const RAMO_MAP_TABLE = 'crosssell_ramo_map';
export const REGLA_TABLE = 'crosssell_regla';
export const OPORTUNIDAD_TABLE = 'crosssell_oportunidad';
export const EXCLUSION_TABLE = 'crosssell_exclusion';
export const EVENTO_TABLE = 'crosssell_evento';
export const PLANTILLA_TABLE = 'crosssell_plantilla';
export const CORREO_TABLE = 'crosssell_correo';
export const SUPRESION_TABLE = 'crosssell_supresion';

const ESTADOS_ABIERTOS: CrossSellOportunidadEstado[] = [
  'NUEVA',
  'VISTA',
  'CONTACTADA',
  'EN_NEGOCIACION',
];

function esTablaFaltante(error: { code?: string } | null): boolean {
  return error?.code === UNDEFINED_TABLE;
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------
export async function fetchCategorias(
  supabase: SupabaseClient
): Promise<CrossSellCategoria[]> {
  const { data, error } = await supabase
    .from(CATEGORIA_TABLE)
    .select('*')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  return (data ?? []) as CrossSellCategoria[];
}

export async function upsertCategoria(
  supabase: SupabaseClient,
  input: CrossSellCategoriaInput & { id?: string }
) {
  const payload = {
    nombre: input.nombre,
    slug: input.slug,
    descripcion: input.descripcion ?? null,
    activa: input.activa,
    orden: input.orden,
  };
  if (input.id) {
    return supabase
      .from(CATEGORIA_TABLE)
      .update(payload)
      .eq('id', input.id)
      .select()
      .single();
  }
  return supabase.from(CATEGORIA_TABLE).insert(payload).select().single();
}

export async function deleteCategoria(supabase: SupabaseClient, id: string) {
  return supabase.from(CATEGORIA_TABLE).delete().eq('id', id);
}

/**
 * Siembra las categorías sugeridas si el workspace todavía no tiene ninguna.
 * Corre bajo la sesión del usuario (el trigger asigna el workspace). Idempotente.
 */
export async function asegurarCategoriasDefault(
  supabase: SupabaseClient
): Promise<CrossSellCategoria[]> {
  const existentes = await fetchCategorias(supabase);
  if (existentes.length > 0) return existentes;
  const filas = CATEGORIAS_SUGERIDAS.map((c, i) => ({
    nombre: c.nombre,
    slug: c.slug,
    descripcion: c.descripcion,
    activa: true,
    orden: i,
  }));
  const { error } = await supabase.from(CATEGORIA_TABLE).insert(filas);
  if (error && !esTablaFaltante(error)) throw error;
  return fetchCategorias(supabase);
}

// ---------------------------------------------------------------------------
// Mapeo ramo -> categoría
// ---------------------------------------------------------------------------
export async function fetchRamoMap(
  supabase: SupabaseClient
): Promise<CrossSellRamoMap[]> {
  const { data, error } = await supabase.from(RAMO_MAP_TABLE).select('*');
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  return (data ?? []) as CrossSellRamoMap[];
}

export async function setRamoMap(
  supabase: SupabaseClient,
  ramoId: string,
  categoriaId: string | null,
  origen: 'AUTO' | 'MANUAL' = 'MANUAL'
) {
  if (categoriaId == null) {
    return supabase.from(RAMO_MAP_TABLE).delete().eq('ramo_id', ramoId);
  }
  return supabase
    .from(RAMO_MAP_TABLE)
    .upsert(
      { ramo_id: ramoId, categoria_id: categoriaId, origen },
      { onConflict: 'workspace_id,ramo_id' }
    );
}

/**
 * Sugiere automáticamente categoría para los ramos sin mapear (origen AUTO).
 * No pisa mapeos existentes (manuales o automáticos). Devuelve cuántos mapeó.
 */
export async function autosugerirMapeos(
  supabase: SupabaseClient
): Promise<number> {
  const [ramos, categorias, mapeos] = await Promise.all([
    supabase
      .from('ramos')
      .select('id, nombre')
      .order('nombre')
      .then((r) => (r.data ?? []) as Pick<Ramo, 'id' | 'nombre'>[]),
    fetchCategorias(supabase),
    fetchRamoMap(supabase),
  ]);
  const yaMapeados = new Set(mapeos.map((m) => m.ramo_id));
  const catPorSlug = new Map(categorias.map((c) => [c.slug, c.id]));
  const nuevos: { ramo_id: string; categoria_id: string; origen: 'AUTO' }[] = [];
  for (const ramo of ramos) {
    if (yaMapeados.has(ramo.id)) continue;
    const slug = sugerirCategoriaSlug(ramo.nombre);
    if (!slug) continue;
    const categoriaId = catPorSlug.get(slug);
    if (!categoriaId) continue;
    nuevos.push({ ramo_id: ramo.id, categoria_id: categoriaId, origen: 'AUTO' });
  }
  if (nuevos.length === 0) return 0;
  const { error } = await supabase.from(RAMO_MAP_TABLE).insert(nuevos);
  if (error && !esTablaFaltante(error)) throw error;
  return nuevos.length;
}

// ---------------------------------------------------------------------------
// Reglas
// ---------------------------------------------------------------------------
export async function fetchReglas(
  supabase: SupabaseClient
): Promise<CrossSellRegla[]> {
  const { data, error } = await supabase
    .from(REGLA_TABLE)
    .select('*')
    .order('prioridad', { ascending: false })
    .order('nombre', { ascending: true });
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  return (data ?? []) as CrossSellRegla[];
}

export async function upsertRegla(
  supabase: SupabaseClient,
  input: CrossSellReglaInput & { id?: string }
) {
  const payload = {
    nombre: input.nombre,
    descripcion: input.descripcion ?? null,
    activa: input.activa,
    prioridad: input.prioridad,
    categorias_requeridas: input.categorias_requeridas,
    modo: input.modo,
    categoria_objetivo_id: input.categoria_objetivo_id,
    condiciones: input.condiciones,
  };
  if (input.id) {
    return supabase
      .from(REGLA_TABLE)
      .update(payload)
      .eq('id', input.id)
      .select()
      .single();
  }
  return supabase.from(REGLA_TABLE).insert(payload).select().single();
}

export async function deleteRegla(supabase: SupabaseClient, id: string) {
  return supabase.from(REGLA_TABLE).delete().eq('id', id);
}

/**
 * Siembra reglas de ejemplo (editables) si no hay ninguna. Requiere categorías.
 */
export async function asegurarReglasDefault(
  supabase: SupabaseClient
): Promise<void> {
  const existentes = await fetchReglas(supabase);
  if (existentes.length > 0) return;
  const categorias = await fetchCategorias(supabase);
  const porSlug = new Map(categorias.map((c) => [c.slug, c.id]));
  const plantillas: {
    nombre: string;
    descripcion: string;
    requeridas: string[];
    objetivo: string;
  }[] = [
    {
      nombre: 'Automotor sin hogar',
      descripcion: 'Clientes con automotor que no registran hogar en la cartera.',
      requeridas: ['automotor'],
      objetivo: 'hogar',
    },
    {
      nombre: 'Vida sin accidentes personales',
      descripcion: 'Clientes con vida que podrían sumar accidentes personales.',
      requeridas: ['vida'],
      objetivo: 'accidentes_personales',
    },
    {
      nombre: 'Comercio sin caución',
      descripcion: 'Comercios que podrían necesitar una caución.',
      requeridas: ['comercio'],
      objetivo: 'caucion',
    },
  ];
  const filas = plantillas
    .map((p) => {
      const objetivoId = porSlug.get(p.objetivo);
      const requeridasIds = p.requeridas
        .map((s) => porSlug.get(s))
        .filter((x): x is string => !!x);
      if (!objetivoId || requeridasIds.length === 0) return null;
      return {
        nombre: p.nombre,
        descripcion: p.descripcion,
        activa: true,
        prioridad: 50,
        categorias_requeridas: requeridasIds,
        modo: 'ANY' as const,
        categoria_objetivo_id: objetivoId,
        condiciones: {},
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  if (filas.length === 0) return;
  const { error } = await supabase.from(REGLA_TABLE).insert(filas);
  if (error && !esTablaFaltante(error)) throw error;
}

// ---------------------------------------------------------------------------
// Exclusiones
// ---------------------------------------------------------------------------
export async function fetchExclusiones(
  supabase: SupabaseClient
): Promise<CrossSellExclusion[]> {
  const { data, error } = await supabase.from(EXCLUSION_TABLE).select('*');
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  return (data ?? []) as CrossSellExclusion[];
}

export async function addExclusion(
  supabase: SupabaseClient,
  input: CrossSellExclusionInput
) {
  return supabase.from(EXCLUSION_TABLE).insert({
    cliente_id: input.cliente_id,
    categoria_id: input.categoria_id ?? null,
    motivo: input.motivo ?? null,
  });
}

export async function removeExclusion(supabase: SupabaseClient, id: string) {
  return supabase.from(EXCLUSION_TABLE).delete().eq('id', id);
}

// ---------------------------------------------------------------------------
// Eventos (historial comercial)
// ---------------------------------------------------------------------------
export async function logCrossSellEvento(
  supabase: SupabaseClient,
  evento: {
    cliente_id: string;
    tipo: string;
    oportunidad_id?: string | null;
    correo_id?: string | null;
    detalle?: Record<string, unknown>;
    actor_user_id?: string | null;
  }
) {
  return supabase.from(EVENTO_TABLE).insert({
    cliente_id: evento.cliente_id,
    tipo: evento.tipo,
    oportunidad_id: evento.oportunidad_id ?? null,
    correo_id: evento.correo_id ?? null,
    detalle: evento.detalle ?? {},
    actor_user_id: evento.actor_user_id ?? null,
  });
}

export async function fetchEventosRecientes(
  supabase: SupabaseClient,
  limite = 100
): Promise<CrossSellEvento[]> {
  const { data, error } = await supabase
    .from(EVENTO_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  return (data ?? []) as CrossSellEvento[];
}

export async function fetchEventosCliente(
  supabase: SupabaseClient,
  clienteId: string
): Promise<CrossSellEvento[]> {
  const { data, error } = await supabase
    .from(EVENTO_TABLE)
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  return (data ?? []) as CrossSellEvento[];
}

// ---------------------------------------------------------------------------
// Oportunidades (lectura enriquecida + cambios de estado)
// ---------------------------------------------------------------------------
export interface OportunidadEnriquecida extends CrossSellOportunidad {
  cliente: {
    id: string;
    nombre: string;
    apellido: string;
    email: string | null;
    telefono: string | null;
    provincia: string | null;
  } | null;
  categoria_objetivo: { id: string; nombre: string; slug: string } | null;
}

export async function fetchOportunidades(
  supabase: SupabaseClient
): Promise<OportunidadEnriquecida[]> {
  const { data, error } = await supabase
    .from(OPORTUNIDAD_TABLE)
    .select('*')
    .order('prioridad_score', { ascending: false })
    .order('detectada_at', { ascending: false });
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  const opps = (data ?? []) as CrossSellOportunidad[];
  if (opps.length === 0) return [];

  const [clientes, categorias] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre, apellido, email, telefono, provincia')
      .then((r) => (r.data ?? []) as OportunidadEnriquecida['cliente'][]),
    fetchCategorias(supabase),
  ]);
  const cliById = new Map((clientes ?? []).map((c) => [c!.id, c!]));
  const catById = new Map(categorias.map((c) => [c.id, c]));
  return opps.map((o) => ({
    ...o,
    cliente: cliById.get(o.cliente_id) ?? null,
    categoria_objetivo: catById.get(o.categoria_objetivo_id)
      ? {
          id: o.categoria_objetivo_id,
          nombre: catById.get(o.categoria_objetivo_id)!.nombre,
          slug: catById.get(o.categoria_objetivo_id)!.slug,
        }
      : null,
  }));
}

export async function fetchOportunidad(
  supabase: SupabaseClient,
  id: string
): Promise<CrossSellOportunidad | null> {
  const { data, error } = await supabase
    .from(OPORTUNIDAD_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    if (esTablaFaltante(error)) return null;
    throw error;
  }
  return (data as CrossSellOportunidad | null) ?? null;
}

export async function actualizarOportunidad(
  supabase: SupabaseClient,
  id: string,
  cambios: {
    estado?: CrossSellOportunidadEstado;
    nota?: string | null;
    cierre_motivo?: string | null;
  }
) {
  const payload: Record<string, unknown> = {};
  if (cambios.estado !== undefined) {
    payload.estado = cambios.estado;
    const cerrada = ['CONVERTIDA', 'DESCARTADA', 'NO_APLICA'].includes(
      cambios.estado
    );
    payload.cerrada_at = cerrada ? new Date().toISOString() : null;
  }
  if (cambios.nota !== undefined) payload.nota = cambios.nota;
  if (cambios.cierre_motivo !== undefined)
    payload.cierre_motivo = cambios.cierre_motivo;
  return supabase
    .from(OPORTUNIDAD_TABLE)
    .update(payload)
    .eq('id', id)
    .select()
    .single();
}

// ---------------------------------------------------------------------------
// Carga de cartera + regeneración del motor
// ---------------------------------------------------------------------------
interface CarteraCrosssell {
  clientes: Cliente[];
  motorPolizas: MotorPoliza[];
  ramos: Ramo[];
  siniestrosPorCliente: Map<string, number>;
}

async function cargarCartera(
  supabase: SupabaseClient
): Promise<CarteraCrosssell> {
  const [clientes, polizas, ramos, companias, siniestros] = await Promise.all([
    leerTodas<Cliente>(
      supabase,
      'clientes',
      'id,nombre,apellido,email,telefono,provincia,deleted_at,created_at'
    ),
    leerTodas<Poliza>(
      supabase,
      'polizas',
      'id,cliente_id,ramo_id,compania_id,estado,fecha_fin,prima'
    ),
    leerTodas<Ramo>(supabase, 'ramos', 'id,nombre'),
    leerTodas<Compania>(supabase, 'companias', 'id,nombre'),
    leerTodas<Pick<Siniestro, 'id' | 'cliente_id'>>(
      supabase,
      'siniestros',
      'id,cliente_id'
    ),
  ]);
  const ramoNombre = new Map(ramos.map((r) => [r.id, r.nombre]));
  const companiaNombre = new Map(companias.map((c) => [c.id, c.nombre]));
  const motorPolizas: MotorPoliza[] = polizas.map((p) => ({
    id: p.id,
    cliente_id: p.cliente_id,
    ramo_id: p.ramo_id,
    ramo_nombre: p.ramo_id ? (ramoNombre.get(p.ramo_id) ?? null) : null,
    compania_nombre: p.compania_id
      ? (companiaNombre.get(p.compania_id) ?? null)
      : null,
    estado: p.estado,
    fecha_fin: p.fecha_fin,
    prima: p.prima,
  }));
  const siniestrosPorCliente = new Map<string, number>();
  for (const s of siniestros)
    siniestrosPorCliente.set(
      s.cliente_id,
      (siniestrosPorCliente.get(s.cliente_id) ?? 0) + 1
    );
  return { clientes, motorPolizas, ramos, siniestrosPorCliente };
}

// ---------------------------------------------------------------------------
// Plantillas de correo
// ---------------------------------------------------------------------------
export async function fetchPlantillas(
  supabase: SupabaseClient
): Promise<CrossSellPlantilla[]> {
  const { data, error } = await supabase
    .from(PLANTILLA_TABLE)
    .select('*')
    .order('nombre');
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  return (data ?? []) as CrossSellPlantilla[];
}

export async function upsertPlantilla(
  supabase: SupabaseClient,
  input: { id?: string; nombre: string; asunto: string; cuerpo: string; activa: boolean }
) {
  const payload = {
    nombre: input.nombre,
    asunto: input.asunto,
    cuerpo: input.cuerpo,
    activa: input.activa,
  };
  if (input.id)
    return supabase
      .from(PLANTILLA_TABLE)
      .update(payload)
      .eq('id', input.id)
      .select()
      .single();
  return supabase.from(PLANTILLA_TABLE).insert(payload).select().single();
}

export async function deletePlantilla(supabase: SupabaseClient, id: string) {
  return supabase.from(PLANTILLA_TABLE).delete().eq('id', id);
}

// ---------------------------------------------------------------------------
// Correos (borradores + historial)
// ---------------------------------------------------------------------------
/** Último borrador (estado BORRADOR) de una oportunidad, o null. */
export async function fetchBorradorOportunidad(
  supabase: SupabaseClient,
  oportunidadId: string
): Promise<CrossSellCorreo | null> {
  const { data, error } = await supabase
    .from(CORREO_TABLE)
    .select('*')
    .eq('oportunidad_id', oportunidadId)
    .eq('estado', 'BORRADOR')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (esTablaFaltante(error)) return null;
    throw error;
  }
  return (data as CrossSellCorreo | null) ?? null;
}

export interface GuardarBorradorInput {
  id?: string;
  oportunidad_id: string;
  cliente_id: string;
  categoria_objetivo_id: string | null;
  asunto: string;
  cuerpo: string;
  destinatario_email: string;
  plantilla_id?: string | null;
}

/** Inserta o actualiza un borrador. Guarda el cuerpo editable en cuerpo_text. */
export async function guardarBorrador(
  supabase: SupabaseClient,
  input: GuardarBorradorInput
) {
  const payload = {
    oportunidad_id: input.oportunidad_id,
    cliente_id: input.cliente_id,
    categoria_objetivo_id: input.categoria_objetivo_id,
    asunto: input.asunto,
    cuerpo_text: input.cuerpo,
    destinatario_email: input.destinatario_email,
    plantilla_id: input.plantilla_id ?? null,
    estado: 'BORRADOR' as const,
    preparado_at: new Date().toISOString(),
  };
  if (input.id)
    return supabase
      .from(CORREO_TABLE)
      .update(payload)
      .eq('id', input.id)
      .select()
      .single();
  return supabase.from(CORREO_TABLE).insert(payload).select().single();
}

/** Cantidad de correos ya ENVIADOS a un cliente para una categoría (reenvío). */
export async function contarEnviosPrevios(
  supabase: SupabaseClient,
  clienteId: string,
  categoriaId: string | null
): Promise<number> {
  let query = supabase
    .from(CORREO_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)
    .eq('estado', 'ENVIADO');
  query = categoriaId
    ? query.eq('categoria_objetivo_id', categoriaId)
    : query.is('categoria_objetivo_id', null);
  const { count, error } = await query;
  if (error) {
    if (esTablaFaltante(error)) return 0;
    throw error;
  }
  return count ?? 0;
}

export async function fetchCorreosCliente(
  supabase: SupabaseClient,
  clienteId: string
): Promise<CrossSellCorreo[]> {
  const { data, error } = await supabase
    .from(CORREO_TABLE)
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  return (data ?? []) as CrossSellCorreo[];
}

// ---------------------------------------------------------------------------
// Supresión comercial
// ---------------------------------------------------------------------------
export async function fetchSupresiones(
  supabase: SupabaseClient
): Promise<CrossSellSupresion[]> {
  const { data, error } = await supabase
    .from(SUPRESION_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  return (data ?? []) as CrossSellSupresion[];
}

/** `true` si el email está suprimido en el workspace del usuario. */
export async function emailSuprimido(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from(SUPRESION_TABLE)
    .select('id')
    .ilike('email', email.trim())
    .limit(1)
    .maybeSingle();
  if (error) {
    if (esTablaFaltante(error)) return false;
    throw error;
  }
  return !!data;
}

/** Registra una supresión (RPC que deriva el workspace de la sesión o del token). */
export async function suprimirEmail(
  supabase: SupabaseClient,
  params: {
    email: string;
    motivo: CrossSellSupresionMotivo;
    origen?: string | null;
    workspaceId?: string | null;
  }
) {
  return supabase.rpc('crosssell_suprimir', {
    p_email: params.email,
    p_motivo: params.motivo,
    p_origen: params.origen ?? null,
    p_workspace_id: params.workspaceId ?? null,
  });
}

export async function quitarSupresion(supabase: SupabaseClient, id: string) {
  return supabase.from(SUPRESION_TABLE).delete().eq('id', id);
}

export interface RegeneracionResultado {
  detectadas: number;
  convertidas: number;
  categorias: number;
  reglas: number;
}

/**
 * Regenera las oportunidades: corre el motor y hace upsert idempotente. Preserva
 * los estados manuales (no incluye `estado` en el update: una oportunidad
 * DESCARTADA/CONTACTADA conserva su estado) y auto-cierra como CONVERTIDA las
 * oportunidades abiertas cuyo cliente ya tiene la cobertura en la cartera.
 */
export async function regenerarOportunidades(
  supabase: SupabaseClient,
  now = new Date()
): Promise<RegeneracionResultado> {
  // Asegura que haya categorías y reglas (semillas editables) la primera vez.
  await asegurarCategoriasDefault(supabase);
  await asegurarReglasDefault(supabase);

  const hoy = now.toISOString().slice(0, 10);
  const [cartera, categorias, ramoMapRows, reglas, exclusiones, abiertas] =
    await Promise.all([
      cargarCartera(supabase),
      fetchCategorias(supabase),
      fetchRamoMap(supabase),
      fetchReglas(supabase),
      fetchExclusiones(supabase),
      supabase
        .from(OPORTUNIDAD_TABLE)
        .select('id, cliente_id, categoria_objetivo_id, estado')
        .in('estado', ESTADOS_ABIERTOS)
        .then((r) => (r.data ?? []) as Pick<
          CrossSellOportunidad,
          'id' | 'cliente_id' | 'categoria_objetivo_id' | 'estado'
        >[]),
    ]);

  const ramoMap = new Map(ramoMapRows.map((m) => [m.ramo_id, m.categoria_id]));

  const entrada: MotorEntrada = {
    clientes: cartera.clientes.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      apellido: c.apellido,
      provincia: c.provincia,
      email: c.email,
      deleted_at: c.deleted_at,
    })),
    polizas: cartera.motorPolizas,
    ramoMap,
    categorias: categorias.map((c) => ({
      id: c.id,
      slug: c.slug,
      nombre: c.nombre,
      activa: c.activa,
    })),
    reglas: reglas.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      activa: r.activa,
      prioridad: r.prioridad,
      categorias_requeridas: r.categorias_requeridas,
      modo: r.modo,
      categoria_objetivo_id: r.categoria_objetivo_id,
      condiciones: r.condiciones ?? {},
    })),
    exclusiones: exclusiones.map((e) => ({
      cliente_id: e.cliente_id,
      categoria_id: e.categoria_id,
    })),
    siniestrosPorCliente: cartera.siniestrosPorCliente,
    hoy,
  };

  const detectadas = detectarOportunidades(entrada);

  // Upsert (omitimos `estado` para no pisar decisiones manuales; filas nuevas
  // usan el default 'NUEVA'). Reabrir una descartada no cambia su estado.
  const nowIso = now.toISOString();
  if (detectadas.length > 0) {
    const filas = detectadas.map((o) => ({
      cliente_id: o.cliente_id,
      categoria_objetivo_id: o.categoria_objetivo_id,
      regla_id: o.regla_id,
      prioridad_score: o.prioridad_score,
      motivo: o.motivo,
      ultima_deteccion_at: nowIso,
    }));
    const { error } = await supabase
      .from(OPORTUNIDAD_TABLE)
      .upsert(filas, {
        onConflict: 'workspace_id,cliente_id,categoria_objetivo_id',
      });
    if (error) throw error;
  }

  // Auto-cierre a CONVERTIDA: oportunidades abiertas cuyo cliente ya tiene la
  // cobertura objetivo en su cartera vigente.
  const coberturas = coberturasVigentesPorCliente(
    cartera.motorPolizas,
    ramoMap,
    hoy
  );
  const convertirIds = abiertas
    .filter((o) =>
      coberturas.get(o.cliente_id)?.has(o.categoria_objetivo_id)
    )
    .map((o) => o.id);
  if (convertirIds.length > 0) {
    const { error } = await supabase
      .from(OPORTUNIDAD_TABLE)
      .update({
        estado: 'CONVERTIDA',
        cerrada_at: nowIso,
        cierre_motivo: 'Cobertura detectada en la cartera',
      })
      .in('id', convertirIds);
    if (error) throw error;
  }

  return {
    detectadas: detectadas.length,
    convertidas: convertirIds.length,
    categorias: categorias.length,
    reglas: reglas.length,
  };
}
