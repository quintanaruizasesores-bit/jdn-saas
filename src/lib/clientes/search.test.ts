import { describe, it, expect } from 'vitest';
import {
  buildClienteSearchFilters,
  sanitizeSearchTerm,
  CLIENTE_SEARCH_COLUMNS,
} from './search';

describe('sanitizeSearchTerm', () => {
  it('colapsa espacios y recorta', () => {
    expect(sanitizeSearchTerm('  juan   perez ')).toBe('juan perez');
  });

  it('elimina comas, paréntesis y backslash que rompen el .or() de PostgREST', () => {
    expect(sanitizeSearchTerm('juan, (perez)\\')).toBe('juan perez');
  });

  it('limita la longitud a 100 caracteres', () => {
    const largo = 'a'.repeat(250);
    expect(sanitizeSearchTerm(largo)).toHaveLength(100);
  });
});

describe('buildClienteSearchFilters', () => {
  it('término vacío o sólo-puntuación devuelve []', () => {
    expect(buildClienteSearchFilters('')).toEqual([]);
    expect(buildClienteSearchFilters('   ')).toEqual([]);
    expect(buildClienteSearchFilters(',()')).toEqual([]);
  });

  it('busca por nombre en todas las columnas (un token → un grupo)', () => {
    const filtros = buildClienteSearchFilters('juan');
    expect(filtros).toHaveLength(1);
    for (const col of CLIENTE_SEARCH_COLUMNS) {
      expect(filtros[0]).toContain(`${col}.ilike.%juan%`);
    }
  });

  it('incluye la columna telefono (antes faltaba)', () => {
    expect(buildClienteSearchFilters('juan')[0]).toContain('telefono.ilike.%juan%');
  });

  it('busca por apellido', () => {
    expect(buildClienteSearchFilters('perez')[0]).toContain('apellido.ilike.%perez%');
  });

  it('busca por email', () => {
    expect(buildClienteSearchFilters('juan@mail.com')[0]).toContain(
      'email.ilike.%juan@mail.com%'
    );
  });

  it('busca por DNI', () => {
    expect(buildClienteSearchFilters('30123456')[0]).toContain('dni.ilike.%30123456%');
  });

  it('nombre completo: un grupo por token (AND entre tokens)', () => {
    const filtros = buildClienteSearchFilters('juan perez');
    expect(filtros).toHaveLength(2);
    expect(filtros[0]).toContain('nombre.ilike.%juan%');
    expect(filtros[1]).toContain('apellido.ilike.%perez%');
  });

  it('es parcial (substring con %)', () => {
    expect(buildClienteSearchFilters('jua')[0]).toContain('nombre.ilike.%jua%');
  });

  it('preserva mayúsculas (ilike resuelve el case en la DB)', () => {
    expect(buildClienteSearchFilters('JUAN')[0]).toContain('nombre.ilike.%JUAN%');
  });

  it('teléfono con espacios: un grupo por bloque de dígitos', () => {
    const filtros = buildClienteSearchFilters('351 555 1234');
    expect(filtros).toHaveLength(3);
    expect(filtros[0]).toContain('telefono.ilike.%351%');
    expect(filtros[2]).toContain('telefono.ilike.%1234%');
  });

  it('teléfono sin espacios: un solo grupo con el número completo', () => {
    const filtros = buildClienteSearchFilters('3515551234');
    expect(filtros).toHaveLength(1);
    expect(filtros[0]).toContain('telefono.ilike.%3515551234%');
  });

  it('token con separadores internos agrega variante sólo-dígitos', () => {
    const filtros = buildClienteSearchFilters('351-555');
    expect(filtros[0]).toContain('telefono.ilike.%351-555%');
    expect(filtros[0]).toContain('telefono.ilike.%351555%');
  });

  it('caracteres especiales no inyectan sintaxis de filtro', () => {
    const filtros = buildClienteSearchFilters('a,b(c)');
    // comas/paréntesis se descartan → tokens limpios a, b, c
    expect(filtros).toHaveLength(3);
    for (const f of filtros) {
      expect(f).not.toContain('(');
      expect(f).not.toContain(')');
    }
    expect(filtros[0]).toContain('nombre.ilike.%a%');
    expect(filtros[1]).toContain('nombre.ilike.%b%');
    expect(filtros[2]).toContain('nombre.ilike.%c%');
  });

  it('limita la cantidad de tokens a 6', () => {
    const filtros = buildClienteSearchFilters('a b c d e f g h');
    expect(filtros).toHaveLength(6);
  });
});
