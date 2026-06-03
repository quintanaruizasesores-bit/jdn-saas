'use client';

import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/utils';

interface BarListItem {
  label: string;
  value: number;
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
          className="grid grid-cols-[120px_1fr_60px] items-center gap-3 text-[11.5px]"
        >
          <span className="truncate text-ink-dim">{item.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rust to-amber transition-all duration-1000 ease-out"
              style={{ width: animated ? `${(item.value / max) * 100}%` : '0%' }}
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
