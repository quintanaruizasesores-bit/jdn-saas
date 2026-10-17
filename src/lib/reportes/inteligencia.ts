import type {
  Cliente,
  Compania,
  Poliza,
  PolizaHistorial,
  Ramo,
} from '@/types/database';
import {
  aporteComision,
  construirVersionesComision,
  periodoComision,
  type VersionComision,
} from '@/lib/dashboard/comision';
import {
  normalizarProvincia,
  nombreProvincia,
  normalizarTexto,
  PROVINCIAS,
} from './geografia';

export interface DatosInteligencia {
  clientes: Cliente[];
  polizas: Poliza[];
  historial: PolizaHistorial[];
  companias: Compania[];
  ramos: Ramo[];
}
export interface FiltrosInteligencia {
  desde: string;
  hasta: string;
  compania?: string;
  ramo?: string;
  provincia?: string;
  estado?: 'VIGENTE' | 'BAJA' | 'HISTORICA' | 'VENCIDA' | '';
}
export const fechaValida = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  Number.isFinite(Date.parse(`${s}T12:00:00Z`)) &&
  new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;
export function sumarDias(s: string, dias: number) {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
export function finMes(s: string) {
  const d = new Date(`${s}T12:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12))
    .toISOString()
    .slice(0, 10);
}
export function validarFiltros(f: FiltrosInteligencia, hoy: string) {
  if (
    !fechaValida(f.desde) ||
    !fechaValida(f.hasta) ||
    f.desde > f.hasta ||
    f.hasta > hoy
  )
    throw new Error('Elegí un rango válido que no supere la fecha de hoy.');
  if (
    Number(f.hasta.slice(0, 4)) * 12 +
      Number(f.hasta.slice(5, 7)) -
      Number(f.desde.slice(0, 4)) * 12 -
      Number(f.desde.slice(5, 7)) >
    119
  )
    throw new Error('Elegí hasta 120 meses por consulta.');
}
const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fechaRegistro = (s: string) => periodoComision(new Date(s)).hoy;
type Version = VersionComision['datos'];
function vigente(v: Version, corte: string): boolean | null {
  if (
    [
      v.fecha_inicio,
      v.fecha_baja,
      ...(v.fechasVerificadas === false ? [] : [v.fecha_fin]),
    ].some((s) => !!s && !fechaValida(s))
  )
    return null;
  if (
    v.fecha_inicio &&
    v.fecha_fin &&
    v.fechasVerificadas !== false &&
    v.fecha_fin < v.fecha_inicio
  )
    return null;
  return (
    v.estado === 'VIGENTE' &&
    (!v.fecha_inicio || v.fecha_inicio <= corte) &&
    (!v.fecha_baja || v.fecha_baja > corte) &&
    (v.fechasVerificadas === false || !v.fecha_fin || v.fecha_fin >= corte)
  );
}
function estadoDerivado(v: Version, corte: string) {
  if (v.fecha_baja && v.fecha_baja <= corte) return 'BAJA';
  if (
    v.estado === 'VIGENTE' &&
    v.fechasVerificadas !== false &&
    v.fecha_fin &&
    v.fecha_fin < corte
  )
    return 'VENCIDA';
  return v.estado;
}
export function analizarCartera(
  datos: DatosInteligencia,
  filtros: FiltrosInteligencia,
  now = new Date()
) {
  const hoy = periodoComision(now).hoy;
  validarFiltros(filtros, hoy);
  const versiones = construirVersionesComision(
    datos.polizas,
    now,
    datos.historial
  );
  const clientes = new Map(datos.clientes.map((c) => [c.id, c]));
  const companias = new Map(datos.companias.map((c) => [c.id, c]));
  const ramos = new Map(datos.ramos.map((r) => [r.id, r]));
  const esCliente = (p: Poliza, corte: string) => {
    const c = clientes.get(p.cliente_id);
    return !!c && (!c.deleted_at || fechaRegistro(c.deleted_at) > corte);
  };
  const versionEn = (p: Poliza, corte: string) =>
    (versiones.get(p.id) ?? []).findLast((v) => v.desde <= corte)?.datos;
  const ausenciaProbada = (p: Poliza, corte: string) => {
    const first = versiones.get(p.id)?.[0];
    return (
      !!first?.datos.fecha_inicio &&
      first.desde <= first.datos.fecha_inicio &&
      corte < first.datos.fecha_inicio
    );
  };
  // Un segmento de pólizas estable permite comparar stocks y movimientos sin
  // que un cambio de filtro produzca altas/bajas ficticias entre cortes.
  const polizas = datos.polizas.filter((p) => {
    const c = clientes.get(p.cliente_id);
    if (!c) return false;
    const v = versionEn(p, filtros.hasta);
    return (
      (!filtros.compania || p.compania_id === filtros.compania) &&
      (!filtros.ramo || p.ramo_id === filtros.ramo) &&
      (!filtros.provincia ||
        normalizarProvincia(c.provincia) === filtros.provincia) &&
      // Un estado desconocido no puede excluirse por el estado actual: haría
      // desaparecer la falta de historia detrás de un cero aparente.
      (!filtros.estado ||
        !v ||
        vigente(v, filtros.hasta) === null ||
        estadoDerivado(v, filtros.hasta) === filtros.estado)
    );
  });
  function fotografia(corte: string) {
    const activas: {
      poliza: Poliza;
      version: Version;
      cliente: Cliente;
      comision: number | null;
    }[] = [];
    let desconocidas = 0,
      sinImporte = 0,
      comision = 0;
    const pendientesComision = {
      premio: 0,
      periodicidad: 0,
      fechas: 0,
    };
    for (const p of polizas) {
      if (!esCliente(p, corte)) continue;
      const v = versionEn(p, corte);
      if (!v) {
        if (!ausenciaProbada(p, corte)) desconocidas++;
        continue;
      }
      const activa = vigente(v, corte);
      if (activa === null) {
        desconocidas++;
        continue;
      }
      if (!activa) continue;
      const aporte = aporteComision(v, corte);
      if (typeof aporte !== 'number') {
        sinImporte++;
        if (aporte === 'PREMIO') pendientesComision.premio++;
        if (aporte === 'PERIODICIDAD') pendientesComision.periodicidad++;
        if (aporte === 'FECHAS') pendientesComision.fechas++;
      } else comision += aporte;
      activas.push({
        poliza: p,
        version: v,
        cliente: clientes.get(p.cliente_id)!,
        comision: typeof aporte === 'number' ? aporte : null,
      });
    }
    const asegurados = new Set(activas.map((p) => p.cliente.id)).size;
    return {
      activas,
      desconocidas,
      sinImporte,
      pendientesComision,
      asegurados: desconocidas ? null : asegurados,
      polizas: desconocidas ? null : activas.length,
      comision: desconocidas || sinImporte ? null : redondear(comision),
    };
  }
  function movimientos(desde: string, hasta: string) {
    let altas = 0,
      bajas = 0;
    const motivos = { baja: 0, vencimiento: 0, historica: 0 };
    let incompleto = fotografia(sumarDias(desde, -1)).desconocidas > 0;
    for (const p of polizas) {
      if (!esCliente(p, hasta)) continue;
      const lista = versiones.get(p.id) ?? [];
      const fechas = new Set<string>();
      for (const v of lista) {
        fechas.add(v.desde);
        if (v.datos.fecha_inicio && fechaValida(v.datos.fecha_inicio))
          fechas.add(v.datos.fecha_inicio);
        if (v.datos.fecha_baja && fechaValida(v.datos.fecha_baja))
          fechas.add(v.datos.fecha_baja);
        if (
          v.datos.fecha_fin &&
          fechaValida(v.datos.fecha_fin) &&
          v.datos.fechasVerificadas !== false
        )
          fechas.add(sumarDias(v.datos.fecha_fin, 1));
      }
      for (const fecha of [...fechas]
        .filter((f) => f >= desde && f <= hasta)
        .sort()) {
        const antes = versionEn(p, sumarDias(fecha, -1));
        const despues = versionEn(p, fecha);
        const a = antes
          ? vigente(antes, sumarDias(fecha, -1))
          : ausenciaProbada(p, sumarDias(fecha, -1))
            ? false
            : null;
        const b = despues ? vigente(despues, fecha) : null;
        if (a === null || b === null) {
          incompleto = true;
          continue;
        }
        if (!a && b) altas++;
        if (a && !b && despues) {
          bajas++;
          if (
            (despues.fecha_baja && despues.fecha_baja <= fecha) ||
            despues.estado === 'BAJA'
          )
            motivos.baja++;
          else if (despues.estado === 'HISTORICA') motivos.historica++;
          else motivos.vencimiento++;
        }
      }
    }
    return {
      altas: incompleto ? null : altas,
      bajas: incompleto ? null : bajas,
      neto: incompleto ? null : altas - bajas,
      motivos: incompleto ? null : motivos,
    };
  }
  const primeraPoliza = new Map<string, string>();
  datos.polizas.forEach((p) => {
    const fecha = fechaRegistro(p.created_at);
    if (
      !primeraPoliza.has(p.cliente_id) ||
      fecha < primeraPoliza.get(p.cliente_id)!
    )
      primeraPoliza.set(p.cliente_id, fecha);
  });
  function nuevos(desde: string, hasta: string) {
    return new Set(
      polizas
        .filter(
          (p) =>
            esCliente(p, hasta) &&
            primeraPoliza.get(p.cliente_id)! >= desde &&
            primeraPoliza.get(p.cliente_id)! <= hasta
        )
        .map((p) => p.cliente_id)
    ).size;
  }
  function serie(desde: string, hasta: string) {
    const puntos = [];
    let inicio = desde;
    let acumulado: number | null = 0;
    while (inicio <= hasta) {
      const corte = finMes(inicio) < hasta ? finMes(inicio) : hasta;
      const foto = fotografia(corte),
        flujo = movimientos(inicio, corte);
      acumulado =
        acumulado === null || foto.comision === null
          ? null
          : redondear(acumulado + foto.comision);
      puntos.push({
        mes: inicio.slice(0, 7),
        corte,
        polizas: foto.polizas,
        asegurados: foto.asegurados,
        comision: foto.comision,
        acumulado,
        ...flujo,
      });
      inicio = sumarDias(corte, 1);
    }
    return puntos;
  }
  const foto = fotografia(filtros.hasta),
    puntos = serie(filtros.desde, filtros.hasta);
  const duracion =
    (Date.parse(filtros.hasta) - Date.parse(filtros.desde)) / 86400000 + 1;
  const anteriorHasta = sumarDias(filtros.desde, -1),
    anteriorDesde = sumarDias(filtros.desde, -duracion);
  const fotoAnterior = fotografia(anteriorHasta),
    serieAnterior = serie(anteriorDesde, anteriorHasta);
  const vence = (f: ReturnType<typeof fotografia>, corte: string) =>
    f.desconocidas
      ? null
      : f.activas.filter(
          (p) =>
            p.version.fechasVerificadas !== false &&
            p.version.fecha_fin &&
            p.version.fecha_fin >= corte &&
            p.version.fecha_fin <= sumarDias(corte, 30)
        ).length;
  const metricas = {
    asegurados: foto.asegurados,
    polizas: foto.polizas,
    comision: foto.comision,
    acumulado: puntos.at(-1)?.acumulado ?? null,
    vencimientos: vence(foto, filtros.hasta),
    nuevos: nuevos(filtros.desde, filtros.hasta),
    bajas: movimientos(filtros.desde, filtros.hasta).bajas,
    promedio: foto.asegurados
      ? redondear(foto.activas.length / foto.asegurados)
      : null,
  };
  const previas = {
    asegurados: fotoAnterior.asegurados,
    polizas: fotoAnterior.polizas,
    comision: fotoAnterior.comision,
    acumulado:
      puntos.length === serieAnterior.length
        ? (serieAnterior.at(-1)?.acumulado ?? null)
        : null,
    vencimientos: vence(fotoAnterior, anteriorHasta),
    nuevos: nuevos(anteriorDesde, anteriorHasta),
    bajas: movimientos(anteriorDesde, anteriorHasta).bajas,
    promedio: fotoAnterior.asegurados
      ? redondear(fotoAnterior.activas.length / fotoAnterior.asegurados)
      : null,
  };
  const contar = (
    items: typeof foto.activas,
    key: (item: (typeof foto.activas)[number]) => string
  ) => {
    const grupos = new Map<
      string,
      {
        id: string;
        polizas: number;
        clientes: Set<string>;
        comision: number | null;
      }
    >();
    items.forEach((item) => {
      const id = key(item),
        g = grupos.get(id) ?? {
          id,
          polizas: 0,
          clientes: new Set<string>(),
          comision: 0,
        };
      g.polizas++;
      g.clientes.add(item.cliente.id);
      g.comision =
        g.comision === null || item.comision === null
          ? null
          : g.comision + item.comision;
      grupos.set(id, g);
    });
    return [...grupos.values()]
      .map((g) => ({
        ...g,
        asegurados: g.clientes.size,
        clientes: undefined,
        comision: g.comision === null ? null : redondear(g.comision),
      }))
      .sort((a, b) => b.polizas - a.polizas);
  };
  const porCompania = (items: typeof foto.activas) =>
    contar(items, (p) => p.poliza.compania_id ?? 'sin-compania').map((g) => {
      const c = companias.get(g.id);
      return {
        ...g,
        nombre: c?.nombre ?? 'Sin aseguradora',
        color: c?.color ?? null,
      };
    });
  const porRamo = (items: typeof foto.activas) =>
    contar(items, (p) => p.poliza.ramo_id ?? 'sin-ramo').map((g) => ({
      ...g,
      nombre: ramos.get(g.id)?.nombre ?? 'Sin ramo',
    }));
  const provinciasIds = new Set<string>(PROVINCIAS.map((p) => p[0]));
  const nacionalIdentificado = new Set(
    foto.activas
      .filter((p) =>
        provinciasIds.has(normalizarProvincia(p.cliente.provincia))
      )
      .map((p) => p.cliente.id)
  ).size;
  const geografia = contar(foto.activas, (p) =>
    normalizarProvincia(p.cliente.provincia)
  ).map((g) => {
    const items = foto.activas.filter(
      (p) => normalizarProvincia(p.cliente.provincia) === g.id
    );
    return {
      ...g,
      nombre: nombreProvincia(g.id),
      porcentaje: foto.asegurados
        ? redondear((g.asegurados / foto.asegurados) * 100)
        : 0,
      porcentajeNacional:
        provinciasIds.has(g.id) && nacionalIdentificado
          ? redondear((g.asegurados / nacionalIdentificado) * 100)
          : null,
      localidades: contar(
        items,
        (p) => normalizarTexto(p.cliente.localidad ?? '') || 'sin-localidad'
      ).map((l) => ({
        ...l,
        nombre:
          items.find(
            (p) =>
              (normalizarTexto(p.cliente.localidad ?? '') ||
                'sin-localidad') === l.id
          )?.cliente.localidad || 'Sin localidad',
      })),
      ramos: porRamo(items),
      companias: porCompania(items),
    };
  });
  const porCliente = new Map<
    string,
    { id: string; nombre: string; polizas: number; provincia: string }
  >();
  foto.activas.forEach((p) => {
    const c = p.cliente,
      g = porCliente.get(c.id) ?? {
        id: c.id,
        nombre: `${c.apellido} ${c.nombre}`.trim(),
        polizas: 0,
        provincia: nombreProvincia(normalizarProvincia(c.provincia)),
      };
    g.polizas++;
    porCliente.set(c.id, g);
  });
  return {
    generado: now.toISOString(),
    filtros,
    anterior: { desde: anteriorDesde, hasta: anteriorHasta },
    metricas,
    previas,
    serie: puntos,
    geografia: foto.desconocidas ? null : geografia,
    nacionalIdentificado: foto.desconocidas ? null : nacionalIdentificado,
    companias: foto.desconocidas ? null : porCompania(foto.activas),
    ramos: foto.desconocidas ? null : porRamo(foto.activas),
    segmentos: foto.desconocidas
      ? null
      : [1, 2, 3, 4].map((n) => ({
          cantidad: n,
          clientes: [...porCliente.values()]
            .filter((c) => (n === 4 ? c.polizas >= 4 : c.polizas === n))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        })),
    motivos: movimientos(filtros.desde, filtros.hasta).motivos,
    calidad: {
      sinHistoria: foto.desconocidas,
      sinImporte: foto.sinImporte,
      comisionPendiente: foto.pendientesComision,
      mesesSinComisionDisponible: puntos.filter((p) => p.comision === null)
        .length,
      finLegacyAmbiguo: foto.activas.filter(
        (p) => p.version.fechasVerificadas === false
      ).length,
    },
    opciones: {
      companias: datos.companias.map((c) => ({ id: c.id, nombre: c.nombre })),
      ramos: datos.ramos.map((r) => ({ id: r.id, nombre: r.nombre })),
    },
  };
}
export type ResultadoInteligencia = ReturnType<typeof analizarCartera>;
