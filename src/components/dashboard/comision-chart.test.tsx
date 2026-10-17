import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { calcularComisionMensual } from '@/lib/dashboard/comision';
import { formatCurrency } from '@/lib/utils/format';

vi.mock('@/features/auth/actions', () => ({ logoutAction: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/dashboard/use-comision-dashboard', () => ({
  useComisionDashboard: vi.fn(),
}));
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
      <div>{children}</div>
    ),
  };
});
import { useComisionDashboard } from '@/features/dashboard/use-comision-dashboard';
import { ComisionChart, ComisionTooltip } from './comision-chart';
import DashboardPage from '@/app/(dashboard)/dashboard/page';

const data = calcularComisionMensual(
  [
    {
      id: 'p1',
      estado: 'VIGENTE',
      fecha_inicio: '2026-01-01',
      fecha_fin: null,
      prima: 1000,
      prima_periodicidad: 'MENSUAL',
      fecha_baja: null,
      comision_desde: '2026-01-01',
    },
    {
      id: 'p2',
      estado: 'VIGENTE',
      fecha_inicio: '2026-06-01',
      fecha_fin: null,
      prima: 2000,
      prima_periodicidad: 'MENSUAL',
      fecha_baja: null,
      comision_desde: '2026-06-01',
    },
  ],
  new Date('2026-06-17T15:00:00Z')
);
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const configure = (value = data) =>
  vi.mocked(useComisionDashboard).mockReturnValue({
    data: value,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useComisionDashboard>);

describe('indicadores de comisión', () => {
  it('el KPI superior y el panel utilizan el mismo resultado que el gráfico', () => {
    configure();
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    client.setQueryData(['dashboard-kpis'], {
      total_clientes: 2,
      total_polizas: 2,
      prima_total: 3000,
    });
    client.setQueryData(['dashboard-compania'], []);
    client.setQueryData(['dashboard-ramo'], []);
    client.setQueryData(['dashboard-top-clientes'], []);
    render(
      <QueryClientProvider client={client}>
        <DashboardPage />
      </QueryClientProvider>
    );
    const amount = formatCurrency(data.serie.at(-1)!.comision!).replace(
      /\s/g,
      ' '
    );
    expect(screen.getAllByText(amount, { exact: true })).toHaveLength(2);
    expect(
      screen.getByText('Pólizas con aporte conocido').nextElementSibling
    ).toHaveTextContent('2');
    expect(
      screen.getByText('Variación vs. mes anterior').nextElementSibling
    ).toHaveTextContent('280');
    expect(
      screen.getByText('Equivalente anual del valor actual').nextElementSibling
    ).toHaveTextContent('5.040');
    client.clear();
  });
  it('el tooltip indica mes en curso, total estimado y variación mensual', () => {
    render(<ComisionTooltip punto={data.serie.at(-1)!} />);
    expect(screen.getByText(/jun.*26.*en curso/)).toBeInTheDocument();
    expect(
      screen.getByText(formatCurrency(420).replace(/\s/g, ' '), { exact: true })
    ).toBeInTheDocument();
    expect(screen.getByText(/Variación:.*280/)).toBeInTheDocument();
  });
  it('una fecha de inicio ausente no oculta la comisión mensual actual', () => {
    const incompleto = calcularComisionMensual(
      [
        {
          id: 'sin-fecha',
          estado: 'VIGENTE',
          fecha_inicio: null,
          fecha_fin: null,
          prima: 1000,
        },
      ],
      new Date('2026-06-17T15:00:00Z')
    );
    configure(incompleto);
    render(<ComisionChart />);
    const region = screen.getByRole('region', {
      name: /Comisión mensual estimada/,
    });
    expect(
      within(region).getByText('Mensual actual · en curso').nextElementSibling
    ).toHaveTextContent('140');
    expect(
      screen.queryByText('Equivalente anual del valor actual')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/meses sin historial suficiente/)
    ).toBeInTheDocument();
  });
  it('una póliza sin importe no reemplaza el subtotal por un guion y se indica aparte', () => {
    configure(
      calcularComisionMensual(
        [
          {
            id: 'cargada',
            estado: 'VIGENTE',
            fecha_inicio: null,
            fecha_fin: null,
            prima: 1000,
          },
          {
            id: 'sin-importe',
            estado: 'VIGENTE',
            fecha_inicio: null,
            fecha_fin: null,
            prima: 0,
          },
        ],
        new Date('2026-06-17T15:00:00Z')
      )
    );
    render(<ComisionChart />);
    expect(
      screen.getByText('Subtotal mensual · importes cargados')
        .nextElementSibling
    ).toHaveTextContent('140');
    expect(
      screen.queryByText('Equivalente anual del valor actual')
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Revisar pólizas' })
    ).toHaveAttribute('href', '/polizas/pendientes-comision');
    expect(
      screen.getByText(/1 póliza con datos pendientes/)
    ).toBeInTheDocument();
  });
});
