'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { AppHeader } from '@/components/dashboard/app-header';
import { EstadoBadge } from '@/components/ui/estado-badge';
import { createClient } from '@/lib/supabase/client';
import { fetchPolizas } from '@/services/polizas.service';
import { fetchCompanias } from '@/services/companias.service';
import { fetchRamos } from '@/services/ramos.service';
import { formatCurrency, formatDate, getClienteNombre } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PolizaEstado } from '@/types/database';
import { EmptyState } from '@/components/ui/empty-state';

export default function PolizasPage() {
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [companiaId, setCompaniaId] = useState('');
  const [ramoId, setRamoId] = useState('');

  const { data: companias } = useQuery({
    queryKey: ['companias'],
    queryFn: async () => {
      const { data } = await fetchCompanias(createClient());
      return data ?? [];
    },
  });

  const { data: ramos } = useQuery({
    queryKey: ['ramos'],
    queryFn: async () => {
      const { data } = await fetchRamos(createClient());
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['polizas', search, estado, companiaId, ramoId],
    queryFn: async () => {
      const result = await fetchPolizas(createClient(), {
        search,
        estado: estado || undefined,
        compania_id: companiaId || undefined,
        ramo_id: ramoId || undefined,
        pageSize: 200,
      });
      if (result.error) throw result.error;
      return result;
    },
  });

  return (
    <div>
      <AppHeader
        title={
          <>
            Cartera <em>completa</em>
          </>
        }
        subtitle="Buscá, filtrá y gestioná pólizas"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            placeholder="Buscar cliente, detalle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-line bg-bg2 pl-9"
          />
        </div>
        <Select value={companiaId || 'all'} onValueChange={(v) => setCompaniaId(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[160px] border-line bg-bg2">
            <SelectValue placeholder="Compañía" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {(companias ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ramoId || 'all'} onValueChange={(v) => setRamoId(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[140px] border-line bg-bg2">
            <SelectValue placeholder="Ramo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {(ramos ?? []).map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estado || 'all'} onValueChange={(v) => setEstado(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[130px] border-line bg-bg2">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="VIGENTE">Vigente</SelectItem>
            <SelectItem value="HISTORICA">Histórica</SelectItem>
            <SelectItem value="BAJA">Baja</SelectItem>
          </SelectContent>
        </Select>
        <Button asChild className="border border-amber bg-bg2 text-amber-bright hover:bg-amber hover:text-[#1a1510]">
          <Link href="/polizas/nueva">
            <Plus className="mr-1 h-4 w-4" /> Nueva póliza
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-[3px] border border-line bg-panel">
        {isLoading ? (
          <p className="p-8 text-ink-faint">Cargando...</p>
        ) : !data?.data?.length ? (
          <EmptyState title="Sin pólizas" />
        ) : (
          <div className="max-h-[560px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-line bg-panel2 sticky top-0">
                  <TableHead className="text-ink-faint">Cliente</TableHead>
                  <TableHead className="text-ink-faint">Ramo</TableHead>
                  <TableHead className="text-ink-faint">Compañía</TableHead>
                  <TableHead className="text-ink-faint">Detalle</TableHead>
                  <TableHead className="text-ink-faint">Vigencia</TableHead>
                  <TableHead className="text-right text-ink-faint">Prima</TableHead>
                  <TableHead className="text-ink-faint">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((p) => {
                  const c = p.cliente as { nombre: string; apellido: string } | null;
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer border-line/50 hover:bg-panel2"
                      onDoubleClick={() => window.location.href = `/polizas/${p.id}`}
                    >
                      <TableCell>
                        <Link href={`/clientes/${p.cliente_id}`} className="font-medium text-ink hover:text-amber">
                          {c ? getClienteNombre(c) : '—'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-ink-dim">
                        {(p.ramo as { nombre: string })?.nombre ?? '—'}
                      </TableCell>
                      <TableCell className="text-blue text-xs">
                        {(p.compania as { nombre: string })?.nombre ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">{p.detalle || '—'}</TableCell>
                      <TableCell className="text-xs">{formatDate(p.fecha_inicio)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {Number(p.prima) > 0 ? formatCurrency(Number(p.prima)) : (
                          <span className="italic text-ink-faint">sin cargar</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <EstadoBadge estado={p.estado as PolizaEstado} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        <b className="text-amber">{data?.count ?? data?.data?.length ?? 0}</b> pólizas
      </p>
    </div>
  );
}
