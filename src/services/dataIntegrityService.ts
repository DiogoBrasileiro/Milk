import {
  MilkBatch,
  FeedingRecord,
  PumpingRecord,
  DiaperRecord,
  DiscomfortRecord,
  WeightRecord,
  SleepRecord,
  Caregiver,
  FeedingPlanPhase,
} from '../types';

export type IntegritySeverity = 'critical' | 'warning' | 'info';

export interface DataIntegrityIssue {
  id: string;
  entityType: 'batch' | 'feeding' | 'pumping' | 'diaper' | 'discomfort' | 'weight' | 'sleep' | 'caregiver' | 'sync';
  entityId: string;
  severity: IntegritySeverity;
  title: string;
  description: string;
  suggestedAction: string;
  autoFixAvailable: boolean;
  fixType?: 'clamp_volume' | 'fix_date' | 'recalculate_sum' | 'fix_sleep_order' | 'deduplicate' | 'fix_status' | 'fill_name';
  rawRecord?: any;
}

export interface DataIntegrityReport {
  checkedAt: string;
  totalEntitiesScanned: number;
  counts: {
    batches: number;
    feedings: number;
    pumpings: number;
    diapers: number;
    discomforts: number;
    weights: number;
    sleep: number;
    caregivers: number;
  };
  issues: DataIntegrityIssue[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  healthScore: number; // 0 to 100
  healthStatus: 'healthy' | 'warning' | 'conflict_detected';
  summaryMessage: string;
}

function isValidDate(d: any): boolean {
  if (!d) return false;
  const time = new Date(d).getTime();
  return !isNaN(time) && time > 0;
}

function isFutureDate(d: string, maxFutureHours = 24): boolean {
  if (!isValidDate(d)) return false;
  const time = new Date(d).getTime();
  const maxAllowed = Date.now() + maxFutureHours * 3600 * 1000;
  return time > maxAllowed;
}

/**
 * Realiza uma auditoria completa e rigorosa em todos os registros locais e sincronizados
 */
export function checkDataIntegrity(payload: {
  batches: MilkBatch[];
  feedings: FeedingRecord[];
  pumpings: PumpingRecord[];
  diapers: DiaperRecord[];
  discomforts: DiscomfortRecord[];
  weights: WeightRecord[];
  sleepLogs: SleepRecord[];
  caregivers: Caregiver[];
  feedingPhases?: FeedingPlanPhase[];
  lastCloudSyncTime?: string | null;
}): DataIntegrityReport {
  const issues: DataIntegrityIssue[] = [];
  const now = Date.now();

  const {
    batches = [],
    feedings = [],
    pumpings = [],
    diapers = [],
    discomforts = [],
    weights = [],
    sleepLogs = [],
    caregivers = [],
  } = payload;

  // 1. CHECAGEM DE LOTES DE LEITE (ESTOQUE)
  const batchIdSet = new Set<string>();
  batches.forEach((b, index) => {
    if (!b || !b.id) {
      issues.push({
        id: `batch_missing_id_${index}`,
        entityType: 'batch',
        entityId: `index_${index}`,
        severity: 'critical',
        title: 'Lote sem identificador único',
        description: `O item #${index + 1} no estoque não possui identificador de lote válido.`,
        suggestedAction: 'Regerar identificador do lote.',
        autoFixAvailable: true,
        fixType: 'deduplicate',
        rawRecord: b,
      });
      return;
    }

    if (batchIdSet.has(b.id)) {
      issues.push({
        id: `batch_duplicate_${b.id}`,
        entityType: 'batch',
        entityId: b.id,
        severity: 'critical',
        title: `Lote duplicado (${b.id})`,
        description: `Existem dois ou mais frascos com o identificador "${b.id}" no estoque.`,
        suggestedAction: 'Deduplicar registros mantendo a versão mais recente.',
        autoFixAvailable: true,
        fixType: 'deduplicate',
        rawRecord: b,
      });
    }
    batchIdSet.add(b.id);

    // Checagem de datas
    if (!isValidDate(b.extractedAt)) {
      issues.push({
        id: `batch_invalid_date_${b.id}`,
        entityType: 'batch',
        entityId: b.id,
        severity: 'critical',
        title: 'Data de ordenha corrompida',
        description: `O lote "${b.id}" possui data de ordenha ilegível ou corrompida ("${b.extractedAt}").`,
        suggestedAction: 'Ajustar para a data de criação ou momento atual.',
        autoFixAvailable: true,
        fixType: 'fix_date',
        rawRecord: b,
      });
    } else if (isFutureDate(b.extractedAt, 12)) {
      issues.push({
        id: `batch_future_date_${b.id}`,
        entityType: 'batch',
        entityId: b.id,
        severity: 'warning',
        title: 'Data de ordenha no futuro',
        description: `O lote "${b.id}" está registrado com data de ordenha à frente do relógio atual.`,
        suggestedAction: 'Verificar relógio do dispositivo e ajustar data.',
        autoFixAvailable: true,
        fixType: 'fix_date',
        rawRecord: b,
      });
    }

    // Checagem de volumes
    if (b.currentVolumeMl < 0 || b.originalVolumeMl < 0) {
      issues.push({
        id: `batch_negative_vol_${b.id}`,
        entityType: 'batch',
        entityId: b.id,
        severity: 'critical',
        title: 'Volume negativo no lote',
        description: `O lote "${b.id}" possui volume negativo (${b.currentVolumeMl}ml / ${b.originalVolumeMl}ml).`,
        suggestedAction: 'Normalizar volume para zero.',
        autoFixAvailable: true,
        fixType: 'clamp_volume',
        rawRecord: b,
      });
    } else if (b.currentVolumeMl > b.originalVolumeMl) {
      issues.push({
        id: `batch_volume_overflow_${b.id}`,
        entityType: 'batch',
        entityId: b.id,
        severity: 'warning',
        title: 'Volume atual maior que volume original',
        description: `O lote "${b.id}" possui volume atual (${b.currentVolumeMl}ml) maior que o volume original ordenhado (${b.originalVolumeMl}ml).`,
        suggestedAction: 'Igualar volume original ao volume atual.',
        autoFixAvailable: true,
        fixType: 'clamp_volume',
        rawRecord: b,
      });
    }

    // Checagem de status inconsistente com volume
    if (b.currentVolumeMl === 0 && (b.status === 'geladeira' || b.status === 'freezer' || b.status === 'recem_ordenhado')) {
      issues.push({
        id: `batch_status_mismatch_${b.id}`,
        entityType: 'batch',
        entityId: b.id,
        severity: 'info',
        title: 'Frasco vazio com status ativo',
        description: `O lote "${b.id}" está com volume 0ml mas ainda listado como "${b.status}".`,
        suggestedAction: 'Atualizar status do frasco para "consumido".',
        autoFixAvailable: true,
        fixType: 'fix_status',
        rawRecord: b,
      });
    }
  });

  // 2. CHECAGEM DE MAMADAS (FEEDINGS)
  const feedingIdSet = new Set<string>();
  feedings.forEach((f, index) => {
    if (!f || !f.id) {
      issues.push({
        id: `feeding_missing_id_${index}`,
        entityType: 'feeding',
        entityId: `index_${index}`,
        severity: 'critical',
        title: 'Mamada sem identificador',
        description: `Registro #${index + 1} de mamada não possui ID válido.`,
        suggestedAction: 'Regerar identificador da mamada.',
        autoFixAvailable: true,
        fixType: 'deduplicate',
        rawRecord: f,
      });
      return;
    }

    if (feedingIdSet.has(f.id)) {
      issues.push({
        id: `feeding_duplicate_${f.id}`,
        entityType: 'feeding',
        entityId: f.id,
        severity: 'warning',
        title: `Mamada duplicada (${f.id})`,
        description: `Existem dois registros com o mesmo ID de mamada.`,
        suggestedAction: 'Deduplicar mantendo o mais recente.',
        autoFixAvailable: true,
        fixType: 'deduplicate',
        rawRecord: f,
      });
    }
    feedingIdSet.add(f.id);

    if (!isValidDate(f.timestamp)) {
      issues.push({
        id: `feeding_invalid_date_${f.id}`,
        entityType: 'feeding',
        entityId: f.id,
        severity: 'critical',
        title: 'Data de mamada corrompida',
        description: `A mamada "${f.id}" possui data de início corrompida.`,
        suggestedAction: 'Corrigir para o momento atual.',
        autoFixAvailable: true,
        fixType: 'fix_date',
        rawRecord: f,
      });
    } else if (isFutureDate(f.timestamp, 12)) {
      issues.push({
        id: `feeding_future_date_${f.id}`,
        entityType: 'feeding',
        entityId: f.id,
        severity: 'warning',
        title: 'Mamada agendada no futuro',
        description: `A mamada "${f.id}" tem horário registrado adiante do relógio atual.`,
        suggestedAction: 'Ajustar horário da mamada.',
        autoFixAvailable: true,
        fixType: 'fix_date',
        rawRecord: f,
      });
    }

    if ((f.consumedMl !== undefined && f.consumedMl < 0) || (f.offeredMl !== undefined && f.offeredMl < 0)) {
      issues.push({
        id: `feeding_neg_vol_${f.id}`,
        entityType: 'feeding',
        entityId: f.id,
        severity: 'critical',
        title: 'Volume negativo na mamada',
        description: `Mamada "${f.id}" possui quantidade consumida ou oferecida negativa.`,
        suggestedAction: 'Normalizar volume para zero.',
        autoFixAvailable: true,
        fixType: 'clamp_volume',
        rawRecord: f,
      });
    } else if (f.consumedMl && f.consumedMl > 500) {
      issues.push({
        id: `feeding_high_vol_${f.id}`,
        entityType: 'feeding',
        entityId: f.id,
        severity: 'warning',
        title: 'Volume de mamada atipicamente alto',
        description: `Mamada de ${f.consumedMl}ml excede a capacidade estomacal típica de lactentes.`,
        suggestedAction: 'Confirmar se o volume digitado está correto.',
        autoFixAvailable: false,
        rawRecord: f,
      });
    }
  });

  // 3. CHECAGEM DE ORDENHAS (PUMPINGS)
  const pumpingIdSet = new Set<string>();
  pumpings.forEach((p, index) => {
    if (!p || !p.id) return;
    if (pumpingIdSet.has(p.id)) {
      issues.push({
        id: `pumping_duplicate_${p.id}`,
        entityType: 'pumping',
        entityId: p.id,
        severity: 'warning',
        title: `Ordenha duplicada (${p.id})`,
        description: `Existe mais de um registro de ordenha com este identificador.`,
        suggestedAction: 'Deduplicar mantendo o mais recente.',
        autoFixAvailable: true,
        fixType: 'deduplicate',
        rawRecord: p,
      });
    }
    pumpingIdSet.add(p.id);

    if (!isValidDate(p.timestamp)) {
      issues.push({
        id: `pumping_invalid_date_${p.id}`,
        entityType: 'pumping',
        entityId: p.id,
        severity: 'critical',
        title: 'Data de ordenha corrompida',
        description: `Sessão de ordenha com carimbo de tempo ilegível.`,
        suggestedAction: 'Corrigir timestamp.',
        autoFixAvailable: true,
        fixType: 'fix_date',
        rawRecord: p,
      });
    }

    if (p.leftVolumeMl < 0 || p.rightVolumeMl < 0 || p.totalVolumeMl < 0) {
      issues.push({
        id: `pumping_neg_vol_${p.id}`,
        entityType: 'pumping',
        entityId: p.id,
        severity: 'critical',
        title: 'Volume de ordenha negativo',
        description: `Registro com volumes negativos na mama esquerda ou direita.`,
        suggestedAction: 'Normalizar volumes para zero.',
        autoFixAvailable: true,
        fixType: 'clamp_volume',
        rawRecord: p,
      });
    } else {
      const sum = (p.leftVolumeMl || 0) + (p.rightVolumeMl || 0);
      if (sum > 0 && Math.abs(sum - (p.totalVolumeMl || 0)) > 1) {
        issues.push({
          id: `pumping_sum_mismatch_${p.id}`,
          entityType: 'pumping',
          entityId: p.id,
          severity: 'info',
          title: 'Divergência na soma dos seios',
          description: `E (${p.leftVolumeMl}ml) + D (${p.rightVolumeMl}ml) = ${sum}ml, mas o total está registrado como ${p.totalVolumeMl}ml.`,
          suggestedAction: 'Recalcular volume total da ordenha pela soma dos seios.',
          autoFixAvailable: true,
          fixType: 'recalculate_sum',
          rawRecord: p,
        });
      }
    }
  });

  // 4. CHECAGEM DE PESAGENS (WEIGHTS)
  const weightIdSet = new Set<string>();
  const sortedWeights = [...weights].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  sortedWeights.forEach((w, idx) => {
    if (!w || !w.id) return;
    if (weightIdSet.has(w.id)) {
      issues.push({
        id: `weight_duplicate_${w.id}`,
        entityType: 'weight',
        entityId: w.id,
        severity: 'warning',
        title: 'Pesagem duplicada',
        description: `Registro de peso com ID repetido "${w.id}".`,
        suggestedAction: 'Deduplicar mantendo o mais recente.',
        autoFixAvailable: true,
        fixType: 'deduplicate',
        rawRecord: w,
      });
    }
    weightIdSet.add(w.id);

    if (!isValidDate(w.timestamp)) {
      issues.push({
        id: `weight_invalid_date_${w.id}`,
        entityType: 'weight',
        entityId: w.id,
        severity: 'critical',
        title: 'Data de pesagem corrompida',
        description: `Registro de peso sem data/hora válida.`,
        suggestedAction: 'Corrigir timestamp.',
        autoFixAvailable: true,
        fixType: 'fix_date',
        rawRecord: w,
      });
    }

    if (w.weightGrams <= 400 || w.weightGrams > 25000) {
      issues.push({
        id: `weight_extreme_val_${w.id}`,
        entityType: 'weight',
        entityId: w.id,
        severity: 'critical',
        title: 'Valor de peso improvável',
        description: `Peso registrado de ${w.weightGrams}g (${(w.weightGrams / 1000).toFixed(2)}kg) está fora dos padrões normais de pediatria.`,
        suggestedAction: 'Revisar valor da pesagem.',
        autoFixAvailable: false,
        rawRecord: w,
      });
    }

    // Checagem de variação súbita de peso em curto intervalo
    if (idx > 0) {
      const prevW = sortedWeights[idx - 1];
      const deltaDays = Math.abs(new Date(w.timestamp).getTime() - new Date(prevW.timestamp).getTime()) / (1000 * 3600 * 24);
      const deltaGrams = Math.abs(w.weightGrams - prevW.weightGrams);

      if (deltaDays <= 2 && deltaGrams > 2000) {
        issues.push({
          id: `weight_spike_${w.id}`,
          entityType: 'weight',
          entityId: w.id,
          severity: 'warning',
          title: 'Variação atípica de peso',
          description: `Salto de ${(deltaGrams / 1000).toFixed(2)}kg em ${deltaDays.toFixed(1)} dias em relação à pesagem anterior.`,
          suggestedAction: 'Verifique se houve erro de digitação de gramas para quilos.',
          autoFixAvailable: false,
          rawRecord: w,
        });
      }
    }
  });

  // 5. CHECAGEM DE SONECA E SONO (SLEEP LOGS)
  sleepLogs.forEach((s) => {
    if (!s || !s.id) return;
    if (isValidDate(s.startTime) && isValidDate(s.endTime)) {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      if (end < start) {
        issues.push({
          id: `sleep_inverted_time_${s.id}`,
          entityType: 'sleep',
          entityId: s.id,
          severity: 'critical',
          title: 'Horário de sono invertido',
          description: `O horário de acordar (${new Date(s.endTime).toLocaleTimeString()}) é anterior ao de adormecer (${new Date(s.startTime).toLocaleTimeString()}).`,
          suggestedAction: 'Inverter horários de início e fim da soneca.',
          autoFixAvailable: true,
          fixType: 'fix_sleep_order',
          rawRecord: s,
        });
      }
    }
  });

  // 6. CHECAGEM DE CUIDADORES (CAREGIVERS)
  const cgIdSet = new Set<string>();
  caregivers.forEach((c) => {
    if (!c) return;
    if (cgIdSet.has(c.id)) {
      issues.push({
        id: `caregiver_dup_${c.id}`,
        entityType: 'caregiver',
        entityId: c.id,
        severity: 'warning',
        title: `Cuidador com ID repetido (${c.name})`,
        description: `Mais de um cuidador configurado com o identificador "${c.id}".`,
        suggestedAction: 'Reatribuir IDs distintos aos cuidadores.',
        autoFixAvailable: true,
        fixType: 'deduplicate',
        rawRecord: c,
      });
    }
    cgIdSet.add(c.id);

    if (!c.name || !c.name.trim()) {
      issues.push({
        id: `caregiver_empty_name_${c.id}`,
        entityType: 'caregiver',
        entityId: c.id,
        severity: 'info',
        title: 'Cuidador sem nome preenchido',
        description: `Existe um cuidador sem nome cadastrado.`,
        suggestedAction: 'Atribuir nome padrão "Cuidador".',
        autoFixAvailable: true,
        fixType: 'fill_name',
        rawRecord: c,
      });
    }
  });

  // CÁLCULO DE PONTUAÇÃO DE SAÚDE
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  let healthScore = 100;
  healthScore -= criticalCount * 25;
  healthScore -= warningCount * 8;
  healthScore -= infoCount * 2;
  healthScore = Math.max(0, Math.min(100, healthScore));

  let healthStatus: 'healthy' | 'warning' | 'conflict_detected' = 'healthy';
  let summaryMessage = 'Todos os dados e registros manuais estão íntegros e consistentes.';

  if (criticalCount > 0) {
    healthStatus = 'conflict_detected';
    summaryMessage = `${criticalCount} inconsistência(s) crítica(s) identificada(s). Ação recomendada para garantir a segurança dos registros.`;
  } else if (warningCount > 0) {
    healthStatus = 'warning';
    summaryMessage = `${warningCount} aviso(s) de integridade detectado(s). Seus dados estão preservados.`;
  }

  const totalEntitiesScanned =
    batches.length +
    feedings.length +
    pumpings.length +
    diapers.length +
    discomforts.length +
    weights.length +
    sleepLogs.length +
    caregivers.length;

  return {
    checkedAt: new Date().toISOString(),
    totalEntitiesScanned,
    counts: {
      batches: batches.length,
      feedings: feedings.length,
      pumpings: pumpings.length,
      diapers: diapers.length,
      discomforts: discomforts.length,
      weights: weights.length,
      sleep: sleepLogs.length,
      caregivers: caregivers.length,
    },
    issues,
    criticalCount,
    warningCount,
    infoCount,
    healthScore,
    healthStatus,
    summaryMessage,
  };
}

/**
 * Aplica reparos seguros e não-destrutivos nos registros com backup preventivo automático
 */
export function autoRepairDataIntegrity(
  currentData: {
    batches: MilkBatch[];
    feedings: FeedingRecord[];
    pumpings: PumpingRecord[];
    diapers: DiaperRecord[];
    discomforts: DiscomfortRecord[];
    weights: WeightRecord[];
    sleepLogs: SleepRecord[];
    caregivers: Caregiver[];
    [key: string]: any;
  },
  selectedIssueIds?: string[]
): {
  repairedData: any;
  repairedCount: number;
  backupKey: string;
} {
  // 1. Criar snapshot imutável de backup preventivo no localStorage
  const backupKey = `milkflow_integrity_backup_${Date.now()}`;
  try {
    localStorage.setItem(backupKey, JSON.stringify(currentData));
  } catch (e) {
    console.warn('Erro ao salvar snapshot pré-reparo', e);
  }

  const shouldFix = (issueId: string) => {
    if (!selectedIssueIds || selectedIssueIds.length === 0) return true;
    return selectedIssueIds.includes(issueId);
  };

  let repairedCount = 0;

  // 1. Reparar Lotes
  const repairedBatches = (currentData.batches || []).map((b, idx) => {
    if (!b) return b;
    let modified = false;
    let newBatch = { ...b };

    if (!newBatch.id && shouldFix(`batch_missing_id_${idx}`)) {
      newBatch.id = `LOTE-${Math.floor(1000 + Math.random() * 9000)}`;
      modified = true;
    }

    if (!isValidDate(newBatch.extractedAt) && shouldFix(`batch_invalid_date_${newBatch.id}`)) {
      newBatch.extractedAt = newBatch.createdAt || new Date().toISOString();
      modified = true;
    }

    if (newBatch.currentVolumeMl < 0 && shouldFix(`batch_negative_vol_${newBatch.id}`)) {
      newBatch.currentVolumeMl = 0;
      modified = true;
    }

    if (newBatch.originalVolumeMl < 0 && shouldFix(`batch_negative_vol_${newBatch.id}`)) {
      newBatch.originalVolumeMl = Math.max(0, newBatch.currentVolumeMl);
      modified = true;
    }

    if (newBatch.currentVolumeMl > newBatch.originalVolumeMl && shouldFix(`batch_volume_overflow_${newBatch.id}`)) {
      newBatch.originalVolumeMl = newBatch.currentVolumeMl;
      modified = true;
    }

    if (newBatch.currentVolumeMl === 0 && (newBatch.status === 'geladeira' || newBatch.status === 'freezer') && shouldFix(`batch_status_mismatch_${newBatch.id}`)) {
      newBatch.status = 'consumido';
      modified = true;
    }

    if (modified) repairedCount++;
    return newBatch;
  });

  // Deduplicar lotes
  const uniqueBatchesMap = new Map<string, MilkBatch>();
  repairedBatches.forEach((b) => {
    if (b && b.id) uniqueBatchesMap.set(b.id, b);
  });
  const finalBatches = Array.from(uniqueBatchesMap.values());

  // 2. Reparar Mamadas
  const repairedFeedings = (currentData.feedings || []).map((f, idx) => {
    if (!f) return f;
    let modified = false;
    let newFeeding = { ...f };

    if (!newFeeding.id && shouldFix(`feeding_missing_id_${idx}`)) {
      newFeeding.id = `feed_${Date.now()}_${idx}`;
      modified = true;
    }

    if (!isValidDate(newFeeding.timestamp) && shouldFix(`feeding_invalid_date_${newFeeding.id}`)) {
      newFeeding.timestamp = new Date().toISOString();
      modified = true;
    }

    if (newFeeding.consumedMl !== undefined && newFeeding.consumedMl < 0 && shouldFix(`feeding_neg_vol_${newFeeding.id}`)) {
      newFeeding.consumedMl = 0;
      modified = true;
    }

    if (modified) repairedCount++;
    return newFeeding;
  });

  const uniqueFeedingsMap = new Map<string, FeedingRecord>();
  repairedFeedings.forEach((f) => {
    if (f && f.id) uniqueFeedingsMap.set(f.id, f);
  });
  const finalFeedings = Array.from(uniqueFeedingsMap.values());

  // 3. Reparar Ordenhas
  const repairedPumpings = (currentData.pumpings || []).map((p) => {
    if (!p) return p;
    let modified = false;
    let newPumping = { ...p };

    if (!isValidDate(newPumping.timestamp) && shouldFix(`pumping_invalid_date_${newPumping.id}`)) {
      newPumping.timestamp = new Date().toISOString();
      modified = true;
    }

    if ((newPumping.leftVolumeMl < 0 || newPumping.rightVolumeMl < 0 || newPumping.totalVolumeMl < 0) && shouldFix(`pumping_neg_vol_${newPumping.id}`)) {
      newPumping.leftVolumeMl = Math.max(0, newPumping.leftVolumeMl);
      newPumping.rightVolumeMl = Math.max(0, newPumping.rightVolumeMl);
      newPumping.totalVolumeMl = Math.max(0, newPumping.totalVolumeMl);
      modified = true;
    }

    const sum = (newPumping.leftVolumeMl || 0) + (newPumping.rightVolumeMl || 0);
    if (sum > 0 && Math.abs(sum - (newPumping.totalVolumeMl || 0)) > 1 && shouldFix(`pumping_sum_mismatch_${newPumping.id}`)) {
      newPumping.totalVolumeMl = sum;
      modified = true;
    }

    if (modified) repairedCount++;
    return newPumping;
  });

  const uniquePumpingsMap = new Map<string, PumpingRecord>();
  repairedPumpings.forEach((p) => {
    if (p && p.id) uniquePumpingsMap.set(p.id, p);
  });
  const finalPumpings = Array.from(uniquePumpingsMap.values());

  // 4. Reparar Sono
  const repairedSleepLogs = (currentData.sleepLogs || []).map((s) => {
    if (!s) return s;
    let modified = false;
    let newSleep = { ...s };

    if (isValidDate(newSleep.startTime) && isValidDate(newSleep.endTime)) {
      const start = new Date(newSleep.startTime).getTime();
      const end = new Date(newSleep.endTime).getTime();
      if (end < start && shouldFix(`sleep_inverted_time_${newSleep.id}`)) {
        const temp = newSleep.startTime;
        newSleep.startTime = newSleep.endTime;
        newSleep.endTime = temp;
        modified = true;
      }
    }

    if (modified) repairedCount++;
    return newSleep;
  });

  // 5. Reparar Cuidadores
  const repairedCaregivers = (currentData.caregivers || []).map((c, idx) => {
    if (!c) return c;
    let modified = false;
    let newCg = { ...c };

    if ((!newCg.name || !newCg.name.trim()) && shouldFix(`caregiver_empty_name_${newCg.id}`)) {
      newCg.name = idx === 0 ? 'Mãe' : idx === 1 ? 'Pai' : 'Cuidador';
      modified = true;
    }

    if (modified) repairedCount++;
    return newCg;
  });

  const uniqueCaregiversMap = new Map<string, Caregiver>();
  repairedCaregivers.forEach((c, idx) => {
    if (c) {
      const id = c.id || `cg_${Date.now()}_${idx}`;
      uniqueCaregiversMap.set(id, { ...c, id });
    }
  });
  const finalCaregivers = Array.from(uniqueCaregiversMap.values());

  const repairedData = {
    ...currentData,
    batches: finalBatches,
    feedings: finalFeedings,
    pumpings: finalPumpings,
    sleepLogs: repairedSleepLogs,
    caregivers: finalCaregivers,
    lastUpdatedAt: new Date().toISOString(),
  };

  return {
    repairedData,
    repairedCount,
    backupKey,
  };
}
