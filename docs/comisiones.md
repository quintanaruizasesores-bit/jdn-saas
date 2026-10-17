# Comisión mensual recurrente estimada

## Datos revisados y decisión de negocio

Se inspeccionaron los tipos, las seis migraciones existentes, el importador del
prototipo, servicios, formularios y pruebas. No hay credenciales ni proyecto
Supabase enlazado en este entorno: no se verificó el esquema remoto ni se ejecutó
ninguna migración sobre datos reales.

`polizas.prima` es un único `NUMERIC(14,2)`, sin periodicidad en la base. La app lo
llamaba indistintamente Prima y Premio, y el importador lo copia sin conversión.
El usuario confirmó explícitamente el 17/10/2026 que **todos los importes cargados
son mensuales**. Se aplica directamente el 14% del premio mensual. No se divide
por 12, ni se vuelve a pedir confirmar la periodicidad. El 14% es un parámetro de
estimación comercial, no una comisión contractual por compañía/ramo ni un cobro.
Los formularios y el listado ahora identifican el importe como «Premio mensual».

## Criterio de cálculo

- Ventana de 12 meses calendario. Los meses cerrados se cortan en su último día;
  el actual se corta hoy, en `America/Argentina/Cordoba`.
- Cada punto representa el **valor mensual recurrente de la cartera al corte**.
  No es el dinero devengado durante ese mes ni se prorratea por días.
- Una póliza activa aporta `premio mensual × 0,14` en todos los cortes dentro de
  su vigencia: `fecha_inicio <= corte <= fecha_fin`, si hay vencimiento.
- La baja deja de aportar desde `fecha_baja`, inclusive. Un estado inactivo en
  una versión acreditada no aporta desde la fecha de efecto de esa versión.
- Cada id tiene una sola versión efectiva por corte. La renovación existente
  actualiza el mismo id; la nueva versión sustituye a la anterior desde su fecha
  de inicio. No se suman simultáneamente dos versiones del mismo contrato.
- Una renovación o baja futura no reemplaza la versión anterior antes de su
  fecha de efecto. No se generan puntos para meses futuros.
- Premio cero («sin cargar» en la app), fechas ausentes/inválidas o cobertura
  histórica insuficiente producen un dato desconocido. Un total incompleto es
  `null`, nunca cero ni un subtotal presentado como total de cartera.
- Variación absoluta: punto actual menos anterior, sólo si ambos son completos.
  La variación porcentual no se calcula sobre una base cero.
- El equivalente anual es el valor mensual actual por 12, sólo con información
  completa. Es una equivalencia a ritmo actual; no una proyección ni cobro anual.
- Se quitó la media móvil: agregaba retraso a una métrica de stock que ya se
  mantiene estable cuando no hay movimientos.

`mensualizarPrima` conserva conversiones explícitas para pruebas y una futura
ampliación del modelo. **La aplicación actual utiliza la periodicidad mensual
confirmada**; admitir importes mixtos requerirá persistir su periodicidad antes
de capturarlos. No hay inferencias por importe, ramo ni duración de la vigencia.

## Límite histórico encontrado

El trigger anterior guardaba `CREACION` completa pero, en actualizaciones, sólo
algunos campos. No registraba una renovación VIGENTE → VIGENTE si cambiaban sólo
las fechas y el premio seguía igual. Si cambiaban prima y estado a la vez, tampoco
conservaba toda la vigencia. `created_at` es fecha de carga; no acredita por sí
sola la fecha efectiva de una baja o modificación.

Por eso no se extrapola hacia atrás el estado o premio actual y no se encadenan
los diffs antiguos como si fueran un historial completo. Los cortes anteriores
a la primera versión financiera acreditada quedan vacíos. Los registros legacy
se conservan; no se fabrican renovaciones, bajas ni premios históricos.

