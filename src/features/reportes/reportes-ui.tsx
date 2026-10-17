'use client';
import type { ReactNode } from 'react';

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
export function Barras({
  items,
  moneda = false,
}: {
  items: {
    id: string;
    nombre: string;
    valor: number | null;
    color?: string | null;
  }[];
  moneda?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.valor ?? 0));
  if (!items.length) return <SinDatos />;
  return (
    <ul className="space-y-4">
      {items.map((i) => (
        <li key={i.id}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="text-ink min-w-0 break-words">{i.nombre}</span>
            <span className="text-ink shrink-0 font-medium tabular-nums">
              {moneda ? dinero(i.valor) : numero(i.valor)}
            </span>
          </div>
          <div
            className="bg-bg2 h-2 overflow-hidden rounded-sm"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-sm"
              style={{
                width: `${((i.valor ?? 0) / max) * 100}%`,
                background: i.color ?? 'var(--primary)',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
