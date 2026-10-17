# Colores de compañías

En **Configuración → Compañías**, cada fila permite elegir un color y guardarlo.
**Restablecer** vuelve al color inicial. La paleta inicial conserva Holando celeste,
Sancor bordó, San Cristóbal azul, Río Uruguay azul oscuro, Triunfo verde, Mercantil
azul acero y Mapfre rojo.

La migración nueva `008_companias_color.sql` añade `companias.color`, opcional,
validado como hexadecimal de seis dígitos. No sobrescribe los valores iniciales
ni modifica los datos de las pólizas. `NULL` utiliza la paleta inicial. Se amplía
la vista de distribución con ese mismo campo, sin cambiar cantidades ni premios.

El color guardado se utiliza en el listado y filtros de pólizas, alta/edición y
distribución del dashboard. Los fondos y el texto de las etiquetas se ajustan
para conservar legibilidad. Al guardar se invalidan las consultas relacionadas.
Los errores de guardado conservan la configuración anterior. Se puede cambiar
el nombre de una compañía sin perder un color personalizado, porque se guarda
por su id.

Aplicar 008 antes de usar el guardado de colores. Sin la migración, la lectura
conserva la paleta inicial; un error al guardar no se presenta como éxito.

Verificación: pruebas del editor para guardar, recuperar al volver, restablecer y
fallar sin cambiar el valor anterior; pruebas en PostgreSQL para persistencia,
restricción del formato y conservación de totales en la distribución.
