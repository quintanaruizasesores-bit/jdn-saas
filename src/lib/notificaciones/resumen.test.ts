import { describe, expect, it } from 'vitest';
import {
  construirPruebaEmail,
  construirResumenEmail,
  diasDeAtraso,
  escapeHtml,
  type TareaVencidaResumen,
} from './resumen';

describe('diasDeAtraso', () => {
  it('cuenta los días completos de atraso', () => {
    expect(diasDeAtraso('2026-11-01', '2026-11-10')).toBe(9);
    expect(diasDeAtraso('2026-11-09', '2026-11-10')).toBe(1);
  });

  it('una tarea que vence hoy no está vencida (0 días)', () => {
    expect(diasDeAtraso('2026-11-10', '2026-11-10')).toBe(0);
  });

  it('una fecha futura no da atraso negativo', () => {
    expect(diasDeAtraso('2026-11-20', '2026-11-10')).toBe(0);
  });

  it('cruza meses y años correctamente', () => {
    expect(diasDeAtraso('2025-12-31', '2026-01-02')).toBe(2);
  });
});

describe('escapeHtml', () => {
  it('escapa los caracteres peligrosos y conserva acentos', () => {
    expect(escapeHtml(`<b>"o'Hara" & Cía</b>`)).toBe(
      '&lt;b&gt;&quot;o&#39;Hara&quot; &amp; Cía&lt;/b&gt;'
    );
  });
});

const tareas: TareaVencidaResumen[] = [
  {
    id: 't1',
    titulo: 'Llamar a <script>alert(1)</script>',
    fecha_vencimiento: '2026-11-01',
    cliente_nombre: 'Juan Pérez',
    poliza_detalle: 'ABC 123 XY',
  },
  {
    id: 't2',
    titulo: 'Renovar póliza',
    fecha_vencimiento: '2026-11-05',
    cliente_nombre: null,
    poliza_detalle: null,
  },
];

describe('construirResumenEmail', () => {
  it('arma asunto, html y texto con total y escapado', () => {
    const r = construirResumenEmail({
      nombre: 'Ana',
      tareas,
      hoyLocal: '2026-11-10',
      appUrl: 'https://app.example.com/',
    });
    expect(r.subject).toBe('Tenés 2 tareas vencidas');
    expect(r.html).toContain('Hola Ana');
    // El contenido dinámico está escapado (sin <script> literal).
    expect(r.html).not.toContain('<script>alert(1)</script>');
    expect(r.html).toContain('&lt;script&gt;');
    // Enlace al listado, sin doble barra.
    expect(r.html).toContain('href="https://app.example.com/tareas"');
    expect(r.text).toContain(
      'Ver mis tareas vencidas: https://app.example.com/tareas'
    );
    expect(r.text).toContain('Juan Pérez');
    expect(r.text).toContain('Póliza: ABC 123 XY');
  });

  it('singulariza el asunto con una sola tarea', () => {
    const r = construirResumenEmail({
      nombre: null,
      tareas: [tareas[0]],
      hoyLocal: '2026-11-10',
      appUrl: 'https://app.example.com',
    });
    expect(r.subject).toBe('Tenés 1 tarea vencida');
    expect(r.html).toContain('Hola,');
  });

  it('construirPruebaEmail arma un correo de prueba con enlace', () => {
    const r = construirPruebaEmail({
      nombre: 'Ana',
      appUrl: 'https://app.example.com/',
    });
    expect(r.subject).toContain('prueba');
    expect(r.html).toContain('Hola Ana');
    expect(r.html).toContain('href="https://app.example.com/tareas"');
    expect(r.text).toContain('correo de prueba');
  });

  it('trunca a maxItems e indica cuántas quedan', () => {
    const muchas: TareaVencidaResumen[] = Array.from(
      { length: 25 },
      (_, i) => ({
        id: `t${i}`,
        titulo: `Tarea ${i}`,
        fecha_vencimiento: '2026-11-01',
      })
    );
    const r = construirResumenEmail({
      nombre: 'Ana',
      tareas: muchas,
      hoyLocal: '2026-11-10',
      appUrl: 'https://app.example.com',
      maxItems: 20,
    });
    expect(r.subject).toBe('Tenés 25 tareas vencidas');
    expect(r.html).toContain('y 5 tarea(s) más');
    expect(r.text).toContain('y 5 tarea(s) más');
    // Solo se listan 20 títulos.
    expect(r.html.match(/Tarea \d+<\/div>/g)?.length).toBe(20);
  });
});
