import { describe, it, expect } from 'vitest';
import {
  MIN_YEAR,
  maskFechaInput,
  isoToDisplay,
  displayToIso,
  validateFechaNacimiento,
} from './fecha-nacimiento';

describe('maskFechaInput', () => {
  it('inserta las barras a medida que se tipea', () => {
    expect(maskFechaInput('0')).toBe('0');
    expect(maskFechaInput('05')).toBe('05');
    expect(maskFechaInput('058')).toBe('05/8');
    expect(maskFechaInput('0508')).toBe('05/08');
    expect(maskFechaInput('05081943')).toBe('05/08/1943');
  });

  it('descarta no-dígitos y corta a 8 dígitos', () => {
    expect(maskFechaInput('05/08/1943')).toBe('05/08/1943');
    expect(maskFechaInput('abc05x08y1943zzz')).toBe('05/08/1943');
    expect(maskFechaInput('050819439999')).toBe('05/08/1943');
  });
});

describe('isoToDisplay / displayToIso', () => {
  it('convierte ISO a dd/mm/aaaa', () => {
    expect(isoToDisplay('1943-08-05')).toBe('05/08/1943');
    expect(isoToDisplay('1943-08-05T12:00:00')).toBe('05/08/1943');
  });

  it('devuelve vacío para nulos/malformados', () => {
    expect(isoToDisplay(null)).toBe('');
    expect(isoToDisplay(undefined)).toBe('');
    expect(isoToDisplay('')).toBe('');
    expect(isoToDisplay('05/08/1943')).toBe('');
  });

  it('convierte dd/mm/aaaa a ISO', () => {
    expect(displayToIso('05/08/1943')).toBe('1943-08-05');
    expect(displayToIso(' 05/08/1943 ')).toBe('1943-08-05');
  });

  it('devuelve null para vacío/incompleto', () => {
    expect(displayToIso('')).toBeNull();
    expect(displayToIso(null)).toBeNull();
    expect(displayToIso('05/08')).toBeNull();
  });

  it('roundtrip ISO → display → ISO', () => {
    expect(displayToIso(isoToDisplay('1975-12-31'))).toBe('1975-12-31');
  });
});

describe('validateFechaNacimiento', () => {
  it('acepta una fecha vieja válida', () => {
    expect(validateFechaNacimiento('05/08/1943')).toBeNull();
    expect(validateFechaNacimiento(`01/01/${MIN_YEAR}`)).toBeNull();
  });

  it('trata el vacío como válido (campo opcional)', () => {
    expect(validateFechaNacimiento('')).toBeNull();
    expect(validateFechaNacimiento('   ')).toBeNull();
  });

  it('rechaza formato incompleto o inválido', () => {
    expect(validateFechaNacimiento('5/8/1943')).not.toBeNull();
    expect(validateFechaNacimiento('05-08-1943')).not.toBeNull();
    expect(validateFechaNacimiento('1943')).not.toBeNull();
  });

  it('rechaza una fecha de calendario inexistente', () => {
    expect(validateFechaNacimiento('31/02/2000')).toBe('Fecha inexistente');
    expect(validateFechaNacimiento('32/01/2000')).toBe('Fecha inexistente');
  });

  it('rechaza años anteriores a MIN_YEAR', () => {
    expect(validateFechaNacimiento('10/10/1910')).toBe(`El año debe ser ${MIN_YEAR} o posterior`);
  });

  it('rechaza fechas futuras', () => {
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    const dd = String(next.getDate()).padStart(2, '0');
    const mm = String(next.getMonth() + 1).padStart(2, '0');
    expect(validateFechaNacimiento(`${dd}/${mm}/${next.getFullYear()}`)).toBe(
      'La fecha no puede ser futura'
    );
  });
});
