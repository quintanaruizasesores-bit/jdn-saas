'use client';

import { Download } from 'lucide-react';
import { AppHeader } from '@/components/dashboard/app-header';

const reportes = [
  { tipo: 'produccion', label: 'Producción', desc: 'Pólizas y primas por período', ext: 'xlsx' },
  { tipo: 'companias', label: 'Compañías', desc: 'Distribución por aseguradora', ext: 'xlsx' },
  { tipo: 'ramos', label: 'Ramos', desc: 'Distribución por ramo', ext: 'csv' },
  { tipo: 'clientes', label: 'Clientes', desc: 'Listado completo de clientes', ext: 'xlsx' },
  { tipo: 'siniestros', label: 'Siniestros', desc: 'Historial de siniestros', ext: 'pdf' },
];

export default function ReportesPage() {
  return (
    <div>
      <AppHeader
        title={
          <>
            Respaldo <em>& exportación</em>
          </>
        }
        subtitle="Exportá tu cartera en cualquier momento"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportes.map((r) => (
          <a
            key={r.tipo}
            href={`/api/reportes/${r.tipo}?format=${r.ext === 'pdf' ? 'pdf' : r.ext === 'csv' ? 'csv' : 'xlsx'}`}
            download
            className="group relative cursor-pointer rounded-[3px] border border-line bg-panel p-6 transition-all hover:-translate-y-0.5 hover:border-amber hover:shadow-lg"
          >
            <span className="absolute right-4 top-4 rounded-full border border-line px-2 py-0.5 text-[9px] uppercase text-amber">
              .{r.ext}
            </span>
            <Download className="mb-3 h-6 w-6 text-ink-dim group-hover:text-amber" />
            <h3 className="font-serif text-lg text-ink">{r.label}</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-dim">{r.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
