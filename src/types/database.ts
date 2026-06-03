export type UserRole = 'ADMIN' | 'PRODUCTOR' | 'OPERADOR';
export type PolizaEstado = 'VIGENTE' | 'HISTORICA' | 'BAJA';
export type SiniestroTipo = 'CHOQUE' | 'ROBO' | 'INCENDIO' | 'GRANIZO' | 'OTROS';
export type Responsabilidad = 'RESPONSABLE' | 'NO_RESPONSABLE' | 'INDETERMINADA';
export type TareaEstado = 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADA';
export type ActividadEntidad = 'CLIENTE' | 'POLIZA' | 'SINIESTRO' | 'TAREA' | 'COMPANIA' | 'RAMO';
export type HistorialTipo = 'CREACION' | 'ACTUALIZACION' | 'RENOVACION' | 'BAJA' | 'PRIMA';
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
  cuit: string | null;
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
  numero_poliza: string;
  estado: PolizaEstado;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  prima: number;
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
  titulo: string;
  descripcion: string | null;
  fecha_vencimiento: string | null;
  estado: TareaEstado;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
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
  numero_poliza: string;
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
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      clientes: {
        Row: Cliente;
        Insert: Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
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
        Insert: Omit<Compania, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Compania>;
        Relationships: [];
      };
      ramos: {
        Row: Ramo;
        Insert: Omit<Ramo, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Ramo>;
        Relationships: [];
      };
      polizas: {
        Row: Poliza;
        Insert: Omit<Poliza, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Poliza>;
        Relationships: [];
      };
      poliza_historial: {
        Row: PolizaHistorial;
        Insert: Omit<PolizaHistorial, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<PolizaHistorial>;
        Relationships: [];
      };
      siniestros: {
        Row: Siniestro;
        Insert: Omit<Siniestro, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Siniestro>;
        Relationships: [];
      };
      tareas: {
        Row: Tarea;
        Insert: Omit<Tarea, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Tarea>;
        Relationships: [];
      };
      actividad: {
        Row: Actividad;
        Insert: Omit<Actividad, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Actividad>;
        Relationships: [];
      };
    };
    Views: {
      v_dashboard_kpis: { Row: DashboardKpis; Relationships: [] };
      v_polizas_por_compania: {
        Row: { compania_id: string; compania_nombre: string; total_polizas: number; prima_total: number };
        Relationships: [];
      };
      v_polizas_por_ramo: {
        Row: { ramo_id: string; ramo_nombre: string; total_polizas: number; prima_total: number };
        Relationships: [];
      };
      v_renovaciones_proximas: { Row: RenovacionProxima; Relationships: [] };
      v_produccion_mensual: {
        Row: { mes: string; polizas_count: number; prima_total: number };
        Relationships: [];
      };
      v_clientes_top: {
        Row: { cliente_id: string; cliente_nombre: string; total_polizas: number; prima_total: number };
        Relationships: [];
      };
      v_siniestros_por_tipo: { Row: { tipo: SiniestroTipo; total: number }; Relationships: [] };
      v_siniestros_por_responsabilidad: {
        Row: { responsabilidad: Responsabilidad; total: number };
        Relationships: [];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
