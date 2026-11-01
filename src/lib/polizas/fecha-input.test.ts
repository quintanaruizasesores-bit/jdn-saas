import { describe, expect, it } from 'vitest';
import { displayDate, isIsoDate, parseDisplayDate } from './fecha-input';

describe('fechas visibles de póliza', () => {
  it('convierte entre DD/MM/AAAA e ISO sin cambiar el día', () => {
    expect(displayDate('2026-11-01')).toBe('01/11/2026');
    expect(parseDisplayDate('01/11/2026')).toBe('2026-11-01');
  });

  it('no convierte fechas imposibles o incompletas', () => {
    expect(parseDisplayDate('31/02/2026')).toBe('31/02/2026');
    expect(parseDisplayDate('01/11/')).toBe('01/11/');
    expect(isIsoDate('2026-02-31')).toBe(false);
  });
});
