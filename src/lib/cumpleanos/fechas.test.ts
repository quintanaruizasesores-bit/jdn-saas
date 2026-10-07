import { describe, it, expect } from 'vitest';
import {
  parseIsoDate,
  getTodayInTimezone,
  isLeapYear,
  observedBirthday,
  daysUntilBirthday,
  isBirthdayToday,
  calcularEdad,
  formatCumpleanos,
  type FechaPartes,
} from './fechas';

const today = (y: number, m: number, d: number): FechaPartes => ({ year: y, month: m, day: d });

describe('parseIsoDate', () => {
  it('parsea yyyy-mm-dd', () => {
    expect(parseIsoDate('1990-03-15')).toEqual({ year: 1990, month: 3, day: 15 });
  });
  it('devuelve null para vacío o malformado', () => {
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate('15/03/1990')).toBeNull();
    expect(parseIsoDate('1990-13-40')).toBeNull();
  });
});

describe('getTodayInTimezone', () => {
  it('no se adelanta a las 23:30 de Buenos Aires (UTC-3)', () => {
    // 2024-03-15 23:30 en Buenos Aires = 2024-03-16 02:30 UTC.
    const now = new Date('2024-03-16T02:30:00Z');
    expect(getTodayInTimezone('America/Argentina/Buenos_Aires', now)).toEqual({
      year: 2024,
      month: 3,
      day: 15,
    });
  });
});

describe('isLeapYear', () => {
  it('reconoce años bisiestos', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2023)).toBe(false);
  });
});

describe('observedBirthday (regla 29/02)', () => {
  it('mantiene 29/02 en años bisiestos', () => {
    expect(observedBirthday({ month: 2, day: 29 }, 2024)).toEqual({ month: 2, day: 29 });
  });
  it('observa el 28/02 en años no bisiestos', () => {
    expect(observedBirthday({ month: 2, day: 29 }, 2025)).toEqual({ month: 2, day: 28 });
  });
  it('no toca otras fechas', () => {
    expect(observedBirthday({ month: 3, day: 15 }, 2025)).toEqual({ month: 3, day: 15 });
  });
});

describe('daysUntilBirthday / isBirthdayToday', () => {
  it('es 0 el mismo día', () => {
    expect(daysUntilBirthday({ month: 3, day: 15 }, today(2025, 3, 15))).toBe(0);
    expect(isBirthdayToday({ month: 3, day: 15 }, today(2025, 3, 15))).toBe(true);
  });

  it('cuenta los días hasta un cumpleaños futuro de este año', () => {
    expect(daysUntilBirthday({ month: 3, day: 20 }, today(2025, 3, 15))).toBe(5);
  });

  it('salta al año siguiente si ya pasó', () => {
    // De 2025-03-16 al 2026-03-15 (365 días; 2026 no bisiesto).
    expect(daysUntilBirthday({ month: 3, day: 15 }, today(2025, 3, 16))).toBe(364);
  });

  it('nacido el 29/02 cumple "hoy" el 28/02 de un año no bisiesto', () => {
    expect(isBirthdayToday({ month: 2, day: 29 }, today(2025, 2, 28))).toBe(true);
  });
});

describe('calcularEdad', () => {
  it('edad cumplida cuando ya pasó el cumpleaños', () => {
    expect(calcularEdad({ year: 1990, month: 3, day: 15 }, today(2025, 10, 7))).toBe(35);
  });
  it('edad el día del cumpleaños', () => {
    expect(calcularEdad({ year: 1990, month: 3, day: 15 }, today(2025, 3, 15))).toBe(35);
  });
  it('resta un año si todavía no cumplió', () => {
    expect(calcularEdad({ year: 1990, month: 12, day: 25 }, today(2025, 3, 15))).toBe(34);
  });
});

describe('formatCumpleanos', () => {
  it('formatea en español ignorando el año', () => {
    expect(formatCumpleanos({ month: 10, day: 7 })).toBe('7 de octubre');
  });
});
