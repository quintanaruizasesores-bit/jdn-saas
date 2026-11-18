import { z } from 'zod';

const uuid = z.string().uuid('Identificador inválido');

/** Categoría de cobertura normalizada. */
export const crossSellCategoriaSchema = z.object({
  nombre: z.string().trim().min(1, 'Indicá un nombre').max(80),
  slug: z
    .string()
    .trim()
    .min(1, 'Indicá una clave')
    .max(40)
    .regex(/^[a-z0-9_]+$/, 'Usá minúsculas, números y guion bajo'),
  descripcion: z.string().trim().max(300).nullish(),
  activa: z.boolean().default(true),
  orden: z.number().int().min(0).max(999).default(0),
});
export type CrossSellCategoriaInput = z.infer<typeof crossSellCategoriaSchema>;

/** Asignación ramo -> categoría. */
export const crossSellRamoMapSchema = z.object({
  ramo_id: uuid,
  categoria_id: uuid,
  origen: z.enum(['AUTO', 'MANUAL']).default('MANUAL'),
});
export type CrossSellRamoMapInput = z.infer<typeof crossSellRamoMapSchema>;

/** Condiciones extensibles de una regla. */
export const crossSellReglaCondicionesSchema = z.object({
  min_polizas: z.number().int().min(1).max(99).optional(),
  prima_minima: z.number().min(0).optional(),
  provincia: z.string().trim().max(60).optional(),
  excluir_alta_siniestralidad: z.boolean().optional(),
});

/** Regla comercial configurable. */
export const crossSellReglaSchema = z
  .object({
    nombre: z.string().trim().min(1, 'Indicá un nombre').max(100),
    descripcion: z.string().trim().max(400).nullish(),
    activa: z.boolean().default(true),
    prioridad: z.number().int().min(0).max(100).default(50),
    categorias_requeridas: z.array(uuid).default([]),
    modo: z.enum(['ALL', 'ANY']).default('ANY'),
    categoria_objetivo_id: uuid,
    condiciones: crossSellReglaCondicionesSchema.default({}),
  })
  .refine((r) => !r.categorias_requeridas.includes(r.categoria_objetivo_id), {
    message: 'La categoría objetivo no puede estar entre las requeridas.',
    path: ['categoria_objetivo_id'],
  });
export type CrossSellReglaInput = z.infer<typeof crossSellReglaSchema>;

/** Cambio de estado / nota de una oportunidad. */
export const crossSellOportunidadUpdateSchema = z.object({
  estado: z
    .enum([
      'NUEVA',
      'VISTA',
      'CONTACTADA',
      'EN_NEGOCIACION',
      'CONVERTIDA',
      'DESCARTADA',
      'NO_APLICA',
    ])
    .optional(),
  nota: z.string().trim().max(1000).nullish(),
  cierre_motivo: z.string().trim().max(300).nullish(),
});
export type CrossSellOportunidadUpdateInput = z.infer<
  typeof crossSellOportunidadUpdateSchema
>;

/** Exclusión de un cliente (global si categoria_id es null). */
export const crossSellExclusionSchema = z.object({
  cliente_id: uuid,
  categoria_id: uuid.nullish(),
  motivo: z.string().trim().max(300).nullish(),
});
export type CrossSellExclusionInput = z.infer<typeof crossSellExclusionSchema>;

/** Plantilla de correo reutilizable. */
export const crossSellPlantillaSchema = z.object({
  nombre: z.string().trim().min(1, 'Indicá un nombre').max(100),
  asunto: z.string().trim().min(1, 'Indicá un asunto').max(200),
  cuerpo: z.string().trim().min(1, 'Escribí el cuerpo del correo').max(10000),
  activa: z.boolean().default(true),
});
export type CrossSellPlantillaInput = z.infer<typeof crossSellPlantillaSchema>;

/**
 * Guardado de un correo (borrador). El asunto y el cuerpo son editables; el
 * destinatario se deriva del cliente, pero se admite corregirlo.
 */
export const crossSellCorreoDraftSchema = z.object({
  oportunidad_id: uuid,
  asunto: z.string().trim().min(1, 'Indicá un asunto').max(200),
  cuerpo: z.string().trim().min(1, 'Escribí el mensaje').max(10000),
  destinatario_email: z
    .string()
    .trim()
    .email('Correo de destino inválido')
    .max(320),
  plantilla_id: uuid.nullish(),
});
export type CrossSellCorreoDraftInput = z.infer<
  typeof crossSellCorreoDraftSchema
>;

/** Confirmación de envío de un correo individual. */
export const crossSellCorreoEnviarSchema = z.object({
  correo_id: uuid,
  /** Reenviar aunque exista un envío previo para la misma cobertura. */
  confirmar_reenvio: z.boolean().default(false),
});
export type CrossSellCorreoEnviarInput = z.infer<
  typeof crossSellCorreoEnviarSchema
>;
