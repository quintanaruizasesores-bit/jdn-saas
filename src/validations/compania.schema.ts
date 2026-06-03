import { z } from 'zod';

export const companiaSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  codigo: z.string().optional().nullable(),
  estado: z.enum(['ACTIVA', 'INACTIVA']),
});

export const ramoSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  codigo: z.string().optional().nullable(),
});
