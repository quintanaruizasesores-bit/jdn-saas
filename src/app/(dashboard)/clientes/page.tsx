'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { AppHeader } from '@/components/dashboard/app-header';
import { createClient } from '@/lib/supabase/client';
import { fetchClientes } from '@/services/clientes.service';
import { getClienteNombre } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', debounced],
    queryFn: async () => {
      const supabase = createClient();
      const result = await fetchClientes(supabase, { search: debounced, pageSize: 100 });
      if (result.error) throw result.error;
      return result;
    },
  });

  return (
    <div>
      <AppHeader
        title={
          <>
            Clientes <em>activos</em>
          </>
        }
        subtitle="Administrá tu cartera de clientes"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            placeholder="Buscar nombre, DNI, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setTimeout(() => setDebounced(e.target.value), 300);
            }}
            className="border-line bg-bg2 pl-9"
          />
        </div>
        <span className="text-xs text-ink-faint">
          <b className="text-amber">{data?.count ?? 0}</b> clientes
        </span>
        <Button asChild className="bg-bg2 text-amber-bright border border-amber hover:bg-amber hover:text-[#1a1510]">
          <Link href="/clientes/nuevo">
            <Plus className="mr-1 h-4 w-4" />
            Nuevo cliente
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-[3px] border border-line bg-panel">
        {isLoading ? (
          <div className="p-8 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 bg-panel2" />
            ))}
          </div>
        ) : !data?.data?.length ? (
          <EmptyState title="Sin clientes" description="Creá el primer cliente o importá desde el prototipo." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-line hover:bg-panel2">
                <TableHead className="text-ink-faint">Cliente</TableHead>
                <TableHead className="text-ink-faint">DNI</TableHead>
                <TableHead className="text-ink-faint">Contacto</TableHead>
                <TableHead className="text-ink-faint">Localidad</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((c) => (
                <TableRow key={c.id} className="border-line/50 hover:bg-panel2">
                  <TableCell className="font-medium text-ink">
                    <Link href={`/clientes/${c.id}`} className="hover:text-amber hover:underline">
                      {getClienteNombre(c)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-ink-dim">{c.dni || '—'}</TableCell>
                  <TableCell className="text-ink-dim text-xs">{c.email || c.telefono || '—'}</TableCell>
                  <TableCell className="text-ink-dim">{c.localidad || '—'}</TableCell>
                  <TableCell>
                    <Link href={`/clientes/${c.id}/editar`} className="text-xs text-amber hover:underline">
                      editar
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
