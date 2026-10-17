import { z } from 'zod';

export const polizaSchema = z
  .object({
    cliente_id: z.string().uuid('Cliente requerido'),
    compania_id: z.string().uuid().optional().nullable(),
    ramo_id: z.string().uuid().optional().nullable(),
    estado: z.enum(['VIGENTE', 'HISTORICA', 'BAJA']),
    fecha_inicio: z.string().optional().nullable(),
    fecha_fin: z.string().optional().nullable(),
    fecha_baja: z.string().optional().nullable(),
    comision_desde: z.string().optional().nullable(),
    prima: z.number().min(0, 'El premio mensual debe ser positivo'),
    detalle: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.estado === 'BAJA' && data.comision_desde && !data.fecha_baja) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha_baja'],
        message: 'Indicá desde qué fecha deja de aportar',
      });
    }
    if (
      data.fecha_inicio &&
      data.fecha_fin &&
      data.fecha_fin < data.fecha_inicio
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha_fin'],
        message: 'El vencimiento no puede ser anterior al inicio',
      });
    }
  });

export type PolizaFormData = z.infer<typeof polizaSchema>;

export const renovacionSchema = z.object({
  fecha_inicio: z.string().min(1, 'Fecha inicio requerida'),
  fecha_fin: z.string().optional().nullable(),
  prima: z.number().min(0),
  nota: z.string().optional(),
});
