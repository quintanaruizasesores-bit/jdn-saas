'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RiskBadge } from '@/components/ui/risk-badge';
import { EstadoBadge } from '@/components/ui/estado-badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { fetchClienteById, softDeleteCliente } from '@/services/clientes.service';
import { fetchPolizasByCliente } from '@/services/polizas.service';
import { fetchSiniestrosByCliente } from '@/services/siniestros.service';
import { fetchTareas } from '@/services/tareas.service';
import { calculateRiskScore } from '@/lib/riesgo/calculate-risk-score';
import { formatCurrency, formatDate, getClienteNombre } from '@/lib/utils';
import { SINIESTRO_TIPO_LABELS, RESPONSABILIDAD_LABELS } from '@/lib/riesgo/calculate-risk-score';
import type { PolizaEstado } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

export default function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => softDeleteCliente(createClient(), id),
    onSuccess: () => {
      toast.success('Cliente eliminado');
      qc.invalidateQueries({ queryKey: ['clientes'] });
      router.push('/clientes');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await fetchClienteById(supabase, id);
      if (error) throw error;
      return data;
    },
  });

  const { data: polizas } = useQuery({
    queryKey: ['polizas-cliente', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await fetchPolizasByCliente(supabase, id);
      return data ?? [];
    },
  });

  const { data: siniestros } = useQuery({
    queryKey: ['siniestros-cliente', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await fetchSiniestrosByCliente(supabase, id);
      return data ?? [];
    },
  });

  const { data: tareas } = useQuery({
    queryKey: ['tareas-cliente', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await fetchTareas(supabase, { cliente_id: id });
      return data ?? [];
    },
  });

  const { data: actividad } = useQuery({
    queryKey: ['actividad-cliente', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('actividad')
        .select('*')
        .eq('entidad', 'CLIENTE')
        .eq('entidad_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data ?? []) as import('@/types/database').Actividad[];
    },
  });

  if (isLoading || !cliente) {
    return <Skeleton className="h-96 bg-panel" />;
  }

  const riesgo = calculateRiskScore({
    siniestros: siniestros ?? [],
    totalPolizas: polizas?.length ?? 0,
  });
  const primaTotal = (polizas ?? []).reduce((s, p) => s + Number(p.prima), 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <Link href="/clientes" className="inline-flex items-center gap-2 text-sm text-ink-dim hover:text-amber">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="border-amber text-amber">
            <Link href={`/clientes/${id}/editar`}>Editar</Link>
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="destructive" disabled={deleteMutation.isPending}>
                <Trash2 className="mr-1 h-4 w-4" /> Eliminar
              </Button>
            }
            title="Eliminar cliente"
            description="Esta acción da de baja al cliente y lo oculta de la cartera. Las pólizas y siniestros se conservan. ¿Continuar?"
            confirmLabel="Eliminar"
            destructive
            onConfirm={() => deleteMutation.mutateAsync()}
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap justify-between gap-4 rounded-[5px] border border-line bg-gradient-to-br from-panel2 to-panel p-7">
        <div>
          <h2 className="font-serif text-3xl font-medium text-ink">{getClienteNombre(cliente)}</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-dim">
            {cliente.email && (
              <a href={`mailto:${cliente.email}`} className="text-blue hover:text-amber">
                {cliente.email}
              </a>
            )}
            {cliente.telefono && (
              <a href={`tel:${cliente.telefono}`} className="text-blue hover:text-amber">
                {cliente.telefono}
              </a>
            )}
            {cliente.dni && <span>DNI / CUIT {cliente.dni}</span>}
          </div>
        </div>
        <div className="text-center">
          <RiskBadge score={riesgo.score} nivel={riesgo.nivel} />
          <p className="mt-2 text-[9px] uppercase tracking-widest text-ink-faint">
            Riesgo {riesgo.nivel}
          </p>
        </div>
      </div>

      {riesgo.alertas.length > 0 && (
        <div className="mb-4 rounded-[3px] border border-red/40 bg-red/7 p-4">
          <p className="text-[10px] font-bold uppercase text-red">Banderas de riesgo</p>
          <ul className="mt-2 space-y-1 text-sm">
            {riesgo.alertas.map((a, i) => (
              <li key={i}>{a.txt}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pólizas" value={String(polizas?.length ?? 0)} />
        <Stat label="Prima total" value={formatCurrency(primaTotal)} />
        <Stat label="Siniestros" value={String(siniestros?.length ?? 0)} />
        <Stat label="Tareas" value={String(tareas?.length ?? 0)} />
      </div>

      <Tabs defaultValue="polizas">
        <TabsList className="bg-panel2 border border-line">
          <TabsTrigger value="polizas">Pólizas</TabsTrigger>
          <TabsTrigger value="siniestros">Siniestros</TabsTrigger>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
        </TabsList>
        <TabsContent value="polizas" className="mt-4 space-y-2">
          {(polizas ?? []).map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 rounded-[3px] border border-line bg-bg2 p-3 hover:border-amber"
            >
              <Link href={`/polizas/${p.id}`} className="text-sm text-ink hover:text-amber">
                {p.detalle || 'Sin detalle'}
              </Link>
              <span className="text-xs text-blue">{(p.compania as { nombre: string })?.nombre}</span>
              <EstadoBadge estado={p.estado as PolizaEstado} />
              <Link
                href={`/siniestros/nuevo?cliente=${id}&poliza=${p.id}`}
                className="inline-flex items-center gap-1 text-xs text-amber hover:underline"
              >
                <Plus className="h-3 w-3" /> Siniestro
              </Link>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="siniestros" className="mt-4 space-y-3">
          {(siniestros ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/siniestros/${s.id}`}
              className="block rounded-[3px] border border-line bg-panel p-3 hover:border-amber"
            >
              <p className="font-medium text-ink">
                {SINIESTRO_TIPO_LABELS[s.tipo as keyof typeof SINIESTRO_TIPO_LABELS]} —{' '}
                {RESPONSABILIDAD_LABELS[s.responsabilidad as keyof typeof RESPONSABILIDAD_LABELS]}
              </p>
              <p className="text-xs text-ink-faint">{formatDate(s.fecha)} · {s.descripcion}</p>
              {(s.poliza as { detalle: string | null } | null)?.detalle && (
                <p className="mt-1 text-xs text-blue">
                  Auto: {(s.poliza as { detalle: string | null }).detalle}
                </p>
              )}
            </Link>
          ))}
        </TabsContent>
        <TabsContent value="tareas" className="mt-4 space-y-2">
          {(tareas ?? []).map((t) => (
            <div key={t.id} className="rounded-[3px] border border-line bg-panel p-3">
              <p className="font-medium">{t.titulo}</p>
              <p className="text-xs text-ink-faint">{t.estado} · vence {formatDate(t.fecha_vencimiento)}</p>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="actividad" className="mt-4 space-y-1">
          {(actividad ?? []).map((a) => (
            <div key={a.id} className="flex gap-3 text-xs text-ink-dim">
              <span className="text-ink-faint">{formatDate(a.created_at)}</span>
              <span>{a.accion}</span>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[3px] border border-line bg-panel p-4">
      <p className="text-[9px] uppercase tracking-widest text-ink-faint">{label}</p>
      <p className="mt-1 font-serif text-2xl text-ink">{value}</p>
    </div>
  );
}
