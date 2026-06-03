import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'green' | 'blue' | 'rust';
  isCurrency?: boolean;
}

export function KpiCard({
  label,
  value,
  subtitle,
  variant = 'default',
  isCurrency,
}: KpiCardProps) {
  const display =
    typeof value === 'number'
      ? isCurrency
        ? formatCurrency(value)
        : formatNumber(value)
      : value;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[3px] border border-line bg-gradient-to-br from-panel to-bg2 p-5',
        variant === 'green' && 'before:bg-green',
        variant === 'blue' && 'before:bg-blue',
        variant === 'rust' && 'before:bg-rust',
        'before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-amber before:content-[""]'
      )}
    >
      <div className="text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">{label}</div>
      <div className="mt-2 font-serif text-3xl font-medium tracking-tight text-ink">
        {isCurrency && typeof value === 'number' && (
          <small className="mr-1 font-mono text-sm font-normal text-ink-dim">$</small>
        )}
        {display}
      </div>
      {subtitle && <div className="mt-1 text-[10.5px] text-ink-dim">{subtitle}</div>}
    </div>
  );
}
