'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/dashboard/app-header';
import { CompaniaBadge } from '@/components/ui/compania-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useComisionDashboard } from '@/features/dashboard/use-comision-dashboard';
import { MOTIVOS_COMISION_PENDIENTE } from '@/lib/dashboard/comision-modelo';
import { getClienteNombre } from '@/lib/utils';

const PAGE_SIZE = 30;

export default function PendientesComisionPage() {
  const { data, isLoading, isError, refetch } = useComisionDashboard();
  const [page, setPage] = useState(0);
  const pendientes = data?.pendientes ?? [];
  const pageCount = Math.max(1, Math.ceil(pendientes.length / PAGE_SIZE));
  const pagina = Math.min(page, pageCount - 1);

  return (
    <div>
      <AppHeader
        title="Pólizas pendientes de comisión"
        subtitle="Datos faltantes para estimar el aporte mensual. No son comisiones impagas."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard">Volver al dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/polizas">Ver toda la cartera</Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-ink-faint p-8">Cargando pendientes...</p>
      ) : isError ? (
        <div
          role="alert"
          className="border-line bg-panel rounded-xl border p-6"
        >
          <p>No se pudieron cargar los registros pendientes.</p>
          <Button variant="outline" className="mt-3" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : pendientes.length === 0 ? (
        <EmptyState
          title="Sin pólizas pendientes"
          description="Todas las pólizas tienen un aporte calculable al corte de hoy."
        />
      ) : (
        <>
          <p className="text-ink-dim mb-3 text-sm">
            {pendientes.length} pólizas pendientes. Al guardar una corrección,
            la comisión se recalcula desde su fecha de efecto.
          </p>
          <ul className="space-y-3">
            {pendientes
              .slice(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE)
              .map((p) => {
                const motivo = MOTIVOS_COMISION_PENDIENTE[p.motivo];
                const cliente = p.cliente
                  ? getClienteNombre(p.cliente)
                  : 'Póliza sin cliente identificado';
                return (
                  <li
                    key={p.polizaId}
                    className="border-line bg-panel flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
                  >
                    <div className="min-w-0 flex-1 basis-64">
                      <Link
                        href={`/polizas/${p.polizaId}`}
                        className="text-ink hover:text-primary font-medium"
                      >
                        {cliente}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <CompaniaBadge
                          nombre={p.compania?.nombre}
                          color={p.compania?.color}
                        />
                        {p.detalle && (
                          <span className="text-ink-dim text-xs break-words">
                            {p.detalle}
                          </span>
                        )}
                      </div>
                      <p className="text-ink mt-3 text-sm font-medium">
                        {motivo.titulo}
                      </p>
                      <p className="text-ink-dim mt-1 text-xs">
                        {motivo.ayuda}
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <Link
                        href={`/polizas/${p.polizaId}/editar?volver=pendientes-comision`}
                        aria-label={`Editar póliza de ${cliente}`}
                      >
                        Editar póliza
                      </Link>
                    </Button>
                  </li>
                );
              })}
          </ul>
          {pageCount > 1 && (
            <div className="text-ink-dim mt-4 flex items-center justify-end gap-3 text-xs">
              <Button
                variant="outline"
                disabled={pagina === 0}
                onClick={() => setPage(pagina - 1)}
              >
                Anterior
              </Button>
              <span>
                Página {pagina + 1} de {pageCount}
              </span>
              <Button
                variant="outline"
                disabled={pagina === pageCount - 1}
                onClick={() => setPage(pagina + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
