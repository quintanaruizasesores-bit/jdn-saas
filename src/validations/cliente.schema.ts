import { z } from 'zod';

export const clienteSchema = z.object({
  nombre: z.string().optional().nullable(),
  apellido: z.string().optional().nullable(),
  dni: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  localidad: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  fecha_nacimiento: z.string().optional().nullable(),
});

export type ClienteFormData = z.infer<typeof clienteSchema>;
