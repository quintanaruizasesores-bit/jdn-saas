'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  fetchEmailPrefs,
  saveEmailPrefs,
} from '@/services/notificaciones.service';
import { DEFAULT_EMAIL_NOTIF_PREFS } from '@/lib/notificaciones/prefs';
import { emailNotifPrefsSchema } from '@/validations/notificaciones.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

type EstadoPrueba = 'idle' | 'enviando' | 'ok' | 'error';

interface DiagPrueba {
  httpStatus: number;
  mensaje: string;
  detalle?: string;
  resendStatus?: number;
  from?: string | null;
  pista?: string;
}

/** Pista accionable según el código de error, para diagnosticar el envío. */
function pistaDeError(httpStatus: number, resendStatus?: number): string {
  if (httpStatus === 503)
    return 'Faltan RESEND_API_KEY y/o RESEND_FROM en el servidor, o cambiaste las variables y todavía no hiciste Redeploy en Vercel.';
  if (httpStatus === 400)
    return 'Guardá primero un correo de destino válido antes de probar.';
  if (httpStatus === 429)
    return 'Enviaste una prueba hace menos de un minuto. Esperá ~60 segundos y reintentá.';
  switch (resendStatus) {
    case 401:
      return 'La API Key de Resend es inválida o es de otra cuenta. Creá una nueva (Full access) en la MISMA cuenta donde el dominio figura Verified, cargala en Vercel y redeployá.';
    case 403:
      return 'La API Key no tiene permiso para enviar desde ese dominio, o el dominio del remitente no está verificado en esta cuenta de Resend.';
    case 422:
      return 'El remitente (RESEND_FROM) no coincide con un dominio verificado, o su formato es inválido. Debe ser: Nombre <casilla@tu-dominio-verificado>.';
    default:
      return 'Revisá el detalle de Resend de abajo. Si cambiaste variables en Vercel, confirmá que hiciste Redeploy y que el valor es el del environment Production.';
  }
}

