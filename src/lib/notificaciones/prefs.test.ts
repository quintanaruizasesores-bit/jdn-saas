import { describe, expect, it } from 'vitest';
import { DEFAULT_EMAIL_NOTIF_PREFS, normalizePrefs } from './prefs';
import { emailNotifPrefsSchema } from '@/validations/notificaciones.schema';

describe('normalizePrefs', () => {
  it('devuelve los valores por defecto cuando no hay fila', () => {
    expect(normalizePrefs(null)).toEqual(DEFAULT_EMAIL_NOTIF_PREFS);
    expect(normalizePrefs(undefined).activo).toBe(false);
  });

  it('corrige hora fuera de rango y zona inválida', () => {
    const p = normalizePrefs({
      activo: true,
      destinatario: ' avisos@correo.com ',
      hora_local: 99,
      zona_horaria: 'No/Existe',
    });
    expect(p.hora_local).toBe(DEFAULT_EMAIL_NOTIF_PREFS.hora_local);
    expect(p.zona_horaria).toBe(DEFAULT_EMAIL_NOTIF_PREFS.zona_horaria);
    expect(p.destinatario).toBe('avisos@correo.com');
    expect(p.activo).toBe(true);
  });

  it('normaliza destinatario vacío a null', () => {
    expect(normalizePrefs({ destinatario: '   ' }).destinatario).toBeNull();
  });
});

describe('emailNotifPrefsSchema', () => {
  it('exige correo de destino al activar', () => {
    const r = emailNotifPrefsSchema.safeParse({
      activo: true,
      destinatario: '',
      hora_local: 8,
      zona_horaria: 'America/Argentina/Buenos_Aires',
    });
    expect(r.success).toBe(false);
  });

  it('acepta desactivado sin correo', () => {
    const r = emailNotifPrefsSchema.safeParse({
      activo: false,
      destinatario: '',
      hora_local: 8,
      zona_horaria: 'America/Argentina/Buenos_Aires',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.destinatario).toBeNull();
  });

  it('rechaza email y zona inválidos', () => {
    expect(
      emailNotifPrefsSchema.safeParse({
        activo: true,
        destinatario: 'no-es-email',
        hora_local: 8,
        zona_horaria: 'America/Argentina/Buenos_Aires',
      }).success
    ).toBe(false);
    expect(
      emailNotifPrefsSchema.safeParse({
        activo: false,
        destinatario: null,
        hora_local: 8,
        zona_horaria: 'Zona/Falsa',
      }).success
    ).toBe(false);
  });

  it('rechaza hora fuera de 0–23', () => {
    expect(
      emailNotifPrefsSchema.safeParse({
        activo: false,
        destinatario: null,
        hora_local: 24,
        zona_horaria: 'America/Argentina/Buenos_Aires',
      }).success
    ).toBe(false);
  });
});
