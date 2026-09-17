export type UserRole = 'OWNER' | 'CAREGIVER' | 'VIEWER';

export interface AuthUser {
  id: string; // userId e.g. "usr_10283"
  email: string;
  name: string;
  avatarColor: string;
  role: UserRole;
  currentFamilyId: string;
  createdAt: string;
  emailVerified: boolean;
}

export interface Family {
  id: string; // familyId e.g. "fam_9281"
  name: string; // e.g. "Família Silva"
  ownerId: string;
  createdAt: string;
  babyIds: string[];
  pairingCode?: string; // 6-digit code for connecting multiple devices
}

export interface FamilyMember {
  userId: string;
  familyId: string;
  email: string;
  name: string;
  role: UserRole;
  avatarColor: string;
  joinedAt: string;
}

export type CaregiverRole = 'admin' | 'mae' | 'pai' | 'cuidador' | 'outro' | 'avo' | 'baba';

export interface Caregiver {
  id: string;
  name: string;
  role: CaregiverRole;
  avatarColor: string;
}

export type Gender = 'masculino' | 'feminino' | 'outro';

export interface BabyProfile {
  id: string; // babyId e.g. "baby_ana_01"
  familyId: string; // multi-tenant family boundary
  createdBy: string; // userId of owner
  name: string;
  birthDate: string; // ISO string
  gender: Gender;
  birthWeight: number; // in grams e.g. 3045
  currentWeight: number; // in grams
  birthLength: number; // in cm e.g. 49
  currentLength?: number; // in cm
  headCircumference?: number; // in cm
  bloodType?: string;
  photoUrl?: string;
  pediatricianName?: string;
  notes?: string;
  defaultDiaperStockItemId?: string; // Fralda em uso selecionada
  lowStockThreshold?: number; // Configuração de alerta em unidades (default 20)
  updatedAt?: string;
}

export interface UndoToastState {
  id: string;
  message: string;
  timestamp: number;
  onUndo: () => void;
}

export type StorageLocationType = 'geladeira' | 'freezer' | 'descongelando' | 'descongelado' | 'ambiente' | 'bolsa_termica' | 'consumo_imediato';

export type MilkBatchStatus =
  | 'recem_ordenhado'
  | 'geladeira'
  | 'freezer'
  | 'descongelando'
  | 'descongelado'
  | 'separado_mamada'
  | 'parcialmente_utilizado'
  | 'consumido'
  | 'descartado'
  | 'vencido';

export type ConservationProtocolId = 'brasil_ms' | 'cdc_aap' | 'personalizado';

export interface ConservationProtocol {
  id: ConservationProtocolId;
  name: string;
  version: string;
  source: string;
  description?: string;
  roomTempHours: number; // temperatura ambiente
  fridgeHours: number; // geladeira (<4C)
  freezerDays: number; // freezer (-18C)
  thawedFridgeHours: number; // descongelado em geladeira
  warmedHours: number; // apos aquecido
  allowRefreeze: boolean;
  leftoverPolicy: string;
  discardOfferedLeftover?: boolean; // Se true, sobra após oferecida é descartada (ex: protocolo BRASIL MS)
}

export interface MilkBatch {
  id: string; // e.g. "LOTE-0284"
  containerName?: string; // Nome/identificador customizado do potinho (ex: "Pote Vidro Tampa Verde", "Mamadeira Philips")
  containerNumber?: string; // Número/Código do potinho (ex: "1", "02", "A-3")
  containerColor?: string; // Cor visual do potinho (ex: '#3b82f6', '#ec4899', '#10b981', '#f59e0b')
  containerTag?: string; // Etiqueta opcional (ex: "Fresco", "Colostro", "Leite da Madrugada")
  createdAt: string; // ISO
  extractedAt: string; // ISO
  expiresAt: string; // ISO calculated deterministically
  originalVolumeMl: number;
  currentVolumeMl: number;
  location: StorageLocationType;
  subLocation?: string; // e.g., "Prateleira superior", "Gaveta 2"
  status: MilkBatchStatus;
  protocolId: ConservationProtocolId;
  caregiverId: string;
  caregiverName: string;
  notes?: string;
  isThawed?: boolean;
  thawedAt?: string;
  comfortLevel?: number;
  sideDistribution?: { left: number; right: number };
  updatedAt?: string;
}

export type MilkTransactionType =
  | 'EXTRACTION'
  | 'PUMP_ADD'
  | 'TRANSFER'
  | 'FREEZE'
  | 'THAW'
  | 'PORTION'
  | 'FEED'
  | 'FEED_PREPARE'
  | 'DISCARD'
  | 'DISCARD_AFTER_FEEDING'
  | 'EXPIRE'
  | 'CORRECTION';

export interface MilkTransaction {
  id: string;
  timestamp: string;
  batchId: string;
  type: MilkTransactionType;
  volumeChangeMl: number; // positive or negative
  previousVolumeMl: number;
  newVolumeMl: number;
  fromLocation?: StorageLocationType;
  toLocation?: StorageLocationType;
  caregiverId: string;
  caregiverName: string;
  reason?: string;
  feedingId?: string;
  updatedAt?: string;
}

