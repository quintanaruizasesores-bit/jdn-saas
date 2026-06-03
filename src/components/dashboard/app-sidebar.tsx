'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  AlertTriangle,
  Shield,
  CheckSquare,
  Download,
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
  { href: '/reportes', label: 'Reportes', icon: Download },
  { href: '/config/companias', label: 'Configuración', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen flex-col border-r border-line bg-bg2 transition-all',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex h-[62px] items-center gap-2 border-b border-line px-4">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex flex-col">
            <span className="font-serif text-xl font-semibold tracking-tight text-ink">
              Cartera <em className="text-amber not-italic">JDN</em>
            </span>
            <span className="text-[9px] uppercase tracking-[0.28em] text-ink-faint">
              Gestión de pólizas
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className={cn(
            'ml-auto text-ink-faint hover:text-amber',
            sidebarCollapsed && 'mx-auto'
          )}
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-[3px] px-3 py-2 text-[11px] font-medium uppercase tracking-wide transition-colors',
                active
                  ? 'bg-panel text-amber-bright'
                  : 'text-ink-dim hover:bg-panel hover:text-ink'
              )}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
