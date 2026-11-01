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
  // Una fecha DATE pura (YYYY-MM-DD) se ancla al mediodía para evitar que la zona
  // horaria la corra un día. Un TIMESTAMPTZ (con hora/offset) se parsea tal cual.
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const parsed = new Date(soloFecha ? `${date}T12:00:00` : date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getClienteNombre(cliente: { nombre: string; apellido: string }): string {
  return `${cliente.nombre} ${cliente.apellido}`.trim();
}

export function splitNombreCompleto(nombreCompleto: string): { nombre: string; apellido: string } {
  const parts = nombreCompleto.trim().split(/\s+/);
  if (parts.length <= 1) return { nombre: parts[0] || 'Sin nombre', apellido: '' };
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') };
}
