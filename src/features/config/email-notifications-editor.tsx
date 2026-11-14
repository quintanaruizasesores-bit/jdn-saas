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

export function EmailNotificationsEditor() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const emailCuenta = user?.email ?? '';

  const [activo, setActivo] = useState(false);
  const [destinatario, setDestinatario] = useState('');
  const [estadoPrueba, setEstadoPrueba] = useState<EstadoPrueba>('idle');

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
    try {
      const res = await fetch('/api/notificaciones/prueba', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        destinatario?: string;
      };
      if (!res.ok)
        throw new Error(body.error ?? 'No se pudo enviar la prueba.');
      setEstadoPrueba('ok');
      toast.success(
        `Correo de prueba enviado a ${body.destinatario ?? destinoGuardado}`
      );
    } catch (e) {
      setEstadoPrueba('error');
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
    </div>
  );
}
