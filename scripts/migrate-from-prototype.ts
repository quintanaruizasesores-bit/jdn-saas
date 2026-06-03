/**
 * Migración desde cartera_jdn-5.html → Supabase
 * Uso: npm run migrate:prototype
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { splitNombreCompleto } from '../src/lib/utils/format';
import { parseSiniestroText } from '../src/lib/riesgo/parse-siniestro-legacy';

interface PrototypePoliza {
  id: number;
  cliente: string;
  ramo: string | null;
  cia: string | null;
  detalle: string | null;
  vigencia: string | null;
  prima: number;
  fechaBaja: string | null;
  siniestro: string | null;
  nota: string | null;
  estado: 'VIGENTE' | 'HISTORICA' | 'BAJA';
  mail?: string | null;
  telefono?: string | null;
}

const htmlPath =
  process.argv.find((a) => a.startsWith('--html='))?.split('=')[1] ??
  process.env.PROTOTYPE_HTML ??
  `${process.env.HOME}/Downloads/cartera_jdn-5.html`;

function extractData(html: string): PrototypePoliza[] {
  const match = html.match(/const DATA\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error('No se encontró const DATA en el HTML');
  return JSON.parse(match[1]) as PrototypePoliza[];
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('Leyendo', htmlPath);
  const html = readFileSync(htmlPath, 'utf-8');
  const DATA = extractData(html);
  console.log(`Pólizas en prototipo: ${DATA.length}`);

  const clienteMap = new Map<string, string>();
  const ciaMap = new Map<string, string>();
  const ramoMap = new Map<string, string>();
  const contactByCliente = new Map<string, { mail?: string; telefono?: string }>();

  for (const p of DATA) {
    if (p.mail || p.telefono) {
      const existing = contactByCliente.get(p.cliente) ?? {};
      contactByCliente.set(p.cliente, {
        mail: p.mail ?? existing.mail,
        telefono: p.telefono ?? existing.telefono,
      });
    }
  }

  const uniqueClientes = [...new Set(DATA.map((p) => p.cliente))];
  console.log(`Clientes únicos: ${uniqueClientes.length}`);

  for (const nombreCompleto of uniqueClientes) {
    const { nombre, apellido } = splitNombreCompleto(nombreCompleto);
    const contact = contactByCliente.get(nombreCompleto);

    const { data: existing } = await supabase
      .from('clientes')
      .select('id')
      .eq('legacy_nombre', nombreCompleto)
      .maybeSingle();

    if (existing) {
      clienteMap.set(nombreCompleto, existing.id);
      await supabase
        .from('clientes')
        .update({
          email: contact?.mail ?? null,
          telefono: contact?.telefono ?? null,
        })
        .eq('id', existing.id);
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('clientes')
        .insert({
          nombre,
          apellido,
          legacy_nombre: nombreCompleto,
          email: contact?.mail ?? null,
          telefono: contact?.telefono ?? null,
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      clienteMap.set(nombreCompleto, inserted.id);
    }
  }

  for (const nombre of [...new Set(DATA.map((p) => p.cia).filter(Boolean))] as string[]) {
    const { data: existing } = await supabase.from('companias').select('id').eq('nombre', nombre).maybeSingle();
    if (existing) ciaMap.set(nombre, existing.id);
    else {
      const { data, error } = await supabase.from('companias').insert({ nombre, estado: 'ACTIVA' }).select('id').single();
      if (error) throw error;
      ciaMap.set(nombre, data.id);
    }
  }

  for (const nombre of [...new Set(DATA.map((p) => p.ramo).filter(Boolean))] as string[]) {
    const { data: existing } = await supabase.from('ramos').select('id').eq('nombre', nombre).maybeSingle();
    if (existing) ramoMap.set(nombre, existing.id);
    else {
      const { data, error } = await supabase.from('ramos').insert({ nombre }).select('id').single();
      if (error) throw error;
      ramoMap.set(nombre, data.id);
    }
  }

  let polizasOk = 0;
  let siniestrosOk = 0;

  for (const p of DATA) {
    const clienteId = clienteMap.get(p.cliente);
    if (!clienteId) continue;

    const { data: existingPol } = await supabase.from('polizas').select('id').eq('legacy_id', p.id).maybeSingle();
    let polizaId = existingPol?.id;

    if (!polizaId) {
      const { data: poliza, error } = await supabase
        .from('polizas')
        .insert({
          cliente_id: clienteId,
          compania_id: p.cia ? ciaMap.get(p.cia) ?? null : null,
          ramo_id: p.ramo ? ramoMap.get(p.ramo) ?? null : null,
          numero_poliza: `LEGACY-${p.id}`,
          estado: p.estado,
          fecha_inicio: p.vigencia,
          fecha_fin: p.fechaBaja,
          prima: p.prima ?? 0,
          detalle: p.detalle,
          legacy_id: p.id,
        })
        .select('id')
        .single();
      if (error) {
        console.warn(`Poliza ${p.id}:`, error.message);
        continue;
      }
      polizaId = poliza.id;
    }
    polizasOk++;

    if (p.siniestro && polizaId) {
      const events = parseSiniestroText(p.siniestro);
      for (const ev of events) {
        for (let i = 0; i < ev.count; i++) {
          const { error } = await supabase.from('siniestros').insert({
            cliente_id: clienteId,
            poliza_id: polizaId,
            tipo: ev.tipo,
            fecha: p.vigencia,
            descripcion: p.siniestro,
            descripcion_raw: p.siniestro,
            responsabilidad: ev.responsabilidad,
            monto_estimado: 0,
          });
          if (!error) siniestrosOk++;
        }
      }
    }
  }

  console.log(`Migración completa: ${polizasOk} pólizas, ${siniestrosOk} siniestros`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
