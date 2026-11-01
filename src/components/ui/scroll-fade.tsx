'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Contenedor con desplazamiento horizontal para barras de filtros.
 * En escritorio el contenido entra completo y no aparece scroll ni degradados.
 * En pantallas pequeñas permite desplazar horizontalmente (mouse, trackpad y
 * táctil) y muestra un degradado sutil en el borde donde hay más contenido.
 */
export function ScrollFade({
  children,
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setEdges({
      left: scrollLeft > 1,
      right: scrollLeft + clientWidth < scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [update]);

  return (
    <div className={cn('relative', className)}>
      <div
        ref={ref}
        onScroll={update}
        className={cn(
          'scrollbar-none flex gap-2 overflow-x-auto',
          contentClassName
        )}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className={cn(
          'from-bg pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r to-transparent transition-opacity duration-200',
          edges.left ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          'from-bg pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent transition-opacity duration-200',
          edges.right ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}
