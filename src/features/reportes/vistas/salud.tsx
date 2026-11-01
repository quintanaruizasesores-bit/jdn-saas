'use client';
import { useState } from 'react';
import type { ResultadoInteligencia } from '@/lib/reportes/inteligencia';
import { getCompaniaColor } from '@/lib/companias/colores';
import {
  Barras,
  KpiCard,
  Delta,
  Seccion,
  SinDatos,
  fecha,
  numero,
} from '../reportes-ui';
import { GeografiaPanel } from '../geografia-panel';
import { ListaRegistrosDialog, type Registro } from '../lista-registros';

type Modal = 'v30' | 'v60' | 'v90' | 'vencidas' | 'sinVigentes' | null;

export function Salud({ datos }: { datos: ResultadoInteligencia }) {
  const { metricas, previas, motivos, detalle } = datos;
  const [modal, setModal] = useState<Modal>(null);
  const venc = detalle.vencimientos;
  const c30 = venc ? venc.filter((v) => v.dias <= 30).length : null;
  const c60 = venc ? venc.filter((v) => v.dias <= 60).length : null;
  const c90 = venc ? venc.length : null;
  const vencidas = detalle.vencidas;

  type ItemPoliza = {
    polizaId: string;
    cliente: string;
    ramo: string;
    compania: string;
    fechaFin: string | null;
    estado: string;
    dias?: number;
  };
  const regPolizas = (items: ItemPoliza[]): Registro[] =>
    items.map((p) => ({
      id: p.polizaId,
      href: `/polizas/${p.polizaId}`,
      principal: p.cliente,
      secundario: `${p.ramo} · ${p.compania}${p.fechaFin ? ` · vence ${fecha(p.fechaFin)}` : ''}`,
      etiqueta: p.dias != null ? `${p.dias} d` : p.estado,
    }));
  const regClientes: Registro[] = detalle.clientesSinVigentes.map((c) => ({
    id: c.id,
    href: `/clientes/${c.id}`,
    principal: c.nombre,
    secundario: c.provincia,
  }));

  const abrir = (m: Modal, disponible: number | null) =>
    disponible && disponible > 0 ? () => setModal(m) : undefined;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Vencen en 30 días"
          valor={numero(c30)}
          nota="Vigencias que terminan dentro de 30 días."
          acento={c30 ? 'warning' : 'neutral'}
          hint="Vigentes con vencimiento confirmado entre el corte y los próximos 30 días. Excluye fechas legacy sin confirmar."
          accion={c30 ? 'Ver pólizas' : undefined}
          onClick={abrir('v30', c30)}
        />
        <KpiCard
          titulo="Vencen en 60 días"
          valor={numero(c60)}
          nota="Acumulado hasta 60 días."
          acento={c60 ? 'warning' : 'neutral'}
          accion={c60 ? 'Ver pólizas' : undefined}
          onClick={abrir('v60', c60)}
        />
        <KpiCard
          titulo="Vencen en 90 días"
          valor={numero(c90)}
          nota="Acumulado hasta 90 días."
          accion={c90 ? 'Ver pólizas' : undefined}
          onClick={abrir('v90', c90)}
        />
        <KpiCard
          titulo="Vencidas pendientes"
          valor={numero(vencidas === null ? null : vencidas.length)}
          nota="Vigencia terminada, sin baja registrada."
          acento={vencidas && vencidas.length ? 'warning' : 'neutral'}
          hint="Pólizas cuyo fin de cobertura confirmado ya pasó al corte pero siguen sin baja efectiva: requieren revisión (renovar o dar de baja)."
          accion={vencidas && vencidas.length ? 'Revisar' : undefined}
          onClick={abrir('vencidas', vencidas === null ? null : vencidas.length)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Clientes sin pólizas vigentes"
          valor={numero(detalle.clientesSinVigentes.length)}
          nota="Sin ninguna cobertura activa al corte."
          acento={detalle.clientesSinVigentes.length ? 'warning' : 'neutral'}
          hint="Clientes activos (no dados de baja) sin ninguna póliza vigente al corte, en toda su cartera. Honra el filtro de provincia; ignora aseguradora y ramo."
          accion={detalle.clientesSinVigentes.length ? 'Ver clientes' : undefined}
          onClick={abrir('sinVigentes', detalle.clientesSinVigentes.length)}
        />
        <KpiCard
          titulo="Bajas verificadas"
          valor={numero(metricas.bajas)}
          nota="Transiciones a baja en el período."
          delta={<Delta valor={metricas.bajas} previo={previas.bajas} invertido />}
          hint="Pasajes verificados de vigencia a baja efectiva, vencimiento o estado histórico dentro del rango."
        />
        <KpiCard
          titulo="Asegurados activos"
          valor={numero(metricas.asegurados)}
          nota="Clientes únicos con póliza vigente."
          delta={<Delta valor={metricas.asegurados} previo={previas.asegurados} />}
          hint="Clientes únicos con al menos una póliza vigente a la fecha de corte."
        />
        <KpiCard
          titulo="Pólizas por asegurado"
          valor={numero(metricas.promedio, 2)}
          nota="Profundidad media de la cartera."
          hint="Pólizas vigentes ÷ asegurados activos dentro de los filtros aplicados."
        />
      </div>

      {motivos && (
        <p className="text-ink-dim text-xs leading-relaxed">
          Bajas del período: {numero(motivos.baja)} por baja efectiva,{' '}
          {numero(motivos.vencimiento)} por vencimiento y {numero(motivos.historica)}{' '}
          por pase a histórica.
        </p>
      )}

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <Seccion
          titulo="Concentración por aseguradora"
          descripcion="Riesgo de concentración: pólizas vigentes al corte por aseguradora."
        >
          {datos.companias === null ? (
            <SinDatos texto="Sin historia suficiente al corte." />
          ) : (
            <Barras
              items={[...datos.companias]
                .sort((a, b) => b.polizas - a.polizas)
                .map((c) => ({
                  id: c.id,
                  nombre: c.nombre,
                  valor: c.polizas,
                  color: getCompaniaColor(c.nombre, c.color).accent,
                }))}
            />
          )}
        </Seccion>
        <Seccion
          titulo="Concentración por ramo"
          descripcion="Pólizas vigentes al corte por ramo. Cada barra abre la cartera filtrada."
        >
          {datos.ramos === null ? (
            <SinDatos texto="Sin historia suficiente al corte." />
          ) : (
            <Barras
              items={[...datos.ramos]
                .sort((a, b) => b.polizas - a.polizas)
                .map((r) => ({
                  id: r.id,
                  nombre: r.nombre,
                  valor: r.polizas,
                  href: r.id !== 'sin-ramo' ? `/polizas?ramo=${r.id}` : undefined,
                }))}
            />
          )}
        </Seccion>
      </div>

      <GeografiaPanel datos={datos} />

      <ListaRegistrosDialog
        abierto={modal === 'v30'}
        onCerrar={() => setModal(null)}
        titulo="Pólizas que vencen en 30 días"
        descripcion="Vigentes con vencimiento confirmado dentro de 30 días. Los enlaces abren la póliza."
        registros={regPolizas(venc?.filter((v) => v.dias <= 30) ?? [])}
      />
      <ListaRegistrosDialog
        abierto={modal === 'v60'}
        onCerrar={() => setModal(null)}
        titulo="Pólizas que vencen en 60 días"
        descripcion="Acumulado de vencimientos confirmados hasta 60 días."
        registros={regPolizas(venc?.filter((v) => v.dias <= 60) ?? [])}
      />
      <ListaRegistrosDialog
        abierto={modal === 'v90'}
        onCerrar={() => setModal(null)}
        titulo="Pólizas que vencen en 90 días"
        descripcion="Acumulado de vencimientos confirmados hasta 90 días."
        registros={regPolizas(venc ?? [])}
      />
      <ListaRegistrosDialog
        abierto={modal === 'vencidas'}
        onCerrar={() => setModal(null)}
        titulo="Pólizas vencidas pendientes de revisión"
        descripcion="Fin de cobertura cumplido sin baja registrada. Revisá para renovar o dar de baja."
        registros={regPolizas(vencidas ?? [])}
      />
      <ListaRegistrosDialog
        abierto={modal === 'sinVigentes'}
        onCerrar={() => setModal(null)}
        titulo="Clientes sin pólizas vigentes"
        descripcion="Clientes activos sin ninguna cobertura vigente al corte. Los enlaces abren la ficha."
        registros={regClientes}
      />
    </div>
  );
}
