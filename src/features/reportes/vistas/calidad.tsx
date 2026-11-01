'use client';
import { useState } from 'react';
import type { ResultadoInteligencia } from '@/lib/reportes/inteligencia';
import { KpiCard, numero } from '../reportes-ui';
import { ListaRegistrosDialog, type Registro } from '../lista-registros';

type Modal = 'premio' | 'periodicidad' | 'ubicacion' | 'contacto' | null;

const MOTIVO_TEXTO: Record<string, string> = {
  PREMIO: 'Sin premio',
  PERIODICIDAD: 'Sin periodicidad',
  FECHAS: 'Fechas inválidas',
};

export function Calidad({ datos }: { datos: ResultadoInteligencia }) {
  const { calidad, detalle } = datos;
  const [modal, setModal] = useState<Modal>(null);
  const pendiente = calidad.comisionPendiente;
  const limpio =
    calidad.sinHistoria === 0 &&
    calidad.sinImporte === 0 &&
    calidad.finLegacyAmbiguo === 0 &&
    detalle.sinUbicacion.length === 0 &&
    detalle.sinContacto.length === 0;

  const regPolizasMotivo = (motivo: string): Registro[] =>
    (detalle.sinImporte ?? [])
      .filter((p) => p.motivo === motivo)
      .map((p) => ({
        id: p.polizaId,
        href: `/polizas/${p.polizaId}`,
        principal: p.cliente,
        secundario: `${p.ramo} · ${p.compania}`,
        etiqueta: MOTIVO_TEXTO[p.motivo] ?? p.motivo,
      }));
  const regClientes = (items: { id: string; nombre: string }[]): Registro[] =>
    items.map((c) => ({
      id: c.id,
      href: `/clientes/${c.id}`,
      principal: c.nombre,
    }));

  const abrir = (m: Modal, lista: unknown[] | null, count: number) =>
    lista !== null && count > 0 ? () => setModal(m) : undefined;

  return (
    <div className="space-y-5">
      <p className="text-ink-dim bg-bg2 rounded-lg px-4 py-3 text-xs leading-relaxed">
        Problemas de datos que afectan el cálculo de la cartera dentro del segmento
        filtrado. Los valores desconocidos no se reemplazan por cero ni se completan
        artificialmente. Cada indicador con detalle abre los registros afectados.
      </p>

      {limpio && (
        <p className="text-ink text-sm">
          No se detectaron problemas de datos en este segmento al corte aplicado.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          titulo="Pólizas sin historia suficiente"
          valor={numero(calidad.sinHistoria)}
          nota="No se puede acreditar su estado al corte."
          acento={calidad.sinHistoria ? 'warning' : 'neutral'}
          hint="Pólizas sin una versión financiera observable a la fecha de corte: faltan snapshots completos para saber si están vigentes. Cargá versiones completas para acreditarlas."
        />
        <KpiCard
          titulo="Sin premio cargado"
          valor={numero(pendiente.premio)}
          nota="Falta el importe de la prima."
          acento={pendiente.premio ? 'warning' : 'neutral'}
          hint="Pólizas vigentes sin valor de prima cargado; cargarlo habilita el cálculo de comisión."
          accion={abrir('premio', detalle.sinImporte, pendiente.premio) ? 'Ver pólizas' : undefined}
          onClick={abrir('premio', detalle.sinImporte, pendiente.premio)}
        />
        <KpiCard
          titulo="Sin periodicidad válida"
          valor={numero(pendiente.periodicidad)}
          nota="No se puede mensualizar la prima."
          acento={pendiente.periodicidad ? 'warning' : 'neutral'}
          hint="Pólizas con prima cargada pero sin una periodicidad que permita convertirla a valor mensual."
          accion={abrir('periodicidad', detalle.sinImporte, pendiente.periodicidad) ? 'Ver pólizas' : undefined}
          onClick={abrir('periodicidad', detalle.sinImporte, pendiente.periodicidad)}
        />
        <KpiCard
          titulo="Clientes sin ubicación"
          valor={numero(detalle.sinUbicacion.length)}
          nota="Sin provincia identificable."
          acento={detalle.sinUbicacion.length ? 'warning' : 'neutral'}
          hint="Clientes activos sin una provincia que el sistema pueda ubicar en el mapa. Completar la ubicación mejora los reportes territoriales."
          accion={detalle.sinUbicacion.length ? 'Ver clientes' : undefined}
          onClick={abrir('ubicacion', detalle.sinUbicacion, detalle.sinUbicacion.length)}
        />
        <KpiCard
          titulo="Clientes sin contacto"
          valor={numero(detalle.sinContacto.length)}
          nota="Sin email ni teléfono."
          acento={detalle.sinContacto.length ? 'warning' : 'neutral'}
          hint="Clientes activos sin ningún dato de contacto cargado; dificulta el seguimiento comercial y los saludos."
          accion={detalle.sinContacto.length ? 'Ver clientes' : undefined}
          onClick={abrir('contacto', detalle.sinContacto, detalle.sinContacto.length)}
        />
        <KpiCard
          titulo="Fechas a validar"
          valor={numero(pendiente.fechas + calidad.finLegacyAmbiguo)}
          nota="Vigencia o baja inconsistente o sin confirmar."
          acento={pendiente.fechas + calidad.finLegacyAmbiguo ? 'warning' : 'neutral'}
          hint="Incluye fechas inválidas y pólizas importadas con fecha final legacy sin confirmar. Estas últimas conservan su vigencia observada y no se cuentan como vencimientos."
        />
        <KpiCard
          titulo="Meses sin comisión verificable"
          valor={numero(calidad.mesesSinComisionDisponible)}
          nota="Cortes del rango sin evidencia suficiente."
          acento={calidad.mesesSinComisionDisponible ? 'warning' : 'neutral'}
          hint="Meses del rango en los que falta evidencia para saber qué pólizas estaban vigentes; quedan como «No disponible» en la evolución."
        />
      </div>

      <ListaRegistrosDialog
        abierto={modal === 'premio'}
        onCerrar={() => setModal(null)}
        titulo="Pólizas sin premio cargado"
        descripcion="Vigentes al corte sin importe de prima. Los enlaces abren la póliza para completarla."
        registros={regPolizasMotivo('PREMIO')}
      />
      <ListaRegistrosDialog
        abierto={modal === 'periodicidad'}
        onCerrar={() => setModal(null)}
        titulo="Pólizas sin periodicidad válida"
        descripcion="Vigentes al corte con prima pero sin periodicidad para mensualizar."
        registros={regPolizasMotivo('PERIODICIDAD')}
      />
      <ListaRegistrosDialog
        abierto={modal === 'ubicacion'}
        onCerrar={() => setModal(null)}
        titulo="Clientes sin ubicación"
        descripcion="Clientes activos sin provincia identificable. Los enlaces abren la ficha."
        registros={regClientes(detalle.sinUbicacion)}
      />
      <ListaRegistrosDialog
        abierto={modal === 'contacto'}
        onCerrar={() => setModal(null)}
        titulo="Clientes sin datos de contacto"
        descripcion="Clientes activos sin email ni teléfono cargados. Los enlaces abren la ficha."
        registros={regClientes(detalle.sinContacto)}
      />
    </div>
  );
}
