import type { Responsabilidad, SiniestroTipo } from '@/types/database';

export interface ParsedSiniestroEvent {
  tipo: SiniestroTipo;
  responsabilidad: Responsabilidad;
  count: number;
}

const ADMIN_RE =
  /baja|anula|dejo de pagar|no pag|falta de pago|fondos|incob|rescind|cancelad|actualizar|cuponera|por \d+ meses|lista la|^-$|^\s*$|^dt\??$|rechazo de pago|no paga/i;

function parseCount(s: string): number {
  let m = s.match(/(\d+)\s*rueda/);
  if (m) return +m[1];
  m = s.match(/rueda\w*\s*x\s*(\d+)/);
  if (m) return +m[1];
  if (/rueda|cubierta/.test(s)) return 1;
  return 0;
}

function mapLegacyTipo(seg: string): { tipo: SiniestroTipo; resp: Responsabilidad; n: number }[] {
  const s = seg.toLowerCase().trim();
  if (!s || ADMIN_RE.test(s)) return [];
  const ev: { tipo: SiniestroTipo; resp: Responsabilidad; n: number }[] = [];

  if (/choque|chocaron|chocó|chocada/.test(s)) {
    const noResp = /no\s*r|no resp|chocaron|de tercero|lo chocaron/.test(s);
    const resp = /tercero r\b|resp\.|a tercero r|tercero responsable|choque resp/.test(s);
    if (resp) ev.push({ tipo: 'CHOQUE', resp: 'RESPONSABLE', n: 1 });
    else if (noResp) ev.push({ tipo: 'CHOQUE', resp: 'NO_RESPONSABLE', n: 1 });
    else ev.push({ tipo: 'CHOQUE', resp: 'INDETERMINADA', n: 1 });
  }
  if (/robo total|robo completo|robada|robo del? veh/.test(s))
    ev.push({ tipo: 'ROBO', resp: 'INDETERMINADA', n: 1 });
  const r = parseCount(s);
  if (r > 0) {
    for (let i = 0; i < r; i++) ev.push({ tipo: 'ROBO', resp: 'INDETERMINADA', n: 1 });
  }
  if (/robo parcial|cerradura|bateria|notebook|robo de bici/.test(s))
    ev.push({ tipo: 'ROBO', resp: 'INDETERMINADA', n: 1 });
  if (/granizo/.test(s)) ev.push({ tipo: 'GRANIZO', resp: 'INDETERMINADA', n: 1 });
  if (/incendio|quemad|fuego/.test(s)) ev.push({ tipo: 'INCENDIO', resp: 'INDETERMINADA', n: 1 });
  if (!ev.length) ev.push({ tipo: 'OTROS', resp: 'INDETERMINADA', n: 1 });
  return ev;
}

export function parseSiniestroText(text: string | null): ParsedSiniestroEvent[] {
  if (!text) return [];
  const segs = String(text).split(/\s*\/\s*|\s*\+\s*|\s*,\s*/);
  const all: ParsedSiniestroEvent[] = [];
  segs.forEach((seg) => {
    mapLegacyTipo(seg).forEach((e) => {
      all.push({ tipo: e.tipo, responsabilidad: e.resp, count: e.n });
    });
  });
  if (!all.length) {
    mapLegacyTipo(String(text)).forEach((e) => {
      all.push({ tipo: e.tipo, responsabilidad: e.resp, count: e.n });
    });
  }
  return all;
}
