/**
 * Utilitários de formatação de datas, tempo, volumes e idades
 */

export type AgeDisplayFormat = 'days' | 'weeks_days' | 'months_days';

export interface BabyAgeResult {
  days: number;
  totalDays: number;
  weeks: number;
  remDaysInWeek: number;
  months: number;
  remDaysInMonth: number;
  displayString: string;
  daysOnlyString: string;
  weeksDaysString: string;
  monthsDaysString: string;
}

/**
 * Converte com segurança entradas de peso (kg com vírgula/ponto ou gramas) para gramas inteiras.
 * Ex: "3,850" -> 3850 | "3.85" -> 3850 | 3850 -> 3850 | 4.2 -> 4200
 */
export function parseWeightToGrams(input: string | number): number {
  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0) return 0;
    // Se o valor for menor que 30, o usuário digitou em kg (ex: 3.85 kg)
    return input <= 30 ? Math.round(input * 1000) : Math.round(input);
  }
  const clean = String(input).trim().replace(',', '.');
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return 0;
  return num <= 30 ? Math.round(num * 1000) : Math.round(num);
}

/**
 * Converte com segurança entradas de comprimento/estatura (cm com vírgula ou ponto) para número.
 * Ex: "51,5" -> 51.5 | "52" -> 52
 */
export function parseLengthToCm(input: string | number | undefined): number | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0) return undefined;
    return input;
  }
  const clean = String(input).trim().replace(',', '.');
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return undefined;
  return Math.round(num * 10) / 10;
}

export function calculateBabyAge(birthDateStr: string, referenceDate: Date = new Date()): BabyAgeResult {
  if (!birthDateStr) {
    return {
      days: 0,
      totalDays: 0,
      weeks: 0,
      remDaysInWeek: 0,
      months: 0,
      remDaysInMonth: 0,
      displayString: 'Idade não informada',
      daysOnlyString: '0 dias',
      weeksDaysString: '0 semanas',
      monthsDaysString: '0 meses',
    };
  }

  // Parse sem deslocamento de timezone (garante YYYY-MM-DD exato no fuso local)
  let birth: Date;
  if (birthDateStr.includes('T')) {
    birth = new Date(birthDateStr);
  } else {
    const parts = birthDateStr.split('-');
    if (parts.length === 3) {
      birth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0);
    } else {
      birth = new Date(birthDateStr);
    }
  }

  const now = referenceDate;
  
  // Total de dias corridos absolutos
  const diffMs = now.getTime() - birth.getTime();
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  // 1. Apenas em dias
  const daysOnlyString = totalDays === 0
    ? 'Recém-nascido (hoje)'
    : `${totalDays} ${totalDays === 1 ? 'dia' : 'dias'} de vida`;

  // 2. Semanas e dias
  const weeks = Math.floor(totalDays / 7);
  const remDaysInWeek = totalDays % 7;
  let weeksDaysString = '';
  if (weeks === 0) {
    weeksDaysString = `${remDaysInWeek} ${remDaysInWeek === 1 ? 'dia' : 'dias'}`;
  } else if (remDaysInWeek === 0) {
    weeksDaysString = `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  } else {
    weeksDaysString = `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} e ${remDaysInWeek} ${remDaysInWeek === 1 ? 'dia' : 'dias'}`;
  }

  // 3. Meses e dias (cálculo astronômico pelo calendário real)
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  let tempDate = new Date(birth.getFullYear(), birth.getMonth() + months, birth.getDate());
  
  if (tempDate > now) {
    months--;
    tempDate = new Date(birth.getFullYear(), birth.getMonth() + months, birth.getDate());
  }

  const remDaysInMonth = Math.max(0, Math.floor((now.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  let monthsDaysString = '';
  if (months === 0) {
    monthsDaysString = totalDays === 0 ? '0 dias (hoje)' : `${totalDays} ${totalDays === 1 ? 'dia' : 'dias'}`;
  } else if (remDaysInMonth === 0) {
    monthsDaysString = `${months} ${months === 1 ? 'mês' : 'meses'}`;
  } else {
    monthsDaysString = `${months} ${months === 1 ? 'mês' : 'meses'} e ${remDaysInMonth} ${remDaysInMonth === 1 ? 'dia' : 'dias'}`;
  }

  // DisplayString contextual padrão (se menor de 28 dias: dias; até 60 dias: semanas; acima: meses)
  let displayString = '';
  if (totalDays === 0) {
    displayString = 'Recém-nascido (hoje)';
  } else if (totalDays < 28) {
    displayString = daysOnlyString;
  } else if (totalDays < 60) {
    displayString = weeksDaysString;
  } else {
    displayString = monthsDaysString;
  }

  return {
    days: remDaysInMonth,
    totalDays,
    weeks,
    remDaysInWeek,
    months,
    remDaysInMonth,
    displayString,
    daysOnlyString,
    weeksDaysString,
    monthsDaysString,
  };
}

export function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return 'Agora mesmo';
  if (diffMinutes < 60) return `Há ${diffMinutes} min`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    const remMin = diffMinutes % 60;
    return remMin > 0 ? `Há ${diffHours}h ${remMin}m` : `Há ${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
}

