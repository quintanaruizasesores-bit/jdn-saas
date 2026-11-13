# Validación de preservación y aislamiento

**Estado:** pendiente. Ninguna prueba local equivale a la validación del proyecto remoto.

Para el propietario A: mismo UUID de Auth, credenciales y sesión; mismos IDs, filas, nulos, fechas, primas, historiales, relaciones, estados, bajas lógicas, colores, plantilla y actividades. Comparar huellas de todas las columnas originales antes/después, totales exactos y resultados de dashboard/reportes en un corte fijo. Verificar descarga XLSX limitada a su workspace.

Para B y C, usar conexiones autenticadas normales, nunca `service_role`: carteras inicialmente vacías; altas independientes; lecturas y mutaciones cruzadas denegadas; FK entre tenants rechazadas; vistas, búsquedas, `/api/inteligencia`, `/api/respaldo`, RPC y Storage sin fugas. Probar cambio A→B en un mismo navegador: caché TanStack Query y marca de WhatsApp aisladas.

**Criterio de paso:** cero diferencias en columnas originales para A, cero filas privadas sin workspace, cero relaciones cruzadas, cero fugas para B/C y backup restaurable verificado. Registrar evidencia privada y completar la tabla de `MULTITENANT_AUDIT.md` con valores reales. No declarar éxito basándose solo en UI o conteos.