export function EmailNotificationsEditor() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const emailCuenta = user?.email ?? '';

  const [activo, setActivo] = useState(false);
  const [destinatario, setDestinatario] = useState('');
  const [estadoPrueba, setEstadoPrueba] = useState<EstadoPrueba>('idle');
  const [diag, setDiag] = useState<DiagPrueba | null>(null);

  const prefsQuery = useQuery({
    queryKey: ['email-notif-prefs'],
    queryFn: () => fetchEmailPrefs(createClient()),
  });

  // Carga inicial cuando llegan las preferencias guardadas.
  useEffect(() => {
    if (prefsQuery.data) {
      setActivo(prefsQuery.data.activo);
      setDestinatario(prefsQuery.data.destinatario ?? '');
    }
  }, [prefsQuery.data]);

  // Hay cambios sin guardar respecto de lo persistido.
  const sucio = useMemo(() => {
    const d = prefsQuery.data;
    if (!d) return false;
    return (
      d.activo !== activo || (d.destinatario ?? '') !== destinatario.trim()
    );
  }, [prefsQuery.data, activo, destinatario]);

  const destinoGuardado = (prefsQuery.data?.destinatario ?? '').trim();

  const save = useMutation({
    mutationFn: async () => {
      const parsed = emailNotifPrefsSchema.safeParse({
        activo,
        destinatario: destinatario.trim(),
        // El horario de envío es fijo (09:00 Argentina, L–V); estos campos se
        // conservan por compatibilidad del esquema pero no se eligen.
        hora_local: DEFAULT_EMAIL_NOTIF_PREFS.hora_local,
        zona_horaria: DEFAULT_EMAIL_NOTIF_PREFS.zona_horaria,
      });
      if (!parsed.success) {
        throw new Error(
          parsed.error.issues[0]?.message ?? 'Revisá los datos ingresados.'
        );
      }
      await saveEmailPrefs(createClient(), parsed.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-notif-prefs'] });
      toast.success('Preferencias guardadas');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enviarPrueba = async () => {
    setEstadoPrueba('enviando');
    setDiag(null);
    try {
      const res = await fetch('/api/notificaciones/prueba', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        destinatario?: string;
        detalle?: string;
        resendStatus?: number;
        from?: string | null;
      };
      if (!res.ok) {
        setEstadoPrueba('error');
        setDiag({
          httpStatus: res.status,
          mensaje: body.error ?? 'No se pudo enviar la prueba.',
          detalle: body.detalle,
          resendStatus: body.resendStatus,
          from: body.from,
          pista: pistaDeError(res.status, body.resendStatus),
        });
        toast.error(body.error ?? 'No se pudo enviar la prueba.');
        return;
      }
      setEstadoPrueba('ok');
      toast.success(
        `Correo de prueba enviado a ${body.destinatario ?? destinoGuardado}`
      );
    } catch (e) {
      setEstadoPrueba('error');
      setDiag({
        httpStatus: 0,
        mensaje: 'No se pudo contactar al servidor.',
        detalle: (e as Error).message,
        pista: 'Problema de red o la función del servidor no respondió. Revisá la conexión y reintentá.',
      });
      toast.error((e as Error).message);
    }
  };

  if (prefsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="bg-panel2 h-40" />
        <Skeleton className="bg-panel2 h-10 w-48" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-ink-dim text-sm">
        Recibí un resumen diario por email con tus tareas vencidas y pendientes.
        Están desactivados por defecto.
      </p>

      <label className="flex items-start gap-3">
        <Checkbox
          checked={activo}
          onCheckedChange={(checked) => setActivo(checked === true)}
          aria-label="Activar recordatorios por email"
        />
        <span className="text-sm">
          <span className="text-ink font-medium">
            Activar recordatorios por email
          </span>
          <span className="text-ink-faint mt-0.5 block text-[12px]">
            Enviaremos el resumen solo los días en que tengas tareas vencidas.
          </span>
        </span>
      </label>

      <div>
        <Label htmlFor="destinatario" className="text-ink-dim">
          Correo de destino
        </Label>
        <Input
          id="destinatario"
          type="email"
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value)}
          placeholder={emailCuenta || 'nombre@correo.com'}
          className="border-line bg-bg2 mt-1"
        />
        <p className="text-ink-faint mt-1 text-[11px]">
          {emailCuenta ? (
            <>
              Sugerencia: el correo de tu cuenta es <b>{emailCuenta}</b>.{' '}
              {destinatario.trim() !== emailCuenta && (
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => setDestinatario(emailCuenta)}
                >
                  Usar ese
                </button>
              )}
            </>
          ) : (
            'Podés indicar un correo distinto al de acceso.'
          )}{' '}
          Cambiarlo acá no modifica tu correo de inicio de sesión.
        </p>
      </div>

      <p className="text-ink-faint border-line bg-bg2 rounded-md border px-3 py-2 text-[12px]">
        El resumen se envía automáticamente a las <b>09:00 (hora de Argentina)</b>,
        de <b>lunes a viernes</b>, solo los días en que tengas tareas vencidas.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending || !sucio}
        >
          {save.isPending ? 'Guardando…' : 'Guardar preferencias'}
        </Button>

        <Button
          variant="outline"
          onClick={enviarPrueba}
          disabled={estadoPrueba === 'enviando' || !destinoGuardado || sucio}
        >
          {estadoPrueba === 'enviando'
            ? 'Enviando…'
            : 'Enviar correo de prueba'}
        </Button>

        {estadoPrueba === 'ok' && (
          <span className="text-green text-sm">Prueba enviada.</span>
        )}
        {estadoPrueba === 'error' && (
          <span className="text-red text-sm">No se pudo enviar.</span>
        )}
      </div>

      {(!destinoGuardado || sucio) && (
        <p className="text-ink-faint text-[11px]">
          El correo de prueba se envía al destino guardado. Guardá tus cambios
          antes de probar.
        </p>
      )}

      {estadoPrueba === 'error' && diag && (
        <div className="border-red/40 bg-red/5 space-y-2 rounded-md border p-3 text-[12px]">
          <p className="text-red text-sm font-medium">
            No se pudo enviar el correo de prueba
          </p>
          <p className="text-ink-dim">{diag.pista}</p>
          <dl className="text-ink-faint grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt>Estado HTTP</dt>
            <dd className="font-mono">{diag.httpStatus || '—'}</dd>
            {typeof diag.resendStatus === 'number' && (
              <>
                <dt>Respuesta de Resend</dt>
                <dd className="font-mono">{diag.resendStatus}</dd>
              </>
            )}
            {diag.from && (
              <>
                <dt>Remitente (RESEND_FROM)</dt>
                <dd className="font-mono break-all">{diag.from}</dd>
              </>
            )}
          </dl>
          {diag.detalle && (
            <div>
              <p className="text-ink-faint mb-1">Detalle del proveedor:</p>
              <pre className="bg-bg2 border-line text-ink-dim max-h-40 overflow-auto rounded border p-2 text-[11px] break-all whitespace-pre-wrap">
                {diag.detalle}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
