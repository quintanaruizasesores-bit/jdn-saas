'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronRight } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export const numero = (n: number | null | undefined, decimales = 0) =>
  n == null
    ? 'No disponible'
    : n.toLocaleString('es-AR', { maximumFractionDigits: decimales });
export const dinero = (n: number | null | undefined) =>
  n == null
    ? 'No disponible'
    : new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      }).format(n);
export const fecha = (s: string) => s.split('-').reverse().join('/');
export const selectClass =
  'min-h-10 w-full min-w-0 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink';
export function Seccion({
  titulo,
  descripcion,
  acciones,
  children,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-line bg-panel min-w-0 rounded-xl border p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-ink text-base sm:text-lg">{titulo}</h2>
          {descripcion && (
            <p className="text-ink-dim mt-1 max-w-2xl text-xs leading-relaxed">
              {descripcion}
            </p>
          )}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  );
}
export function SinDatos({
  texto = 'No hay pólizas vigentes para los filtros aplicados.',
}: {
  texto?: string;
}) {
  return <p className="bg-bg2 text-ink-dim rounded-lg p-5 text-sm">{texto}</p>;
}

/** Ícono de ayuda con definición metodológica en un popover (reemplaza los
 *  bloques de texto permanentes de la vista anterior). */
export function InfoHint({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Qué significa: ${titulo}`}
        className="text-ink-faint hover:text-primary focus-visible:text-primary shrink-0 rounded-full outline-none"
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={8}
        className="max-w-[min(20rem,calc(100vw-1rem))] p-3"
      >
        <p className="text-ink mb-1 text-xs font-medium">{titulo}</p>
        <p className="text-ink-dim text-xs leading-relaxed">{children}</p>
      </PopoverContent>
    </Popover>
  );
}

/** Variación porcentual sutil; se omite cuando no hay base comparable (evita el
 *  ruido de «Sin comparación válida» repetido en cada tarjeta). */
export function Delta({
  valor,
  previo,
  invertido = false,
}: {
  valor: number | null | undefined;
  previo: number | null | undefined;
  invertido?: boolean;
}) {
  if (valor == null || previo == null || previo <= 0) return null;
  const pct = ((valor - previo) / previo) * 100;
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.05)
    return <span className="text-ink-faint text-xs tabular-nums">Sin cambios</span>;
  const positivo = invertido ? pct < 0 : pct > 0;
  return (
    <span
      className={`text-xs font-medium tabular-nums ${positivo ? 'text-green' : 'text-red'}`}
    >
      {pct.toLocaleString('es-AR', {
        maximumFractionDigits: 1,
        signDisplay: 'exceptZero',
      })}
      %
    </span>
  );
}

type Acento = 'primary' | 'warning' | 'neutral';
const acentoBarra: Record<Acento, string> = {
  primary: 'bg-primary',
  warning: 'bg-rust',
  neutral: 'bg-line',
};

/** Tarjeta de KPI ejecutiva, opcionalmente accionable (abre otra vista o una
 *  ruta con los registros relacionados). */
export function KpiCard({
  titulo,
  valor,
  nota,
  delta,
  hint,
  acento = 'primary',
  accion,
  href,
  onClick,
}: {
  titulo: string;
  valor: ReactNode;
  nota?: ReactNode;
  delta?: ReactNode;
  hint?: ReactNode;
  acento?: Acento;
  accion?: string;
  href?: string;
  onClick?: () => void;
}) {
  const interactivo = !!href || !!onClick;
  const contenido = (
    <>
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${acentoBarra[acento]}`}
      />
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-ink-dim text-xs font-medium">{titulo}</h3>
        {hint ? <InfoHint titulo={titulo}>{hint}</InfoHint> : null}
      </div>
      <p className="font-heading text-navy mt-2 text-2xl font-semibold tabular-nums break-words">
        {valor}
      </p>
      {nota ? <p className="text-ink-dim mt-1 text-xs leading-relaxed">{nota}</p> : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span>{delta}</span>
        {interactivo && accion ? (
          <span className="text-primary inline-flex items-center gap-0.5 text-xs font-medium">
            {accion} <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </>
  );
  const clase =
    'border-line bg-panel relative min-w-0 overflow-hidden rounded-xl border py-4 pr-4 pl-5 text-left';
  if (href)
    return (
      <Link
        href={href}
        className={`${clase} hover:border-primary/40 hover:shadow-sm transition-shadow block`}
      >
        {contenido}
      </Link>
    );
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${clase} hover:border-primary/40 hover:shadow-sm transition-shadow w-full`}
      >
        {contenido}
      </button>
    );
  return <article className={clase}>{contenido}</article>;
}

/** Panel compacto con título, ayuda opcional y acción de pie («ver todo»). */
export function Panel({
  titulo,
  hint,
  children,
  pie,
}: {
  titulo: string;
  hint?: ReactNode;
  children: ReactNode;
  pie?: ReactNode;
}) {
  return (
    <section className="border-line bg-panel flex min-w-0 flex-col rounded-xl border p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-ink text-sm font-medium">{titulo}</h3>
        {hint ? <InfoHint titulo={titulo}>{hint}</InfoHint> : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      {pie ? <div className="border-line mt-4 border-t pt-3">{pie}</div> : null}
    </section>
  );
}

/** Enlace de pie de panel que deriva a otra vista o módulo. */
export function VerTodo({
  children,
  href,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const clase =
    'text-primary inline-flex items-center gap-0.5 text-xs font-medium hover:underline';
  if (href)
    return (
      <Link href={href} className={clase}>
        {children} <ChevronRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={clase}>
      {children} <ChevronRight className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}
export function Barras({
  items,
  moneda = false,
}: {
  items: {
    id: string;
    nombre: string;
    valor: number | null;
    color?: string | null;
    href?: string;
  }[];
  moneda?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.valor ?? 0));
  if (!items.length) return <SinDatos />;
  return (
    <ul className="space-y-3">
      {items.map((i) => {
        const fila = (
          <>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="text-ink min-w-0 break-words">{i.nombre}</span>
              <span className="text-ink shrink-0 font-medium tabular-nums">
                {moneda ? dinero(i.valor) : numero(i.valor)}
              </span>
            </div>
            <div
              className="bg-bg2 h-2 overflow-hidden rounded-full"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${((i.valor ?? 0) / max) * 100}%`,
                  background: i.color ?? 'var(--primary)',
                }}
              />
            </div>
          </>
        );
        return (
          <li key={i.id}>
            {i.href ? (
              <Link
                href={i.href}
                className="hover:bg-bg2 -mx-2 block rounded-md px-2 py-1 transition-colors"
              >
                {fila}
              </Link>
            ) : (
              fila
            )}
          </li>
        );
      })}
    </ul>
  );
}
