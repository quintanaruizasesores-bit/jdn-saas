'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, Send, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OportunidadEnriquecida } from '@/services/crosssell.service';
import {
  fetchBorradorOportunidad,
  fetchPlantillas,
  guardarBorrador,
} from '@/services/crosssell.service';
import {
  generarBorrador,
  renderPlantilla,
  textoAHtml,
  type VariablesCorreo,
} from '@/lib/crosssell/correo/plantilla';
import { EMPRESA_NOMBRE } from '@/lib/email/layout';

export function CorreoEditor({
  oportunidad,
}: {
  oportunidad: OportunidadEnriquecida;
}) {
  const qc = useQueryClient();
  const cliente = oportunidad.cliente;

  const vars: VariablesCorreo = useMemo(
    () => ({
      nombre: cliente?.nombre ?? '',
      apellido: cliente?.apellido ?? '',
      ramoAsegurado:
        oportunidad.motivo?.categorias_actuales?.[0]?.nombre ?? 'seguro',
      coberturaOfrecida: oportunidad.categoria_objetivo?.nombre ?? 'cobertura',
      empresa: EMPRESA_NOMBRE,
    }),
    [cliente, oportunidad]
  );

  const borradorQuery = useQuery({
    queryKey: ['crosssell', 'borrador', oportunidad.id],
    queryFn: () => fetchBorradorOportunidad(createClient(), oportunidad.id),
  });
  const plantillasQuery = useQuery({
    queryKey: ['crosssell', 'plantillas'],
    queryFn: () => fetchPlantillas(createClient()),
  });

  const defaults = useMemo(
    () =>
      generarBorrador({
        nombre: vars.nombre,
        ramoAsegurado: vars.ramoAsegurado,
        coberturaOfrecida: vars.coberturaOfrecida,
      }),
    [vars]
  );

  const borrador = borradorQuery.data;
  const [asunto, setAsunto] = useState<string | null>(null);
  const [cuerpo, setCuerpo] = useState<string | null>(null);
  const [destinatario, setDestinatario] = useState<string | null>(null);
  const [correoId, setCorreoId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [reenvio, setReenvio] = useState(false);

  // Inicialización perezosa desde el borrador guardado o el ejemplo generado.
  const asuntoVal = asunto ?? borrador?.asunto ?? defaults.asunto;
  const cuerpoVal = cuerpo ?? borrador?.cuerpo_text ?? defaults.cuerpo;
  const destinatarioVal =
    destinatario ?? borrador?.destinatario_email ?? cliente?.email ?? '';
  const correoIdVal = correoId ?? borrador?.id ?? null;

  const aplicarPlantilla = (id: string) => {
    const p = (plantillasQuery.data ?? []).find((x) => x.id === id);
    if (!p) return;
    setAsunto(renderPlantilla(p.asunto, vars));
    setCuerpo(renderPlantilla(p.cuerpo, vars));
  };

  const persistir = async (): Promise<string> => {
    const { data, error } = await guardarBorrador(createClient(), {
      id: correoIdVal ?? undefined,
      oportunidad_id: oportunidad.id,
      cliente_id: oportunidad.cliente_id,
      categoria_objetivo_id: oportunidad.categoria_objetivo_id,
      asunto: asuntoVal,
      cuerpo: cuerpoVal,
      destinatario_email: destinatarioVal,
    });
    if (error) throw error;
    const id = (data as { id: string }).id;
    setCorreoId(id);
    return id;
  };

  const guardar = useMutation({
    mutationFn: persistir,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crosssell', 'borrador', oportunidad.id] });
      toast.success('Borrador guardado.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enviar = useMutation({
    mutationFn: async (confirmarReenvio: boolean) => {
      const id = await persistir();
      const res = await fetch('/api/cross-selling/correos/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo_id: id,
          confirmar_reenvio: confirmarReenvio,
        }),
      });
      const json = await res.json();
      if (res.status === 409 && json.needsConfirm) {
        setReenvio(true);
        throw new Error(json.error);
      }
      if (!res.ok)
        throw new Error(json.detalle ?? json.error ?? 'No se pudo enviar.');
      return json as { destinatario: string };
    },
    onSuccess: (r) => {
      setReenvio(false);
      qc.invalidateQueries({ queryKey: ['crosssell'] });
      toast.success(`Correo enviado a ${r.destinatario}.`);
    },
    onError: (e: Error) => {
      if (!reenvio) toast.error(e.message);
    },
  });

  const sinEmail = !destinatarioVal.trim();

  if (borradorQuery.isLoading)
    return <p className="text-ink-dim text-sm">Cargando borrador…</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select onValueChange={aplicarPlantilla}>
          <SelectTrigger className="border-line bg-bg2 h-8 w-52 text-xs">
            <SelectValue placeholder="Aplicar plantilla…" />
          </SelectTrigger>
          <SelectContent>
            {(plantillasQuery.data ?? [])
              .filter((p) => p.activa)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                </SelectItem>
              ))}
            {(plantillasQuery.data ?? []).length === 0 && (
              <div className="text-ink-dim px-2 py-1.5 text-xs">
                Sin plantillas
              </div>
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          onClick={() => setPreview((p) => !p)}
        >
          <Eye className="h-3.5 w-3.5" /> {preview ? 'Editar' : 'Previsualizar'}
        </Button>
      </div>

      <div>
        <label className="text-ink-dim text-xs">Para</label>
        <Input
          value={destinatarioVal}
          onChange={(e) => setDestinatario(e.target.value)}
          className="border-line bg-bg2 mt-1"
          placeholder="correo@cliente.com"
        />
        {sinEmail && (
          <p className="text-red mt-1 text-xs">
            El cliente no tiene email. Cargalo para poder enviar.
          </p>
        )}
      </div>

      {preview ? (
        <div className="border-line bg-white rounded-lg border p-4 text-sm text-[#111827]">
          <p className="mb-2 font-semibold text-[#1A2556]">{asuntoVal}</p>
          <div
            // textoAHtml escapa todo el contenido dinámico.
            dangerouslySetInnerHTML={{ __html: textoAHtml(cuerpoVal) }}
          />
          <p className="mt-3 text-[11px] text-[#9ca3af]">
            Pie con enlace de baja — se agrega automáticamente al enviar.
          </p>
        </div>
      ) : (
        <>
          <div>
            <label className="text-ink-dim text-xs">Asunto</label>
            <Input
              value={asuntoVal}
              onChange={(e) => setAsunto(e.target.value)}
              className="border-line bg-bg2 mt-1"
            />
          </div>
          <div>
            <label className="text-ink-dim text-xs">Mensaje</label>
            <Textarea
              value={cuerpoVal}
              onChange={(e) => setCuerpo(e.target.value)}
              rows={9}
              className="border-line bg-bg2 mt-1 font-mono text-[13px]"
            />
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => guardar.mutate()}
          disabled={guardar.isPending}
        >
          <Save className="h-3.5 w-3.5" /> Guardar borrador
        </Button>
        {!reenvio ? (
          <Button
            type="button"
            size="sm"
            className="gap-1"
            onClick={() => enviar.mutate(false)}
            disabled={enviar.isPending || sinEmail}
          >
            <Send className="h-3.5 w-3.5" />
            {enviar.isPending ? 'Enviando…' : 'Enviar correo'}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-red text-xs">
              Ya se contactó esta cobertura.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => enviar.mutate(true)}
              disabled={enviar.isPending}
            >
              Reenviar igual
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setReenvio(false)}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>
      <p className="text-ink-faint text-[11px]">
        Enviar envía un único correo a este cliente. No genera envíos masivos.
      </p>
    </div>
  );
}
