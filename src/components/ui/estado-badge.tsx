import { cn } from '@/lib/utils';
import type { PolizaEstado } from '@/types/database';

const styles: Record<PolizaEstado, string> = {
  VIGENTE: 'bg-green/15 text-green border-green/30',
  HISTORICA: 'bg-blue/12 text-blue border-blue/25',
  BAJA: 'bg-red/12 text-red border-red/25',
};

const labels: Record<PolizaEstado, string> = {
  VIGENTE: 'vigente',
  HISTORICA: 'histórica',
  BAJA: 'baja',
};

export function EstadoBadge({ estado }: { estado: PolizaEstado }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider',
        styles[estado]
      )}
    >
      {labels[estado]}
    </span>
  );
}
