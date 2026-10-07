import { describe, it, expect } from 'vitest';
import { prepareCumpleMessage, type ClienteCumple } from './mensaje';
import { DEFAULT_BIRTHDAY_TEMPLATE } from './plantilla';

const today = { year: 2025, month: 10, day: 7 };

function cliente(overrides: Partial<ClienteCumple> = {}): ClienteCumple {
  return {
    nombre: 'Juan',
    apellido: 'Pérez',
    telefono: '351 555 1234',
    fecha_nacimiento: '1990-10-07',
    ...overrides,
  };
}

describe('prepareCumpleMessage', () => {
  it('genera mensaje personalizado + link wa.me con el número correcto', () => {
    const r = prepareCumpleMessage({
      cliente: cliente(),
      template: DEFAULT_BIRTHDAY_TEMPLATE,
      empresa: 'Seguros XYZ',
      asesor: 'Gaspar',
      today,
    });

    expect(r.phone).toEqual({ status: 'ok', e164: '5493515551234' });
    expect(r.message).toContain('¡Hola Juan! 🎉');
    expect(r.message).toContain('Desde Seguros XYZ');
    expect(r.link).not.toBeNull();

    // El link lleva el número correcto y el texto encodeado = al mensaje.
    expect(r.link!.startsWith('https://wa.me/5493515551234?text=')).toBe(true);
    const text = r.link!.split('text=')[1];
    expect(decodeURIComponent(text)).toBe(r.message);
  });

  it('reemplaza {{nombre_completo}} y {{edad}}', () => {
    const r = prepareCumpleMessage({
      cliente: cliente(),
      template: '{{nombre_completo}} cumple {{edad}}',
      empresa: 'X',
      asesor: 'Y',
      today,
    });
    expect(r.message).toBe('Juan Pérez cumple 35');
  });

  it('sin teléfono → no genera link', () => {
    const r = prepareCumpleMessage({
      cliente: cliente({ telefono: null }),
      template: DEFAULT_BIRTHDAY_TEMPLATE,
      empresa: 'X',
      asesor: 'Y',
      today,
    });
    expect(r.phone).toEqual({ status: 'empty' });
    expect(r.link).toBeNull();
  });

  it('teléfono inválido → no genera link pero sí mensaje', () => {
    const r = prepareCumpleMessage({
      cliente: cliente({ telefono: '123' }),
      template: DEFAULT_BIRTHDAY_TEMPLATE,
      empresa: 'X',
      asesor: 'Y',
      today,
    });
    expect(r.phone.status).toBe('invalid');
    expect(r.link).toBeNull();
    expect(r.message).toContain('¡Hola Juan!');
  });
});
