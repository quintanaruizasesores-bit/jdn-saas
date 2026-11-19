import { describe, expect, it } from 'vitest';
import {
  construirCorreo,
  generarBorrador,
  renderPlantilla,
  PLANTILLAS_SUGERIDAS,
  type VariablesCorreo,
} from './plantilla';

const vars: VariablesCorreo = {
  nombre: 'Juan',
  apellido: 'Pérez',
  ramoAsegurado: 'Automotor',
  coberturaOfrecida: 'Hogar',
  empresa: 'Quintana Ruiz Asesores de Seguros',
};

describe('renderPlantilla', () => {
  it('reemplaza variables conocidas y deja vacías las desconocidas', () => {
    expect(renderPlantilla('Hola {{nombre}} {{apellido}}', vars)).toBe(
      'Hola Juan Pérez'
    );
    expect(renderPlantilla('X {{inexistente}} Y', vars)).toBe('X  Y');
  });
});

describe('generarBorrador', () => {
  it('propone sumar la cobertura sin afirmar ausencia en otra aseguradora', () => {
    const { asunto, cuerpo } = generarBorrador({
      nombre: 'Juan',
      ramoAsegurado: 'Automotor',
      coberturaOfrecida: 'Hogar',
    });
    expect(asunto).toContain('Juan');
    const texto = `${asunto}\n${cuerpo}`.toLowerCase();
    // No debe afirmar que NO tiene la cobertura (en otra compañía).
    expect(texto).not.toMatch(/no (tenés|tiene|registr|cuenta con)/);
    expect(texto).not.toContain('otra aseguradora');
    expect(texto).not.toContain('otra compañía');
    expect(cuerpo).toContain('propuesta personalizada');
  });
});

describe('PLANTILLAS_SUGERIDAS', () => {
  const VARIABLES_VALIDAS = new Set([
    'nombre',
    'apellido',
    'ramoAsegurado',
    'coberturaOfrecida',
    'empresa',
  ]);

  it('tiene varias plantillas de ejemplo con nombre, asunto y cuerpo', () => {
    expect(PLANTILLAS_SUGERIDAS.length).toBeGreaterThanOrEqual(3);
    for (const p of PLANTILLAS_SUGERIDAS) {
      expect(p.nombre.trim()).not.toBe('');
      expect(p.asunto.trim()).not.toBe('');
      expect(p.cuerpo.trim()).not.toBe('');
    }
  });

  it('solo usa variables válidas y no afirma ausencia en otra aseguradora', () => {
    for (const p of PLANTILLAS_SUGERIDAS) {
      const texto = `${p.asunto}\n${p.cuerpo}`;
      for (const [, clave] of texto.matchAll(/\{\{\s*([a-zA-Z]+)\s*\}\}/g)) {
        expect(VARIABLES_VALIDAS.has(clave), `variable {{${clave}}}`).toBe(true);
      }
      const lower = texto.toLowerCase();
      expect(lower).not.toContain('otra aseguradora');
      expect(lower).not.toContain('otra compañía');
      expect(lower).not.toMatch(/no (tenés|tiene|registr|cuenta con)/);
    }
  });

  it('renderiza sin dejar variables sin resolver', () => {
    for (const p of PLANTILLAS_SUGERIDAS) {
      const render = renderPlantilla(`${p.asunto}\n${p.cuerpo}`, vars);
      expect(render).not.toMatch(/\{\{.*?\}\}/);
      expect(render).toContain('Juan');
    }
  });
});

describe('construirCorreo', () => {
  it('escapa el contenido y agrega el enlace de baja', () => {
    const r = construirCorreo({
      asunto: 'Hola {{nombre}}',
      cuerpo: 'Cuerpo con <script> y {{coberturaOfrecida}}',
      vars,
      bajaUrl: 'https://app.test/api/cross-selling/baja?token=abc',
    });
    expect(r.asunto).toBe('Hola Juan');
    expect(r.html).toContain('&lt;script&gt;');
    expect(r.html).not.toContain('<script>');
    expect(r.html).toContain('darte de baja');
    expect(r.text).toContain('Hogar');
    expect(r.text).toContain('dale de baja');
  });

  it('sin bajaUrl no agrega pie de baja', () => {
    const r = construirCorreo({
      asunto: 'A',
      cuerpo: 'B',
      vars,
      bajaUrl: null,
    });
    expect(r.html).not.toContain('darte de baja');
  });
});
