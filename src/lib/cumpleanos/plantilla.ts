/**
 * Plantilla configurable del mensaje de cumpleaños y reemplazo de variables.
 *
 * El texto por defecto es solo un ejemplo: la plantilla real se edita desde
 * Configuración y se persiste en la base (tabla `app_settings`). Nunca se
 * hardcodea el mensaje final en el frontend.
 */

/** Plantilla de ejemplo usada cuando el usuario todavía no configuró una. */
export const DEFAULT_BIRTHDAY_TEMPLATE = `¡Hola {{nombre}}! 🎉

Desde {{empresa}} queremos desearte un muy feliz cumpleaños.

Esperamos que tengas un excelente día y que se cumplan todos tus deseos.

¡Un abrazo!
{{asesor}}`;

/** Nombre de empresa por defecto si no se configuró uno. */
export const DEFAULT_EMPRESA = 'tu aseguradora';

export interface PlantillaVariables {
  nombre: string;
  apellido: string;
  nombre_completo: string;
  empresa: string;
  asesor: string;
  edad: string;
}

/** Variables disponibles para mostrarle al usuario al editar la plantilla. */
export const AVAILABLE_VARIABLES: ReadonlyArray<{
  key: keyof PlantillaVariables;
  token: string;
  label: string;
}> = [
  { key: 'nombre', token: '{{nombre}}', label: 'Nombre del cliente' },
  { key: 'apellido', token: '{{apellido}}', label: 'Apellido del cliente' },
  { key: 'nombre_completo', token: '{{nombre_completo}}', label: 'Nombre y apellido' },
  { key: 'empresa', token: '{{empresa}}', label: 'Nombre de la empresa/aseguradora' },
  { key: 'asesor', token: '{{asesor}}', label: 'Nombre del usuario/asesor' },
  { key: 'edad', token: '{{edad}}', label: 'Edad que cumple el cliente' },
];

const VARIABLE_KEYS = new Set<string>(AVAILABLE_VARIABLES.map((v) => v.key));

/**
 * Reemplaza las variables `{{clave}}` de la plantilla por sus valores. Tolera
 * espacios dentro de las llaves (`{{ nombre }}`). Las variables desconocidas se
 * dejan intactas para que el usuario detecte errores de tipeo.
 */
export function renderPlantilla(
  template: string,
  vars: Partial<PlantillaVariables>
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    if (!VARIABLE_KEYS.has(key)) return match;
    const value = vars[key as keyof PlantillaVariables];
    return value ?? '';
  });
}
