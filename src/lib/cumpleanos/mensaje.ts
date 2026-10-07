/**
 * Orquestador puro: a partir de un cliente + la configuración + el asesor,
 * arma el mensaje personalizado, normaliza el teléfono y genera el link
 * `wa.me`. Es el punto que combina todas las piezas (`telefono`, `plantilla`,
 * `fechas`, `whatsapp`) y el objetivo principal de los tests de integración.
 */

import type { Cliente } from '@/types/database';
import { normalizeWhatsappPhone, type TelefonoResult } from './telefono';
import { renderPlantilla, type PlantillaVariables } from './plantilla';
import { buildWhatsappLink } from './whatsapp';
import { calcularEdad, parseIsoDate, type FechaPartes } from './fechas';

/** Datos mínimos del cliente necesarios para armar el mensaje. */
export type ClienteCumple = Pick<
  Cliente,
  'nombre' | 'apellido' | 'telefono' | 'fecha_nacimiento'
>;

export interface PrepareCumpleInput {
  cliente: ClienteCumple;
  template: string;
  empresa: string;
  asesor: string;
  /** Hoy (zona de la app) para calcular `{{edad}}`. */
  today: FechaPartes;
}

export interface PrepareCumpleResult {
  /** Mensaje con las variables ya reemplazadas (para la vista previa). */
  message: string;
  /** Resultado de normalizar el teléfono. */
  phone: TelefonoResult;
  /** Link `wa.me` listo, o `null` si el teléfono falta o es inválido. */
  link: string | null;
}

function buildVariables(input: PrepareCumpleInput): PlantillaVariables {
  const { cliente, empresa, asesor, today } = input;
  const nombre = cliente.nombre ?? '';
  const apellido = cliente.apellido ?? '';
  const nacimiento = parseIsoDate(cliente.fecha_nacimiento);
  const edad = nacimiento ? calcularEdad(nacimiento, today) : null;

  return {
    nombre,
    apellido,
    nombre_completo: `${nombre} ${apellido}`.trim(),
    empresa,
    asesor,
    edad: edad != null ? String(edad) : '',
  };
}

export function prepareCumpleMessage(input: PrepareCumpleInput): PrepareCumpleResult {
  const message = renderPlantilla(input.template, buildVariables(input));
  const phone = normalizeWhatsappPhone(input.cliente.telefono);
  const link = phone.status === 'ok' ? buildWhatsappLink(phone.e164, message) : null;
  return { message, phone, link };
}
