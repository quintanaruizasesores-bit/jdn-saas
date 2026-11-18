import { describe, expect, it } from 'vitest';
import { sugerirCategoriaSlug, normalizarTexto } from './normalizar';

describe('sugerirCategoriaSlug', () => {
  it('mapea ramos típicos a su categoría', () => {
    expect(sugerirCategoriaSlug('Automotores')).toBe('automotor');
    expect(sugerirCategoriaSlug('AUTOMOTOR')).toBe('automotor');
    expect(sugerirCategoriaSlug('Combinado Familiar')).toBe('hogar');
    expect(sugerirCategoriaSlug('Seguro de Vida')).toBe('vida');
    expect(sugerirCategoriaSlug('Accidentes Personales')).toBe('accidentes_personales');
    expect(sugerirCategoriaSlug('A.R.T. Riesgos del Trabajo')).toBe('art');
    expect(sugerirCategoriaSlug('Motos y ciclomotores')).toBe('motovehiculo');
  });

  it('devuelve null para ramos desconocidos (evita falso positivo)', () => {
    expect(sugerirCategoriaSlug('Ramo inventado xyz')).toBeNull();
    expect(sugerirCategoriaSlug('')).toBeNull();
  });

  it('no matchea keywords cortas dentro de otra palabra', () => {
    // "cap" no debe disparar " ap " (accidentes personales).
    expect(sugerirCategoriaSlug('Capital asegurado')).toBeNull();
  });

  it('normalizarTexto quita acentos y baja a minúsculas', () => {
    expect(normalizarTexto('Automotóres')).toBe('automotores');
  });
});
