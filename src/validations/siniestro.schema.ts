import { z } from 'zod';

export const siniestroSchema = z.object({
  cliente_id: z.string().uuid('Cliente requerido'),
  poliza_id: z.string().uuid().optional().nullable(),
  tipo: z.enum(['CHOQUE', 'ROBO', 'INCENDIO', 'GRANIZO', 'OTROS']),
  fecha: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  responsabilidad: z.enum(['RESPONSABLE', 'NO_RESPONSABLE', 'INDETERMINADA']),
  monto_estimado: z.number().min(0),
});

export type SiniestroFormData = z.infer<typeof siniestroSchema>;
