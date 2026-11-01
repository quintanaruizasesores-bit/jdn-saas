'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Plus,
  Menu,
  AlertTriangle,
  Shield,
  CheckSquare,
  Cake,
  ChartNoAxesCombined,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { logoutAction } from '@/features/auth/actions';

const principales = [
  { href: '/dashboard', label: 'Tablero', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/polizas', label: 'Pólizas', icon: FileText },
];
const secundarias = [
  { href: '/siniestros', label: 'Siniestros', icon: AlertTriangle },
  { href: '/riesgo', label: 'Riesgo', icon: Shield },
  { href: '/tareas', label: 'Tareas', icon: CheckSquare },
  { href: '/cumpleanos', label: 'Cumpleaños', icon: Cake },
  { href: '/reportes', label: 'Reportes', icon: ChartNoAxesCombined },
  { href: '/config', label: 'Configuración', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activo = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const masActivo = secundarias.some((i) => activo(i.href));

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="border-line bg-panel/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-center px-1 pb-[env(safe-area-inset-bottom)]">
          {principales.slice(0, 2).map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} label={label} activo={activo(href)}>
              <Icon className="h-5 w-5" />
            </NavLink>
          ))}

          <div className="flex justify-center">
            <Link
              href="/clientes/nuevo"
              aria-label="Nuevo cliente"
              className="bg-primary text-primary-foreground hover:bg-primary-dark focus-visible:ring-primary/30 -mt-6 flex h-12 w-12 items-center justify-center rounded-full shadow-lg outline-none transition-colors focus-visible:ring-4"
            >
              <Plus className="h-6 w-6" aria-hidden="true" />
            </Link>
          </div>

          {principales.slice(2).map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} label={label} activo={activo(href)}>
              <Icon className="h-5 w-5" />
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Más secciones"
            aria-haspopup="dialog"
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium outline-none transition-colors',
              masActivo ? 'text-primary' : 'text-ink-dim'
            )}
          >
            <Menu className="h-5 w-5" />
            Más
          </button>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-4 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="px-0">
            <SheetTitle>Secciones</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2">
            {secundarias.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={activo(href) ? 'page' : undefined}
                className={cn(
                  'border-line flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium transition-colors',
                  activo(href)
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'text-ink-dim hover:bg-bg2 hover:text-primary'
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
          </div>
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="border-line text-ink-dim hover:border-primary hover:text-primary flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

function NavLink({
  href,
  label,
  activo,
  children,
}: {
  href: string;
  label: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={activo ? 'page' : undefined}
      className={cn(
        'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium outline-none transition-colors',
        activo ? 'text-primary' : 'text-ink-dim'
      )}
    >
      {children}
      {label}
    </Link>
  );
}