export type FeedingType = 'leite_materno_ordenhado' | 'amamentacao_direta' | 'formula' | 'outro';

export interface BatchAllocation {
  batchId: string;
  volumeMl: number;
  containerNumber?: string;
  containerName?: string;
  containerColor?: string;
  containerTag?: string;
}

export interface FeedingRecord {
  id: string;
  timestamp: string; // ISO start time
  endTime?: string;
  durationMinutes?: number;
  type: FeedingType;
  offeredMl?: number;
  consumedMl?: number;
  remainingMl?: number;
  batchIdsUsed?: string[]; // If breast milk from storage
  batchesUsedDetails?: BatchAllocation[]; // Breakdown when 2 or more bottles are combined
  containerNumber?: string;
  containerName?: string;
  containerColor?: string;
  containerTag?: string;
  formulaBrand?: string;
  directNursing?: {
    leftMinutes: number;
    rightMinutes: number;
    lastSide?: 'esquerdo' | 'direito' | 'ambos';
  };
  caregiverId: string;
  caregiverName: string;
  notes?: string;
  hungerSignsBefore?: boolean;
  satietySignsAfter?: boolean;
  burped?: boolean;
  discardRemainingStock?: boolean;
  breast?: 'esquerdo' | 'direito' | 'ambos';
  leftDurationMinutes?: number;
  rightDurationMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type PumpingMethod = 'bomba_eletrica' | 'bomba_manual' | 'ordenha_manual' | 'eletrica_dupla';

export interface PumpingRecord {
  id: string;
  timestamp: string;
  endTime?: string;
  durationMinutes: number;
  method: PumpingMethod;
  leftVolumeMl: number;
  rightVolumeMl: number;
  totalVolumeMl: number;
  targetStorage: StorageLocationType;
  batchIdCreated?: string;
  containerName?: string;
  containerNumber?: string;
  containerColor?: string;
  containerTag?: string;
  caregiverId: string;
  caregiverName: string;
  comfortLevel?: 'baixo' | 'normal' | 'otimo';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DiaperPeeAmount = 'pouco' | 'normal' | 'muito';
export type DiaperPoopAmount = 'pouco' | 'normal' | 'muito';
export type DiaperPoopConsistency = 'liquido' | 'pastoso' | 'normal' | 'ressecado';
export type DiaperPoopColor = 'amarelo' | 'mostarda' | 'marrom' | 'verde' | 'preto' | 'vermelho' | 'branco' | 'outro';

export interface DiaperRecord {
  id: string;
  timestamp: string;
  hasPee: boolean;
  peeAmount?: DiaperPeeAmount;
  hasPoop: boolean;
  poopAmount?: DiaperPoopAmount;
  poopConsistency?: DiaperPoopConsistency;
  poopColor?: DiaperPoopColor;
  caregiverId: string;
  caregiverName: string;
  photoUrl?: string;
  notes?: string;
  diaperStockItemId?: string; // ID do lote de fralda utilizado
  diaperBrand?: string;       // Marca salva no momento
  diaperSize?: string;        // Tamanho salvo no momento
  createdAt?: string;
  updatedAt?: string;
}

export type DiaperStockStatus = 'ACTIVE' | 'EM_ESTOQUE' | 'LOW_STOCK' | 'ALERTA_BAIXO' | 'OUT_OF_STOCK' | 'ESGOTADO' | 'ARCHIVED';

export interface DiaperStockItem {
  id: string;
  familyId?: string;
  babyId?: string;
  brand: string;            // marca (e.g. Pampers)
  productLine?: string;     // linha/modelo (e.g. Premium Care)
  size: string;             // tamanho (RN, P, M, G, XG, XXG, XXXG, Outro / livre)
  weightMinKg?: number;     // faixa de peso min
  weightMaxKg?: number;     // faixa de peso max
  quantityPurchased: number; // quantidade comprada inicialmente
  quantityCurrent: number;   // saldo atual
  purchaseDate?: string;     // data da compra (YYYY-MM-DD or ISO)
  unitCost?: number;        // custo unitário opcional
  unitPrice?: number;
  packagePrice?: number;
  totalCost?: number;       // valor total opcional
  store?: string;           // loja opcional
  storeName?: string;
  notes?: string;           // observações
  status: DiaperStockStatus;
  isDefaultInUse?: boolean; // fralda em uso como padrão atual
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type DiaperTransactionType = 'PURCHASE' | 'BUY' | 'USE' | 'ADJUST' | 'RETURN' | 'DISCARD' | 'RESTORE' | 'ADD';

export interface DiaperStockTransaction {
  id: string;
  familyId?: string;
  babyId?: string;
  diaperStockItemId: string;
  diaperRecordId?: string;
  diaperChangeId?: string;  // ID da troca de fralda associada
  type: DiaperTransactionType;
  quantity: number;         // quantidade (+ ou -)
  dateTime: string;         // ISO timestamp
  createdBy?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiaperShoppingItem {
  id: string;
  familyId?: string;
  babyId?: string;
  brand: string;
  productLine?: string;
  size: string;
  quantityPackages?: number;
  quantityDiapers?: number;
  quantityNeeded?: number;
  priority?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedBy?: 'ALERTA_ESTOQUE' | 'PREVISAO_CONSUMO' | 'MANUAL';
  targetPrice?: number;
  notes?: string;
  status: 'PENDING' | 'PURCHASED' | 'CANCELLED';
  createdAt: string;
  updatedAt?: string;
}

export type DiscomfortSymptom =
  | 'gases'
  | 'colica_choro'
  | 'regurgitou'
  | 'vomitou'
  | 'soluco'
  | 'arroto_dificil'
  | 'irritacao'
  | 'barriga_distendida'
  | 'choro_pos_mamada'
  | 'outro';

export type DiscomfortTiming = 'antes_mamada' | 'durante_mamada' | 'logo_depois' | '30_60_min_depois' | 'sem_relacao';
export type DiscomfortIntensity = 'leve' | 'moderado' | 'forte';

export interface DiscomfortRecord {
  id: string;
  timestamp: string;
  durationMinutes?: number;
  symptoms: DiscomfortSymptom[];
  symptom?: string;
  remedyApplied?: string;
  intensity: DiscomfortIntensity;
  timing: DiscomfortTiming;
  reliefMeasures: string[]; // e.g. "colo", "posicao_vertical", "arrotar", "movimento", etc.
  caregiverId: string;
  caregiverName: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeightRecord {
  id: string;
  timestamp: string;
  weightGrams: number;
  lengthCm?: number;
  headCircumferenceCm?: number;
  location?: string;
  caregiverId: string;
  caregiverName: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SleepType = 'soneca_dia' | 'sono_noturno';
export type SleepLocation = 'berco' | 'colo' | 'carrinho' | 'cama_compartilhada' | 'ninho' | 'outro';
export type SleepQuality = 'tranquilo' | 'agitado' | 'muitos_despertares' | 'choro';
export type SleepWakingReason = 'fome' | 'fralda' | 'barulho' | 'espontaneo' | 'colica' | 'outro';

export interface SleepRecord {
  id: string;
  babyId?: string;
  startTime: string; // ISO
  endTime: string; // ISO
  durationMinutes: number;
  type: SleepType;
  location: SleepLocation;
  quality: SleepQuality;
  wakingReason?: SleepWakingReason;
  notes?: string;
  caregiverId: string;
  caregiverName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActiveSleepTimer {
  isSleeping: boolean;
  startTime: string | null;
  location: SleepLocation;
  type: SleepType;
}

export interface FeedingPlanPhase {
  id: string;
  phaseNumber: number;
  title: string;
  targetVolumeMl: number;
  intervalHours: number;
  startDate: string;
  endDate?: string;
  prescribedBy: 'pediatra' | 'responsavel' | 'protocolo';
  notes?: string;
  isActive: boolean;
  updatedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  entityType: 'feeding' | 'pumping' | 'batch' | 'weight' | 'diaper' | 'discomfort' | 'plan';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CORRECTION';
  previousValue?: any;
  newValue?: any;
  caregiverId: string;
  caregiverName: string;
  description: string;
  updatedAt?: string;
}

export interface SafetyAlert {
  id: string;
  level: 'info' | 'warning' | 'urgent';
  title: string;
  message: string;
  source: string;
  timestamp: string;
}

export interface AiInsight {
  id: string;
  category: 'alimentacao' | 'fraldas' | 'conforto' | 'crescimento' | 'estoque';
  title: string;
  shortText: string;
  confidence: 'alta' | 'moderada' | 'insuficiente';
  confidenceReason: string;
  timestamp: string;
  updatedAt?: string;
}

export type MedicationDosageUnit = 'gotas' | 'ml' | 'mg' | 'comprimido' | 'spray' | 'flaconete' | 'colher' | 'outro';
export type MedicationPurpose = 'febre' | 'dor' | 'colica_gases' | 'vitaminas' | 'antibiotico' | 'antialergico' | 'refluxo' | 'pomada' | 'outro';
export type MedicationScheduleType = 'interval' | 'specific_times' | 'as_needed';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  dosageUnit: MedicationDosageUnit;
  purpose?: MedicationPurpose;
  scheduleType: MedicationScheduleType;
  intervalHours?: number; // e.g. 6, 8, 12, 24
  specificTimes?: string[]; // e.g. ['08:00', '16:00', '00:00']
  firstDoseTime?: string; // ISO
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  instructions?: string;
  color?: string;
  active: boolean;
  prescribedBy?: string;
  caregiverId?: string;
  caregiverName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  dosageUnit: string;
  scheduledTime?: string; // ISO
  administeredAt: string; // ISO
  givenByCaregiverId: string;
  givenByCaregiverName: string;
  status: 'given' | 'skipped' | 'late';
  notes?: string;
  reaction?: 'nenhuma' | 'vomitou' | 'sonolencia' | 'agitacao' | 'outro';
  temperatureBefore?: number;
  createdAt: string;
  updatedAt?: string;
}

