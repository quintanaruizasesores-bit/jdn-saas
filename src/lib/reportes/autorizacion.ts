/** El rol editable no basta: el despliegue debe habilitar UUIDs explícitos. */
export function puedeExportar(
  id: string,
  role: string | null | undefined,
  permitidos: string | undefined
) {
  return (
    role === 'ADMIN' &&
    (permitidos ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(id)
  );
}
