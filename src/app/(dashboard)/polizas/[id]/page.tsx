'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppHeader } from '@/components/dashboard/app-header';
import { EstadoBadge } from '@/components/ui/estado-badge';
import { PolizaForm } from '@/features/polizas/poliza-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import {
  fetchPolizaById,
  fetchPolizaHistorial,
  updatePoliza,
  renovarPoliza,
  darBajaPoliza,
} from '@/services/polizas.service';
import { fetchCompanias } from '@/services/companias.service';
import { fetchRamos } from '@/services/ramos.service';
import { formatCurrency, formatDate, getClienteNombre } from '@/lib/utils';
import type { PolizaEstado } from '@/types/database';
import type { PolizaFormData } from '@/validations/poliza.schema';

export default function PolizaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [renovFechaInicio, setRenovFechaInicio] = useState('');
  const [renovFechaFin, setRenovFechaFin] = useState('');
  const [renovPrima, setRenovPrima] = useState('');

  const { data: poliza, isLoading } = useQuery({
    queryKey: ['poliza', id],
    queryFn: async () => {
      const { data, error } = await fetchPolizaById(createClient(), id);
      if (error) throw error;
      return data;
    },
  });

  const { data: historial } = useQuery({
    queryKey: ['poliza-historial', id],
    queryFn: async () => {
      const { data } = await fetchPolizaHistorial(createClient(), id);
      return data ?? [];
    },
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data } = await createClient().from('clientes').select('id, nombre, apellido').is('deleted_at', null);
      return ((data ?? []) as import('@/types/database').Cliente[]).map((c) => ({
        id: c.id,
        nombre: getClienteNombre(c),
      }));
    },
  });

  const { data: companias } = useQuery({
    queryKey: ['companias'],
    queryFn: async () => {
      const { data } = await fetchCompanias(createClient());
      return (data ?? []).map((c) => ({ id: c.id, nombre: c.nombre }));
    },
  });

  const { data: ramos } = useQuery({
    queryKey: ['ramos'],
    queryFn: async () => {
      const { data } = await fetchRamos(createClient());
      return (data ?? []).map((r) => ({ id: r.id, nombre: r.nombre }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PolizaFormData) => updatePoliza(createClient(), id, data),
    onSuccess: () => {
      toast.success('Póliza actualizada');
      qc.invalidateQueries({ queryKey: ['poliza', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bajaMutation = useMutation({
    mutationFn: () => darBajaPoliza(createClient(), id),
    onSuccess: () => {
      toast.success('Póliza dada de baja');
      qc.invalidateQueries({ queryKey: ['poliza', id] });
    },
  });

  const renovMutation = useMutation({
    mutationFn: () =>
      renovarPoliza(createClient(), id, {
        fecha_inicio: renovFechaInicio,
        fecha_fin: renovFechaFin,
        prima: Number(renovPrima),
      }),
    onSuccess: () => {
      toast.success('Póliza renovada');
      qc.invalidateQueries({ queryKey: ['poliza', id] });
    },
  });

  if (isLoading || !poliza) return <p className="text-ink-faint">Cargando...</p>;

  const cliente = poliza.cliente as { nombre: string; apellido: string; id: string };

  return (
    <div>
      <AppHeader title={`Póliza #${poliza.numero_poliza}`} subtitle={poliza.detalle ?? undefined} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <EstadoBadge estado={poliza.estado as PolizaEstado} />
        <span className="text-ink-dim">
          Cliente:{' '}
          <Link href={`/clientes/${cliente?.id ?? poliza.cliente_id}`} className="text-amber hover:underline">
            {cliente ? getClienteNombre(cliente) : '—'}
          </Link>
        </span>
        <span className="text-ink-dim">Prima: {formatCurrency(Number(poliza.prima))}</span>
        <span className="text-ink-dim">
          Vigencia: {formatDate(poliza.fecha_inicio)} — {formatDate(poliza.fecha_fin)}
        </span>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-amber text-amber">
              Renovar
            </Button>
          </DialogTrigger>
          <DialogContent className="border-line bg-panel2">
            <DialogHeader>
              <DialogTitle>Renovar póliza</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nueva fecha inicio</Label>
                <Input type="date" value={renovFechaInicio} onChange={(e) => setRenovFechaInicio(e.target.value)} className="border-line bg-bg" />
              </div>
              <div>
                <Label>Nueva fecha fin</Label>
                <Input type="date" value={renovFechaFin} onChange={(e) => setRenovFechaFin(e.target.value)} className="border-line bg-bg" />
              </div>
              <div>
                <Label>Prima</Label>
                <Input type="number" value={renovPrima} onChange={(e) => setRenovPrima(e.target.value)} className="border-line bg-bg" />
              </div>
              <Button onClick={() => renovMutation.mutate()} className="bg-amber text-[#1a1510]">
                Confirmar renovación
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {poliza.estado !== 'BAJA' && (
          <Button variant="outline" className="border-red text-red" onClick={() => bajaMutation.mutate()}>
            Dar de baja
          </Button>
        )}
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[3px] border border-line bg-panel p-6">
          <h3 className="mb-4 text-sm uppercase tracking-wider text-ink-dim">Editar</h3>
          <PolizaForm
            defaultValues={poliza}
            clientes={clientes ?? []}
            companias={companias ?? []}
            ramos={ramos ?? []}
            onSubmit={async (d) => {
              await updateMutation.mutateAsync(d);
            }}
            loading={updateMutation.isPending}
          />
        </div>
        <div className="rounded-[3px] border border-line bg-panel p-6">
          <h3 className="mb-4 text-sm uppercase tracking-wider text-ink-dim">Historial</h3>
          <ul className="space-y-2 text-xs">
            {(historial ?? []).map((h) => (
              <li key={h.id} className="border-b border-line/40 pb-2 text-ink-dim">
                <span className="text-amber">{h.tipo}</span> — {formatDate(h.created_at)}
                {h.nota && <span className="block">{h.nota}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
