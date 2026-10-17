'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchComisionMensual } from '@/services/dashboard.service';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';

const compactCurrency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function ComisionChart() {
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-comision'],
    queryFn: () => fetchComisionMensual(createClient()),
  });
  const hayTendencia = data.some((p) => p.tendencia !== null);

  return (
    <section
      className="border-line bg-panel min-w-0 rounded-2xl border p-4 sm:p-5"
      aria-labelledby="comision-title"
    >
      <h2
        id="comision-title"
        className="text-ink-dim text-[11px] font-normal tracking-widest uppercase"
      >
        Comisión <b className="text-primary">aproximada</b>
      </h2>
      <p className="text-ink-dim mt-1 text-xs">
        Evolución mensual · 14% del premio · últimos 12 meses
      </p>

      {isLoading ? (
        <Skeleton className="mt-4 h-[260px]" aria-label="Cargando comisiones" />
      ) : isError ? (
        <div
          role="alert"
          className="text-ink-dim flex h-[260px] flex-col items-center justify-center gap-3 text-sm"
        >
          <p>No se pudo cargar la evolución de comisiones.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-primary underline"
          >
            Reintentar
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className="text-ink-dim flex h-[260px] items-center justify-center text-center text-sm">
          Todavía no hay pólizas con inicio de vigencia en los últimos 12 meses.
        </div>
      ) : (
        <>
          <div className="text-ink-dim mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
            <span className="inline-flex items-center gap-2">
              <span className="border-primary w-5 border-t-2" />
              Comisión estimada
            </span>
            {hayTendencia && (
              <span className="inline-flex items-center gap-2">
                <span className="border-green w-5 border-t-2 border-dashed" />
                Tendencia (promedio de 3 meses)
              </span>
            )}
          </div>
          <div
            className="mt-3 h-[260px]"
            role="img"
            aria-label="Comisión estimada mensual y tendencia de los meses completos"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  stroke="var(--line)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="etiqueta"
                  tick={{ fill: 'var(--ink-dim)', fontSize: 10 }}
                  minTickGap={20}
                />
                <YAxis
                  width={70}
                  tick={{ fill: 'var(--ink-dim)', fontSize: 10 }}
                  tickFormatter={(v) => compactCurrency.format(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--panel)',
                    border: '1px solid var(--line)',
                    fontSize: 11,
                  }}
                  labelFormatter={(label, payload) => {
                    const punto = payload[0]?.payload;
                    return `${label}${punto?.enCurso ? ' · en curso' : ''} · ${formatNumber(punto?.polizas ?? 0)} pólizas`;
                  }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name,
                  ]}
                />
                <Line
                  type="linear"
                  dataKey="comision"
                  name="Comisión estimada"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="linear"
                  dataKey="tendencia"
                  name="Tendencia (3 meses)"
                  stroke="var(--green)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 2 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {!hayTendencia && (
            <p className="text-ink-dim mt-2 text-xs">
              La tendencia aparecerá al contar con 3 meses completos desde el
              primer registro.
            </p>
          )}
        </>
      )}

      <p className="text-ink-dim mt-3 text-[11px] leading-relaxed">
        Por inicio de vigencia, sin usar la fecha de carga. Se excluyen pólizas
        sin fecha o con inicio futuro. El mes en curso es parcial y no integra
        la tendencia.
      </p>
      <p className="text-ink-dim mt-2 text-[11px] leading-relaxed">
        Mientras se completa la carga histórica, la tendencia es orientativa y
        puede cambiar. No representa comisiones cobradas ni una proyección de
        ingresos.
      </p>
    </section>
  );
}
