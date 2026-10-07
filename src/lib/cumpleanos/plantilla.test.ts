import { describe, it, expect } from 'vitest';
import {
  renderPlantilla,
  DEFAULT_BIRTHDAY_TEMPLATE,
  AVAILABLE_VARIABLES,
} from './plantilla';

describe('renderPlantilla', () => {
  const vars = {
    nombre: 'Juan',
    apellido: 'Pérez',
    nombre_completo: 'Juan Pérez',
    empresa: 'Seguros XYZ',
    asesor: 'Gaspar',
    edad: '34',
  };

  it('reemplaza todas las variables conocidas', () => {
    const out = renderPlantilla('{{nombre}} {{apellido}} de {{empresa}} ({{edad}})', vars);
    expect(out).toBe('Juan Pérez de Seguros XYZ (34)');
  });

  it('tolera espacios dentro de las llaves', () => {
    expect(renderPlantilla('Hola {{ nombre }}', vars)).toBe('Hola Juan');
  });

  it('deja intactas las variables desconocidas', () => {
    expect(renderPlantilla('{{nombre}} {{inexistente}}', vars)).toBe('Juan {{inexistente}}');
  });

  it('reemplaza una variable faltante por string vacío', () => {
    expect(renderPlantilla('Hola{{edad}}', { nombre: 'Juan' })).toBe('Hola');
  });

  it('rinde la plantilla por defecto con nombre y asesor', () => {
    const out = renderPlantilla(DEFAULT_BIRTHDAY_TEMPLATE, vars);
    expect(out).toContain('¡Hola Juan! 🎉');
    expect(out).toContain('Desde Seguros XYZ');
    expect(out.trimEnd().endsWith('Gaspar')).toBe(true);
    expect(out).not.toContain('{{');
  });

  it('expone las variables documentadas', () => {
    const tokens = AVAILABLE_VARIABLES.map((v) => v.token);
    expect(tokens).toContain('{{nombre}}');
    expect(tokens).toContain('{{nombre_completo}}');
    expect(tokens).toContain('{{asesor}}');
  });
});
