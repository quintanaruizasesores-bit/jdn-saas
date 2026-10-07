import { describe, it, expect } from 'vitest';
import { normalizeWhatsappPhone, extractArgentinaNsn } from './telefono';

describe('extractArgentinaNsn', () => {
  it('devuelve el NSN cuando ya tiene 10 dígitos', () => {
    expect(extractArgentinaNsn('3515551234')).toBe('3515551234');
  });

  it('quita el 9 inicial de celular (11 dígitos)', () => {
    expect(extractArgentinaNsn('93515551234')).toBe('3515551234');
  });

  it('quita el 15 legacy con área de 3 dígitos (Córdoba)', () => {
    // 351 15 5551234 → 351 5551234
    expect(extractArgentinaNsn('351155551234')).toBe('3515551234');
  });

  it('quita el 15 legacy con área de 2 dígitos (Buenos Aires)', () => {
    // 11 15 55551234 → 11 55551234
    expect(extractArgentinaNsn('111555551234')).toBe('1155551234');
  });

  it('devuelve null para largos no reconocibles', () => {
    expect(extractArgentinaNsn('123')).toBeNull();
    expect(extractArgentinaNsn('123456789')).toBeNull(); // 9 dígitos
  });
});

describe('normalizeWhatsappPhone', () => {
  it('marca vacío cuando no hay teléfono', () => {
    expect(normalizeWhatsappPhone(null)).toEqual({ status: 'empty' });
    expect(normalizeWhatsappPhone('')).toEqual({ status: 'empty' });
    expect(normalizeWhatsappPhone('   ')).toEqual({ status: 'empty' });
  });

  it('normaliza un número nacional con espacios', () => {
    expect(normalizeWhatsappPhone('351 555 1234')).toEqual({
      status: 'ok',
      e164: '5493515551234',
    });
  });

  it('normaliza un número con 0 y 15 y guiones', () => {
    expect(normalizeWhatsappPhone('0351 15 555-1234')).toEqual({
      status: 'ok',
      e164: '5493515551234',
    });
  });

  it('normaliza con paréntesis en el área', () => {
    expect(normalizeWhatsappPhone('(0351) 155551234')).toEqual({
      status: 'ok',
      e164: '5493515551234',
    });
  });

  it('normaliza un internacional +54 9', () => {
    expect(normalizeWhatsappPhone('+54 9 351 555 1234')).toEqual({
      status: 'ok',
      e164: '5493515551234',
    });
  });

  it('normaliza +54 sin el 9', () => {
    expect(normalizeWhatsappPhone('+54 351 555 1234')).toEqual({
      status: 'ok',
      e164: '5493515551234',
    });
  });

  it('normaliza con prefijo 00 internacional', () => {
    expect(normalizeWhatsappPhone('0054 9 351 555 1234')).toEqual({
      status: 'ok',
      e164: '5493515551234',
    });
  });

  it('respeta un internacional de otro país sin inventar nada', () => {
    expect(normalizeWhatsappPhone('+1 415 555 0199')).toEqual({
      status: 'ok',
      e164: '14155550199',
    });
  });

  it('marca inválido cuando no se puede convertir de forma confiable', () => {
    expect(normalizeWhatsappPhone('123')).toEqual({ status: 'invalid', raw: '123' });
    expect(normalizeWhatsappPhone('no-es-un-numero')).toEqual({
      status: 'invalid',
      raw: 'no-es-un-numero',
    });
  });
});
