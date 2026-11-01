import { describe, expect, it } from 'vitest';
import { getTaskAlertWindow, taskDueLabel } from './alertas';

describe('ventana de alertas de tareas', () => {
  it('usa la fecha argentina incluso antes de medianoche local', () => {
    expect(getTaskAlertWindow(new Date('2026-11-02T02:30:00Z'))).toEqual({
      today: '2026-11-01',
      through: '2026-11-08',
    });
  });

  it('incluye exactamente siete días y cruza meses y años', () => {
    expect(getTaskAlertWindow(new Date('2026-12-31T15:00:00Z'))).toEqual({
      today: '2026-12-31',
      through: '2027-01-07',
    });
  });

  it('distingue tareas vencidas, de hoy y próximas', () => {
    expect(taskDueLabel('2026-10-31', '2026-11-01')).toContain('Vencida');
    expect(taskDueLabel('2026-11-01', '2026-11-01')).toBe('Vence hoy');
    expect(taskDueLabel('2026-11-08', '2026-11-01')).toContain('Vence el');
  });
});
