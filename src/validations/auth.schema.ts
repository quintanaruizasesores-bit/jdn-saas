import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

const camposContrasena = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
});

const errorConfirmacion = {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
};

export const registerSchema = camposContrasena
  .extend({
    nombre: z.string().min(2, 'Nombre requerido'),
    email: z.string().email('Email inválido'),
  })
  .refine((data) => data.password === data.confirmPassword, errorConfirmacion);

export const recuperarSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const nuevaContrasenaSchema = camposContrasena.refine(
  (data) => data.password === data.confirmPassword,
  errorConfirmacion
);
