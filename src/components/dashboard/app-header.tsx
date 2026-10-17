'use client';

import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/features/auth/actions';
import { Button } from '@/components/ui/button';

export function AppHeader({
  title,
  subtitle,
}: {
  title?: React.ReactNode;
  subtitle?: string;
}) {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) +
          ' · ' +
          d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="border-line mb-6 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
      <div>
        {title != null && (
          <h1 className="font-heading text-ink [&_em]:text-primary text-2xl leading-tight font-bold tracking-tight sm:text-[32px] [&_em]:not-italic">
            {title}
          </h1>
        )}
        {subtitle && <p className="text-ink-dim mt-1 text-sm">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-ink-faint hidden text-[11px] sm:inline">
          {clock}
        </span>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="border-line text-ink-dim hover:border-primary hover:text-primary"
          >
            <LogOut className="mr-1 h-3 w-3" />
            Salir
          </Button>
        </form>
      </div>
    </header>
  );
}
