'use client';

import Link from 'next/link';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useComisionDashboard } from '@/features/dashboard/use-comision-dashboard';
import {
  formatVariacion,
  type ComisionMensual,
} from '@/lib/dashboard/comision';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';

const compactCurrency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function ComisionTooltip({ punto }: { punto: ComisionMensual }) {
  return (
    <div className="border-line bg-panel rounded-xl border p-3 text-xs shadow-md">
      <p className="text-ink font-medium">
        {punto.etiqueta}
        {punto.enCurso ? ' · en curso' : ''}
      </p>
      <p className="text-primary mt-1">
        {punto.comision === null
          ? 'Estimación no disponible'
          : formatCurrency(punto.comision)}
      </p>
      <p className="text-ink-dim mt-1">
        Variación: {formatVariacion(punto.variacion)}
      </p>
      {punto.comision !== null && punto.sinDatos > 0 && (
        <p className="text-ink-dim mt-1">
          Subtotal de importes cargados · {formatNumber(punto.sinDatos)}{' '}
          pendientes
        </p>
      )}
      <p className="text-ink-dim">
        {formatNumber(punto.polizas)} pólizas con aporte conocido
      </p>
    </div>
  );
}

export function ComisionChart() {
  const { data, isLoading, isError, refetch } = useComisionDashboard();
  const resumen = data?.resumen;
  const actual = data?.serie.at(-1);
  const hayDatos = data?.serie.some((p) => p.comision !== null);
  const hayHuecos = data?.serie.some((p) => p.comision === null);
  const dinero = (value: number | null | undefined) =>
    value == null ? '—' : formatCurrency(value);

  return (
    <section
      className="border-line bg-panel min-w-0 rounded-2xl border p-4 sm:p-5"
      aria-labelledby="comision-title"
    >
      <h2
        id="comision-title"
        className="text-ink-dim text-[11px] font-normal tracking-widest uppercase"
      >
        Comisión <b className="text-primary">mensual estimada</b>
      </h2>
      <p className="text-ink-dim mt-1 text-xs">
        Cartera al cierre de cada mes · 14% del premio mensual
      </p>
      {isLoading ? (
        <Skeleton className="mt-4 h-[340px]" aria-label="Cargando comisiones" />
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
      ) : (
        <>
          <dl className="my-4 grid grid-cols-2 gap-3">
            <div className="bg-bg2 min-w-0 rounded-xl p-3">
              <dt className="text-ink-dim text-[11px]">
                {resumen?.sinDatos
                  ? 'Subtotal mensual · importes cargados'
                  : 'Mensual actual · en curso'}
              </dt>
              <dd className="text-primary mt-1 text-lg font-semibold break-words tabular-nums">
                {dinero(resumen?.comisionActual)}
              </dd>
            </div>
            <div className="bg-bg2 min-w-0 rounded-xl p-3">
              <dt className="text-ink-dim text-[11px]">
                Variación vs. mes anterior
              </dt>
              <dd className="text-ink mt-1 text-base font-semibold break-words tabular-nums">
                {formatVariacion(resumen?.variacion ?? null)}
              </dd>
            </div>
            <div className="bg-bg2 min-w-0 rounded-xl p-3">
              <dt className="text-ink-dim text-[11px]">
                Pólizas con aporte conocido
              </dt>
              <dd className="text-ink mt-1 text-lg font-semibold tabular-nums">
                {formatNumber(resumen?.polizas ?? 0)}
              </dd>
            </div>
            {resumen?.anualizada != null && (
              <div className="bg-bg2 min-w-0 rounded-xl p-3">
                <dt className="text-ink-dim text-[11px]">
                  Equivalente anual del valor actual
                </dt>
                <dd className="text-ink mt-1 text-lg font-semibold break-words tabular-nums">
                  {dinero(resumen.anualizada)}
                </dd>
              </div>
            )}
          </dl>
          {data?.totalPolizas === 0 ? (
            <p className="text-ink-dim py-12 text-center text-sm">
              Todavía no hay pólizas en la cartera.
            </p>
          ) : !hayDatos ? (
            <p className="text-ink-dim py-12 text-center text-sm">
              Faltan datos de vigencia para estimar la cartera.
            </p>
          ) : (
            <div
              className="h-[260px]"
              role="img"
              aria-label="Evolución de la comisión mensual recurrente estimada durante los últimos 12 meses"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data?.serie}
                  margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--line)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: 'var(--ink-dim)', fontSize: 10 }}
                    minTickGap={20}
                    tickFormatter={(mes) =>
                      data?.serie.find((p) => p.mes === mes)?.etiqueta ?? mes
                    }
                  />
                  <YAxis
                    width={70}
                    tick={{ fill: 'var(--ink-dim)', fontSize: 10 }}
                    tickFormatter={(v) => compactCurrency.format(Number(v))}
                  />
                  <Tooltip
                    filterNull={false}
                    content={({ active, payload }) =>
                      active && payload?.[0]?.payload ? (
                        <ComisionTooltip
                          punto={payload[0].payload as ComisionMensual}
                        />
                      ) : null
                    }
                  />
                  <Line
                    type="linear"
                    dataKey="comision"
                    name="Comisión mensual estimada"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  {actual?.comision != null && (
                    <ReferenceDot
                      x={actual.mes}
                      y={actual.comision}
                      r={5}
                      fill="var(--primary)"
                      stroke="var(--panel)"
                      strokeWidth={2}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {hayHuecos && (
            <p className="text-ink-dim mt-3 text-[11px]">
              Los meses sin historial suficiente quedan sin valor; no
              representan cero.
            </p>
          )}
          {!!resumen?.sinDatos && (
            <p className="text-ink-dim mt-2 text-xs">
              {formatNumber(resumen.sinDatos)} pólizas con datos pendientes; el
              subtotal incluye los aportes calculables.{' '}
              <Link href="/polizas" className="text-primary underline">
                Revisar pólizas
              </Link>
            </p>
          )}
        </>
      )}
      <p className="text-ink-dim mt-3 text-[11px]">
        Mes actual al día de hoy. Importes estimados, no comisiones cobradas.
      </p>
    </section>
  );
}
