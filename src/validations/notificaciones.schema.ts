import { z } from 'zod';
import { APP_TIMEZONE } from '@/lib/cumpleanos/fechas';

/** `true` si la zona horaria IANA es reconocida por el runtime. */
export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Preferencias de recordatorios por email. El correo de destino es opcional
 * mientras los recordatorios están desactivados; al activarlos pasa a ser
 * obligatorio y debe ser un email válido.
 */
export const emailNotifPrefsSchema = z
  .object({
    activo: z.boolean(),
    destinatario: z
      .string()
      .trim()
      .email('Correo de destino inválido')
      .nullable()
      .or(z.literal('').transform(() => null)),
    hora_local: z.number().int().min(0).max(23),
    zona_horaria: z
      .string()
      .refine(isValidTimeZone, 'Zona horaria inválida')
      .default(APP_TIMEZONE),
  })
  .refine((p) => !p.activo || !!p.destinatario, {
    message: 'Indicá un correo de destino para activar los recordatorios.',
    path: ['destinatario'],
  });

export type EmailNotifPrefsInput = z.input<typeof emailNotifPrefsSchema>;
export type EmailNotifPrefs = z.output<typeof emailNotifPrefsSchema>;
