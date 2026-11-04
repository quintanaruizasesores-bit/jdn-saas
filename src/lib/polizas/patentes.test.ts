import { describe, expect, it } from 'vitest';
import {
  distanciaPatente,
  patenteBuscada,
  patentesEnDetalle,
} from './patentes';

describe('búsqueda de patentes', () => {
  it('reconoce los dos formatos completos y normaliza separadores', () => {
    expect(patenteBuscada('abc-123')).toBe('ABC123');
    expect(patenteBuscada('ab 123 cd')).toBe('AB123CD');
    expect(patenteBuscada('ABC12')).toBeNull();
    expect(patenteBuscada('Juan Pérez')).toBeNull();
  });

  it('extrae patentes completas del detalle sin aceptar fragmentos de otras cadenas', () => {
    expect(patentesEnDetalle('Auto ABC-123 / AB 123 CD')).toEqual([
      'ABC123',
      'AB123CD',
    ]);
    expect(patentesEnDetalle('ABC1234 y XABC123Y')).toEqual([]);
  });

  it('sólo considera similares las patentes del mismo largo con una diferencia', () => {
    expect(distanciaPatente('ABC123', 'ABD123')).toBe(1);
    expect(distanciaPatente('ABC123', 'XYZ123')).toBe(3);
    expect(distanciaPatente('ABC123', 'AB123CD')).toBe(Infinity);
  });
});
