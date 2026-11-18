'use client';

import { useMemo, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, ChevronRight, Info, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import type {
  CrossSellOportunidadEstado,
  CrossSellEvento,
} from '@/types/database';
import {
  actualizarOportunidad,
  addExclusion,
  fetchCategorias,
  fetchEventosCliente,
  logCrossSellEvento,
  type OportunidadEnriquecida,
} from '@/services/crosssell.service';
import { ESTADO_LABEL, ESTADO_OPCIONES, ESTADO_VARIANT } from './estado';
import { CorreoEditor } from './correo-editor';

export function Bandeja({
  query,
}: {
  query: UseQueryResult<OportunidadEnriquecida[]>;
}) {
  const qc = useQueryClient();
  const [filtroEstado, setFiltroEstado] = useState<string>('ABIERTAS');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');
  const [texto, setTexto] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const categoriasQuery = useQuery({
    queryKey: ['crosssell', 'categorias'],
    queryFn: () => fetchCategorias(createClient()),
  });

  const oportunidades = useMemo(() => query.data ?? [], [query.data]);

  const filtradas = useMemo(() => {
    const t = texto.trim().toLowerCase();
    return oportunidades.filter((o) => {
      if (filtroEstado === 'ABIERTAS') {
        if (!['NUEVA', 'VISTA', 'CONTACTADA', 'EN_NEGOCIACION'].includes(o.estado))
          return false;
      } else if (filtroEstado !== 'TODAS' && o.estado !== filtroEstado) {
        return false;
      }
      if (
        filtroCategoria !== 'TODAS' &&
        o.categoria_objetivo_id !== filtroCategoria
      )
        return false;
      if (t) {
        const nombre = `${o.cliente?.nombre ?? ''} ${o.cliente?.apellido ?? ''}`
          .toLowerCase()
          .trim();
        if (!nombre.includes(t)) return false;
      }
      return true;
    });
  }, [oportunidades, filtroEstado, filtroCategoria, texto]);

  const seleccionada =
    filtradas.find((o) => o.id === selectedId) ?? filtradas[0] ?? null;

  const avanzarSiguiente = (actualId: string) => {
    const idx = filtradas.findIndex((o) => o.id === actualId);
    const siguiente = filtradas[idx + 1] ?? filtradas[idx - 1] ?? null;
    setSelectedId(siguiente ? siguiente.id : null);
  };

  const cambiarEstado = useMutation({
    mutationFn: async (vars: {
      o: OportunidadEnriquecida;
      estado: CrossSellOportunidadEstado;
    }) => {
      const supabase = createClient();
      const { error } = await actualizarOportunidad(supabase, vars.o.id, {
        estado: vars.estado,
      });
      if (error) throw error;
      await logCrossSellEvento(supabase, {
        cliente_id: vars.o.cliente_id,
        oportunidad_id: vars.o.id,
        tipo: 'ESTADO_CAMBIADO',
        detalle: { estado: vars.estado },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crosssell'] });
      toast.success(`Oportunidad marcada como ${ESTADO_LABEL[vars.estado]}.`);
      if (['CONVERTIDA', 'DESCARTADA', 'NO_APLICA'].includes(vars.estado))
        avanzarSiguiente(vars.o.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (query.isLoading)
    return (
      <p className="text-ink-dim py-10 text-center text-sm">
        Cargando oportunidades…
      </p>
    );
  if (oportunidades.length === 0)
    return (
      <EmptyState
        title="Todavía no hay oportunidades"
        description='Configurá las categorías y reglas, y luego tocá "Detectar oportunidades".'
      />
    );

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(260px,340px)_1fr]">
      {/* Panel izquierdo: filtros + lista */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Buscar cliente…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="border-line bg-bg2"
          />
          <div className="flex gap-2">
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="border-line bg-bg2 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABIERTAS">Abiertas</SelectItem>
                <SelectItem value="TODAS">Todos los estados</SelectItem>
                {ESTADO_OPCIONES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESTADO_LABEL[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="border-line bg-bg2 h-9 text-xs">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las categorías</SelectItem>
                {(categoriasQuery.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-ink-dim text-xs">
            {filtradas.length} oportunidad
            {filtradas.length === 1 ? '' : 'es'}
          </p>
        </div>

        <ul className="max-h-[70vh] space-y-1 overflow-auto pr-1">
          {filtradas.map((o) => {
            const activa = seleccionada?.id === o.id;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(o.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                    activa
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-line bg-panel hover:bg-bg2'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-ink truncate text-sm font-medium">
                      {o.cliente
                        ? `${o.cliente.apellido} ${o.cliente.nombre}`.trim()
                        : 'Cliente'}
                    </div>
                    <div className="text-ink-dim truncate text-xs">
                      Ofrecer: {o.categoria_objetivo?.nombre ?? '—'}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={ESTADO_VARIANT[o.estado]}>
                      {ESTADO_LABEL[o.estado]}
                    </Badge>
                    <span className="text-ink-dim text-[11px]">
                      {o.prioridad_score}
                    </span>
                  </div>
                  <ChevronRight className="text-ink-faint h-4 w-4 shrink-0" />
                </button>
              </li>
            );
          })}
          {filtradas.length === 0 && (
            <li className="text-ink-dim px-2 py-6 text-center text-sm">
              Sin oportunidades con estos filtros.
            </li>
          )}
        </ul>
      </div>

      {/* Panel principal: detalle + editor de correo */}
      <div className="border-line bg-panel min-h-[320px] rounded-xl border p-4">
        {seleccionada ? (
          <Detalle
            key={seleccionada.id}
            o={seleccionada}
            onEstado={(estado) =>
              cambiarEstado.mutate({ o: seleccionada, estado })
            }
            cambiando={cambiarEstado.isPending}
          />
        ) : (
          <p className="text-ink-dim py-16 text-center text-sm">
            Elegí una oportunidad de la lista.
          </p>
        )}
      </div>
    </div>
  );
}

function Detalle({
  o,
  onEstado,
  cambiando,
}: {
  o: OportunidadEnriquecida;
  onEstado: (estado: CrossSellOportunidadEstado) => void;
  cambiando: boolean;
}) {
  const qc = useQueryClient();
  const [nota, setNota] = useState(o.nota ?? '');

  const eventosQuery = useQuery({
    queryKey: ['crosssell', 'eventos', o.cliente_id],
    queryFn: () => fetchEventosCliente(createClient(), o.cliente_id),
  });

  const guardarNota = useMutation({
    mutationFn: async () => {
      const { error } = await actualizarOportunidad(createClient(), o.id, {
        nota: nota.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crosssell', 'oportunidades'] });
      toast.success('Nota guardada.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (alcance: 'CATEGORIA' | 'GLOBAL') => {
      const supabase = createClient();
      const { error } = await addExclusion(supabase, {
        cliente_id: o.cliente_id,
        categoria_id:
          alcance === 'CATEGORIA' ? o.categoria_objetivo_id : null,
        motivo: 'Excluido manualmente desde Cross-Selling',
      });
      if (error) throw error;
      await actualizarOportunidad(supabase, o.id, {
        estado: 'NO_APLICA',
        cierre_motivo: 'Cliente excluido',
      });
      await logCrossSellEvento(supabase, {
        cliente_id: o.cliente_id,
        oportunidad_id: o.id,
        tipo: 'EXCLUIDO',
        detalle: { alcance },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crosssell'] });
      toast.success('Cliente excluido.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nombre = o.cliente
    ? `${o.cliente.apellido} ${o.cliente.nombre}`.trim()
    : 'Cliente';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-ink text-lg font-semibold">{nombre}</h3>
          <p className="text-ink-dim text-sm">
            Oportunidad: <b>{o.categoria_objetivo?.nombre ?? '—'}</b> ·
            prioridad {o.prioridad_score}
          </p>
          {o.cliente?.email ? (
            <p className="text-ink-dim text-xs">{o.cliente.email}</p>
          ) : (
            <p className="text-red text-xs">Sin email registrado</p>
          )}
        </div>
        <Badge variant={ESTADO_VARIANT[o.estado]}>
          {ESTADO_LABEL[o.estado]}
        </Badge>
      </div>

      {/* Por qué se generó */}
      <div className="border-line bg-bg2 rounded-lg border p-3">
        <div className="text-ink-dim mb-1 flex items-center gap-1 text-xs font-medium">
          <Info className="h-3.5 w-3.5" /> Por qué se generó
        </div>
        <p className="text-ink text-sm">
          {o.motivo?.regla_nombre ? `Regla: ${o.motivo.regla_nombre}. ` : ''}
          {o.motivo?.categorias_actuales?.length
            ? `Tiene ${o.motivo.categorias_actuales
                .map((c) => c.nombre)
                .join(', ')} y no registra ${
                o.categoria_objetivo?.nombre ?? 'esta cobertura'
              } en la cartera.`
            : 'Cobertura ausente en la cartera.'}
        </p>
        {o.motivo?.polizas_relacionadas?.length ? (
          <ul className="text-ink-dim mt-2 space-y-0.5 text-xs">
            {o.motivo.polizas_relacionadas.map((p) => (
              <li key={p.id}>
                • {p.ramo}
                {p.compania ? ` · ${p.compania}` : ''}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-ink-faint mt-2 text-[11px]">
          Oportunidad potencial: no implica que el cliente no tenga esta
          cobertura en otra aseguradora.
        </p>
      </div>

      {/* Acciones de estado */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={cambiando}
          onClick={() => onEstado('EN_NEGOCIACION')}
        >
          En negociación
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={cambiando}
          onClick={() => onEstado('CONVERTIDA')}
        >
          Convertida
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={cambiando}
          onClick={() => onEstado('DESCARTADA')}
        >
          Descartar
        </Button>
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" className="text-red gap-1">
              <Ban className="h-3.5 w-3.5" /> Excluir
            </Button>
          }
          title="Excluir cliente"
          description="El cliente dejará de generar oportunidades de esta categoría. Podés revertirlo desde la pestaña de exclusiones."
          confirmLabel="Excluir de esta categoría"
          onConfirm={() => excluir.mutateAsync('CATEGORIA')}
        />
      </div>

      {/* Editor de correo individual (Fase 2) */}
      <div className="border-line border-t pt-4">
        <div className="text-ink-dim mb-2 flex items-center gap-1 text-xs font-medium">
          <Mail className="h-3.5 w-3.5" /> Correo personalizado
        </div>
        <CorreoEditor oportunidad={o} />
      </div>

      {/* Nota */}
      <div>
        <label className="text-ink-dim text-xs">Nota de seguimiento</label>
        <Textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          className="border-line bg-bg2 mt-1"
          placeholder="Observaciones comerciales…"
        />
        <div className="mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => guardarNota.mutate()}
            disabled={guardarNota.isPending || (nota.trim() === (o.nota ?? ''))}
          >
            Guardar nota
          </Button>
        </div>
      </div>

      {/* Historial del cliente */}
      <Timeline eventos={eventosQuery.data ?? []} />
    </div>
  );
}

function Timeline({ eventos }: { eventos: CrossSellEvento[] }) {
  if (eventos.length === 0) return null;
  return (
    <div className="border-line border-t pt-3">
      <div className="text-ink-dim mb-2 text-xs font-medium">
        Historial comercial
      </div>
      <ul className="space-y-1">
        {eventos.slice(0, 15).map((e) => (
          <li key={e.id} className="text-ink-dim text-xs">
            <span className="text-ink-faint">
              {new Date(e.created_at).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
              })}
            </span>{' '}
            · {tipoEventoLabel(e.tipo)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function tipoEventoLabel(tipo: string): string {
  const map: Record<string, string> = {
    ESTADO_CAMBIADO: 'Cambio de estado',
    EXCLUIDO: 'Cliente excluido',
    CORREO_PREPARADO: 'Correo preparado',
    CORREO_ENVIADO: 'Correo enviado',
  };
  return map[tipo] ?? tipo;
}
