import { z } from 'zod';

export const companiaSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  codigo: z.string().optional().nullable(),
  estado: z.enum(['ACTIVA', 'INACTIVA']),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Color inválido').optional().nullable(),
});

export const ramoSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  codigo: z.string().optional().nullable(),
});
