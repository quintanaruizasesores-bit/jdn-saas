export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(Math.round(value));
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  try {
    return new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

export function getClienteNombre(cliente: { nombre: string; apellido: string }): string {
  return `${cliente.nombre} ${cliente.apellido}`.trim();
}

export function splitNombreCompleto(nombreCompleto: string): { nombre: string; apellido: string } {
  const parts = nombreCompleto.trim().split(/\s+/);
  if (parts.length <= 1) return { nombre: parts[0] || 'Sin nombre', apellido: '' };
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') };
}
