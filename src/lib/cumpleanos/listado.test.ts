import { describe, it, expect } from 'vitest';
import {
  buildClienteCumpleViews,
  computeResumen,
  filterAndSortCumples,
} from './listado';
import type { ClienteCumpleRow } from '@/services/cumpleanos.service';

const today = { year: 2025, month: 10, day: 7 };

function row(over: Partial<ClienteCumpleRow> & { id: string }): ClienteCumpleRow {
  return {
    nombre: 'Juan',
    apellido: 'Pérez',
    telefono: '351 555 1234',
    fecha_nacimiento: '1990-10-07',
    ...over,
  };
}

const rows: ClienteCumpleRow[] = [
  row({ id: 'a', nombre: 'Ana', apellido: 'Gómez', fecha_nacimiento: '1990-10-07' }), // hoy
  row({ id: 'b', nombre: 'Beto', apellido: 'Díaz', fecha_nacimiento: '1985-10-10' }), // +3
  row({ id: 'c', nombre: 'Caro', apellido: 'Luna', fecha_nacimiento: '1992-10-30' }), // +23
  row({ id: 'd', nombre: 'Dani', apellido: 'Sosa', fecha_nacimiento: '1980-12-25' }), // >30
  row({ id: 'e', nombre: 'Eva', apellido: 'Ruiz', fecha_nacimiento: 'no-fecha' }), // inválida
];

describe('buildClienteCumpleViews', () => {
  it('descarta filas con fecha no parseable', () => {
    const views = buildClienteCumpleViews(rows, today);
    expect(views.map((v) => v.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('marca esHoy y calcula edad/días/label', () => {
    const views = buildClienteCumpleViews(rows, today);
    const ana = views.find((v) => v.id === 'a')!;
    expect(ana.esHoy).toBe(true);
    expect(ana.dias).toBe(0);
    expect(ana.edad).toBe(35);
    expect(ana.cumpleLabel).toBe('7 de octubre');
  });
});

describe('computeResumen', () => {
  it('cuenta ventanas inclusivas desde hoy', () => {
    const views = buildClienteCumpleViews(rows, today);
    expect(computeResumen(views)).toEqual({ hoy: 1, proximos7: 2, proximos30: 3 });
  });
});

describe('filterAndSortCumples', () => {
  const views = buildClienteCumpleViews(rows, today);

  it('rango hoy solo trae los de dias 0', () => {
    const r = filterAndSortCumples(views, { rango: 'hoy', search: '' });
    expect(r.map((v) => v.id)).toEqual(['a']);
  });

  it('rango 30 ordena por cercanía', () => {
    const r = filterAndSortCumples(views, { rango: '30', search: '' });
    expect(r.map((v) => v.id)).toEqual(['a', 'b', 'c']);
  });

  it('todos incluye los de más de 30 días', () => {
    const r = filterAndSortCumples(views, { rango: 'todos', search: '' });
    expect(r.map((v) => v.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('busca por nombre sin distinguir tildes', () => {
    const r = filterAndSortCumples(views, { rango: 'todos', search: 'gomez' });
    expect(r.map((v) => v.id)).toEqual(['a']);
  });

  it('busca por teléfono ignorando separadores', () => {
    const r = filterAndSortCumples(views, { rango: 'todos', search: '3515551234' });
    expect(r.length).toBe(4); // todos comparten teléfono base
  });
});
