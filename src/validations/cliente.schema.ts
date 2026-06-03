import { z } from 'zod';

export const clienteSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  apellido: z.string().min(1, 'Apellido requerido'),
  dni: z.string().optional().nullable(),
  cuit: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  localidad: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  fecha_nacimiento: z.string().optional().nullable(),
});

export type ClienteFormData = z.infer<typeof clienteSchema>;
