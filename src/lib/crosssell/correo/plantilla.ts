/**
 * Render de plantillas y generación del borrador personalizado. Las variables
 * se interpolan con `{{clave}}`. Todo el contenido dinámico se escapa al pasar a
 * HTML. El texto de ejemplo es solo un punto de partida editable y **nunca**
 * afirma que el cliente carezca de la cobertura en otra aseguradora.
 */
import { construirEmailLayout, escapeHtml, EMPRESA_NOMBRE } from '@/lib/email/layout';

export interface VariablesCorreo {
  nombre: string;
  apellido: string;
  ramoAsegurado: string;
  coberturaOfrecida: string;
  empresa: string;
}

/** Variables que el usuario puede insertar en asunto/cuerpo. */
export const VARIABLES_DISPONIBLES: { clave: keyof VariablesCorreo; label: string }[] =
  [
    { clave: 'nombre', label: 'Nombre' },
    { clave: 'apellido', label: 'Apellido' },
    { clave: 'ramoAsegurado', label: 'Cobertura actual' },
    { clave: 'coberturaOfrecida', label: 'Cobertura ofrecida' },
    { clave: 'empresa', label: 'Empresa' },
  ];

/** Reemplaza `{{clave}}` por el valor correspondiente (claves desconocidas vacías). */
export function renderPlantilla(
  texto: string,
  vars: VariablesCorreo
): string {
  const dict = vars as unknown as Record<string, string>;
  return texto.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (_m, clave: string) => {
    return dict[clave] ?? '';
  });
}

/**
 * Borrador de ejemplo (editable). Se genera distinto según la cobertura ofrecida.
 * No afirma ausencia de cobertura en otra compañía: solo propone sumar con nosotros.
 */
export function generarBorrador(vars: {
  nombre: string;
  ramoAsegurado: string;
  coberturaOfrecida: string;
}): { asunto: string; cuerpo: string } {
  const asunto = `${vars.nombre}, ¿sumamos tu ${vars.coberturaOfrecida}?`;
  const cuerpo = [
    `Hola ${vars.nombre}, ¿cómo estás?`,
    '',
    `Como ya confiás en nosotros para tu ${vars.ramoAsegurado}, queríamos contarte que también podemos ayudarte con ${vars.coberturaOfrecida}.`,
    '',
    'Tenemos distintas alternativas y podemos prepararte una propuesta personalizada, sin compromiso.',
    '',
    'Si te interesa, simplemente respondé este correo.',
    '',
    '¡Saludos!',
    `Equipo de ${EMPRESA_NOMBRE}.`,
  ].join('\n');
  return { asunto, cuerpo };
}

/** Convierte texto plano (con saltos de línea) en HTML escapado por párrafos. */
export function textoAHtml(texto: string): string {
  return texto
    .split(/\n{2,}/)
    .map((bloque) => {
      const conSaltos = escapeHtml(bloque.trim()).replace(/\n/g, '<br>');
      return conSaltos ? `<p style="margin:0 0 12px;">${conSaltos}</p>` : '';
    })
    .filter(Boolean)
    .join('\n');
}

export interface CorreoRenderizado {
  asunto: string;
  html: string;
  text: string;
}

/**
 * Construye el correo final: interpola variables en asunto y cuerpo, arma el
 * HTML con el layout de marca y el pie de baja, y devuelve también el texto plano.
 */
export function construirCorreo(params: {
  asunto: string;
  cuerpo: string;
  vars: VariablesCorreo;
  bajaUrl?: string | null;
}): CorreoRenderizado {
  const asunto = renderPlantilla(params.asunto, params.vars).trim();
  const cuerpoTexto = renderPlantilla(params.cuerpo, params.vars).trim();
  const textBaja = params.bajaUrl
    ? `\n\n—\nPara no recibir más propuestas comerciales, dale de baja: ${params.bajaUrl}`
    : '';
  const html = construirEmailLayout({
    asunto,
    cuerpoHtml: textoAHtml(cuerpoTexto),
    bajaUrl: params.bajaUrl,
    empresa: params.vars.empresa,
  });
  return { asunto, html, text: cuerpoTexto + textBaja };
}
