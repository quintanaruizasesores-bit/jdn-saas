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
        'border-line bg-panel relative overflow-hidden rounded-2xl border p-5 shadow-sm',
        'before:bg-primary before:absolute before:top-0 before:left-0 before:h-full before:w-[3px] before:content-[""]',
        variant === 'green' && 'before:bg-green',
        variant === 'blue' && 'before:bg-blue',
        variant === 'rust' && 'before:bg-rust'
      )}
    >
      <div className="text-ink-faint text-[9.5px] tracking-[0.18em] uppercase">
        {label}
      </div>
      <div className="font-heading text-ink mt-2 text-2xl font-semibold sm:text-3xl tracking-tight">
        {isCurrency && typeof value === 'number' && (
          <small className="font-body text-ink-dim mr-1 text-sm font-normal">
            $
          </small>
        )}
        {display}
      </div>
      {subtitle && (
        <div className="text-ink-dim mt-1 text-[10.5px]">{subtitle}</div>
      )}
    </div>
  );
}
