// Tabela oficial de referência OMS (Organização Mundial da Saúde) para peso por idade (0 a 12 meses)
// Percentis P3, P15, P50 (Mediana), P85, P97 (em kg)

export interface WhoAgeData {
  ageMonths: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
  // L, M, S parameters for exact z-score calculation
  l: number;
  m: number;
  s: number;
}

export const WHO_WEIGHT_BOYS: WhoAgeData[] = [
  { ageMonths: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4, l: 0.3487, m: 3.346, s: 0.14602 },
  { ageMonths: 0.5, p3: 3.0, p15: 3.4, p50: 3.9, p85: 4.5, p97: 5.1, l: 0.2311, m: 3.882, s: 0.13893 },
  { ageMonths: 1, p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.8, l: 0.1601, m: 4.471, s: 0.13395 },
  { ageMonths: 2, p3: 4.3, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.1, l: 0.0526, m: 5.603, s: 0.12519 },
  { ageMonths: 3, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0, l: -0.016, m: 6.447, s: 0.11746 },
  { ageMonths: 4, p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.8, p97: 8.7, l: -0.063, m: 7.049, s: 0.11197 },
  { ageMonths: 5, p3: 6.0, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.3, l: -0.098, m: 7.514, s: 0.10822 },
  { ageMonths: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.8, l: -0.124, m: 7.931, s: 0.10543 },
  { ageMonths: 7, p3: 6.7, p15: 7.4, p50: 8.3, p85: 9.2, p97: 10.3, l: -0.145, m: 8.286, s: 0.10334 },
  { ageMonths: 8, p3: 6.9, p15: 7.7, p50: 8.6, p85: 9.6, p97: 10.7, l: -0.161, m: 8.601, s: 0.10183 },
  { ageMonths: 9, p3: 7.1, p15: 8.0, p50: 8.9, p85: 9.9, p97: 11.0, l: -0.174, m: 8.892, s: 0.10078 },
  { ageMonths: 10, p3: 7.4, p15: 8.2, p50: 9.2, p85: 10.2, p97: 11.4, l: -0.185, m: 9.167, s: 0.1001 },
  { ageMonths: 11, p3: 7.6, p15: 8.4, p50: 9.4, p85: 10.5, p97: 11.7, l: -0.194, m: 9.429, s: 0.09971 },
  { ageMonths: 12, p3: 7.7, p15: 8.6, p50: 9.6, p85: 10.8, p97: 12.0, l: -0.201, m: 9.676, s: 0.09955 },
];

export const WHO_BOYS_WEIGHT = WHO_WEIGHT_BOYS.map((b) => ({
  ageMonths: b.ageMonths,
  label: b.ageMonths === 0 ? 'Nascimento' : b.ageMonths === 0.5 ? '15 dias' : `${b.ageMonths} ${b.ageMonths === 1 ? 'mês' : 'meses'}`,
  p3: b.p3 * 1000,
  p15: b.p15 * 1000,
  p50: b.p50 * 1000,
  p85: b.p85 * 1000,
  p97: b.p97 * 1000,
}));

