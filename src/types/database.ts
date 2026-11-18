export type UserRole = 'ADMIN' | 'PRODUCTOR' | 'OPERADOR';
export type PolizaEstado = 'VIGENTE' | 'HISTORICA' | 'BAJA';
export type PrimaPeriodicidad =
  | 'MENSUAL'
  | 'BIMESTRAL'
  | 'TRIMESTRAL'
  | 'CUATRIMESTRAL'
  | 'SEMESTRAL'
  | 'ANUAL'
  | 'UNICA';
export type SiniestroTipo =
  | 'CHOQUE'
  | 'ROBO'
  | 'INCENDIO'
  | 'GRANIZO'
  | 'OTROS';
export type Responsabilidad =
  | 'RESPONSABLE'
  | 'NO_RESPONSABLE'
  | 'INDETERMINADA';
export type TareaEstado = 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADA';
export type ActividadEntidad =
  | 'CLIENTE'
  | 'POLIZA'
  | 'SINIESTRO'
  | 'TAREA'
  | 'COMPANIA'
  | 'RAMO';
export type HistorialTipo =
  | 'CREACION'
  | 'ACTUALIZACION'
  | 'RENOVACION'
  | 'BAJA'
  | 'PRIMA';
export type CompaniaEstado = 'ACTIVA' | 'INACTIVA';
export type RiesgoNivel = 'bajo' | 'medio' | 'alto';

