'use client';
import { useState } from 'react';
import { Database, Download, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RespaldoPanel() {
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function descargar() {
    setOcupado(true);
    setError('');
    setEstado('Verificando permisos y preparando la copia de datos…');
    try {
      const response = await fetch('/api/respaldo', { cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? 'No se pudo generar la exportación.');
      }
      if (
        response.redirected ||
        !response.headers
          .get('Content-Type')
          ?.startsWith(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          )
      )
        throw new Error(
          'El servidor no devolvió un Excel. Revisá tu sesión y volvé a intentar.'
        );
      if (!response.body)
        throw new Error('El servidor no devolvió un archivo.');
      const reader = response.body.getReader(),
        partes: Uint8Array<ArrayBuffer>[] = [];
      let bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partes.push(value as Uint8Array<ArrayBuffer>);
        bytes += value.byteLength;
        setEstado(
          `Recibiendo archivo: ${(bytes / 1024 / 1024).toLocaleString('es-AR', { maximumFractionDigits: 1 })} MB. Verificando la copia…`
        );
      }
      if (bytes === 0)
        throw new Error('La descarga llegó vacía. Volvé a intentar.');
      const blob = new Blob(partes, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download =
        response.headers
          .get('Content-Disposition')
          ?.match(/filename="([^"]+)"/)?.[1] ?? 'quintana_ruiz_respaldo.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setEstado('Archivo completo recibido. La descarga está preparada.');
    } catch (e) {
      setError(
        e instanceof TypeError
          ? 'La copia se interrumpió. No se guardó un archivo parcial. Volvé a intentar sin modificaciones concurrentes.'
          : e instanceof Error
            ? e.message
            : 'La copia se interrumpió. No se guardó un archivo parcial.'
      );
      setEstado('');
    } finally {
      setOcupado(false);
    }
  }
  return (
    <section
      className="border-line bg-panel max-w-3xl rounded-xl border p-5 sm:p-8"
      aria-labelledby="respaldo-titulo"
    >
      <Database className="text-primary mb-4 h-8 w-8" />
      <h2 id="respaldo-titulo" className="text-ink text-xl">
        Respaldo y exportación
      </h2>
      <p className="text-ink-dim mt-3 max-w-2xl text-sm">
        Descargá una copia integral de los datos de la aplicación en un único
        Excel. Incluye catálogos, clientes, pólizas, historiales, siniestros,
        tareas, actividad, perfiles y configuración, con una hoja por tabla.
      </p>
      <div className="border-line text-ink-dim my-6 border-y py-4 text-sm">
        <p className="flex items-start gap-2">
          <ShieldCheck className="text-primary mt-0.5 h-4 w-4 shrink-0" />
          Disponible únicamente para administradores habilitados por el
          responsable del sistema.
        </p>
        <p className="mt-3">
          El índice muestra el alcance y la cantidad de registros. El manifiesto
          documenta campos, relaciones y exclusiones de seguridad. Las fechas e
          importes se conservan como texto exacto; <code>\N</code> representa un
          valor nulo y <code>\E</code> un texto vacío. Los textos extensos se
          conservan en hojas auxiliares.
        </p>
      </div>
      <Button
        onClick={descargar}
        disabled={ocupado}
        className="h-auto min-h-11 w-full whitespace-normal sm:w-auto"
      >
        {ocupado ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Exportar base de datos completa (.xlsx)
      </Button>
      <p role="status" aria-live="polite" className="text-ink-dim mt-3 text-sm">
        {estado}
      </p>
      {error && (
        <p role="alert" className="text-red mt-3 text-sm">
          {error}
        </p>
      )}
      <div className="bg-bg2 text-ink-dim mt-7 rounded-lg p-4 text-sm">
        <h3 className="text-ink mb-2 text-sm">
          Respaldo técnico de PostgreSQL
        </h3>
        <p>
          Este Excel es una copia de datos. Para restaurar índices, funciones,
          restricciones y políticas de acceso se necesita un respaldo nativo de
          PostgreSQL.
        </p>
        <p className="mt-2">
          El proyecto no tiene una integración de backups nativos configurada.
          Su disponibilidad se consulta por separado en la administración de
          Supabase.
        </p>
      </div>
    </section>
  );
}
