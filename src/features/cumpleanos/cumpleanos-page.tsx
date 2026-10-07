'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Cake, Search, PartyPopper } from 'lucide-react';
import { AppHeader } from '@/components/dashboard/app-header';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { fetchClientesConCumple } from '@/services/cumpleanos.service';
import { fetchBirthdaySettings } from '@/services/settings.service';
import {
  buildClienteCumpleViews,
  computeResumen,
  filterAndSortCumples,
  type ClienteCumpleView,
  type RangoCumple,
} from '@/lib/cumpleanos/listado';
import { getTodayInTimezone } from '@/lib/cumpleanos/fechas';
import { prepareCumpleMessage } from '@/lib/cumpleanos/mensaje';
import { cn } from '@/lib/utils';
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
import { ErrorState } from '@/components/ui/error-state';
import {
  WhatsappPreviewDialog,
  type WhatsappPreviewData,
} from './whatsapp-preview-dialog';
import { useContactado } from './use-contactado';

const RANGOS: { value: RangoCumple; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: '7', label: 'Próximos 7 días' },
  { value: '30', label: 'Próximos 30 días' },
  { value: 'todos', label: 'Todos' },
];

interface PreparedRow {
  view: ClienteCumpleView;
  message: string;
  phoneStatus: 'ok' | 'invalid' | 'empty';
  link: string | null;
}

