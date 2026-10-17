interface CompaniaColor {
  accent: string;
  foreground: string;
  background: string;
  border: string;
}

// La identidad de cada compañía se comparte entre pólizas y gráficos.
// Los tonos de texto son más oscuros para conservar contraste sobre fondos claros.
const COMPANIA_COLORS: { nombre: string; color: CompaniaColor }[] = [
  {
    nombre: 'holando',
    color: {
      accent: '#38BDF8',
      foreground: '#075985',
      background: '#F0F9FF',
      border: '#BAE6FD',
    },
  },
  {
    nombre: 'sancor',
    color: {
      accent: '#881337',
      foreground: '#881337',
      background: '#FFF1F2',
      border: '#FECDD3',
    },
  },
  {
    nombre: 'san cristobal',
    color: {
      accent: '#2563EB',
      foreground: '#1D4ED8',
      background: '#EFF6FF',
      border: '#BFDBFE',
    },
  },
  {
    nombre: 'rio uruguay',
    color: {
      accent: '#172554',
      foreground: '#172554',
      background: '#EEF2FF',
      border: '#C7D2FE',
    },
  },
  {
    nombre: 'triunfo',
    color: {
      accent: '#16A34A',
      foreground: '#166534',
      background: '#F0FDF4',
      border: '#BBF7D0',
    },
  },
  {
    nombre: 'mercantil',
    color: {
      accent: '#4B6CB7',
      foreground: '#36518D',
      background: '#F1F4FA',
      border: '#CDD7EC',
    },
  },
  {
    nombre: 'mapfre',
    color: {
      accent: '#DC2626',
      foreground: '#B91C1C',
      background: '#FEF2F2',
      border: '#FECACA',
    },
  },
];

const DEFAULT_COLOR: CompaniaColor = {
  accent: '#64748B',
  foreground: '#475569',
  background: '#F8FAFC',
  border: '#E2E8F0',
};

export function getCompaniaColor(nombre?: string | null): CompaniaColor {
  const normalized = (nombre ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return (
    COMPANIA_COLORS.find(({ nombre }) =>
      ` ${normalized} `.includes(` ${nombre} `)
    )?.color ?? DEFAULT_COLOR
  );
}
