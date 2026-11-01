import { Suspense } from 'react';
import { ReportesDashboard } from '@/features/reportes/reportes-dashboard';

export default function ReportesPage() {
  return (
    <Suspense fallback={<p className="text-ink-faint p-8">Cargando…</p>}>
      <ReportesDashboard />
    </Suspense>
  );
}
