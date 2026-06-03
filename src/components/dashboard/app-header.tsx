'use client';

import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/features/auth/actions';
import { Button } from '@/components/ui/button';

export function AppHeader({ title, subtitle }: { title?: React.ReactNode; subtitle?: string }) {
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
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        {title != null && (
          <h1 className="font-serif text-[34px] font-normal leading-tight tracking-tight text-ink [&_em]:text-amber [&_em]:italic">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="mt-1 text-[11px] tracking-wide text-ink-faint">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-[11px] text-ink-faint sm:inline">{clock}</span>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="border-line text-ink-dim hover:border-amber hover:text-amber"
          >
            <LogOut className="mr-1 h-3 w-3" />
            Salir
          </Button>
        </form>
      </div>
    </header>
  );
}
