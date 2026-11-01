'use client';

import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/features/auth/actions';
import { Button } from '@/components/ui/button';

export function AppHeader({
  title,
  subtitle,
  actions,
}: {
  title?: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
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
    <header className="border-line mb-4 flex items-center justify-between gap-3 border-b pb-3 sm:mb-6 sm:items-end sm:gap-4 sm:pb-4">
      <div className="min-w-0">
        {title != null && (
          <h1 className="font-heading text-ink [&_em]:text-primary truncate text-[22px] leading-tight font-bold tracking-tight sm:text-[32px] [&_em]:not-italic">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-ink-faint mt-0.5 truncate text-xs sm:text-ink-dim sm:mt-1 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="text-ink-faint hidden text-[11px] sm:inline">
          {clock}
        </span>
        {actions}
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            aria-label="Salir"
            className="border-line text-ink-dim hover:border-primary hover:text-primary px-2 sm:px-3"
          >
            <LogOut className="h-3.5 w-3.5 sm:mr-1 sm:h-3 sm:w-3" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
