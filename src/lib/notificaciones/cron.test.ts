import { describe, expect, it, vi } from 'vitest';
import {
  procesarResumenDiario,
  type CronDeps,
  type WorkspacePref,
} from './cron';

const BA = 'America/Argentina/Buenos_Aires';
// 12:00 UTC = 09:00 en Buenos Aires: horario del cron (L–V).
const NOW = new Date('2026-11-10T12:00:00Z');

const prefBase: WorkspacePref = {
  workspace_id: 'w1',
  activo: true,
  destinatario: 'avisos@correo.com',
  hora_local: 8,
  zona_horaria: BA,
  owner_nombre: 'Ana',
  owner_email: 'ana@cuenta.com',
};

const unaTarea = [
  { id: 't1', titulo: 'Llamar', fecha_vencimiento: '2026-11-01' },
];

function deps(overrides: Partial<CronDeps> = {}): CronDeps {
  return {
    now: NOW,
    appUrl: 'https://app.example.com',
    listarPrefsActivas: vi.fn().mockResolvedValue([prefBase]),
    tareasVencidas: vi.fn().mockResolvedValue(unaTarea),
    reclamar: vi.fn().mockResolvedValue('envio-1'),
    enviar: vi.fn().mockResolvedValue({ id: 'resend-1' }),
    finalizar: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('procesarResumenDiario', () => {
  it('envía y cierra en ENVIADO cuando hay tareas y se obtiene el reclamo', async () => {
    const d = deps();
    const r = await procesarResumenDiario(d);
    expect(r).toMatchObject({ procesados: 1, enviados: 1, errores: 0 });
    expect(d.enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'avisos@correo.com',
        idempotencyKey: 'resumen-w1-2026-11-10',
      })
    );
    expect(d.finalizar).toHaveBeenCalledWith('envio-1', 'ENVIADO', {
      provider_id: 'resend-1',
      total_tareas: 1,
    });
  });

  it('procesa sin importar la hora del disparo (lo decide el cron)', async () => {
    // Cualquier marca horaria procesa: el horario lo fija el cron de Vercel.
    const d = deps({ now: new Date('2026-11-10T08:00:00Z') });
    const r = await procesarResumenDiario(d);
    expect(r).toMatchObject({ procesados: 1, enviados: 1 });
    expect(d.enviar).toHaveBeenCalled();
  });

  it('no envía si el usuario no tiene tareas vencidas', async () => {
    const d = deps({ tareasVencidas: vi.fn().mockResolvedValue([]) });
    const r = await procesarResumenDiario(d);
    expect(r).toMatchObject({ procesados: 1, sinTareas: 1, enviados: 0 });
    expect(d.reclamar).not.toHaveBeenCalled();
    expect(d.enviar).not.toHaveBeenCalled();
  });

  it('omite cuando el reclamo falla (ya enviado / concurrencia)', async () => {
    const d = deps({ reclamar: vi.fn().mockResolvedValue(null) });
    const r = await procesarResumenDiario(d);
    expect(r).toMatchObject({ procesados: 1, omitidos: 1, enviados: 0 });
    expect(d.enviar).not.toHaveBeenCalled();
  });

  it('ante error del proveedor cierra en ERROR y sigue con el resto', async () => {
    const pref2: WorkspacePref = { ...prefBase, workspace_id: 'w2' };
    const d = deps({
      listarPrefsActivas: vi.fn().mockResolvedValue([prefBase, pref2]),
      reclamar: vi
        .fn()
        .mockResolvedValueOnce('envio-1')
        .mockResolvedValueOnce('envio-2'),
      enviar: vi
        .fn()
        .mockRejectedValueOnce(new Error('Resend 503'))
        .mockResolvedValueOnce({ id: 'resend-2' }),
    });
    const r = await procesarResumenDiario(d);
    expect(r).toMatchObject({ procesados: 2, enviados: 1, errores: 1 });
    expect(d.finalizar).toHaveBeenNthCalledWith(1, 'envio-1', 'ERROR', {
      error: 'Resend 503',
      total_tareas: 1,
    });
    expect(d.finalizar).toHaveBeenNthCalledWith(2, 'envio-2', 'ENVIADO', {
      provider_id: 'resend-2',
      total_tareas: 1,
    });
  });

  it('ignora preferencias sin destino', async () => {
    const d = deps({
      listarPrefsActivas: vi
        .fn()
        .mockResolvedValue([
          { ...prefBase, destinatario: null, owner_email: null },
        ]),
    });
    const r = await procesarResumenDiario(d);
    expect(r.procesados).toBe(0);
    expect(d.enviar).not.toHaveBeenCalled();
  });
});
