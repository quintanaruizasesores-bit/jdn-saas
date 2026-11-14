/**
 * Orquestación pura del resumen diario. No hace I/O directo: recibe sus
 * dependencias (lectura de preferencias, consulta de tareas, reclamo atómico,
 * envío y cierre de estado) para poder probar concurrencia, reintentos, usuario
 * sin tareas y errores de proveedor con mocks. El route de cron conecta estas
 * dependencias con Supabase (service_role) y Resend.
 */
import { dentroDeVentana, fechaLocal } from './horario';
import { construirResumenEmail, type TareaVencidaResumen } from './resumen';

export interface WorkspacePref {
  workspace_id: string;
  activo: boolean;
  destinatario: string | null;
  hora_local: number;
  zona_horaria: string;
  owner_nombre: string | null;
  owner_email: string | null;
}

export interface CronDeps {
  now: Date;
  appUrl: string;
  listarPrefsActivas: () => Promise<WorkspacePref[]>;
  tareasVencidas: (
    workspaceId: string,
    hoyLocal: string
  ) => Promise<TareaVencidaResumen[]>;
  /** Reclamo atómico: devuelve el id del envío, o null si no corresponde. */
  reclamar: (workspaceId: string, fechaLocal: string) => Promise<string | null>;
  enviar: (p: {
    to: string;
    subject: string;
    html: string;
    text: string;
    idempotencyKey: string;
  }) => Promise<{ id: string }>;
  finalizar: (
    envioId: string,
    estado: 'ENVIADO' | 'ERROR',
    extra: { provider_id?: string; error?: string; total_tareas?: number }
  ) => Promise<void>;
  maxItems?: number;
}

export interface CronResult {
  procesados: number;
  enviados: number;
  sinTareas: number;
  omitidos: number;
  errores: number;
}

export async function procesarResumenDiario(
  deps: CronDeps
): Promise<CronResult> {
  const res: CronResult = {
    procesados: 0,
    enviados: 0,
    sinTareas: 0,
    omitidos: 0,
    errores: 0,
  };
  const prefs = await deps.listarPrefsActivas();

  for (const pref of prefs) {
    try {
      if (!pref.activo) continue;
      if (!dentroDeVentana(pref.hora_local, pref.zona_horaria, deps.now))
        continue;

      const destinatario = pref.destinatario ?? pref.owner_email;
      if (!destinatario) continue; // nada a dónde enviar

      res.procesados++;
      const hoyLocal = fechaLocal(pref.zona_horaria, deps.now);

      // Consultar el estado actualizado antes de decidir el envío.
      const tareas = await deps.tareasVencidas(pref.workspace_id, hoyLocal);
      if (tareas.length === 0) {
        res.sinTareas++;
        continue; // solo se envía cuando hay tareas vencidas
      }

      // Reclamo atómico: evita duplicados ante concurrencia/reintentos.
      const envioId = await deps.reclamar(pref.workspace_id, hoyLocal);
      if (!envioId) {
        res.omitidos++;
        continue; // ya enviado, en curso, o reintentos agotados
      }

      const { subject, html, text } = construirResumenEmail({
        nombre: pref.owner_nombre,
        tareas,
        hoyLocal,
        appUrl: deps.appUrl,
        maxItems: deps.maxItems,
      });

      try {
        const { id } = await deps.enviar({
          to: destinatario,
          subject,
          html,
          text,
          idempotencyKey: `resumen-${pref.workspace_id}-${hoyLocal}`,
        });
        await deps.finalizar(envioId, 'ENVIADO', {
          provider_id: id,
          total_tareas: tareas.length,
        });
        res.enviados++;
      } catch (e) {
        await deps.finalizar(envioId, 'ERROR', {
          error: (e as Error).message,
          total_tareas: tareas.length,
        });
        res.errores++;
      }
    } catch {
      // Un fallo inesperado con un usuario no debe bloquear al resto.
      res.errores++;
    }
  }

  return res;
}
