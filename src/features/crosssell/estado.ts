import type { CrossSellOportunidadEstado } from '@/types/database';

export const ESTADO_LABEL: Record<CrossSellOportunidadEstado, string> = {
  NUEVA: 'Nueva',
  VISTA: 'Vista',
  CONTACTADA: 'Contactada',
  EN_NEGOCIACION: 'En negociación',
  CONVERTIDA: 'Convertida',
  DESCARTADA: 'Descartada',
  NO_APLICA: 'No aplica',
};

type BadgeVariant = 'vigente' | 'historica' | 'baja' | 'default' | 'primary';

export const ESTADO_VARIANT: Record<CrossSellOportunidadEstado, BadgeVariant> = {
  NUEVA: 'primary',
  VISTA: 'default',
  CONTACTADA: 'historica',
  EN_NEGOCIACION: 'historica',
  CONVERTIDA: 'vigente',
  DESCARTADA: 'baja',
  NO_APLICA: 'baja',
};

export const ESTADO_OPCIONES: CrossSellOportunidadEstado[] = [
  'NUEVA',
  'VISTA',
  'CONTACTADA',
  'EN_NEGOCIACION',
  'CONVERTIDA',
  'DESCARTADA',
  'NO_APLICA',
];
