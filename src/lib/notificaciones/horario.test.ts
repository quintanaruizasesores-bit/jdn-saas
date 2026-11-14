import { describe, expect, it } from 'vitest';
import { fechaLocal, horaLocal } from './horario';

const BA = 'America/Argentina/Buenos_Aires';

describe('horario local', () => {
  it('fechaLocal usa la zona del usuario (antes de medianoche UTC)', () => {
    // 02:30 UTC del 2/11 es aún 23:30 del 1/11 en Buenos Aires (UTC-3).
    expect(fechaLocal(BA, new Date('2026-11-02T02:30:00Z'))).toBe('2026-11-01');
  });

  it('horaLocal convierte a la zona indicada', () => {
    // 12:00 UTC = 09:00 en Buenos Aires.
    expect(horaLocal(BA, new Date('2026-11-10T12:00:00Z'))).toBe(9);
    // Misma marca en Madrid (UTC+1 en noviembre) = 13:00.
    expect(horaLocal('Europe/Madrid', new Date('2026-11-10T12:00:00Z'))).toBe(
      13
    );
  });

  it('medianoche local da hora 0, no 24', () => {
    // 03:00 UTC = 00:00 en Buenos Aires.
    expect(horaLocal(BA, new Date('2026-11-10T03:00:00Z'))).toBe(0);
  });
});
