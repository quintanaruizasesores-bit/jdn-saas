import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('@/features/auth/actions', () => ({ logoutAction: vi.fn() }));
vi.mock('@/features/dashboard/use-comision-dashboard', () => ({
  useComisionDashboard: vi.fn(),
}));
import { useComisionDashboard } from '@/features/dashboard/use-comision-dashboard';
import PendientesComisionPage from './page';

const pendiente = {
  polizaId: 'p1',
  motivo: 'PREMIO' as const,
  cliente: { nombre: 'Ana', apellido: 'Prueba' },
  compania: { nombre: 'Sancor', color: null },
  detalle: 'Auto de prueba',
};
function configure(pendientes = [pendiente], extra = {}) {
  vi.mocked(useComisionDashboard).mockReturnValue({
    data: { pendientes },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...extra,
  } as unknown as ReturnType<typeof useComisionDashboard>);
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('identifica cliente, compañía, motivo y permite editar y volver al listado pendiente', () => {
  configure();
  render(<PendientesComisionPage />);
  expect(screen.getByRole('link', { name: 'Ana Prueba' })).toHaveAttribute(
    'href',
    '/polizas/p1'
  );
  expect(screen.getByText('Sancor')).toBeInTheDocument();
  expect(screen.getByText('Auto de prueba')).toBeInTheDocument();
  expect(screen.getByText('Premio mensual sin cargar')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Editar póliza de Ana Prueba' })
  ).toHaveAttribute('href', '/polizas/p1/editar?volver=pendientes-comision');
});
it('al actualizar la consulta desaparece la póliza completada', () => {
  configure();
  const { rerender } = render(<PendientesComisionPage />);
  configure([]);
  rerender(<PendientesComisionPage />);
  expect(screen.getByText('Sin pólizas pendientes')).toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: /Editar póliza/ })
  ).not.toBeInTheDocument();
});
it('pagina todos los pendientes y muestra errores de carga sin confundirlos con una cartera completa', async () => {
  const user = userEvent.setup();
  configure(
    Array.from({ length: 31 }, (_, i) => ({
      ...pendiente,
      polizaId: `p${i}`,
      detalle: `Detalle ${i}`,
    }))
  );
  const { rerender } = render(<PendientesComisionPage />);
  expect(screen.getAllByRole('listitem')).toHaveLength(30);
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  expect(screen.getByText('Detalle 30')).toBeInTheDocument();
  configure([], { isError: true });
  rerender(<PendientesComisionPage />);
  expect(
    within(screen.getByRole('alert')).getByText(/No se pudieron cargar/)
  ).toBeInTheDocument();
  expect(screen.queryByText('Sin pólizas pendientes')).not.toBeInTheDocument();
});