export function CumpleanosPage() {
  const { profile } = useAuth();
  const asesor = profile?.nombre ?? '';

  const [rango, setRango] = useState<RangoCumple>('hoy');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [preview, setPreview] = useState<{ data: WhatsappPreviewData; id: string } | null>(null);

  // "Hoy" en la zona de la app, estable durante la sesión de la página.
  const today = useMemo(() => getTodayInTimezone(), []);
  const { ids: contactados, marcar } = useContactado(today.year);

  const clientesQuery = useQuery({
    queryKey: ['cumpleanos-clientes'],
    queryFn: () => fetchClientesConCumple(createClient()),
  });

  const settingsQuery = useQuery({
    queryKey: ['birthday-settings'],
    queryFn: () => fetchBirthdaySettings(createClient()),
  });

  const views = useMemo(
    () => buildClienteCumpleViews(clientesQuery.data ?? [], today),
    [clientesQuery.data, today]
  );
  const resumen = useMemo(() => computeResumen(views), [views]);

  const rows = useMemo<PreparedRow[]>(() => {
    const settings = settingsQuery.data;
    const filtered = filterAndSortCumples(views, { rango, search: debounced });
    return filtered.map((view) => {
      if (!settings) {
        return { view, message: '', phoneStatus: 'empty' as const, link: null };
      }
      const prepared = prepareCumpleMessage({
        cliente: view,
        template: settings.template,
        empresa: settings.empresa,
        asesor,
        today,
      });
      return {
        view,
        message: prepared.message,
        phoneStatus: prepared.phone.status,
        link: prepared.link,
      };
    });
  }, [views, rango, debounced, settingsQuery.data, asesor, today]);

  const onSearchChange = (value: string) => {
    setSearch(value);
    setTimeout(() => setDebounced(value), 300);
  };

  const openPreview = (row: PreparedRow) => {
    setPreview({
      id: row.view.id,
      data: { nombre: row.view.nombre, message: row.message, link: row.link },
    });
  };

  const confirmPreview = () => {
    if (!preview) return;
    if (preview.data.link) {
      window.open(preview.data.link, '_blank', 'noopener,noreferrer');
      marcar(preview.id);
      toast.success('WhatsApp abierto con el mensaje precargado');
    }
    setPreview(null);
  };

  const isLoading = clientesQuery.isLoading || settingsQuery.isLoading;
  const isError = clientesQuery.isError || settingsQuery.isError;

  return (
    <div>
      <AppHeader
        title={
          <>
            Cumplea<em>ños</em>
          </>
        }
        subtitle="Contactá a tus clientes en una fecha especial."
      />

      {/* Resumen superior */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResumenCard
          emoji="🎂"
          label="Cumplen hoy"
          value={resumen.hoy}
          active={rango === 'hoy'}
          onClick={() => setRango('hoy')}
        />
        <ResumenCard
          emoji="📅"
          label="Próximos 7 días"
          value={resumen.proximos7}
          active={rango === '7'}
          onClick={() => setRango('7')}
        />
        <ResumenCard
          emoji="📆"
          label="Próximos 30 días"
          value={resumen.proximos30}
          active={rango === '30'}
          onClick={() => setRango('30')}
        />
      </div>

      {/* Filtros + buscador */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-[3px] border border-line bg-panel2 p-1">
          {RANGOS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRango(r.value)}
              className={cn(
                'rounded-[2px] px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide transition-colors',
                rango === r.value
                  ? 'bg-amber text-[#1a1510]'
                  : 'text-ink-dim hover:text-ink'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            placeholder="Buscar nombre, apellido o teléfono..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border-line bg-bg2 pl-9"
          />
        </div>
      </div>

      {/* Contenido */}
      {isError ? (
        <ErrorState
          onRetry={() => {
            clientesQuery.refetch();
            settingsQuery.refetch();
          }}
        />
      ) : isLoading ? (
        <div className="space-y-2 rounded-[3px] border border-line bg-panel p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 bg-panel2" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        rango === 'hoy' ? (
          <div className="rounded-[3px] border border-line bg-panel">
            <EmptyState
              title="🎂 No hay cumpleaños hoy"
              description="Revisá los próximos cumpleaños para encontrar a quién contactar."
              action={
                <Button
                  variant="outline"
                  className="border-line text-ink-dim"
                  onClick={() => setRango('30')}
                >
                  Ver próximos 30 días
                </Button>
              }
            />
          </div>
        ) : (
          <div className="rounded-[3px] border border-line bg-panel">
            <EmptyState
              title="Sin resultados"
              description="No hay clientes con cumpleaños en este rango o búsqueda."
            />
          </div>
        )
      ) : (
        <>
          {/* Tabla (desktop) */}
          <div className="hidden overflow-hidden rounded-[3px] border border-line bg-panel md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-line hover:bg-panel2">
                  <TableHead className="text-ink-faint">Cliente</TableHead>
                  <TableHead className="text-ink-faint">Cumpleaños</TableHead>
                  <TableHead className="text-ink-faint">Edad</TableHead>
                  <TableHead className="text-ink-faint">Teléfono</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.view.id} className="border-line/50 hover:bg-panel2">
                    <TableCell className="font-medium text-ink">
                      <span className="flex items-center gap-2">
                        {row.view.nombreCompleto}
                        {row.view.esHoy && <HoyBadge />}
                      </span>
                    </TableCell>
                    <TableCell className="text-ink-dim">{row.view.cumpleLabel}</TableCell>
                    <TableCell className="text-ink-dim">
                      {row.view.edad != null ? `${row.view.edad} años` : '—'}
                    </TableCell>
                    <TableCell>
                      <TelefonoCell status={row.phoneStatus} telefono={row.view.telefono} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <WhatsappAction
                          row={row}
                          contactado={contactados.has(row.view.id)}
                          onClick={() => openPreview(row)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards (mobile) */}
          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <div
                key={row.view.id}
                className="rounded-[3px] border border-line bg-panel p-4"
              >
                <div className="flex items-center gap-2 font-medium text-ink">
                  <Cake className="h-4 w-4 text-amber" />
                  {row.view.nombreCompleto}
                  {row.view.esHoy && <HoyBadge />}
                </div>
                <div className="mt-1 text-sm text-ink-dim">
                  {row.view.cumpleLabel}
                  {row.view.edad != null && <> · {row.view.edad} años</>}
                </div>
                <div className="mt-2 text-xs">
                  <TelefonoCell status={row.phoneStatus} telefono={row.view.telefono} />
                </div>
                <div className="mt-3">
                  <WhatsappAction
                    row={row}
                    contactado={contactados.has(row.view.id)}
                    onClick={() => openPreview(row)}
                    full
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <WhatsappPreviewDialog
        data={preview?.data ?? null}
        open={preview !== null}
        onOpenChange={(open) => !open && setPreview(null)}
        onConfirm={confirmPreview}
      />
    </div>
  );
}

function ResumenCard({
  emoji,
  label,
  value,
  active,
  onClick,
}: {
  emoji: string;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[3px] border bg-gradient-to-br from-panel to-bg2 p-5 text-left transition-colors',
        active ? 'border-amber' : 'border-line hover:border-ink-faint'
      )}
    >
      <div className="text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
        {emoji} {label}
      </div>
      <div className="mt-2 font-serif text-3xl font-medium tracking-tight text-ink">
        {value}
      </div>
    </button>
  );
}

function HoyBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber/50 bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber-bright">
      <PartyPopper className="h-3 w-3" /> Hoy
    </span>
  );
}

function TelefonoCell({
  status,
  telefono,
}: {
  status: 'ok' | 'invalid' | 'empty';
  telefono: string | null;
}) {
  if (status === 'empty') return <span className="text-ink-faint">Sin teléfono</span>;
  if (status === 'invalid')
    return <span className="text-red">⚠️ Teléfono inválido</span>;
  return <span className="text-ink-dim">{telefono}</span>;
}

function WhatsappAction({
  row,
  contactado,
  onClick,
  full,
}: {
  row: PreparedRow;
  contactado: boolean;
  onClick: () => void;
  full?: boolean;
}) {
  if (row.phoneStatus === 'empty') return null;

  return (
    <div className={cn('flex items-center gap-2', full && 'flex-col items-stretch')}>
      <Button
        onClick={onClick}
        disabled={!row.link}
        className={cn(
          'bg-green text-[#10140d] hover:opacity-90',
          full && 'w-full'
        )}
        size="sm"
      >
        <Cake className="mr-1 h-4 w-4" />
        Enviar WhatsApp
      </Button>
      {contactado && (
        <span className="whitespace-nowrap text-[10px] text-green">✓ WhatsApp preparado</span>
      )}
    </div>
  );
}
