import { z } from 'zod';

export const tareaSchema = z.object({
  cliente_id: z.string().uuid().optional().nullable(),
  titulo: z.string().min(1, 'Título requerido'),
  descripcion: z.string().optional().nullable(),
  fecha_vencimiento: z.string().optional().nullable(),
  estado: z.enum(['PENDIENTE', 'EN_PROCESO', 'FINALIZADA']),
});

export type TareaFormData = z.infer<typeof tareaSchema>;
