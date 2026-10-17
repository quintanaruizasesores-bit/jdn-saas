'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  AlertTriangle,
  Shield,
  CheckSquare,
  Cake,
  ChartNoAxesCombined,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';

const navItems = [
  { href: '/dashboard', label: 'Tablero', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/polizas', label: 'Pólizas', icon: FileText },
  { href: '/siniestros', label: 'Siniestros', icon: AlertTriangle },
  { href: '/riesgo', label: 'Riesgo', icon: Shield },
  { href: '/tareas', label: 'Tareas', icon: CheckSquare },
  { href: '/cumpleanos', label: 'Cumpleaños', icon: Cake },
  { href: '/reportes', label: 'Reportes', icon: ChartNoAxesCombined },
  { href: '/config', label: 'Configuración', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <aside
      className={cn(
        'border-line bg-panel sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r transition-[width] duration-200',
        sidebarCollapsed ? 'md:w-16' : 'md:w-64'
      )}
    >
      <div className="border-line relative flex h-32 shrink-0 items-center justify-center border-b px-2">
        <Link
          href="/dashboard"
          aria-label="Quintana Ruiz · Ir al tablero"
          className="rounded-lg"
        >
          <Image
            src="/brand/quintana-ruiz/favicon.png"
            alt=""
            width={64}
            height={55}
            unoptimized
            className={cn('h-auto w-9', !sidebarCollapsed && 'md:hidden')}
          />
          {!sidebarCollapsed && (
            <Image
              src="/brand/quintana-ruiz/logo.png"
              alt="Quintana Ruiz Asesores de Seguros"
              width={971}
              height={550}
              priority
              unoptimized
              className="hidden h-auto w-44 md:block"
            />
          )}
        </Link>
        <button
          type="button"
          onClick={toggleSidebar}
          className="text-ink-dim hover:bg-bg2 hover:text-primary absolute top-2 right-2 hidden h-7 w-7 items-center justify-center rounded-lg md:flex"
          aria-label={
            sidebarCollapsed ? 'Expandir navegación' : 'Contraer navegación'
          }
          aria-expanded={!sidebarCollapsed}
          aria-controls="app-navigation"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav
        id="app-navigation"
        aria-label="Navegación principal"
        className="flex-1 space-y-1 p-2 md:p-3"
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-ink-dim hover:bg-bg2 hover:text-primary'
              )}
              title={label}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && (
                <span className="hidden md:inline">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>
      {!sidebarCollapsed && (
        <p className="border-line text-ink-dim hidden border-t px-5 py-4 text-xs md:block">
          Gestión de cartera de seguros
        </p>
      )}
    </aside>
  );
}
