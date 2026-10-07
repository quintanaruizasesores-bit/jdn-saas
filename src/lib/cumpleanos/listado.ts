/**
 * Derivación en memoria del listado de cumpleaños: a partir de las filas de la
 * base y el "hoy", arma la vista (etiqueta de fecha, edad, días hasta el
 * cumpleaños), el resumen superior y el filtrado + ordenamiento.
 *
 * Se hace del lado del cliente porque el cumpleaños ignora el año (difícil en
 * SQL) y la cartera es acotada. Es lógica pura y testeable.
 *
 * Ventanas de los rangos (y de las cards de resumen), inclusivas desde hoy:
 * - hoy:  faltan 0 días
 * - 7:    faltan 0 a 7 días
 * - 30:   faltan 0 a 30 días
 * - todos: todos los clientes con fecha de nacimiento
 */

import type { ClienteCumpleRow } from '@/services/cumpleanos.service';
import {
  parseIsoDate,
  daysUntilBirthday,
  calcularEdad,
  formatCumpleanos,
  type FechaPartes,
} from './fechas';

export type RangoCumple = 'hoy' | '7' | '30' | 'todos';

export interface ClienteCumpleView {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  fecha_nacimiento: string | null;
  nombreCompleto: string;
  /** "7 de octubre" */
  cumpleLabel: string;
  /** Edad cumplida hoy, o null si no se puede calcular. */
  edad: number | null;
  /** Días hasta el próximo cumpleaños (0 = hoy). */
  dias: number;
  esHoy: boolean;
}

export interface CumpleResumen {
  hoy: number;
  proximos7: number;
  proximos30: number;
}

/** Construye la vista de un cliente, o `null` si la fecha no es parseable. */
export function buildClienteCumpleView(
  row: ClienteCumpleRow,
  today: FechaPartes
): ClienteCumpleView | null {
  const nacimiento = parseIsoDate(row.fecha_nacimiento);
  if (!nacimiento) return null;

  const dias = daysUntilBirthday(nacimiento, today);
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    telefono: row.telefono,
    fecha_nacimiento: row.fecha_nacimiento,
    nombreCompleto: `${row.nombre} ${row.apellido}`.trim(),
    cumpleLabel: formatCumpleanos(nacimiento),
    edad: calcularEdad(nacimiento, today),
    dias,
    esHoy: dias === 0,
  };
}

export function buildClienteCumpleViews(
  rows: ClienteCumpleRow[],
  today: FechaPartes
): ClienteCumpleView[] {
  return rows
    .map((r) => buildClienteCumpleView(r, today))
    .filter((v): v is ClienteCumpleView => v !== null);
}

export function computeResumen(views: ClienteCumpleView[]): CumpleResumen {
  return {
    hoy: views.filter((v) => v.dias === 0).length,
    proximos7: views.filter((v) => v.dias <= 7).length,
    proximos30: views.filter((v) => v.dias <= 30).length,
  };
}

/** Normaliza texto para búsqueda: minúsculas y sin tildes. */
function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function matchesSearch(view: ClienteCumpleView, term: string): boolean {
  const clean = normalizeText(term).trim();
  if (!clean) return true;

  const haystack = normalizeText(view.nombreCompleto);
  const phoneDigits = (view.telefono ?? '').replace(/\D/g, '');
  const termDigits = clean.replace(/\D/g, '');

  return clean
    .split(/\s+/)
    .every(
      (token) =>
        haystack.includes(token) ||
        (!!termDigits && !!phoneDigits && phoneDigits.includes(token.replace(/\D/g, '')))
    );
}

function inRango(dias: number, rango: RangoCumple): boolean {
  switch (rango) {
    case 'hoy':
      return dias === 0;
    case '7':
      return dias <= 7;
    case '30':
      return dias <= 30;
    case 'todos':
      return true;
  }
}

/**
 * Filtra por rango + búsqueda y ordena: primero los de hoy, luego por cercanía
 * del cumpleaños y, a igualdad de días, por nombre. No ordena por año de
 * nacimiento.
 */
export function filterAndSortCumples(
  views: ClienteCumpleView[],
  options: { rango: RangoCumple; search: string }
): ClienteCumpleView[] {
  return views
    .filter((v) => inRango(v.dias, options.rango) && matchesSearch(v, options.search))
    .sort((a, b) => a.dias - b.dias || a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'));
}
