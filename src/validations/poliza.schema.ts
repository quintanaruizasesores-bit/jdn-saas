import { z } from 'zod';

export const polizaSchema = z.object({
  cliente_id: z.string().uuid('Cliente requerido'),
  compania_id: z.string().uuid().optional().nullable(),
  ramo_id: z.string().uuid().optional().nullable(),
  numero_poliza: z.string().min(1, 'Número de póliza requerido'),
  estado: z.enum(['VIGENTE', 'HISTORICA', 'BAJA']),
  fecha_inicio: z.string().optional().nullable(),
  fecha_fin: z.string().optional().nullable(),
  prima: z.number().min(0, 'Prima debe ser positiva'),
  detalle: z.string().optional().nullable(),
});

export type PolizaFormData = z.infer<typeof polizaSchema>;

export const renovacionSchema = z.object({
  fecha_inicio: z.string().min(1, 'Fecha inicio requerida'),
  fecha_fin: z.string().min(1, 'Fecha fin requerida'),
  prima: z.number().min(0),
  nota: z.string().optional(),
});
