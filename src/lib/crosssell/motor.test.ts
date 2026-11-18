import { describe, expect, it } from 'vitest';
import {
  detectarOportunidades,
  calcularScore,
  type MotorEntrada,
  type MotorCliente,
  type MotorPoliza,
} from './motor';

const HOY = '2026-11-18';

// Categorías de prueba.
const AUTO = { id: 'cat-auto', slug: 'automotor', nombre: 'Automotor', activa: true };
const HOGAR = { id: 'cat-hogar', slug: 'hogar', nombre: 'Hogar', activa: true };
const VIDA = { id: 'cat-vida', slug: 'vida', nombre: 'Vida', activa: true };

function cliente(p: Partial<MotorCliente> & { id: string }): MotorCliente {
  return {
    nombre: 'Juan',
    apellido: 'Pérez',
    provincia: 'Buenos Aires',
    email: 'juan@example.com',
    deleted_at: null,
    ...p,
  };
}

function poliza(p: Partial<MotorPoliza> & { id: string; cliente_id: string }): MotorPoliza {
  return {
    ramo_id: 'ramo-auto',
    compania_nombre: 'Compañía X',
    ramo_nombre: 'Automotores',
    estado: 'VIGENTE',
    fecha_fin: '2027-01-01',
    prima: 10000,
    ...p,
  };
}

const reglaAutoHogar = {
  id: 'regla-1',
  nombre: 'Automotor sin hogar',
  activa: true,
  prioridad: 50,
  categorias_requeridas: [AUTO.id],
  modo: 'ANY' as const,
  categoria_objetivo_id: HOGAR.id,
  condiciones: {},
};

function base(over: Partial<MotorEntrada> = {}): MotorEntrada {
  return {
    clientes: [cliente({ id: 'c1' })],
    polizas: [poliza({ id: 'p1', cliente_id: 'c1', ramo_id: 'ramo-auto' })],
    ramoMap: new Map([['ramo-auto', AUTO.id]]),
    categorias: [AUTO, HOGAR, VIDA],
    reglas: [reglaAutoHogar],
    exclusiones: [],
    hoy: HOY,
    ...over,
  };
}

describe('detectarOportunidades', () => {
  it('detecta cliente con automotor pero sin hogar', () => {
    const r = detectarOportunidades(base());
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      cliente_id: 'c1',
      categoria_objetivo_id: HOGAR.id,
      regla_id: 'regla-1',
    });
    expect(r[0].motivo.categoria_objetivo?.slug).toBe('hogar');
    expect(r[0].motivo.categorias_actuales?.[0]?.slug).toBe('automotor');
  });

  it('no genera oportunidad si el cliente ya tiene la cobertura objetivo', () => {
    const r = detectarOportunidades(
      base({
        polizas: [
          poliza({ id: 'p1', cliente_id: 'c1', ramo_id: 'ramo-auto' }),
          poliza({
            id: 'p2',
            cliente_id: 'c1',
            ramo_id: 'ramo-hogar',
            ramo_nombre: 'Combinado familiar',
          }),
        ],
        ramoMap: new Map([
          ['ramo-auto', AUTO.id],
          ['ramo-hogar', HOGAR.id],
        ]),
      })
    );
    expect(r).toHaveLength(0);
  });

  it('no genera falso positivo cuando el ramo del cliente no está mapeado', () => {
    const r = detectarOportunidades(base({ ramoMap: new Map() }));
    expect(r).toHaveLength(0);
  });

  it('ignora pólizas no vigentes o vencidas', () => {
    const r = detectarOportunidades(
      base({
        polizas: [
          poliza({ id: 'p1', cliente_id: 'c1', estado: 'BAJA' }),
          poliza({ id: 'p2', cliente_id: 'c1', estado: 'VIGENTE', fecha_fin: '2020-01-01' }),
        ],
      })
    );
    expect(r).toHaveLength(0);
  });

  it('respeta exclusión global y por categoría', () => {
    expect(
      detectarOportunidades(
        base({ exclusiones: [{ cliente_id: 'c1', categoria_id: null }] })
      )
    ).toHaveLength(0);
    expect(
      detectarOportunidades(
        base({ exclusiones: [{ cliente_id: 'c1', categoria_id: HOGAR.id }] })
      )
    ).toHaveLength(0);
    // Exclusión de otra categoría no bloquea.
    expect(
      detectarOportunidades(
        base({ exclusiones: [{ cliente_id: 'c1', categoria_id: VIDA.id }] })
      )
    ).toHaveLength(1);
  });

  it('excluye clientes dados de baja (deleted_at)', () => {
    const r = detectarOportunidades(
      base({ clientes: [cliente({ id: 'c1', deleted_at: '2026-01-01T00:00:00Z' })] })
    );
    expect(r).toHaveLength(0);
  });

  it('aplica condición min_polizas', () => {
    const regla = { ...reglaAutoHogar, condiciones: { min_polizas: 2 } };
    expect(detectarOportunidades(base({ reglas: [regla] }))).toHaveLength(0);
    const r = detectarOportunidades(
      base({
        reglas: [regla],
        polizas: [
          poliza({ id: 'p1', cliente_id: 'c1', ramo_id: 'ramo-auto' }),
          poliza({ id: 'p2', cliente_id: 'c1', ramo_id: 'ramo-auto' }),
        ],
      })
    );
    expect(r).toHaveLength(1);
  });

  it('modo ALL exige todas las categorías requeridas', () => {
    const regla = {
      ...reglaAutoHogar,
      id: 'regla-all',
      categorias_requeridas: [AUTO.id, VIDA.id],
      modo: 'ALL' as const,
    };
    // Solo tiene automotor → no cumple ALL.
    expect(detectarOportunidades(base({ reglas: [regla] }))).toHaveLength(0);
  });

  it('deduplica por cliente+objetivo quedándose con el mayor score', () => {
    const r1 = { ...reglaAutoHogar, id: 'r-baja', prioridad: 30 };
    const r2 = { ...reglaAutoHogar, id: 'r-alta', prioridad: 80 };
    const r = detectarOportunidades(base({ reglas: [r1, r2] }));
    expect(r).toHaveLength(1);
    expect(r[0].regla_id).toBe('r-alta');
  });
});

describe('calcularScore', () => {
  it('queda acotado entre 0 y 100', () => {
    expect(
      calcularScore({ prioridadRegla: 100, polizasVigentes: 10, primaTotal: 1e6, tieneEmail: true })
    ).toBe(100);
    expect(
      calcularScore({ prioridadRegla: 0, polizasVigentes: 0, primaTotal: 0, tieneEmail: false })
    ).toBe(0);
  });
});
