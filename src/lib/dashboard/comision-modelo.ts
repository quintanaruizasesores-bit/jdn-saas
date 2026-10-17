import type { PolizaEstado, PrimaPeriodicidad } from '@/types/database';

export const COMISION_RATE = 0.14;
/** Confirmado por el usuario el 17/10/2026 para los importes ya cargados. */
export const PERIODICIDAD_LEGACY_CONFIRMADA: PrimaPeriodicidad = 'MENSUAL';

export const PERIODICIDADES_PRIMA: Record<PrimaPeriodicidad, string> = {
  MENSUAL: 'Mensual',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  CUATRIMESTRAL: 'Cuatrimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
  UNICA: 'Única · no recurrente',
};

export interface PolizaComision {
  id: string;
  estado: PolizaEstado;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  prima: number | string | null;
  prima_periodicidad?: PrimaPeriodicidad | null;
  fecha_baja?: string | null;
  /** Fecha de efecto explícita de esta versión financiera. */
  comision_desde?: string | null;
  updated_at?: string;
  legacy_id?: number | null;
  fechasVerificadas?: boolean;
}

export interface HistorialComision {
  id: string;
  poliza_id: string;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  created_at: string;
  completo?: boolean;
  fecha_efecto?: string | null;
  version_orden?: number;
}

export interface ComisionMensual {
  mes: string;
  etiqueta: string;
  corte: string;
  comision: number | null;
  comisionConocida: number;
  polizas: number;
  sinDatos: number;
  sinHistorial: number;
  variacion: number | null;
  variacionPorcentual: number | null;
  enCurso: boolean;
}

export const MOTIVOS_COMISION_PENDIENTE = {
  PREMIO: {
    titulo: 'Premio mensual sin cargar',
    ayuda: 'Cargá el importe mensual real y guardá la póliza.',
  },
  FECHAS: {
    titulo: 'Fechas inválidas o inconsistentes',
    ayuda: 'Revisá las fechas de vigencia y baja de la póliza.',
  },
  PERIODICIDAD: {
    titulo: 'Periodicidad sin identificar',
    ayuda:
      'Requiere revisar el registro de origen; los premios de esta cartera son mensuales.',
  },
  VERSION: {
    titulo: 'Sin versión acreditada para hoy',
    ayuda:
      'Revisá la fecha de efecto y el historial. No adelantes un cambio futuro para completar el cálculo.',
  },
} as const;

export type MotivoComisionPendiente = keyof typeof MOTIVOS_COMISION_PENDIENTE;
export interface ComisionPendiente {
  polizaId: string;
  motivo: MotivoComisionPendiente;
}

export interface ComisionDashboard {
  /** Sólo los registros sin aporte calculable al corte actual, no huecos históricos. */
  pendientes: ComisionPendiente[];
  serie: ComisionMensual[];
  resumen: {
    comisionActual: number | null;
    variacion: number | null;
    variacionPorcentual: number | null;
    polizas: number;
    sinDatos: number;
    anualizada: number | null;
  };
  totalPolizas: number;
}
