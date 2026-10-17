'use client';

import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/utils';

interface BarListItem {
  label: string;
  value: number;
  color?: string;
}

export function BarList({ items, maxItems = 10 }: { items: BarListItem[]; maxItems?: number }) {
  const [animated, setAnimated] = useState(false);
  const sorted = [...items].sort((a, b) => b.value - a.value).slice(0, maxItems);
  const max = sorted[0]?.value ?? 1;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 60);
    return () => clearTimeout(t);
  }, [items]);

  if (!sorted.length) {
    return <p className="text-sm text-ink-faint">Sin datos</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((item) => (
        <div
          key={item.label}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:grid-cols-[120px_1fr_60px] items-center gap-3 text-[11.5px]"
        >
          <span title={item.label} className="flex min-w-0 items-center gap-1.5 text-ink-dim">
            {item.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />}
            <span className="truncate">{item.label}</span>
          </span>
          <div className="h-2 overflow-hidden rounded-full bg-bg">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out${item.color ? '' : ' bg-gradient-to-r from-primary to-navy'}`}
              style={{
                width: animated && max > 0 ? `${(item.value / max) * 100}%` : '0%',
                backgroundColor: item.color,
              }}
            />
          </div>
          <span className="text-right font-medium tabular-nums text-ink">
            {formatNumber(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
