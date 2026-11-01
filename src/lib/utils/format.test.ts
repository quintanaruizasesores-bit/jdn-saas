import { describe, expect, it } from 'vitest';
import { formatDate } from './format';

describe('formatDate', () => {
  it('formatea una fecha DATE pura sin corrimiento de zona horaria', () => {
    const out = formatDate('2026-11-01');
    expect(out).not.toMatch(/invalid/i);
    // El día no debe correrse: sigue siendo 01 de noviembre.
    expect(out).toMatch(/01.*nov.*2026/);
  });

  it('formatea un TIMESTAMPTZ (con hora y offset) sin devolver Invalid Date', () => {
    const out = formatDate('2026-11-01T14:23:45.123456+00:00');
    expect(out).not.toMatch(/invalid/i);
    expect(out).toContain('2026');
  });

  it('acepta el formato de timestamp de Postgres con espacio', () => {
    const out = formatDate('2026-11-01 14:23:45+00');
    expect(out).not.toMatch(/invalid/i);
    expect(out).toContain('2026');
  });

  it('devuelve — cuando no hay valor', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('devuelve el valor original si no es una fecha parseable', () => {
    expect(formatDate('no-es-fecha')).toBe('no-es-fecha');
  });
});
