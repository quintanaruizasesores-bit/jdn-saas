import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider',
  {
    variants: {
      variant: {
        vigente: 'border border-green/30 bg-green/15 text-green',
        historica: 'border border-blue/25 bg-blue/12 text-blue',
        baja: 'border border-red/25 bg-red/12 text-red',
        default: 'border border-line bg-bg text-ink-dim',
        amber: 'border border-amber/30 bg-amber/12 text-amber',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
