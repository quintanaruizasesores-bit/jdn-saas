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
  variacion: number | null;
  variacionPorcentual: number | null;
  enCurso: boolean;
}

export interface ComisionDashboard {
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
