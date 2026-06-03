import { cn } from '@/lib/utils';
import type { RiesgoNivel } from '@/types/database';

const styles: Record<RiesgoNivel, string> = {
  bajo: 'text-green border-green bg-green/10',
  medio: 'text-amber border-amber bg-amber/10',
  alto: 'text-red border-red bg-red/10',
};

export function RiskBadge({ score, nivel }: { score: number; nivel: RiesgoNivel }) {
  return (
    <div
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full border-2 font-serif text-lg font-semibold',
        styles[nivel]
      )}
    >
      {score}
    </div>
  );
}