export interface Profile {
  id: string;
  role: UserRole;
  nombre: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  observaciones: string | null;
  actividad: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  fecha_nacimiento: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Compania {
  id: string;
  nombre: string;
  color?: string | null;
  codigo: string | null;
  estado: CompaniaEstado;
  created_at: string;
}

export interface Ramo {
  id: string;
  nombre: string;
  codigo: string | null;
  created_at: string;
}

export interface Poliza {
  id: string;
  cliente_id: string;
  compania_id: string | null;
  ramo_id: string | null;
  estado: PolizaEstado;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  prima: number;
  fecha_baja?: string | null;
  comision_desde?: string | null;
  detalle: string | null;
  legacy_id: number | null;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  compania?: Compania;
  ramo?: Ramo;
}

export interface PolizaHistorial {
  id: string;
  poliza_id: string;
  usuario_id: string | null;
  tipo: HistorialTipo;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  nota: string | null;
  created_at: string;
  fecha_efecto?: string | null;
  completo?: boolean;
  version_orden?: number;
}

export interface Siniestro {
  id: string;
  cliente_id: string;
  poliza_id: string | null;
  tipo: SiniestroTipo;
  fecha: string | null;
  descripcion: string | null;
  descripcion_raw: string | null;
  responsabilidad: Responsabilidad;
  monto_estimado: number;
  created_at: string;
  cliente?: Cliente;
  poliza?: Poliza;
}

export interface Tarea {
  id: string;
  cliente_id: string | null;
  poliza_id: string | null;
  siniestro_id: string | null;
  titulo: string;
  descripcion: string | null;
  fecha_vencimiento: string | null;
  estado: TareaEstado;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  poliza?: Poliza;
  siniestro?: Siniestro;
}

export interface Actividad {
  id: string;
  usuario_id: string | null;
  accion: string;
  entidad: ActividadEntidad;
  entidad_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

/** Configuración del módulo Cumpleaños (persistida en app_settings['birthday']). */
export interface BirthdaySettings {
  template: string;
  empresa: string;
}

/** Preferencias de recordatorios por email (una fila por workspace). */
export interface NotificacionEmailPrefs {
  workspace_id: string;
  activo: boolean;
  destinatario: string | null;
  hora_local: number;
  zona_horaria: string;
  created_at: string;
  updated_at: string;
}

/** Bitácora de envíos de email (resumen diario / prueba). */
export interface NotificacionEmailEnvio {
  id: string;
  workspace_id: string;
  tipo: 'RESUMEN_DIARIO' | 'PRUEBA';
  fecha_local: string;
  estado: 'ENVIANDO' | 'ENVIADO' | 'ERROR';
  provider_id: string | null;
  error: string | null;
  total_tareas: number | null;
  intentos: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Cross-Selling (venta cruzada asistida)
// ---------------------------------------------------------------------------

export type CrossSellOrigen = 'AUTO' | 'MANUAL';
export type CrossSellModo = 'ALL' | 'ANY';
export type CrossSellOportunidadEstado =
  | 'NUEVA'
  | 'VISTA'
  | 'CONTACTADA'
  | 'EN_NEGOCIACION'
  | 'CONVERTIDA'
  | 'DESCARTADA'
  | 'NO_APLICA';
export type CrossSellCorreoEstado =
  | 'BORRADOR'
  | 'ENVIANDO'
  | 'ENVIADO'
  | 'FALLIDO';
export type CrossSellSupresionMotivo =
  | 'BAJA'
  | 'REBOTE'
  | 'QUEJA'
  | 'MANUAL';

/** Categoría de cobertura normalizada (editable por workspace). */
export interface CrossSellCategoria {
  id: string;
  workspace_id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  activa: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

/** Mapeo configurable ramo -> categoría de cobertura. */
export interface CrossSellRamoMap {
  workspace_id: string;
  ramo_id: string;
  categoria_id: string;
  origen: CrossSellOrigen;
  created_at: string;
  updated_at: string;
}

/** Condiciones extensibles de una regla comercial. */
export interface CrossSellReglaCondiciones {
  min_polizas?: number;
  prima_minima?: number;
  provincia?: string;
  excluir_alta_siniestralidad?: boolean;
}

/** Regla comercial configurable de venta cruzada. */
export interface CrossSellRegla {
  id: string;
  workspace_id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  prioridad: number;
  categorias_requeridas: string[];
  modo: CrossSellModo;
  categoria_objetivo_id: string;
  condiciones: CrossSellReglaCondiciones;
  created_at: string;
  updated_at: string;
}

/** Explicación de por qué se generó una oportunidad. */
export interface CrossSellMotivo {
  regla_nombre?: string;
  categorias_actuales?: { slug: string; nombre: string }[];
  categoria_objetivo?: { slug: string; nombre: string };
  polizas_relacionadas?: { id: string; ramo: string; compania: string | null }[];
}

/** Oportunidad de venta cruzada detectada. */
export interface CrossSellOportunidad {
  id: string;
  workspace_id: string;
  cliente_id: string;
  categoria_objetivo_id: string;
  regla_id: string | null;
  estado: CrossSellOportunidadEstado;
  prioridad_score: number;
  motivo: CrossSellMotivo;
  nota: string | null;
  detectada_at: string;
  ultima_deteccion_at: string;
  cerrada_at: string | null;
  cierre_motivo: string | null;
  created_at: string;
  updated_at: string;
}

/** Exclusión de un cliente (global si categoria_id es null, o por categoría). */
export interface CrossSellExclusion {
  id: string;
  workspace_id: string;
  cliente_id: string;
  categoria_id: string | null;
  motivo: string | null;
  created_at: string;
}

/** Evento del historial comercial de cross-selling (append-only). */
export interface CrossSellEvento {
  id: string;
  workspace_id: string;
  cliente_id: string;
  oportunidad_id: string | null;
  correo_id: string | null;
  tipo: string;
  detalle: Record<string, unknown>;
  actor_user_id: string | null;
  created_at: string;
}

/** Plantilla reutilizable de correo de cross-selling (migración 017). */
export interface CrossSellPlantilla {
  id: string;
  workspace_id: string;
  nombre: string;
  asunto: string;
  cuerpo: string;
  variables: Record<string, unknown>;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

/** Correo individual de cross-selling: borrador + historial (migración 017). */
export interface CrossSellCorreo {
  id: string;
  workspace_id: string;
  oportunidad_id: string | null;
  cliente_id: string;
  categoria_objetivo_id: string | null;
  plantilla_id: string | null;
  estado: CrossSellCorreoEstado;
  asunto: string;
  cuerpo_html: string;
  cuerpo_text: string;
  destinatario_email: string;
  resend_email_id: string | null;
  error: string | null;
  intentos: number;
  preparado_at: string | null;
  enviado_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Lista de supresión comercial por email (migración 017). */
export interface CrossSellSupresion {
  id: string;
  workspace_id: string;
  email: string;
  motivo: CrossSellSupresionMotivo;
  origen: string | null;
  created_at: string;
}

export interface DashboardKpis {
  total_clientes: number;
  total_polizas: number;
  prima_total: number;
  prima_mensual: number;
  siniestros_recientes: number;
  renovaciones_proximas: number;
}

export interface RenovacionProxima {
  poliza_id: string;
  fecha_fin: string;
  dias_restantes: number;
  alerta_nivel: string;
  cliente_id: string;
  cliente_nombre: string;
  compania_nombre: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Profile>;
        Relationships: [];
      };
      clientes: {
        Row: Cliente;
        Insert: Omit<
          Cliente,
          'id' | 'created_at' | 'updated_at' | 'deleted_at'
        > & {
          id?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Cliente>;
        Relationships: [];
      };
      companias: {
        Row: Compania;
        Insert: Omit<Compania, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Compania>;
        Relationships: [];
      };
      ramos: {
        Row: Ramo;
        Insert: Omit<Ramo, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Ramo>;
        Relationships: [];
      };
      polizas: {
        Row: Poliza;
        Insert: Omit<Poliza, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Poliza>;
        Relationships: [];
      };
      poliza_historial: {
        Row: PolizaHistorial;
        Insert: Omit<PolizaHistorial, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<PolizaHistorial>;
        Relationships: [];
      };
      siniestros: {
        Row: Siniestro;
        Insert: Omit<Siniestro, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Siniestro>;
        Relationships: [];
      };
      tareas: {
        Row: Tarea;
        Insert: Omit<Tarea, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Tarea>;
        Relationships: [];
      };
      actividad: {
        Row: Actividad;
        Insert: Omit<Actividad, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Actividad>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSetting;
        Insert: Omit<AppSetting, 'updated_at'> & { updated_at?: string };
        Update: Partial<AppSetting>;
        Relationships: [];
      };
      notificacion_email_prefs: {
        Row: NotificacionEmailPrefs;
        Insert: Omit<
          NotificacionEmailPrefs,
          'workspace_id' | 'created_at' | 'updated_at'
        > & {
          workspace_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<NotificacionEmailPrefs>;
        Relationships: [];
      };
      notificacion_email_envios: {
        Row: NotificacionEmailEnvio;
        Insert: Omit<
          NotificacionEmailEnvio,
          'id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<NotificacionEmailEnvio>;
        Relationships: [];
      };
      crosssell_categoria: {
        Row: CrossSellCategoria;
        Insert: Omit<
          CrossSellCategoria,
          'id' | 'workspace_id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
          workspace_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CrossSellCategoria>;
        Relationships: [];
      };
      crosssell_ramo_map: {
        Row: CrossSellRamoMap;
        Insert: Omit<
          CrossSellRamoMap,
          'workspace_id' | 'created_at' | 'updated_at'
        > & {
          workspace_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CrossSellRamoMap>;
        Relationships: [];
      };
      crosssell_regla: {
        Row: CrossSellRegla;
        Insert: Omit<
          CrossSellRegla,
          'id' | 'workspace_id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
          workspace_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CrossSellRegla>;
        Relationships: [];
      };
      crosssell_oportunidad: {
        Row: CrossSellOportunidad;
        Insert: Omit<
          CrossSellOportunidad,
          'id' | 'workspace_id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
          workspace_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CrossSellOportunidad>;
        Relationships: [];
      };
      crosssell_exclusion: {
        Row: CrossSellExclusion;
        Insert: Omit<
          CrossSellExclusion,
          'id' | 'workspace_id' | 'created_at'
        > & { id?: string; workspace_id?: string; created_at?: string };
        Update: Partial<CrossSellExclusion>;
        Relationships: [];
      };
      crosssell_evento: {
        Row: CrossSellEvento;
        Insert: Omit<
          CrossSellEvento,
          'id' | 'workspace_id' | 'created_at'
        > & { id?: string; workspace_id?: string; created_at?: string };
        Update: Partial<CrossSellEvento>;
        Relationships: [];
      };
      crosssell_plantilla: {
        Row: CrossSellPlantilla;
        Insert: Omit<
          CrossSellPlantilla,
          'id' | 'workspace_id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
          workspace_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CrossSellPlantilla>;
        Relationships: [];
      };
      crosssell_correo: {
        Row: CrossSellCorreo;
        Insert: Omit<
          CrossSellCorreo,
          'id' | 'workspace_id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
          workspace_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CrossSellCorreo>;
        Relationships: [];
      };
      crosssell_supresion: {
        Row: CrossSellSupresion;
        Insert: Omit<
          CrossSellSupresion,
          'id' | 'workspace_id' | 'created_at'
        > & { id?: string; workspace_id?: string; created_at?: string };
        Update: Partial<CrossSellSupresion>;
        Relationships: [];
      };
    };
    Views: {
      v_dashboard_kpis: { Row: DashboardKpis; Relationships: [] };
      v_polizas_por_compania: {
        Row: {
          compania_id: string;
          compania_nombre: string;
          total_polizas: number;
          prima_total: number;
          color?: string | null;
        };
        Relationships: [];
      };
      v_polizas_por_ramo: {
        Row: {
          ramo_id: string;
          ramo_nombre: string;
          total_polizas: number;
          prima_total: number;
        };
        Relationships: [];
      };
      v_renovaciones_proximas: { Row: RenovacionProxima; Relationships: [] };
      v_produccion_mensual: {
        Row: { mes: string; polizas_count: number; prima_total: number };
        Relationships: [];
      };
      v_clientes_top: {
        Row: {
          cliente_id: string;
          cliente_nombre: string;
          total_polizas: number;
          prima_total: number;
        };
        Relationships: [];
      };
      v_siniestros_por_tipo: {
        Row: { tipo: SiniestroTipo; total: number };
        Relationships: [];
      };
      v_siniestros_por_responsabilidad: {
        Row: { responsabilidad: Responsabilidad; total: number };
        Relationships: [];
      };
    };
    Functions: {
      reclamar_resumen_diario: {
        Args: {
          p_workspace_id: string;
          p_fecha_local: string;
          p_max_intentos?: number;
        };
        Returns: string | null;
      };
      crosssell_reclamar_correo: {
        Args: { p_correo_id: string; p_max_intentos?: number };
        Returns: string | null;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
