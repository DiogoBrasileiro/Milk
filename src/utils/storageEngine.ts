import { MilkBatch, MilkTransaction, ConservationProtocolId, StorageLocationType } from '../types';
import { CONSERVATION_PROTOCOLS } from '../constants/medicalProtocols';

/**
 * Calcula a data e hora de validade com base na data de extração, localização e protocolo ativo
 */
export function calculateBatchExpiry(
  extractedAtIso: string,
  location: StorageLocationType,
  protocolId: ConservationProtocolId = 'brasil_ms',
  thawedAtIso?: string
): string {
  const protocol = CONSERVATION_PROTOCOLS[protocolId] || CONSERVATION_PROTOCOLS.brasil_ms;
  const baseDate = new Date(extractedAtIso);

  if (location === 'ambiente') {
    const expiry = new Date(baseDate.getTime() + protocol.roomTempHours * 60 * 60 * 1000);
    return expiry.toISOString();
  }

  if (location === 'geladeira') {
    // Se foi descongelado anteriormente, a regra de descongelado se aplica
    if (thawedAtIso) {
      const thawDate = new Date(thawedAtIso);
      const expiry = new Date(thawDate.getTime() + protocol.thawedFridgeHours * 60 * 60 * 1000);
      return expiry.toISOString();
    }
    const expiry = new Date(baseDate.getTime() + protocol.fridgeHours * 60 * 60 * 1000);
    return expiry.toISOString();
  }

  if (location === 'freezer') {
    const expiry = new Date(baseDate.getTime() + protocol.freezerDays * 24 * 60 * 60 * 1000);
    return expiry.toISOString();
  }

  if (location === 'descongelando' || location === 'descongelado') {
    const thawDate = thawedAtIso ? new Date(thawedAtIso) : new Date();
    const expiry = new Date(thawDate.getTime() + protocol.thawedFridgeHours * 60 * 60 * 1000);
    return expiry.toISOString();
  }

  // Padrão bolsa térmica / uso rápido: 2 horas
  const expiry = new Date(baseDate.getTime() + 2 * 60 * 60 * 1000);
  return expiry.toISOString();
}

/**
 * Ordena os lotes utilizando a lógica FEFO (First Expire, First Out)
 */
export function sortBatchesFEFO(batches: MilkBatch[]): MilkBatch[] {
  const available = batches.filter(
    (b) => b.currentVolumeMl > 0 && b.status !== 'consumido' && b.status !== 'descartado'
  );

  return available.sort((a, b) => {
    // 1. Ordem por data de validade (mais próxima primeiro)
    const expA = new Date(a.expiresAt).getTime();
    const expB = new Date(b.expiresAt).getTime();
    if (expA !== expB) return expA - expB;

    // 2. Desempate: data da coleta mais antiga
    return new Date(a.extractedAt).getTime() - new Date(b.extractedAt).getTime();
  });
}

/**
 * Resumo do estoque inteligente
 */
export function calculateInventorySummary(batches: MilkBatch[]) {
  let totalMl = 0;
  let fridgeMl = 0;
  let freezerMl = 0;
  let thawingMl = 0;
  let readyToUseMl = 0;

  const now = new Date().getTime();
  const validBatches = batches.filter(
    (b) => b.currentVolumeMl > 0 && b.status !== 'consumido' && b.status !== 'descartado'
  );

  for (const b of validBatches) {
    totalMl += b.currentVolumeMl;
    if (b.location === 'geladeira') {
      fridgeMl += b.currentVolumeMl;
      if (b.status === 'descongelado' || b.status === 'separado_mamada') {
        readyToUseMl += b.currentVolumeMl;
      }
    } else if (b.location === 'freezer') {
      freezerMl += b.currentVolumeMl;
    } else if (b.location === 'descongelando') {
      thawingMl += b.currentVolumeMl;
    } else if (b.location === 'ambiente' || b.location === 'bolsa_termica') {
      readyToUseMl += b.currentVolumeMl;
    }
  }

  // Ordenação FEFO para o lote recomendado para uso imediato
  const fefoList = sortBatchesFEFO(validBatches);
  const recommendedBatch = fefoList.find((b) => b.location !== 'freezer') || fefoList[0] || null;

  // Lotes próximos do vencimento (menos de 6 horas para geladeira ou menos de 24h)
  const expiringSoon = validBatches.filter((b) => {
    const diffHours = (new Date(b.expiresAt).getTime() - now) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 6;
  });

  return {
    totalMl,
    fridgeMl,
    freezerMl,
    thawingMl,
    readyToUseMl,
    count: validBatches.length,
    recommendedBatch,
    expiringSoon,
    expiring24hCount: expiringSoon.length,
    fefoList,
  };
}

/**
 * Cria transação no ledger
 */
export function createLedgerTransaction(
  batch: MilkBatch,
  type: MilkTransaction['type'],
  volumeChangeMl: number,
  caregiverId: string,
  caregiverName: string,
  options?: {
    fromLocation?: StorageLocationType;
    toLocation?: StorageLocationType;
    reason?: string;
    feedingId?: string;
  }
): MilkTransaction {
  const previousVolume = batch.currentVolumeMl;
  const newVolume = Math.max(0, previousVolume + volumeChangeMl);

  return {
    id: `TX-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    batchId: batch.id,
    type,
    volumeChangeMl,
    previousVolumeMl: previousVolume,
    newVolumeMl: newVolume,
    fromLocation: options?.fromLocation || batch.location,
    toLocation: options?.toLocation || batch.location,
    caregiverId,
    caregiverName,
    reason: options?.reason,
    feedingId: options?.feedingId,
  };
}