export const WHO_WEIGHT_GIRLS: WhoAgeData[] = [
  { ageMonths: 0, p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2, l: 0.3809, m: 3.232, s: 0.14171 },
  { ageMonths: 0.5, p3: 2.8, p15: 3.2, p50: 3.7, p85: 4.3, p97: 4.9, l: 0.2524, m: 3.697, s: 0.13472 },
  { ageMonths: 1, p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.5, l: 0.1706, m: 4.187, s: 0.12984 },
  { ageMonths: 2, p3: 3.9, p15: 4.5, p50: 5.1, p85: 5.8, p97: 6.6, l: 0.0463, m: 5.128, s: 0.12189 },
  { ageMonths: 3, p3: 4.5, p15: 5.2, p50: 5.8, p85: 6.6, p97: 7.5, l: -0.033, m: 5.844, s: 0.11586 },
  { ageMonths: 4, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.3, p97: 8.2, l: -0.088, m: 6.424, s: 0.11158 },
  { ageMonths: 5, p3: 5.4, p15: 6.1, p50: 6.9, p85: 7.8, p97: 8.8, l: -0.129, m: 6.898, s: 0.10853 },
  { ageMonths: 6, p3: 5.7, p15: 6.5, p50: 7.3, p85: 8.2, p97: 9.3, l: -0.159, m: 7.297, s: 0.10636 },
  { ageMonths: 7, p3: 6.0, p15: 6.8, p50: 7.6, p85: 8.6, p97: 9.8, l: -0.183, m: 7.643, s: 0.10484 },
  { ageMonths: 8, p3: 6.3, p15: 7.0, p50: 7.9, p85: 9.0, p97: 10.2, l: -0.201, m: 7.954, s: 0.10378 },
  { ageMonths: 9, p3: 6.5, p15: 7.3, p50: 8.2, p85: 9.3, p97: 10.5, l: -0.217, m: 8.239, s: 0.10306 },
  { ageMonths: 10, p3: 6.7, p15: 7.5, p50: 8.5, p85: 9.6, p97: 10.9, l: -0.229, m: 8.508, s: 0.10261 },
  { ageMonths: 11, p3: 6.9, p15: 7.7, p50: 8.7, p85: 9.9, p97: 11.2, l: -0.239, m: 8.765, s: 0.10237 },
  { ageMonths: 12, p3: 7.0, p15: 7.9, p50: 8.9, p85: 10.1, p97: 11.5, l: -0.248, m: 9.014, s: 0.10231 },
];

export const WHO_GIRLS_WEIGHT = WHO_WEIGHT_GIRLS.map((g) => ({
  ageMonths: g.ageMonths,
  label: g.ageMonths === 0 ? 'Nascimento' : g.ageMonths === 0.5 ? '15 dias' : `${g.ageMonths} ${g.ageMonths === 1 ? 'mês' : 'meses'}`,
  p3: g.p3 * 1000,
  p15: g.p15 * 1000,
  p50: g.p50 * 1000,
  p85: g.p85 * 1000,
  p97: g.p97 * 1000,
}));

/**
 * Calcula o Z-score de peso usando o método LMS da OMS
 */
export function calculateWeightZScore(
  weightKg: number,
  ageMonths: number,
  gender: 'masculino' | 'feminino' | 'outro' = 'masculino'
): number {
  const table = gender === 'feminino' ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS;
  
  // Find nearest or interpolate
  const exact = table.find((t) => Math.abs(t.ageMonths - ageMonths) < 0.1);
  const ref = exact || table[Math.min(Math.max(0, Math.round(ageMonths)), table.length - 1)];

  const { l, m, s } = ref;
  if (l !== 0) {
    return (Math.pow(weightKg / m, l) - 1) / (l * s);
  } else {
    return Math.log(weightKg / m) / s;
  }
}

/**
 * Converte Z-score em Percentil aproximado
 */
export function zScoreToPercentile(z: number): number {
  // Approximation of standard normal cumulative distribution
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c2 = 0.3989423;

  if (z >= 0) {
    const t = 1.0 / (1.0 + p * z);
    const val = 1.0 - c2 * Math.exp((-z * z) / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
    return Math.round(val * 100);
  } else {
    const t = 1.0 / (1.0 - p * z);
    const val = c2 * Math.exp((-z * z) / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
    return Math.round(val * 100);
  }
}

export function getPercentileLabel(percentile: number): string {
  if (percentile < 3) return '< P3 (Abaixo do esperado)';
  if (percentile <= 15) return 'P3 - P15 (Faixa inferior)';
  if (percentile <= 85) return 'P15 - P85 (Faixa padrão e adequada)';
  if (percentile <= 97) return 'P85 - P97 (Faixa superior)';
  return '> P97 (Acima do esperado)';
}