Además, el importador copiaba `fechaBaja` a `fecha_fin`. Una póliza importada que
sigue VIGENTE y tiene ese campo requiere revisar si es un vencimiento o una baja.
No se reclasifica automáticamente. Hasta revisar sus fechas, esa póliza deja el
total como incompleto. No se alteran el importe, el estado ni las fechas reales
para resolver el gráfico.

Para recuperar meses anteriores hacen falta versiones acreditadas con premio
mensual, estado, vigencia y fecha de efecto de cada cambio. Si una renovación
se cargó manualmente como otro id independiente, el modelo no permite deducir
que sustituye a otro contrato. Debe usarse la renovación sobre el mismo id;
soportar sustituciones entre ids requerirá una relación explícita entre contratos.
El borrado físico de pólizas tampoco conserva auditoría (la FK del historial es
`ON DELETE CASCADE`); la app utiliza baja/renovación, no borrado de pólizas.

## Cambio mínimo persistente: migración 007

La migración nueva añade:

- `polizas.fecha_baja`: primer día sin aporte por baja.
- `polizas.comision_desde`: fecha de efecto de la versión financiera.
- `poliza_historial.fecha_efecto`, `version_orden` y `completo`: separan versiones completas de los
  eventos legacy, sin reescribir los existentes.

La foto inicial sólo acredita la cartera desde el día en que se observa al aplicar
la migración, nunca desde fechas anteriores. Las fechas legacy ambiguas quedan
pendientes. La migración actualiza únicamente el nuevo metadato de observación;
los premios, estados y vigencias existentes permanecen intactos.

El trigger guarda snapshots completos OLD/NEW al cambiar premio, vigencia,
estado o fecha de efecto, también al renovar sin cambio de prima. Las versiones
se mantienen ordenadas por fecha de efecto; se rechaza una modificación anterior
a la última versión acreditada para evitar reescribir intervalos ya conocidos.
Las correcciones anteriores a ese límite necesitan un flujo de rectificación del
historial, no una edición que borre una renovación posterior.

Los formularios permiten indicar la fecha efectiva. La baja solicita una fecha
antes de guardar; la renovación conserva el mismo id y utiliza el inicio nuevo.
Una modificación financiera directa fuera de la app, sin fecha explícita nueva,
se observa desde el día del registro (o desde el inicio de una renovación);
no acredita automáticamente su efecto en meses anteriores.

Aplicar `007_comisiones_recurrentes.sql` después de 001–006 antes de usar los
campos nuevos de alta/edición/baja. La lectura del dashboard tolera el esquema
anterior: calcula la foto actual mensual confirmada, pero no inventa el pasado.
No aplicar migraciones antiguas modificadas. No se ejecuta un backfill financiero.

## Fuentes y presentación

El servicio trae toda la cartera y el historial con paginación: no limita las
pólizas por su fecha de alta ni pierde contratos anteriores a los 12 meses.
`calcularComisionMensual` produce serie e indicadores juntos. El KPI superior y
el panel usan el mismo hook y caché de TanStack Query, incluyendo el día de corte.
Las mutaciones invalidan esa caché para evitar indicadores desactualizados.

El gráfico muestra una sola línea, importes argentinos, mes actual destacado y
tooltip con importe y variación. Los huecos históricos no se conectan. Los textos
largos quedan en esta documentación, no en la pantalla de negocio.

## Verificación

Pruebas de cálculo: continuidad sin altas, nuevos aportes, ejemplo enero-junio,
vencimiento, baja, cambios de premio, renovación sin duplicación y renovación
futura, fechas futuras dentro del mes actual, conversiones explícitas, datos
incompletos, huecos históricos, variación, calendario argentino y consistencia
entre serie e indicadores.

Pruebas de servicio: más de 1.000 pólizas e historiales, contratos anteriores a
la ventana y errores de páginas sin presentar totales parciales. Pruebas de UI:
KPI superior y panel coherentes, tooltip y datos incompletos sin falsos ceros.
Las pruebas SQL aisladas validan 007 sobre el esquema 001–006 con PostgreSQL
embebido, sin conectarse a Supabase remoto.
