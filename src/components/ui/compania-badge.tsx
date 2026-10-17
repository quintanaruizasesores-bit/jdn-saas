import { getCompaniaColor } from '@/lib/companias/colores';

export function CompaniaBadge({ nombre }: { nombre?: string | null }) {
  if (!nombre) return <span className="text-ink-dim text-xs">—</span>;
  const color = getCompaniaColor(nombre);

  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium"
      style={{
        color: color.foreground,
        backgroundColor: color.background,
        borderColor: color.border,
      }}
      title={nombre}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color.accent }}
        aria-hidden="true"
      />
      <span className="truncate">{nombre}</span>
    </span>
  );
}
