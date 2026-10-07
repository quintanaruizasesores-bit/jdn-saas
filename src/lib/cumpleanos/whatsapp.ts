/**
 * Construcción del link `wa.me`. NO envía mensajes: solo arma la URL con el
 * mensaje precargado. El usuario decide si finalmente lo envía desde WhatsApp.
 */

/**
 * Arma `https://wa.me/<e164>?text=<mensaje>` con el mensaje URL-encoded.
 *
 * `encodeURIComponent` protege espacios, saltos de línea, emojis, tildes y
 * signos de puntuación. `e164` debe venir ya normalizado (solo dígitos, sin
 * `+`), tal como lo devuelve `normalizeWhatsappPhone`.
 */
export function buildWhatsappLink(e164: string, message: string): string {
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}
