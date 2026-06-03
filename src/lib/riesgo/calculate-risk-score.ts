import type { RiesgoNivel, Responsabilidad, Siniestro, SiniestroTipo } from '@/types/database';

export interface RiskInput {
  siniestros: Pick<Siniestro, 'tipo' | 'responsabilidad' | 'monto_estimado'>[];
  totalPolizas: number;
}

export interface RiskResult {
  score: number;
  nivel: RiesgoNivel;
  alertas: { nivel: 'alto' | 'medio'; txt: string }[];
}

export function calculateRiskScore(input: RiskInput): RiskResult {
  const { siniestros, totalPolizas } = input;
  const alertas: RiskResult['alertas'] = [];
  let score = 0;

  const totalEv = siniestros.length;
  const robos = siniestros.filter((s) => s.tipo === 'ROBO').length;
  const choquesResp = siniestros.filter(
    (s) => s.tipo === 'CHOQUE' && s.responsabilidad === 'RESPONSABLE'
  ).length;
  const montoTotal = siniestros.reduce((s, e) => s + (Number(e.monto_estimado) || 0), 0);

  // Cantidad de siniestros (hasta +20)
  if (totalEv >= 8) {
    score += 20;
    alertas.push({ nivel: 'alto', txt: `${totalEv} siniestros acumulados` });
  } else if (totalEv >= 4) {
    score += 10;
    alertas.push({ nivel: 'medio', txt: `${totalEv} siniestros registrados` });
  } else if (totalEv >= 2) {
    score += 5;
  }

  // Frecuencia siniestros / pólizas (hasta +20)
  if (totalPolizas > 0 && totalEv / totalPolizas >= 3) {
    score += 20;
    alertas.push({
      nivel: 'alto',
      txt: `Frecuencia elevada: ${totalEv} siniestros en ${totalPolizas} póliza(s)`,
    });
  } else if (totalPolizas > 0 && totalEv / totalPolizas >= 1.5) {
    score += 10;
  }

  // Robos repetidos (hasta +25 c/u, cap 50)
  if (robos >= 2) {
    const robScore = Math.min(50, robos * 25);
    score += robScore;
    alertas.push({
      nivel: robos >= 3 ? 'alto' : 'medio',
      txt: `${robos} robos declarados — patrón de riesgo`,
    });
  } else if (robos === 1) {
    score += 12;
  }

  // Choques responsables (+5 c/u)
  if (choquesResp >= 3) {
    score += choquesResp * 5;
    alertas.push({
      nivel: 'medio',
      txt: `${choquesResp} choques con responsabilidad propia`,
    });
  } else if (choquesResp >= 1) {
    score += choquesResp * 5;
  }

  // Monto acumulado (escala log hasta +15)
  if (montoTotal > 0) {
    const montoScore = Math.min(15, Math.log10(montoTotal + 1) * 3);
    score += montoScore;
    if (montoTotal >= 500000) {
      alertas.push({
        nivel: 'alto',
        txt: `Monto acumulado elevado: $${Math.round(montoTotal).toLocaleString('es-AR')}`,
      });
    }
  }

  score = Math.min(100, Math.round(score));

  let nivel: RiesgoNivel = 'bajo';
  if (score >= 61) nivel = 'alto';
  else if (score >= 31) nivel = 'medio';

  return { score, nivel, alertas };
}

export const SINIESTRO_TIPO_LABELS: Record<SiniestroTipo, string> = {
  CHOQUE: 'Choque',
  ROBO: 'Robo',
  INCENDIO: 'Incendio',
  GRANIZO: 'Granizo',
  OTROS: 'Otros',
};

export const RESPONSABILIDAD_LABELS: Record<Responsabilidad, string> = {
  RESPONSABLE: 'Responsable',
  NO_RESPONSABLE: 'No responsable',
  INDETERMINADA: 'Indeterminada',
};

export const POLIZA_ESTADO_LABELS = {
  VIGENTE: 'Vigente',
  HISTORICA: 'Histórica',
  BAJA: 'Baja',
} as const;