export function getTimeAgoString(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return 'menos de 1 minuto';
  if (diffMinutes < 60) return `${diffMinutes} min`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  const remMin = diffMinutes % 60;
  if (diffHours < 24) {
    return remMin > 0 ? `${diffHours}h ${remMin}m` : `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
}

export interface DetailedExpiryCountdown {
  isExpired: boolean;
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedCountdown: string; // e.g. "14d 21h 34m 12s" or "11h 45m 20s" or "42m 15s" or "Vencido"
  compactTicker: string; // e.g. "14d 21:34:12" or "11:45:20" or "00:42:15"
  urgency: 'seguro' | 'atencao' | 'critico' | 'vencido';
  statusText: string;
  statusBadgeColor: string;
  statusBadgeBg: string;
  statusBorderColor: string;
  progressPercent: number; // 0 to 100% remaining
}

export function getDetailedExpiryCountdown(
  expiryIso: string,
  extractedAtIso?: string,
  nowTimestamp: number = Date.now()
): DetailedExpiryCountdown {
  const expiryTime = new Date(expiryIso).getTime();
  const diffMs = expiryTime - nowTimestamp;

  if (diffMs <= 0) {
    return {
      isExpired: true,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedCountdown: 'Vencido',
      compactTicker: '00:00:00',
      urgency: 'vencido',
      statusText: 'Vencido',
      statusBadgeColor: 'text-rose-600 dark:text-rose-400',
      statusBadgeBg: 'bg-rose-500/15',
      statusBorderColor: 'border-rose-500/40',
      progressPercent: 0,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  let formattedCountdown = '';
  let compactTicker = '';

  if (days > 0) {
    formattedCountdown = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    compactTicker = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else if (hours > 0) {
    formattedCountdown = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    compactTicker = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    formattedCountdown = `${pad(minutes)}m ${pad(seconds)}s`;
    compactTicker = `00:${pad(minutes)}:${pad(seconds)}`;
  }

  // Calculate percentage remaining from extractedAt to expiry
  let progressPercent = 100;
  if (extractedAtIso) {
    const extractedTime = new Date(extractedAtIso).getTime();
    const totalDuration = expiryTime - extractedTime;
    if (totalDuration > 0) {
      progressPercent = Math.max(0, Math.min(100, Math.round((diffMs / totalDuration) * 100)));
    }
  }

  let urgency: 'seguro' | 'atencao' | 'critico' | 'vencido' = 'seguro';
  let statusText = 'Válido';
  let statusBadgeColor = 'text-emerald-600 dark:text-emerald-400';
  let statusBadgeBg = 'bg-emerald-500/15';
  let statusBorderColor = 'border-emerald-500/30';

  if (totalSeconds < 7200) {
    // Less than 2 hours remaining
    urgency = 'critico';
    statusText = 'Crítico (< 2h)';
    statusBadgeColor = 'text-rose-600 dark:text-rose-400';
    statusBadgeBg = 'bg-rose-500/15';
    statusBorderColor = 'border-rose-500/40';
  } else if (totalSeconds < 21600 || (days === 0 && hours < 6) || (days <= 2 && days > 0)) {
    // Less than 6 hours for fridge or <= 2 days for freezer
    urgency = 'atencao';
    statusText = days > 0 ? `Vence em ${days}d` : `Vence em ${hours}h`;
    statusBadgeColor = 'text-amber-600 dark:text-amber-400';
    statusBadgeBg = 'bg-amber-500/15';
    statusBorderColor = 'border-amber-500/40';
  }

  return {
    isExpired: false,
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    formattedCountdown,
    compactTicker,
    urgency,
    statusText,
    statusBadgeColor,
    statusBadgeBg,
    statusBorderColor,
    progressPercent,
  };
}

export function formatTimeRemaining(expiryIso: string): {
  isExpired: boolean;
  hours: number;
  minutes: number;
  text: string;
  urgency: 'normal' | 'atencao' | 'urgente' | 'vencido';
} {
  const expiry = new Date(expiryIso);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      isExpired: true,
      hours: 0,
      minutes: 0,
      text: 'Vencido',
      urgency: 'vencido',
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let text = '';
  let urgency: 'normal' | 'atencao' | 'urgente' | 'vencido' = 'normal';

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    text = `Vence em ${days}d ${remHours}h`;
    urgency = days <= 2 ? 'atencao' : 'normal';
  } else if (hours > 0) {
    text = `Vence em ${hours}h ${minutes}m`;
    urgency = hours <= 2 ? 'urgente' : hours <= 6 ? 'atencao' : 'normal';
  } else {
    text = `Vence em ${minutes} min`;
    urgency = 'urgente';
  }

  return {
    isExpired: false,
    hours,
    minutes,
    text,
    urgency,
  };
}

export function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatGramsToKg(grams: number): string {
  return `${(grams / 1000).toFixed(3).replace('.', ',')} kg`;
}

export interface BatchIdentificationInfo {
  potNumber: string | null;
  potNumberFormatted: string | null;
  potName: string;
  rawPotName: string | null;
  tag: string | null;
  colorHex: string;
  primaryDisplayName: string;
  detailedOptionLabel: string;
  summaryDescription: string;
}

export function formatBatchIdentification(batch?: {
  id?: string;
  containerNumber?: string;
  containerName?: string;
  containerTag?: string;
  containerColor?: string;
  currentVolumeMl?: number;
  location?: string;
  expiresAt?: string;
}): BatchIdentificationInfo {
  if (!batch) {
    return {
      potNumber: null,
      potNumberFormatted: null,
      potName: 'Frasco',
      rawPotName: null,
      tag: null,
      colorHex: '#3b82f6',
      primaryDisplayName: 'Frasco',
      detailedOptionLabel: 'Frasco',
      summaryDescription: 'Frasco',
    };
  }

  const potNumber = batch.containerNumber ? String(batch.containerNumber).trim() : null;
  const rawName = batch.containerName ? String(batch.containerName).trim() : '';
  const tag = batch.containerTag ? String(batch.containerTag).trim() : null;
  const colorHex = batch.containerColor || '#3b82f6';
  const batchCode = batch.id ? `#${batch.id}` : '';
  const potNumberFormatted = potNumber ? `Frasco #${potNumber}` : null;

  // Determine user's customized pot name/number
  let displayTitle = '';
  if (potNumber && rawName) {
    if (
      rawName.toLowerCase() === potNumber.toLowerCase() ||
      rawName.toLowerCase() === `pote ${potNumber}`.toLowerCase() ||
      rawName.toLowerCase() === `pote #${potNumber}`.toLowerCase() ||
      rawName.toLowerCase() === `potinho #${potNumber}`.toLowerCase() ||
      rawName.toLowerCase() === `frasco #${potNumber}`.toLowerCase()
    ) {
      displayTitle = `Frasco #${potNumber} • Pote ${potNumber}`;
    } else {
      displayTitle = `Frasco #${potNumber} • ${rawName}`;
    }
  } else if (potNumber) {
    displayTitle = `Frasco #${potNumber}`;
  } else if (rawName) {
    displayTitle =
      rawName.toLowerCase().startsWith('pote') ||
      rawName.toLowerCase().startsWith('frasco') ||
      rawName.toLowerCase().startsWith('mamadeira')
        ? rawName
        : `Pote "${rawName}"`;
  } else {
    displayTitle = batch.id ? `Frasco ${batchCode}` : 'Frasco';
  }

  // Tag badge text
  const tagBadge = tag ? `🏷️ [${tag}]` : '';

  // Volume and location text
  const volText = batch.currentVolumeMl !== undefined ? `${batch.currentVolumeMl}ml disponíveis` : '';
  const locText = batch.location ? `(${batch.location.toUpperCase()})` : '';

  let expiryText = '';
  if (batch.expiresAt) {
    const timeRemaining = formatTimeRemaining(batch.expiresAt);
    expiryText = timeRemaining.isExpired ? '⚠️ VENCIDO' : `⏳ ${timeRemaining.text}`;
  }

  const parts = [
    displayTitle,
    tagBadge,
    volText,
    locText,
    expiryText,
    batchCode ? `(${batchCode})` : '',
  ].filter(Boolean);

  const detailedOptionLabel = parts.join(' • ');
  const summaryDescription = `${displayTitle}${tag ? ` [${tag}]` : ''}`;

  return {
    potNumber,
    potNumberFormatted,
    potName: displayTitle,
    rawPotName: rawName || null,
    tag,
    colorHex,
    primaryDisplayName: `${displayTitle}${tag ? ` • ${tag}` : ''}`,
    detailedOptionLabel,
    summaryDescription,
  };
}

