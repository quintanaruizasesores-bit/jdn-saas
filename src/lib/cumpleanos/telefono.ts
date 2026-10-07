/**
 * Normalización de teléfonos para generar links de WhatsApp (`wa.me`).
 *
 * Los teléfonos de la cartera se guardan como texto libre (columna
 * `clientes.telefono`), con formatos heterogéneos: "351 555 1234",
 * "0351 15 555-1234", "+54 9 351 5551234", "(0351) 155551234", etc.
 *
 * `wa.me` requiere el número en formato internacional, SOLO dígitos y sin `+`.
 * Para Argentina el formato de WhatsApp es `54` + `9` + los 10 dígitos del
 * Número Significativo Nacional (NSN = código de área + abonado). El `0` de
 * larga distancia y el `15` de celular son artefactos de la marcación local y
 * se descartan.
 *
 * La lógica es pura (sin red ni DOM) para poder testearla aislada, igual que
 * `lib/clientes/*`. NO inventa códigos de país: si no puede convertir el número
 * de forma confiable devuelve `{ status: 'invalid' }` y la UI deshabilita el
 * botón de WhatsApp.
 */

/** Código de país por defecto de la cartera (Argentina). */
export const DEFAULT_COUNTRY_CODE = '54';

/** Largo mínimo/máximo de un número E.164 (sin el `+`). */
const MIN_E164_DIGITS = 8;
const MAX_E164_DIGITS = 15;

export type TelefonoResult =
  | { status: 'empty' }
  | { status: 'invalid'; raw: string }
  | { status: 'ok'; e164: string };

function isValidE164Length(digits: string): boolean {
  return digits.length >= MIN_E164_DIGITS && digits.length <= MAX_E164_DIGITS;
}

/**
 * A partir de los dígitos de un número argentino SIN código de país ni `0` de
 * larga distancia, devuelve el NSN de 10 dígitos (área + abonado) o `null` si
 * no se puede determinar de forma confiable.
 *
 * Casos contemplados (los códigos de área argentinos tienen 2 a 4 dígitos y el
 * NSN siempre suma 10):
 * - 10 dígitos → ya es el NSN.
 * - 11 dígitos que empiezan con `9` → el `9` de celular antepuesto al NSN.
 * - 12 dígitos → contiene el `15` legacy pegado después del área; se quita.
 */
export function extractArgentinaNsn(digits: string): string | null {
  if (digits.length === 10) return digits;

  if (digits.length === 11 && digits.startsWith('9')) {
    return digits.slice(1);
  }

  if (digits.length === 12) {
    // El `15` aparece justo después del código de área (posición 2, 3 o 4).
    for (const areaLen of [2, 3, 4]) {
      if (digits.slice(areaLen, areaLen + 2) === '15') {
        const nsn = digits.slice(0, areaLen) + digits.slice(areaLen + 2);
        if (nsn.length === 10) return nsn;
      }
    }
  }

  return null;
}

/**
 * Construye el E.164 (solo dígitos) de un número argentino a partir de sus
 * dígitos nacionales, o `null` si no es confiable. Antepone siempre `549`
 * porque en Argentina WhatsApp opera sobre celulares (que requieren el `9`).
 */
function buildArgentinaE164(nationalDigits: string): string | null {
  const nsn = extractArgentinaNsn(nationalDigits);
  if (!nsn) return null;
  return `549${nsn}`;
}

/**
 * Normaliza un teléfono de texto libre a un E.164 apto para `wa.me`.
 *
 * @param raw           El teléfono tal como está cargado (puede venir null).
 * @param countryCode   Código de país por defecto para números nacionales.
 */
export function normalizeWhatsappPhone(
  raw: string | null | undefined,
  countryCode: string = DEFAULT_COUNTRY_CODE
): TelefonoResult {
  const value = (raw ?? '').trim();
  if (!value) return { status: 'empty' };

  const digits = value.replace(/\D/g, '');
  if (!digits) return { status: 'invalid', raw: value };

  const hasPlus = /^\+/.test(value);
  const hasIntlPrefix = hasPlus || digits.startsWith('00');

  // 1) Número internacional explícito (`+…` o `00…`).
  if (hasIntlPrefix) {
    const intl = digits.replace(/^00/, '');
    if (intl.startsWith(countryCode) && countryCode === DEFAULT_COUNTRY_CODE) {
      const e164 = buildArgentinaE164(intl.slice(countryCode.length));
      return e164 ? { status: 'ok', e164 } : { status: 'invalid', raw: value };
    }
    // Otro país: confiamos en el número tal cual (no inventamos nada).
    return isValidE164Length(intl)
      ? { status: 'ok', e164: intl }
      : { status: 'invalid', raw: value };
  }

  // 2) Código de país argentino sin `+` (p. ej. "54 9 351…").
  if (countryCode === DEFAULT_COUNTRY_CODE && digits.startsWith('54') && digits.length >= 12) {
    const e164 = buildArgentinaE164(digits.slice(2));
    return e164 ? { status: 'ok', e164 } : { status: 'invalid', raw: value };
  }

  // 3) Número nacional: se quita un único `0` de larga distancia inicial.
  if (countryCode === DEFAULT_COUNTRY_CODE) {
    const national = digits.startsWith('0') ? digits.slice(1) : digits;
    const e164 = buildArgentinaE164(national);
    return e164 ? { status: 'ok', e164 } : { status: 'invalid', raw: value };
  }

  // 4) País por defecto no-AR: anteponemos el código al nacional sin más lógica.
  const national = digits.startsWith('0') ? digits.slice(1) : digits;
  const e164 = `${countryCode}${national}`;
  return isValidE164Length(e164)
    ? { status: 'ok', e164 }
    : { status: 'invalid', raw: value };
}
