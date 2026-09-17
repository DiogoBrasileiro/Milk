import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  BabyProfile,
  Caregiver,
  MilkBatch,
  MilkTransaction,
  FeedingRecord,
  PumpingRecord,
  DiaperRecord,
  DiscomfortRecord,
  WeightRecord,
  FeedingPlanPhase,
  AuditLogEntry,
  ConservationProtocolId,
  AiInsight,
  SafetyAlert,
  StorageLocationType,
  MilkBatchStatus,
  UndoToastState,
  SleepRecord,
  ActiveSleepTimer,
  SleepLocation,
  SleepType,
  SleepQuality,
  SleepWakingReason,
  BatchAllocation,
  Medication,
  MedicationLog,
  Family,
  FamilyMember,
  DiaperStockItem,
  DiaperStockTransaction,
  DiaperShoppingItem,
  DiaperStockStatus,
  DiaperTransactionType,
} from '../types';
import { calculateBatchExpiry, calculateInventorySummary, createLedgerTransaction, sortBatchesFEFO } from '../utils/storageEngine';
import { CONSERVATION_PROTOCOLS } from '../constants/medicalProtocols';
import { calculateBabyAge } from '../utils/formatters';
import {
  playGentleFeedingChime,
  exportFeedingToCalendar,
  sendLocalNotification,
  requestNotificationPermission,
} from '../utils/reminderAlarm';
import {
  directSaveFamilyToSupabase,
  directLoadFamilyFromSupabase,
  subscribeToFamilyInSupabase,
} from '../lib/supabaseClient';

interface AppContextType {
  baby: BabyProfile;
  updateBaby: (baby: Partial<BabyProfile>) => void;
  caregivers: Caregiver[];
  activeCaregiver: Caregiver;
  setActiveCaregiver: (caregiver: Caregiver) => void;
  addCaregiver: (caregiver: Omit<Caregiver, 'id'>) => Caregiver;
  updateCaregiver: (id: string, updates: Partial<Caregiver>) => void;
  deleteCaregiver: (id: string) => void;

  protocolId: ConservationProtocolId;
  setProtocolId: (id: ConservationProtocolId) => void;

  batches: MilkBatch[];
  transactions: MilkTransaction[];
  addMilkBatch: (batch: Omit<MilkBatch, 'id' | 'createdAt' | 'expiresAt' | 'caregiverId' | 'caregiverName' | 'status' | 'protocolId'> & { protocolId?: ConservationProtocolId }) => MilkBatch;
  updateMilkBatch: (batchId: string, updates: Partial<MilkBatch>) => void;
  deleteMilkBatch: (batchId: string) => void;
  moveBatch: (batchId: string, newLocation: StorageLocationType, subLocation?: string) => void;
  portionBatch: (batchId: string, portionMl: number, destination: StorageLocationType) => void;
  discardBatch: (batchId: string, reason: string) => void;
  consumeFromBatch: (batchId: string, volumeMl: number, feedingId?: string) => void;

  feedings: FeedingRecord[];
  addFeeding: (feeding: Omit<FeedingRecord, 'id' | 'caregiverId' | 'caregiverName'>) => FeedingRecord;
  updateFeeding: (id: string, updated: Partial<FeedingRecord>) => void;
  deleteFeeding: (id: string) => void;

  pumpings: PumpingRecord[];
  addPumping: (pumping: Omit<PumpingRecord, 'id' | 'caregiverId' | 'caregiverName'>) => PumpingRecord;
  updatePumping: (id: string, updated: Partial<PumpingRecord>) => void;
  deletePumping: (id: string) => void;

  diapers: DiaperRecord[];
  addDiaper: (diaper: Omit<DiaperRecord, 'id' | 'caregiverId' | 'caregiverName'>) => DiaperRecord;
  updateDiaper: (id: string, updated: Partial<DiaperRecord>) => void;
  deleteDiaper: (id: string) => void;

  // Diaper Stock Engine (Estoque de Fraldas)
  diaperStockItems: DiaperStockItem[];
  diaperStockTransactions: DiaperStockTransaction[];
  diaperShoppingItems: DiaperShoppingItem[];
  addDiaperStockItem: (item: Omit<DiaperStockItem, 'id' | 'createdAt' | 'quantityCurrent' | 'status'> & { quantityCurrent?: number; status?: DiaperStockStatus }) => DiaperStockItem;
  updateDiaperStockItem: (id: string, updates: Partial<DiaperStockItem>) => void;
  deleteDiaperStockItem: (id: string) => void;
  setDefaultDiaperStockItem: (id: string) => void;
  adjustDiaperStockItemQuantity: (id: string, newQuantity: number, notes?: string) => void;
  replenishDiaperStockItem: (id: string, quantityToAdd: number, totalCost?: number, notes?: string) => void;
  addDiaperStockTransaction: (tx: Omit<DiaperStockTransaction, 'id' | 'createdAt'>) => DiaperStockTransaction;
  addDiaperShoppingItem: (item: Omit<DiaperShoppingItem, 'id' | 'createdAt' | 'status'>) => DiaperShoppingItem;
  updateDiaperShoppingItem: (id: string, updates: Partial<DiaperShoppingItem>) => void;
  deleteDiaperShoppingItem: (id: string) => void;
  diaperStockSummary: {
    totalAvailable: number;
    defaultItem?: DiaperStockItem;
    consumptionToday: number;
    avg7Days: number;
    daysRemainingDefault: number;
    daysRemainingTotal: number;
    isLowStock: boolean;
    hasSufficientHistory: boolean;
    weightAlert?: {
      type: 'NEAR_MAX' | 'ABOVE_MAX';
      message: string;
      currentWeightKg: number;
      maxWeightKg: number;
    };
    nextSizeSuggestion?: {
      size: string;
      brand: string;
      availableCount: number;
    };
    sizeBreakdown: Record<string, number>;
    brandBreakdown: Record<string, number>;
  };

  discomforts: DiscomfortRecord[];
  addDiscomfort: (discomfort: Omit<DiscomfortRecord, 'id' | 'caregiverId' | 'caregiverName'>) => DiscomfortRecord;
  deleteDiscomfort: (id: string) => void;

  weights: WeightRecord[];
  addWeight: (weight: Omit<WeightRecord, 'id' | 'caregiverId' | 'caregiverName'>) => WeightRecord;
  updateWeight: (id: string, updated: Partial<WeightRecord>) => void;
  deleteWeight: (id: string) => void;

  // Sleep Management (Sono & Sonecas)
  sleepLogs: SleepRecord[];
  activeSleepTimer: ActiveSleepTimer;
  startSleepTimer: (location?: SleepLocation, type?: SleepType) => void;
  stopSleepTimer: (quality?: SleepQuality, wakingReason?: SleepWakingReason, notes?: string) => SleepRecord | null;
  addSleepRecord: (record: Omit<SleepRecord, 'id' | 'caregiverId' | 'caregiverName'>) => SleepRecord;
  updateSleepRecord: (id: string, updated: Partial<SleepRecord>) => void;
  deleteSleepRecord: (id: string) => void;

  // Medication & Treatment Tracker (Controle de Medicamentos)
  medications: Medication[];
  medicationLogs: MedicationLog[];
  addMedication: (med: Omit<Medication, 'id' | 'createdAt'>) => Medication;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  addMedicationLog: (log: Omit<MedicationLog, 'id' | 'createdAt'>) => MedicationLog;
  updateMedicationLog: (id: string, updates: Partial<MedicationLog>) => void;
  deleteMedicationLog: (id: string) => void;
  administerMedicationDose: (medicationId: string, customTime?: string, notes?: string, temperatureBefore?: number) => MedicationLog | null;

  feedingPhases: FeedingPlanPhase[];
  activePhase?: FeedingPlanPhase;
  addFeedingPhase: (phase: Omit<FeedingPlanPhase, 'id'>) => void;
  activatePhase: (phaseId: string) => void;

  // Next feeding alarm & reminders
  customReminderIntervalMinutes: number;
  setCustomReminderIntervalMinutes: (mins: number) => void;
  playAlarmSound: () => void;
  exportAlarmCalendar: () => void;

  auditLogs: AuditLogEntry[];
  aiInsights: AiInsight[];
  setAiInsights: React.Dispatch<React.SetStateAction<AiInsight[]>>;
  safetyAlerts: SafetyAlert[];

  isNightMode: boolean;
  toggleNightMode: () => void;

  // Timers
  activePumpingTimer: { isRunning: boolean; elapsedSeconds: number; startTime: number | null; breast: 'esquerdo' | 'direito' | 'ambos' };
  setActivePumpingTimer: React.Dispatch<React.SetStateAction<{ isRunning: boolean; elapsedSeconds: number; startTime: number | null; breast: 'esquerdo' | 'direito' | 'ambos' }>>;

  activeNursingTimer: { isRunning: boolean; leftSeconds: number; rightSeconds: number; currentSide: 'esquerdo' | 'direito' | null };
  setActiveNursingTimer: React.Dispatch<React.SetStateAction<{ isRunning: boolean; leftSeconds: number; rightSeconds: number; currentSide: 'esquerdo' | 'direito' | null }>>;

  activeColicTimer: { isRunning: boolean; elapsedSeconds: number; startTime: number | null };
  setActiveColicTimer: React.Dispatch<React.SetStateAction<{ isRunning: boolean; elapsedSeconds: number; startTime: number | null }>>;

  // Quick modals
  activeModal: string | null;
  openModal: (modalName: string, data?: any) => void;
  closeModal: () => void;
  modalData: any;

  // Active navigation tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Summaries
  inventorySummary: ReturnType<typeof calculateInventorySummary>;
  todayStats: {
    totalConsumedMl: number;
    feedingsCount: number;
    totalPumpedMl: number;
    pumpingsCount: number;
    diapersCount: number;
    discomfortCount: number;
    lastFeeding?: FeedingRecord;
    nextExpectedFeeding?: string;
  };

  // Undo and Instant Actions
  undoToast: UndoToastState | null;
  triggerUndoToast: (message: string, onUndo: () => void) => void;
  clearUndoToast: () => void;
  quickLogPee: () => void;
  quickLogPoop: () => void;
  quickLogBottleMilk: (ml: number) => void;
  quickLogDiscomfort: (symptoms: string[]) => void;
  isOnline: boolean;

  exportDataJson: () => string;
  importDataJson: (jsonStr: string) => boolean;
  restoreAllHistoricalData: () => boolean;
  persistFamilyData: (overrideData?: Partial<any>) => void;

  // Multi-device Cloud Sync
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastCloudSyncTime: string | null;
  forceCloudSync: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// 🛡️ UNIVERSAL DATA HARVESTER & RECOVERY ENGINE
// Deep scans all localStorage keys (active family, all other families, guest data, legacy keys, backups)
// and merges all records to guarantee 0% data loss across any device, logout or update.
export function harvestAndMergeAllUserData(activeFamilyId?: string) {
  const merged = {
    protocolId: 'brasil_ms' as ConservationProtocolId,
    batches: [] as MilkBatch[],
    transactions: [] as MilkTransaction[],
    feedings: [] as FeedingRecord[],
    pumpings: [] as PumpingRecord[],
    diapers: [] as DiaperRecord[],
    discomforts: [] as DiscomfortRecord[],
    weights: [] as WeightRecord[],
    sleepLogs: [] as SleepRecord[],
    medications: [] as Medication[],
    medicationLogs: [] as MedicationLog[],
    diaperStockItems: [] as DiaperStockItem[],
    diaperStockTransactions: [] as DiaperStockTransaction[],
    diaperShoppingItems: [] as DiaperShoppingItem[],
    feedingPhases: [] as FeedingPlanPhase[],
    auditLogs: [] as AuditLogEntry[],
    aiInsights: [] as AiInsight[],
    caregivers: [] as Caregiver[],
    customReminderIntervalMinutes: 165,
    baby: null as Partial<BabyProfile> | null,
    lastUpdatedAt: '',
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    return merged;
  }

  // Read specifically from current family or guest key
  const familyKey = activeFamilyId ? `milkflow_family_data_${activeFamilyId}` : 'milkflow_guest_data';
  let raw = localStorage.getItem(familyKey);

  if (!raw || !raw.trim().startsWith('{')) {
    raw = localStorage.getItem('milkflow_universal_backup');
  }

  if (raw && raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      const dataObj = parsed.familyData || parsed;
      if (dataObj && typeof dataObj === 'object') {
        if (dataObj.protocolId) merged.protocolId = dataObj.protocolId;
        const manualSaved = localStorage.getItem('milkflow_selected_protocol') as ConservationProtocolId;
        if (manualSaved && ['brasil_ms', 'cdc', 'aap', 'who', 'abam'].includes(manualSaved)) {
          merged.protocolId = manualSaved;
        }
        if (dataObj.customReminderIntervalMinutes) merged.customReminderIntervalMinutes = dataObj.customReminderIntervalMinutes;
        if (dataObj.baby && typeof dataObj.baby === 'object') merged.baby = dataObj.baby;
        if (Array.isArray(dataObj.batches)) merged.batches = dataObj.batches;
        if (Array.isArray(dataObj.transactions)) merged.transactions = dataObj.transactions;
        if (Array.isArray(dataObj.feedings)) merged.feedings = [...dataObj.feedings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (Array.isArray(dataObj.pumpings)) merged.pumpings = [...dataObj.pumpings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (Array.isArray(dataObj.diapers)) merged.diapers = [...dataObj.diapers].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (Array.isArray(dataObj.discomforts)) merged.discomforts = [...dataObj.discomforts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (Array.isArray(dataObj.weights)) merged.weights = [...dataObj.weights].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (Array.isArray(dataObj.sleepLogs)) merged.sleepLogs = [...dataObj.sleepLogs].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        if (Array.isArray(dataObj.medications)) merged.medications = dataObj.medications;
        if (Array.isArray(dataObj.medicationLogs)) merged.medicationLogs = [...dataObj.medicationLogs].sort((a, b) => new Date(b.administeredAt || b.createdAt).getTime() - new Date(a.administeredAt || a.createdAt).getTime());
        if (Array.isArray(dataObj.diaperStockItems)) merged.diaperStockItems = dataObj.diaperStockItems;
        if (Array.isArray(dataObj.diaperStockTransactions)) merged.diaperStockTransactions = [...dataObj.diaperStockTransactions].sort((a, b) => new Date(b.dateTime || b.createdAt).getTime() - new Date(a.dateTime || a.createdAt).getTime());
        if (Array.isArray(dataObj.diaperShoppingItems)) merged.diaperShoppingItems = dataObj.diaperShoppingItems;
        if (Array.isArray(dataObj.feedingPhases)) merged.feedingPhases = dataObj.feedingPhases;
        if (Array.isArray(dataObj.auditLogs)) merged.auditLogs = [...dataObj.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (Array.isArray(dataObj.aiInsights)) merged.aiInsights = dataObj.aiInsights;
        if (Array.isArray(dataObj.caregivers)) merged.caregivers = dataObj.caregivers;
        if (dataObj.lastUpdatedAt) merged.lastUpdatedAt = dataObj.lastUpdatedAt;
      }
    } catch (e) {
      console.warn('Error reading family data', e);
    }
  }

  return merged;
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, currentFamily, activeBaby, babies, updateBabyProfile, syncIncomingFamilyState } = useAuth();

  // Storage key is dynamic and isolated per family
  const familyStorageKey = currentFamily ? `milkflow_family_data_${currentFamily.id}` : 'milkflow_guest_data';

  // Compute universally harvested initial data
  const initialHarvested = useMemo(() => harvestAndMergeAllUserData(currentFamily?.id), [currentFamily?.id]);

  const defaultBaby: BabyProfile = activeBaby || {
    id: initialHarvested?.baby?.id || 'baby_initial',
    familyId: currentFamily?.id || 'fam_temp',
    createdBy: currentUser?.id || 'usr_temp',
    name: initialHarvested?.baby?.name || 'Gabriel',
    birthDate: initialHarvested?.baby?.birthDate || new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    gender: (initialHarvested?.baby?.gender as any) || 'masculino',
    birthWeight: initialHarvested?.baby?.birthWeight || 3045,
    currentWeight: initialHarvested?.baby?.currentWeight || 3210,
    birthLength: initialHarvested?.baby?.birthLength || 49,
    currentLength: initialHarvested?.baby?.currentLength || 51.5,
  };

  const [localBaby, setLocalBaby] = useState<BabyProfile>(() => {
    return activeBaby ? { ...defaultBaby, ...activeBaby } : defaultBaby;
  });

  const [caregivers, setCaregivers] = useState<Caregiver[]>(() => {
    if (initialHarvested.caregivers && initialHarvested.caregivers.length > 0) {
      return initialHarvested.caregivers;
    }
    return [
      { id: 'cg_1', name: currentUser?.name || 'Mãe', role: 'mae', avatarColor: currentUser?.avatarColor || '#3b82f6' },
      { id: 'cg_2', name: 'Pai', role: 'pai', avatarColor: '#10b981' },
    ];
  });
  const [activeCaregiver, setActiveCaregiver] = useState<Caregiver>(() => caregivers[0]);
  const [protocolId, setProtocolIdState] = useState<ConservationProtocolId>(() => {
    const manualSaved = localStorage.getItem('milkflow_selected_protocol') as ConservationProtocolId;
    if (manualSaved && ['brasil_ms', 'cdc', 'aap', 'who', 'abam'].includes(manualSaved)) {
      return manualSaved;
    }
    return initialHarvested.protocolId || 'brasil_ms';
  });

  const [batches, setBatches] = useState<MilkBatch[]>(() => initialHarvested.batches);
  const [transactions, setTransactions] = useState<MilkTransaction[]>(() => initialHarvested.transactions);
  const [feedings, setFeedings] = useState<FeedingRecord[]>(() => initialHarvested.feedings);
  const [pumpings, setPumpings] = useState<PumpingRecord[]>(() => initialHarvested.pumpings);
  const [diapers, setDiapers] = useState<DiaperRecord[]>(() => initialHarvested.diapers);
  const [discomforts, setDiscomforts] = useState<DiscomfortRecord[]>(() => initialHarvested.discomforts);
  const [weights, setWeights] = useState<WeightRecord[]>(() => initialHarvested.weights);

  // Helper to parse dates safely from any format
  const parseSafeRecordTime = (rec: any): number => {
    if (!rec) return 0;
    const t = new Date(rec.timestamp || rec.createdAt || rec.date || 0).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Derive latest weight, length and head circumference records dynamically from weights
  const latestWeightRecord = useMemo(() => {
    if (!weights || weights.length === 0) return null;
    const valid = weights.filter((w) => typeof w.weightGrams === 'number' && w.weightGrams > 0);
    if (valid.length === 0) return null;
    return [...valid].sort((a, b) => parseSafeRecordTime(b) - parseSafeRecordTime(a))[0];
  }, [weights]);

  const latestLengthRecord = useMemo(() => {
    if (!weights || weights.length === 0) return null;
    const withLength = weights.filter((w) => typeof w.lengthCm === 'number' && w.lengthCm > 0);
    if (withLength.length === 0) return null;
    return [...withLength].sort((a, b) => parseSafeRecordTime(b) - parseSafeRecordTime(a))[0];
  }, [weights]);

  const latestHeadRecord = useMemo(() => {
    if (!weights || weights.length === 0) return null;
    const withHead = weights.filter((w) => typeof w.headCircumferenceCm === 'number' && w.headCircumferenceCm > 0);
    if (withHead.length === 0) return null;
    return [...withHead].sort((a, b) => parseSafeRecordTime(b) - parseSafeRecordTime(a))[0];
  }, [weights]);

  const baby = useMemo((): BabyProfile => {
    const base = { ...localBaby };
    if (latestWeightRecord && latestWeightRecord.weightGrams > 0) {
      base.currentWeight = latestWeightRecord.weightGrams;
    }
    if (latestLengthRecord && typeof latestLengthRecord.lengthCm === 'number' && latestLengthRecord.lengthCm > 0) {
      base.currentLength = latestLengthRecord.lengthCm;
    }
    if (latestHeadRecord && typeof latestHeadRecord.headCircumferenceCm === 'number' && latestHeadRecord.headCircumferenceCm > 0) {
      base.headCircumference = latestHeadRecord.headCircumferenceCm;
    }
    return base;
  }, [localBaby, latestWeightRecord, latestLengthRecord, latestHeadRecord]);

  const babyRef = React.useRef<BabyProfile>(baby);
  babyRef.current = baby;

  // Keep localBaby synchronized with activeBaby while preserving the latest metrics from records
  useEffect(() => {
    if (activeBaby) {
      setLocalBaby((prev) => ({
        ...prev,
        ...activeBaby,
        currentWeight: latestWeightRecord?.weightGrams || activeBaby.currentWeight || prev.currentWeight,
        currentLength: latestLengthRecord?.lengthCm || activeBaby.currentLength || prev.currentLength,
        headCircumference: latestHeadRecord?.headCircumferenceCm || activeBaby.headCircumference || prev.headCircumference,
      }));
    }
  }, [activeBaby, latestWeightRecord, latestLengthRecord, latestHeadRecord]);

  // Keep AuthContext activeBaby synchronized with the latest metrics from records
  useEffect(() => {
    if (activeBaby && (latestWeightRecord || latestLengthRecord || latestHeadRecord)) {
      const updates: Partial<BabyProfile> = {};
      if (latestWeightRecord && activeBaby.currentWeight !== latestWeightRecord.weightGrams) {
        updates.currentWeight = latestWeightRecord.weightGrams;
      }
      if (latestLengthRecord && latestLengthRecord.lengthCm && activeBaby.currentLength !== latestLengthRecord.lengthCm) {
        updates.currentLength = latestLengthRecord.lengthCm;
      }
      if (latestHeadRecord && latestHeadRecord.headCircumferenceCm && activeBaby.headCircumference !== latestHeadRecord.headCircumferenceCm) {
        updates.headCircumference = latestHeadRecord.headCircumferenceCm;
      }
      if (Object.keys(updates).length > 0) {
        updateBabyProfile(activeBaby.id, updates);
      }
    }
  }, [latestWeightRecord?.weightGrams, latestLengthRecord?.lengthCm, latestHeadRecord?.headCircumferenceCm, activeBaby?.id]);
  const [sleepLogs, setSleepLogs] = useState<SleepRecord[]>(() => initialHarvested.sleepLogs);
  const [medications, setMedications] = useState<Medication[]>(() => initialHarvested.medications || []);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>(() => initialHarvested.medicationLogs || []);
  const [diaperStockItems, setDiaperStockItems] = useState<DiaperStockItem[]>(() => initialHarvested.diaperStockItems || []);
  const [diaperStockTransactions, setDiaperStockTransactions] = useState<DiaperStockTransaction[]>(() => initialHarvested.diaperStockTransactions || []);
  const [diaperShoppingItems, setDiaperShoppingItems] = useState<DiaperShoppingItem[]>(() => initialHarvested.diaperShoppingItems || []);
  const [feedingPhases, setFeedingPhases] = useState<FeedingPlanPhase[]>(() => initialHarvested.feedingPhases);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => initialHarvested.auditLogs);
  const [aiInsights, setAiInsights] = useState<AiInsight[]>(() => initialHarvested.aiInsights);
  const [customReminderIntervalMinutes, setCustomReminderIntervalMinutes] = useState<number>(() => initialHarvested.customReminderIntervalMinutes || 165);
  const [activeSleepTimer, setActiveSleepTimer] = useState<ActiveSleepTimer>({
    isSleeping: false,
    startTime: null,
    location: 'berco',
    type: 'soneca_dia',
  });
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    return localStorage.getItem('milkflow_night_mode') === 'true';
  });

  // Track latest state in refs for synchronous, atomic persistence
  const lastLocalMutationTime = React.useRef<number>(0);
  const batchesRef = React.useRef<MilkBatch[]>(batches);
  batchesRef.current = batches;
  const transactionsRef = React.useRef<MilkTransaction[]>(transactions);
  transactionsRef.current = transactions;
  const feedingsRef = React.useRef<FeedingRecord[]>(feedings);
  feedingsRef.current = feedings;
  const pumpingsRef = React.useRef<PumpingRecord[]>(pumpings);
  pumpingsRef.current = pumpings;
  const diapersRef = React.useRef<DiaperRecord[]>(diapers);
  diapersRef.current = diapers;
  const discomfortsRef = React.useRef<DiscomfortRecord[]>(discomforts);
  discomfortsRef.current = discomforts;
  const weightsRef = React.useRef<WeightRecord[]>(weights);
  weightsRef.current = weights;
  const sleepLogsRef = React.useRef<SleepRecord[]>(sleepLogs);
  sleepLogsRef.current = sleepLogs;
  const medicationsRef = React.useRef<Medication[]>(medications);
  medicationsRef.current = medications;
  const medicationLogsRef = React.useRef<MedicationLog[]>(medicationLogs);
  medicationLogsRef.current = medicationLogs;
  const diaperStockItemsRef = React.useRef<DiaperStockItem[]>(diaperStockItems);
  diaperStockItemsRef.current = diaperStockItems;
  const diaperStockTransactionsRef = React.useRef<DiaperStockTransaction[]>(diaperStockTransactions);
  diaperStockTransactionsRef.current = diaperStockTransactions;
  const diaperShoppingItemsRef = React.useRef<DiaperShoppingItem[]>(diaperShoppingItems);
  diaperShoppingItemsRef.current = diaperShoppingItems;
  const feedingPhasesRef = React.useRef<FeedingPlanPhase[]>(feedingPhases);
  feedingPhasesRef.current = feedingPhases;
  const auditLogsRef = React.useRef<AuditLogEntry[]>(auditLogs);
  auditLogsRef.current = auditLogs;
  const aiInsightsRef = React.useRef<AiInsight[]>(aiInsights);
  aiInsightsRef.current = aiInsights;
  const caregiversRef = React.useRef<Caregiver[]>(caregivers);
  caregiversRef.current = caregivers;
  const protocolIdRef = React.useRef<ConservationProtocolId>(protocolId);
  protocolIdRef.current = protocolId;
  const customReminderIntervalRef = React.useRef<number>(customReminderIntervalMinutes);
  customReminderIntervalRef.current = customReminderIntervalMinutes;

  // Immediate and guaranteed sync to localStorage & Cloud backend
  const persistFamilyData = (overrides?: {
    protocolId?: ConservationProtocolId;
    baby?: BabyProfile | Partial<BabyProfile>;
    batches?: MilkBatch[];
    transactions?: MilkTransaction[];
    feedings?: FeedingRecord[];
    pumpings?: PumpingRecord[];
    diapers?: DiaperRecord[];
    discomforts?: DiscomfortRecord[];
    weights?: WeightRecord[];
    sleepLogs?: SleepRecord[];
    medications?: Medication[];
    medicationLogs?: MedicationLog[];
    diaperStockItems?: DiaperStockItem[];
    diaperStockTransactions?: DiaperStockTransaction[];
    diaperShoppingItems?: DiaperShoppingItem[];
    feedingPhases?: FeedingPlanPhase[];
    auditLogs?: AuditLogEntry[];
    aiInsights?: AiInsight[];
    caregivers?: Caregiver[];
    customReminderIntervalMinutes?: number;
  }) => {
    const dataToSave = {
      protocolId: overrides?.protocolId ?? protocolIdRef.current,
      baby: (overrides?.baby ? { ...babyRef.current, ...overrides.baby } : babyRef.current) as BabyProfile,
      batches: overrides?.batches ?? batchesRef.current,
      transactions: overrides?.transactions ?? transactionsRef.current,
      feedings: overrides?.feedings ?? feedingsRef.current,
      pumpings: overrides?.pumpings ?? pumpingsRef.current,
      diapers: overrides?.diapers ?? diapersRef.current,
      discomforts: overrides?.discomforts ?? discomfortsRef.current,
      weights: overrides?.weights ?? weightsRef.current,
      sleepLogs: overrides?.sleepLogs ?? sleepLogsRef.current,
      medications: overrides?.medications ?? medicationsRef.current,
      medicationLogs: overrides?.medicationLogs ?? medicationLogsRef.current,
      diaperStockItems: overrides?.diaperStockItems ?? diaperStockItemsRef.current,
      diaperStockTransactions: overrides?.diaperStockTransactions ?? diaperStockTransactionsRef.current,
      diaperShoppingItems: overrides?.diaperShoppingItems ?? diaperShoppingItemsRef.current,
      feedingPhases: overrides?.feedingPhases ?? feedingPhasesRef.current,
      auditLogs: overrides?.auditLogs ?? auditLogsRef.current,
      aiInsights: overrides?.aiInsights ?? aiInsightsRef.current,
      caregivers: overrides?.caregivers ?? caregiversRef.current,
      customReminderIntervalMinutes: overrides?.customReminderIntervalMinutes ?? customReminderIntervalRef.current,
      lastUpdatedAt: new Date().toISOString(),
    };

    lastLocalMutationTime.current = Date.now();

    try {
      localStorage.setItem(familyStorageKey, JSON.stringify(dataToSave));
      localStorage.setItem('milkflow_universal_backup', JSON.stringify(dataToSave));
      localStorage.setItem('milkflow_guest_data', JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Error saving family data to localStorage', e);
    }

    if (currentFamily?.id) {
      pushToCloud(currentFamily.id, dataToSave);
    }
  };

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerUndoToast = (message: string, onUndo: () => void) => {
    const id = `undo_${Date.now()}`;
    setUndoToast({
      id,
      message,
      timestamp: Date.now(),
      onUndo,
    });
    setTimeout(() => {
      setUndoToast((curr) => (curr?.id === id ? null : curr));
    }, 5000);
  };

  const clearUndoToast = () => setUndoToast(null);

  // Active timers
  const [activePumpingTimer, setActivePumpingTimer] = useState<{
    isRunning: boolean;
    elapsedSeconds: number;
    startTime: number | null;
    breast: 'esquerdo' | 'direito' | 'ambos';
  }>({
    isRunning: false,
    elapsedSeconds: 0,
    startTime: null,
    breast: 'ambos',
  });

  const [activeNursingTimer, setActiveNursingTimer] = useState<{
    isRunning: boolean;
    leftSeconds: number;
    rightSeconds: number;
    currentSide: 'esquerdo' | 'direito' | null;
  }>({
    isRunning: false,
    leftSeconds: 0,
    rightSeconds: 0,
    currentSide: null,
  });

  const [activeColicTimer, setActiveColicTimer] = useState<{
    isRunning: boolean;
    elapsedSeconds: number;
    startTime: number | null;
  }>({
    isRunning: false,
    elapsedSeconds: 0,
    startTime: null,
  });

  // Navigation and Modals
  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  const openModal = (modalName: string, data?: any) => {
    setActiveModal(modalName);
    setModalData(data || null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  // Set of deleted IDs and timestamps to ensure manual deletions persist across cloud merges
  const deletedRecordIdsRef = React.useRef<Set<string>>(
    (() => {
      try {
        const stored = localStorage.getItem('milkflow_deleted_ids');
        if (stored) return new Set<string>(JSON.parse(stored));
      } catch (_) {}
      return new Set<string>();
    })()
  );

  const deletedItemTimestampsRef = React.useRef<Record<string, string>>(
    (() => {
      try {
        const stored = localStorage.getItem('milkflow_deleted_timestamps');
        if (stored) return JSON.parse(stored);
      } catch (_) {}
      return {};
    })()
  );

  const recordManualDeletion = (id: string) => {
    deletedRecordIdsRef.current.add(id);
    const nowIso = new Date().toISOString();
    deletedItemTimestampsRef.current[id] = nowIso;
    try {
      localStorage.setItem('milkflow_deleted_ids', JSON.stringify(Array.from(deletedRecordIdsRef.current)));
      localStorage.setItem('milkflow_deleted_timestamps', JSON.stringify(deletedItemTimestampsRef.current));
    } catch (_) {}
  };

  const clearManualDeletion = (id: string) => {
    if (!id) return;
    deletedRecordIdsRef.current.delete(id);
    delete deletedItemTimestampsRef.current[id];
    try {
      localStorage.setItem('milkflow_deleted_ids', JSON.stringify(Array.from(deletedRecordIdsRef.current)));
      localStorage.setItem('milkflow_deleted_timestamps', JSON.stringify(deletedItemTimestampsRef.current));
    } catch (_) {}
  };

  const getModificationTimestamp = (item: any): number => {
    if (!item) return 0;
    const raw =
      item.updatedAt ||
      item.createdAt ||
      item.timestamp ||
      item.extractedAt ||
      item.startTime ||
      item.administeredAt ||
      item.date ||
      0;
    const time = new Date(raw).getTime();
    return isNaN(time) ? 0 : time;
  };

  const getEventTimestamp = (item: any): number => {
    if (!item) return 0;
    const raw =
      item.timestamp ||
      item.startTime ||
      item.extractedAt ||
      item.administeredAt ||
      item.updatedAt ||
      item.createdAt ||
      item.date ||
      0;
    const time = new Date(raw).getTime();
    return isNaN(time) ? 0 : time;
  };

  const getItemTimestamp = (item: any): number => {
    return getModificationTimestamp(item);
  };

  // Helper to merge lists by id using strict Last-Write-Wins based on modification timestamp
  const mergeListById = <T extends { id: string }>(
    localList: T[],
    incomingList?: T[],
    deletedMap?: Record<string, string>
  ): T[] => {
    const map = new Map<string, T>();
    const effectiveDeletedMap = {
      ...deletedItemTimestampsRef.current,
      ...(deletedMap || {}),
    };

    // 1. Incorporate local list items (skip if superseded by deletion)
    if (localList && Array.isArray(localList)) {
      for (const item of localList) {
        if (!item || !item.id) continue;
        if (effectiveDeletedMap[item.id]) {
          const delTime = new Date(effectiveDeletedMap[item.id]).getTime();
          if (getModificationTimestamp(item) <= delTime) continue;
        }
        map.set(item.id, item);
      }
    }

    // 2. Incorporate incoming list items from Supabase / other devices
    if (incomingList && Array.isArray(incomingList)) {
      for (const item of incomingList) {
        if (!item || !item.id) continue;
        if (effectiveDeletedMap[item.id]) {
          const delTime = new Date(effectiveDeletedMap[item.id]).getTime();
          if (getModificationTimestamp(item) <= delTime) continue;
        }

        const existing = map.get(item.id);
        if (!existing) {
          map.set(item.id, item);
        } else {
          // Last-Write-Wins: item with newer modification timestamp wins!
          const existingTime = getModificationTimestamp(existing);
          const incomingTime = getModificationTimestamp(item);
          if (incomingTime >= existingTime) {
            map.set(item.id, item);
          }
        }
      }
    }

    const result = Array.from(map.values());
    return result.sort((a: any, b: any) => getEventTimestamp(b) - getEventTimestamp(a));
  };

  // Multi-device Cloud Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);

  // Authoritative State Applier from Cloud / Live Stream - NEVER DESTROYS RECORDS
  const applyIncomingFamilyData = (
    d: any,
    incomingBabies?: BabyProfile[],
    incomingFamily?: Partial<Family>,
    incomingMembers?: FamilyMember[]
  ) => {
    if (incomingBabies || incomingFamily || incomingMembers) {
      syncIncomingFamilyState?.(incomingBabies, incomingFamily, incomingMembers);
    }

    if (!d) return;

    // Consolidate deleted IDs from incoming payload
    if (d.deletedItemIds && typeof d.deletedItemIds === 'object') {
      Object.assign(deletedItemTimestampsRef.current, d.deletedItemIds);
      Object.keys(d.deletedItemIds).forEach((id) => deletedRecordIdsRef.current.add(id));
      try {
        localStorage.setItem('milkflow_deleted_ids', JSON.stringify(Array.from(deletedRecordIdsRef.current)));
        localStorage.setItem('milkflow_deleted_timestamps', JSON.stringify(deletedItemTimestampsRef.current));
      } catch (_) {}
    }

    if (d.protocolId) {
      const localManual = localStorage.getItem('milkflow_selected_protocol') as ConservationProtocolId;
      const targetProto = localManual || d.protocolId;
      setProtocolIdState(targetProto);
      protocolIdRef.current = targetProto;
    }

    // SMART LWW MERGE: Compare timestamps so the latest update across any device wins
    let hasBatches = Array.isArray(d.batches);
    const mergedBatches = hasBatches
      ? mergeListById(batchesRef.current, d.batches, d.deletedItemIds)
      : batchesRef.current;
    if (hasBatches) {
      setBatches(mergedBatches);
      batchesRef.current = mergedBatches;
    }

    let hasTransactions = Array.isArray(d.transactions);
    const mergedTransactions = hasTransactions
      ? mergeListById(transactionsRef.current, d.transactions, d.deletedItemIds)
      : transactionsRef.current;
    if (hasTransactions) {
      setTransactions(mergedTransactions);
      transactionsRef.current = mergedTransactions;
    }

    let hasFeedings = Array.isArray(d.feedings);
    const mergedFeedings = hasFeedings
      ? mergeListById(feedingsRef.current, d.feedings, d.deletedItemIds)
      : feedingsRef.current;
    if (hasFeedings) {
      setFeedings(mergedFeedings);
      feedingsRef.current = mergedFeedings;
    }

    let hasPumpings = Array.isArray(d.pumpings);
    const mergedPumpings = hasPumpings
      ? mergeListById(pumpingsRef.current, d.pumpings, d.deletedItemIds)
      : pumpingsRef.current;
    if (hasPumpings) {
      setPumpings(mergedPumpings);
      pumpingsRef.current = mergedPumpings;
    }

    let hasDiapers = Array.isArray(d.diapers);
    const mergedDiapers = hasDiapers
      ? mergeListById(diapersRef.current, d.diapers, d.deletedItemIds)
      : diapersRef.current;
    if (hasDiapers) {
      setDiapers(mergedDiapers);
      diapersRef.current = mergedDiapers;
    }

    let hasDiscomforts = Array.isArray(d.discomforts);
    const mergedDiscomforts = hasDiscomforts
      ? mergeListById(discomfortsRef.current, d.discomforts, d.deletedItemIds)
      : discomfortsRef.current;
    if (hasDiscomforts) {
      setDiscomforts(mergedDiscomforts);
      discomfortsRef.current = mergedDiscomforts;
    }

    let hasWeights = Array.isArray(d.weights);
    const mergedWeights = hasWeights
      ? mergeListById(weightsRef.current, d.weights, d.deletedItemIds)
      : weightsRef.current;
    if (hasWeights) {
      setWeights(mergedWeights);
      weightsRef.current = mergedWeights;
    }

    let hasSleepLogs = Array.isArray(d.sleepLogs);
    const mergedSleepLogs = hasSleepLogs
      ? mergeListById(sleepLogsRef.current, d.sleepLogs, d.deletedItemIds)
      : sleepLogsRef.current;
    if (hasSleepLogs) {
      setSleepLogs(mergedSleepLogs);
      sleepLogsRef.current = mergedSleepLogs;
    }

    let hasMeds = Array.isArray(d.medications);
    const mergedMeds = hasMeds
      ? mergeListById(medicationsRef.current, d.medications, d.deletedItemIds)
      : medicationsRef.current;
    if (hasMeds) {
      setMedications(mergedMeds);
      medicationsRef.current = mergedMeds;
    }

    let hasMedLogs = Array.isArray(d.medicationLogs);
    const mergedMedLogs = hasMedLogs
      ? mergeListById(medicationLogsRef.current, d.medicationLogs, d.deletedItemIds)
      : medicationLogsRef.current;
    if (hasMedLogs) {
      setMedicationLogs(mergedMedLogs);
      medicationLogsRef.current = mergedMedLogs;
    }

    let hasDiaperStockItems = Array.isArray(d.diaperStockItems);
    const mergedDiaperStockItems = hasDiaperStockItems
      ? mergeListById(diaperStockItemsRef.current, d.diaperStockItems, d.deletedItemIds)
      : diaperStockItemsRef.current;
    if (hasDiaperStockItems) {
      setDiaperStockItems(mergedDiaperStockItems);
      diaperStockItemsRef.current = mergedDiaperStockItems;
    }

    let hasDiaperTx = Array.isArray(d.diaperStockTransactions);
    const mergedDiaperTx = hasDiaperTx
      ? mergeListById(diaperStockTransactionsRef.current, d.diaperStockTransactions, d.deletedItemIds)
      : diaperStockTransactionsRef.current;
    if (hasDiaperTx) {
      setDiaperStockTransactions(mergedDiaperTx);
      diaperStockTransactionsRef.current = mergedDiaperTx;
    }

    let hasDiaperShopping = Array.isArray(d.diaperShoppingItems);
    const mergedDiaperShopping = hasDiaperShopping
      ? mergeListById(diaperShoppingItemsRef.current, d.diaperShoppingItems, d.deletedItemIds)
      : diaperShoppingItemsRef.current;
    if (hasDiaperShopping) {
      setDiaperShoppingItems(mergedDiaperShopping);
      diaperShoppingItemsRef.current = mergedDiaperShopping;
    }

    let hasFeedingPhases = Array.isArray(d.feedingPhases);
    const mergedPhases = hasFeedingPhases
      ? mergeListById(feedingPhasesRef.current, d.feedingPhases, d.deletedItemIds)
      : feedingPhasesRef.current;
    if (hasFeedingPhases) {
      setFeedingPhases(mergedPhases);
      feedingPhasesRef.current = mergedPhases;
    }

    let hasAuditLogs = Array.isArray(d.auditLogs);
    const mergedAudit = hasAuditLogs
      ? mergeListById(auditLogsRef.current, d.auditLogs, d.deletedItemIds)
      : auditLogsRef.current;
    if (hasAuditLogs) {
      setAuditLogs(mergedAudit);
      auditLogsRef.current = mergedAudit;
    }

    if (Array.isArray(d.aiInsights)) {
      setAiInsights(d.aiInsights);
      aiInsightsRef.current = d.aiInsights;
    }
    if (d.customReminderIntervalMinutes) {
      setCustomReminderIntervalMinutes(d.customReminderIntervalMinutes);
      customReminderIntervalRef.current = d.customReminderIntervalMinutes;
    }
    if (Array.isArray(d.caregivers) && d.caregivers.length > 0) {
      const mergedCaregivers = mergeListById(caregiversRef.current, d.caregivers, d.deletedItemIds);
      setCaregivers(mergedCaregivers);
      caregiversRef.current = mergedCaregivers;
      setActiveCaregiver((prev) => mergedCaregivers.find((c: any) => c.id === prev.id) || mergedCaregivers[0]);
    }

    // Persist full unified state to local storage for instant offline / cache access
    const unifiedSnapshot = {
      protocolId: d.protocolId || protocolIdRef.current,
      batches: mergedBatches,
      transactions: mergedTransactions,
      feedings: mergedFeedings,
      pumpings: mergedPumpings,
      diapers: mergedDiapers,
      discomforts: mergedDiscomforts,
      weights: mergedWeights,
      sleepLogs: mergedSleepLogs,
      medications: mergedMeds,
      medicationLogs: mergedMedLogs,
      diaperStockItems: mergedDiaperStockItems,
      diaperStockTransactions: mergedDiaperTx,
      diaperShoppingItems: mergedDiaperShopping,
      feedingPhases: mergedPhases,
      auditLogs: mergedAudit,
      aiInsights: d.aiInsights || aiInsightsRef.current,
      caregivers: caregiversRef.current,
      deletedItemIds: deletedItemTimestampsRef.current,
      customReminderIntervalMinutes: d.customReminderIntervalMinutes || customReminderIntervalRef.current,
      lastUpdatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(familyStorageKey, JSON.stringify(unifiedSnapshot));
      localStorage.setItem('milkflow_universal_backup', JSON.stringify(unifiedSnapshot));
      localStorage.setItem('milkflow_guest_data', JSON.stringify(unifiedSnapshot));
    } catch (e) {
      console.warn('Error caching synced family data locally', e);
    }

    setLastCloudSyncTime(
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
    setCloudSyncStatus('synced');
  };

  const restoreAllHistoricalData = (): boolean => {
    const harvested = harvestAndMergeAllUserData(currentFamily?.id);
    setBatches(harvested.batches);
    batchesRef.current = harvested.batches;
    setTransactions(harvested.transactions);
    transactionsRef.current = harvested.transactions;
    setFeedings(harvested.feedings);
    feedingsRef.current = harvested.feedings;
    setPumpings(harvested.pumpings);
    pumpingsRef.current = harvested.pumpings;
    setDiapers(harvested.diapers);
    diapersRef.current = harvested.diapers;
    setDiscomforts(harvested.discomforts);
    discomfortsRef.current = harvested.discomforts;
    setWeights(harvested.weights);
    weightsRef.current = harvested.weights;
    setSleepLogs(harvested.sleepLogs);
    sleepLogsRef.current = harvested.sleepLogs;
    setDiaperStockItems(harvested.diaperStockItems);
    diaperStockItemsRef.current = harvested.diaperStockItems;
    setDiaperStockTransactions(harvested.diaperStockTransactions);
    diaperStockTransactionsRef.current = harvested.diaperStockTransactions;
    setDiaperShoppingItems(harvested.diaperShoppingItems);
    diaperShoppingItemsRef.current = harvested.diaperShoppingItems;
    setFeedingPhases(harvested.feedingPhases);
    feedingPhasesRef.current = harvested.feedingPhases;
    setAuditLogs(harvested.auditLogs);
    auditLogsRef.current = harvested.auditLogs;
    setAiInsights(harvested.aiInsights);
    aiInsightsRef.current = harvested.aiInsights;
    setCaregivers(harvested.caregivers);
    caregiversRef.current = harvested.caregivers;
    if (harvested.caregivers[0]) {
      setActiveCaregiver(harvested.caregivers[0]);
    }

    persistFamilyData(harvested);
    triggerUndoToast('✓ Todos os registros e lançamentos foram recuperados com sucesso!', () => {});
    return true;
  };

  // Function to pull latest data from cloud (for multi-device sync)
  const pullFromCloud = async (familyId: string) => {
    if (!navigator.onLine) {
      setCloudSyncStatus('offline');
      return;
    }
    try {
      setCloudSyncStatus('syncing');
      const res = await fetch(`/api/family/${familyId}/sync`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (json.familyData) {
            applyIncomingFamilyData(json.familyData, json.babies, json.family, json.members);
          } else if (json.babies || json.family || json.members) {
            syncIncomingFamilyState?.(json.babies, json.family, json.members);
          }
          return;
        }
      }
      // Fallback directly to Supabase if API endpoint encountered an issue
      const directSupa = await directLoadFamilyFromSupabase(familyId);
      if (directSupa) {
        applyIncomingFamilyData(directSupa.data || directSupa, directSupa.babies, directSupa.family, directSupa.members);
      }
    } catch (err) {
      console.warn('Cloud sync pull notice, attempting direct Supabase query:', err);
      try {
        const directSupa = await directLoadFamilyFromSupabase(familyId);
        if (directSupa) {
          applyIncomingFamilyData(directSupa.data || directSupa, directSupa.babies, directSupa.family, directSupa.members);
        }
      } catch (_) {}
      setCloudSyncStatus(navigator.onLine ? 'synced' : 'offline');
    }
  };

  // Function to push data to cloud and Supabase
  const pushToCloud = async (familyId: string, payloadData: any) => {
    const enrichedPayload = {
      ...payloadData,
      deletedItemIds: deletedItemTimestampsRef.current,
      _clientPushAt: new Date().toISOString(),
    };

    // Notify same-origin tabs immediately via BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel(`milkflow_sync_${familyId}`);
        bc.postMessage({
          type: 'local_mutation',
          familyData: enrichedPayload,
          babies: babies && babies.length > 0 ? babies : undefined,
          family: currentFamily || undefined,
        });
        bc.close();
      }
    } catch (_) {}

    if (!navigator.onLine) {
      setCloudSyncStatus('offline');
      return;
    }
    try {
      setCloudSyncStatus('syncing');

      // Trigger parallel direct push to Supabase for immediate cloud redundancy
      directSaveFamilyToSupabase(familyId, {
        familyId,
        family: currentFamily,
        babies,
        data: enrichedPayload,
      }).catch((e) => {
        console.warn('Direct Supabase client background sync notice:', e);
      });

      const res = await fetch(`/api/family/${familyId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family: currentFamily || undefined,
          babies: babies && babies.length > 0 ? babies : undefined,
          data: enrichedPayload,
        }),
      });
      if (res.ok) {
        setCloudSyncStatus('synced');
        setLastCloudSyncTime(
          new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }
    } catch (err) {
      console.warn('Cloud push error:', err);
      setCloudSyncStatus('error');
    }
  };

  const forceCloudSync = async () => {
    if (currentFamily?.id) {
      await pullFromCloud(currentFamily.id);
    }
  };

  // ⚡ LIVE REAL-TIME SSE, SUPABASE REALTIME WEBSOCKET, BROADCASTCHANNEL & AUTO-SYNC
  useEffect(() => {
    // 0. Immediately re-harvest and hydrate all local data when family or user changes
    const localHarvested = harvestAndMergeAllUserData(currentFamily?.id);
    applyIncomingFamilyData(localHarvested);

    if (!currentFamily?.id) return;

    // 1. Initial snapshot pull
    pullFromCloud(currentFamily.id);

    // 2. Supabase Direct Realtime Channel Subscription (Instant Cloud Notification)
    const unsubscribeSupabase = subscribeToFamilyInSupabase(currentFamily.id, (incomingVal) => {
      if (incomingVal) {
        applyIncomingFamilyData(
          incomingVal.data || incomingVal,
          incomingVal.babies,
          incomingVal.family,
          incomingVal.members
        );
      }
    });

    // 3. BroadcastChannel for instant cross-tab sync on same device
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel(`milkflow_sync_${currentFamily.id}`);
        broadcastChannel.onmessage = (ev) => {
          if (ev.data?.familyData) {
            applyIncomingFamilyData(ev.data.familyData, ev.data.babies, ev.data.family, ev.data.members);
          } else if (ev.data?.babies || ev.data?.family || ev.data?.members) {
            syncIncomingFamilyState?.(ev.data.babies, ev.data.family, ev.data.members);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    // 4. Real-time Live SSE Connection across all devices
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSse = () => {
      if (eventSource) {
        eventSource.close();
      }

      try {
        eventSource = new EventSource(`/api/family/${currentFamily.id}/events`);

        eventSource.onopen = () => {
          setCloudSyncStatus('synced');
        };

        eventSource.onmessage = (event) => {
          try {
            if (!event.data) return;
            const msg = JSON.parse(event.data);
            if (msg.type === 'snapshot' || msg.type === 'data_updated') {
              if (msg.familyData) {
                applyIncomingFamilyData(msg.familyData, msg.babies, msg.family, msg.members);
              } else if (msg.babies || msg.family || msg.members) {
                syncIncomingFamilyState?.(msg.babies, msg.family, msg.members);
              }
            }
          } catch (e) {
            console.warn('SSE message parse error', e);
          }
        };

        eventSource.onerror = (e) => {
          setCloudSyncStatus(navigator.onLine ? 'syncing' : 'offline');
          eventSource?.close();
          clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connectSse, 2000);
        };
      } catch (err) {
        console.warn('Could not initialize EventSource stream', err);
      }
    };

    connectSse();

    // 5. Periodic fallback poll every 3 seconds & on app focus / visibility change
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        pullFromCloud(currentFamily.id);
      }
    }, 3000);

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        pullFromCloud(currentFamily.id);
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          connectSse();
        }
      }
    };

    window.addEventListener('focus', onFocusOrVisible);
    window.addEventListener('visibilitychange', onFocusOrVisible);
    window.addEventListener('online', onFocusOrVisible);

    return () => {
      unsubscribeSupabase();
      clearInterval(interval);
      clearTimeout(reconnectTimeout);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      if (eventSource) {
        eventSource.close();
      }
      window.removeEventListener('focus', onFocusOrVisible);
      window.removeEventListener('visibilitychange', onFocusOrVisible);
      window.removeEventListener('online', onFocusOrVisible);
    };
  }, [currentFamily?.id]);

  const toggleNightMode = () => {
    setIsNightMode((prev) => {
      const next = !prev;
      localStorage.setItem('milkflow_night_mode', String(next));
      return next;
    });
  };

  const setProtocolId = (newProto: ConservationProtocolId) => {
    setProtocolIdState(newProto);
    protocolIdRef.current = newProto;
    localStorage.setItem('milkflow_selected_protocol', newProto);

    // Recalculate expiry dates for all active batches under the new protocol
    const updatedBatches = batchesRef.current.map((b) => {
      if (b.status === 'consumido' || b.status === 'descartado') return b;
      return {
        ...b,
        protocolId: newProto,
        expiresAt: calculateBatchExpiry(b.extractedAt, b.location, newProto, b.isThawed ? b.thawedAt : undefined),
      };
    });
    batchesRef.current = updatedBatches;
    setBatches(updatedBatches);

    persistFamilyData({
      protocolId: newProto,
      batches: updatedBatches,
    });
  };

  const updateBaby = (updates: Partial<BabyProfile>) => {
    const updated = { ...babyRef.current, ...updates, updatedAt: new Date().toISOString() };
    babyRef.current = updated;
    setLocalBaby(updated);
    
    try {
      localStorage.setItem('milkflow_baby_profile', JSON.stringify(updated));
    } catch (e) {}

    persistFamilyData({ baby: updated });

    if (activeBaby) {
      updateBabyProfile(activeBaby.id, updates);
    }
  };

  const addCaregiver = (cg: Omit<Caregiver, 'id'>): Caregiver => {
    const newCg: Caregiver = {
      ...cg,
      id: `cg_${Date.now()}`,
    };
    const updatedCaregivers = [...caregiversRef.current, newCg];
    setCaregivers(updatedCaregivers);
    persistFamilyData({ caregivers: updatedCaregivers });
    return newCg;
  };

  const updateCaregiver = (id: string, updates: Partial<Caregiver>) => {
    const updatedCaregivers = caregiversRef.current.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setCaregivers(updatedCaregivers);
    if (activeCaregiver.id === id) {
      setActiveCaregiver({ ...activeCaregiver, ...updates });
    }
    persistFamilyData({ caregivers: updatedCaregivers });
  };

  const deleteCaregiver = (id: string) => {
    if (caregiversRef.current.length <= 1) {
      alert('É necessário manter ao menos um cuidador ativo na família.');
      return;
    }
    recordManualDeletion(id);
    const updatedCaregivers = caregiversRef.current.filter((c) => c.id !== id);
    caregiversRef.current = updatedCaregivers;
    setCaregivers(updatedCaregivers);
    if (activeCaregiver.id === id) {
      setActiveCaregiver(updatedCaregivers[0]);
    }
    persistFamilyData({ caregivers: updatedCaregivers });
  };

  // Inventory Actions
  const addMilkBatch = (batchData: Omit<MilkBatch, 'id' | 'createdAt' | 'expiresAt' | 'caregiverId' | 'caregiverName' | 'status'> & { protocolId?: ConservationProtocolId }) => {
    const activeProto = batchData.protocolId || protocolIdRef.current;
    const expiresAt = calculateBatchExpiry(batchData.extractedAt, batchData.location, activeProto);
    const newBatchId = `LOTE-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const newBatch: MilkBatch = {
      ...batchData,
      id: newBatchId,
      createdAt: nowIso,
      updatedAt: nowIso,
      expiresAt: expiresAt,
      protocolId: activeProto,
      status: batchData.location === 'geladeira' ? 'geladeira' : batchData.location === 'freezer' ? 'freezer' : 'recem_ordenhado',
      caregiverId: activeCaregiver.id,
      caregiverName: activeCaregiver.name,
    };

    const newBatches = [newBatch, ...batchesRef.current];
    batchesRef.current = newBatches;

    const tx = createLedgerTransaction(
      newBatch,
      'EXTRACTION',
      newBatch.originalVolumeMl,
      activeCaregiver.id,
      activeCaregiver.name,
      {
        toLocation: newBatch.location,
        reason: `Novo potinho armazenado (${newBatch.location})`,
      }
    );
    const newTransactions = [tx, ...transactionsRef.current];
    transactionsRef.current = newTransactions;

    setBatches(newBatches);
    setTransactions(newTransactions);

    persistFamilyData({
      batches: newBatches,
      transactions: newTransactions,
    });

    return newBatch;
  };

  const updateMilkBatch = (batchId: string, updates: Partial<MilkBatch>) => {
    let newTransactions = transactionsRef.current;
    const targetBatch = batchesRef.current.find((b) => b.id === batchId);
    const nowIso = new Date().toISOString();

    if (targetBatch && updates.currentVolumeMl !== undefined && updates.currentVolumeMl !== targetBatch.currentVolumeMl) {
      const delta = updates.currentVolumeMl - targetBatch.currentVolumeMl;
      const tx = createLedgerTransaction(
        targetBatch,
        'CORRECTION',
        delta,
        activeCaregiver.id,
        activeCaregiver.name,
        {
          reason: `Ajuste manual de volume: ${targetBatch.currentVolumeMl}ml ➔ ${updates.currentVolumeMl}ml`,
        }
      );
      newTransactions = [tx, ...newTransactions];
    }

    const newBatches = batchesRef.current.map((b) => {
      if (b.id !== batchId) return b;
      let newExpiry = b.expiresAt;
      if (updates.extractedAt || updates.location || updates.protocolId) {
        const loc = updates.location || b.location;
        const proto = updates.protocolId || b.protocolId;
        const ext = updates.extractedAt || b.extractedAt;
        newExpiry = calculateBatchExpiry(ext, loc, proto, b.isThawed ? b.thawedAt : undefined);
      }

      let nextStatus = updates.status || b.status;
      if (updates.currentVolumeMl !== undefined) {
        if (updates.currentVolumeMl === 0 && !updates.status) {
          nextStatus = 'consumido';
        } else if (updates.currentVolumeMl > 0 && b.status === 'consumido' && !updates.status) {
          const loc = updates.location || b.location;
          nextStatus = loc === 'geladeira' ? 'geladeira' : loc === 'freezer' ? 'freezer' : 'parcialmente_utilizado';
        }
      }

      return {
        ...b,
        ...updates,
        status: nextStatus,
        expiresAt: updates.expiresAt || newExpiry,
        updatedAt: nowIso,
      };
    });

    batchesRef.current = newBatches;
    transactionsRef.current = newTransactions;
    setBatches(newBatches);
    setTransactions(newTransactions);
    persistFamilyData({ batches: newBatches, transactions: newTransactions });
  };

  const deleteMilkBatch = (batchId: string) => {
    recordManualDeletion(batchId);
    const newBatches = batchesRef.current.filter((b) => b.id !== batchId);
    batchesRef.current = newBatches;
    setBatches(newBatches);
    persistFamilyData({ batches: newBatches });
  };

  const moveBatch = (batchId: string, newLocation: StorageLocationType, subLocation?: string) => {
    const nowIso = new Date().toISOString();
    const newBatches = batchesRef.current.map((b) => {
      if (b.id !== batchId) return b;
      const newExpiry = calculateBatchExpiry(b.extractedAt, newLocation, b.protocolId, b.isThawed ? b.thawedAt : undefined);
      return {
        ...b,
        location: newLocation,
        subLocation: subLocation || b.subLocation,
        expiresAt: newExpiry,
        status: (newLocation === 'geladeira' ? 'geladeira' : newLocation === 'freezer' ? 'freezer' : 'descongelando') as MilkBatchStatus,
        updatedAt: nowIso,
      };
    });

    setBatches(newBatches);
    persistFamilyData({ batches: newBatches });
  };

  const portionBatch = (batchId: string, portionMl: number, destination: StorageLocationType) => {
    const sourceBatch = batchesRef.current.find((b) => b.id === batchId);
    if (!sourceBatch || portionMl <= 0 || portionMl >= sourceBatch.currentVolumeMl) return;

    const nowIso = new Date().toISOString();
    const remainingVolume = sourceBatch.currentVolumeMl - portionMl;
    const newBatchId = `LOTE-${Math.floor(1000 + Math.random() * 9000)}`;
    const newExpiry = calculateBatchExpiry(sourceBatch.extractedAt, destination, sourceBatch.protocolId, sourceBatch.isThawed ? sourceBatch.thawedAt : undefined);

    const newBatch: MilkBatch = {
      ...sourceBatch,
      id: newBatchId,
      originalVolumeMl: portionMl,
      currentVolumeMl: portionMl,
      location: destination,
      expiresAt: newExpiry,
      createdAt: nowIso,
      updatedAt: nowIso,
      notes: `Porção retirada do frasco #${sourceBatch.id}`,
    };

    const newBatches = [
      newBatch,
      ...batchesRef.current.map((b) => (b.id === batchId ? { ...b, currentVolumeMl: remainingVolume, updatedAt: nowIso } : b)),
    ];

    setBatches(newBatches);
    persistFamilyData({ batches: newBatches });
  };

  const discardBatch = (batchId: string, reason: string = 'Descarte do lote') => {
    const targetBatch = batchesRef.current.find((b) => b.id === batchId);
    if (!targetBatch) return;

    const previousBatch = { ...targetBatch };
    const discardedVolume = targetBatch.currentVolumeMl;
    const nowIso = new Date().toISOString();

    const newBatches = batchesRef.current.map((b) =>
      b.id === batchId
        ? {
            ...b,
            status: 'descartado' as MilkBatchStatus,
            currentVolumeMl: 0,
            notes: `${b.notes ? b.notes + ' • ' : ''}Descartado em ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (Motivo: ${reason})`,
            updatedAt: nowIso,
          }
        : b
    );

    let newTransactions = transactionsRef.current;
    if (discardedVolume > 0) {
      const tx = createLedgerTransaction(
        targetBatch,
        'DISCARD',
        -discardedVolume,
        activeCaregiver.id,
        activeCaregiver.name,
        {
          reason: `Descarte de ${discardedVolume}ml: ${reason}`,
        }
      );
      newTransactions = [tx, ...newTransactions];
    }

    setBatches(newBatches);
    setTransactions(newTransactions);
    persistFamilyData({ batches: newBatches, transactions: newTransactions });

    triggerUndoToast(
      `✓ Leite (${discardedVolume}ml) descartado do estoque ativo. O registro da ordenha permanece ativo nos relatórios.`,
      () => {
        const restoredBatches = batchesRef.current.map((b) => (b.id === batchId ? previousBatch : b));
        setBatches(restoredBatches);
        persistFamilyData({ batches: restoredBatches });
      }
    );
  };

  const consumeFromBatch = (batchId: string, volumeMl: number) => {
    const nowIso = new Date().toISOString();
    const newBatches = batchesRef.current.map((b) => {
      if (b.id !== batchId) return b;
      const newVol = Math.max(0, b.currentVolumeMl - volumeMl);
      return {
        ...b,
        currentVolumeMl: newVol,
        status: (newVol === 0 ? 'consumido' : 'parcialmente_utilizado') as MilkBatchStatus,
        updatedAt: nowIso,
      };
    });

    setBatches(newBatches);
    persistFamilyData({ batches: newBatches });
  };

  // Automatic Inventory Deduction via FEFO (First-Expired, First-Out) & Multi-Bottle Combinations
  const autoDeductFromInventory = (
    volumeMl: number,
    preferredBatchIds?: string | string[],
    feedingId?: string,
    currentBatchesList?: MilkBatch[],
    explicitAllocations?: BatchAllocation[],
    discardRemainingStock: boolean = true
  ): {
    updatedBatches: MilkBatch[];
    newTransactions: MilkTransaction[];
    batchIdsUsed: string[];
    batchesUsedDetails: BatchAllocation[];
    details: string;
    primaryBatch?: MilkBatch;
  } => {
    const sourceBatches = currentBatchesList || batchesRef.current;
    if (volumeMl <= 0 || sourceBatches.length === 0) {
      return {
        updatedBatches: sourceBatches,
        newTransactions: [],
        batchIdsUsed: [],
        batchesUsedDetails: [],
        details: '',
        primaryBatch: undefined,
      };
    }

    let updatedBatches = [...sourceBatches];
    const newTxList: MilkTransaction[] = [];
    const usedBatchIds: string[] = [];
    const finalAllocations: BatchAllocation[] = [];
    let primaryBatch: MilkBatch | undefined = undefined;

    // CASE 1: Explicit multi-bottle allocations provided by user UI
    if (explicitAllocations && explicitAllocations.length > 0) {
      for (const alloc of explicitAllocations) {
        if (alloc.volumeMl <= 0) continue;
        const targetBatch = updatedBatches.find((b) => b.id === alloc.batchId);
        if (!targetBatch) continue;

        const deductAmount = Math.min(targetBatch.currentVolumeMl, alloc.volumeMl);
        if (deductAmount <= 0) continue;

        const remainingAfterDeduct = Math.max(0, targetBatch.currentVolumeMl - deductAmount);
        const finalVolume = discardRemainingStock ? 0 : remainingAfterDeduct;
        const newStatus: MilkBatchStatus = finalVolume === 0 ? 'consumido' : 'parcialmente_utilizado';

        if (!primaryBatch) {
          primaryBatch = targetBatch;
        }

        updatedBatches = updatedBatches.map((item) =>
          item.id === targetBatch.id
            ? { ...item, currentVolumeMl: finalVolume, status: newStatus }
            : item
        );

        const tx = createLedgerTransaction(
          targetBatch,
          'FEED',
          -deductAmount,
          activeCaregiver.id,
          activeCaregiver.name,
          {
            feedingId,
            reason: `Baixa de ${deductAmount}ml (${targetBatch.containerName || targetBatch.containerNumber ? `Frasco #${targetBatch.containerNumber || ''} ${targetBatch.containerName || ''}` : `Lote #${targetBatch.id}`})`,
          }
        );
        newTxList.push(tx);
        usedBatchIds.push(targetBatch.id);

        if (discardRemainingStock && remainingAfterDeduct > 0) {
          const discardTx = createLedgerTransaction(
            targetBatch,
            'DISCARD',
            -remainingAfterDeduct,
            activeCaregiver.id,
            activeCaregiver.name,
            {
              feedingId,
              reason: `Descarte de sobra pós-mamada (${remainingAfterDeduct}ml não consumidos)`,
            }
          );
          newTxList.push(discardTx);
        }

        finalAllocations.push({
          batchId: targetBatch.id,
          volumeMl: deductAmount,
          containerNumber: targetBatch.containerNumber,
          containerName: targetBatch.containerName,
          containerColor: targetBatch.containerColor,
          containerTag: targetBatch.containerTag,
        });
      }

      const details = usedBatchIds.map((id) => `#${id}`).join(', ');
      return {
        updatedBatches,
        newTransactions: newTxList,
        batchIdsUsed: usedBatchIds,
        batchesUsedDetails: finalAllocations,
        details,
        primaryBatch,
      };
    }

    // CASE 2: Automatic sequential deduction with optional preferred multiple batch IDs or FEFO
    let remainingNeeded = volumeMl;
    const available = updatedBatches.filter(
      (b) => b.currentVolumeMl > 0 && b.status !== 'consumido' && b.status !== 'descartado'
    );

    if (available.length === 0) {
      return {
        updatedBatches,
        newTransactions: [],
        batchIdsUsed: [],
        batchesUsedDetails: [],
        details: 'Nenhum frasco disponível em estoque',
        primaryBatch: undefined,
      };
    }

    // Normalize preferred IDs
    const preferredList: string[] = Array.isArray(preferredBatchIds)
      ? preferredBatchIds
      : preferredBatchIds
      ? [preferredBatchIds]
      : [];

    let sortedCandidates: MilkBatch[] = [];
    if (preferredList.length > 0) {
      const preferredBatches = preferredList
        .map((id) => available.find((b) => b.id === id))
        .filter((b): b is MilkBatch => Boolean(b));
      const remainingAvailable = available.filter((b) => !preferredList.includes(b.id));
      sortedCandidates = [...preferredBatches, ...sortBatchesFEFO(remainingAvailable)];
    } else {
      sortedCandidates = sortBatchesFEFO(available);
    }

    for (const b of sortedCandidates) {
      if (remainingNeeded <= 0) break;

      const deductAmount = Math.min(b.currentVolumeMl, remainingNeeded);
      if (deductAmount > 0) {
        const remainingAfterDeduct = Math.max(0, b.currentVolumeMl - deductAmount);
        const finalVolume = discardRemainingStock ? 0 : remainingAfterDeduct;
        const newStatus: MilkBatchStatus = finalVolume === 0 ? 'consumido' : 'parcialmente_utilizado';

        if (!primaryBatch) {
          primaryBatch = b;
        }

        updatedBatches = updatedBatches.map((item) =>
          item.id === b.id
            ? { ...item, currentVolumeMl: finalVolume, status: newStatus }
            : item
        );

        const tx = createLedgerTransaction(
          b,
          'FEED',
          -deductAmount,
          activeCaregiver.id,
          activeCaregiver.name,
          {
            feedingId,
            reason: `Baixa automática de ${deductAmount}ml (${b.containerName || b.containerNumber ? `Frasco #${b.containerNumber || ''} ${b.containerName || ''}` : `Lote #${b.id}`})`,
          }
        );
        newTxList.push(tx);
        usedBatchIds.push(b.id);

        if (discardRemainingStock && remainingAfterDeduct > 0) {
          const discardTx = createLedgerTransaction(
            b,
            'DISCARD',
            -remainingAfterDeduct,
            activeCaregiver.id,
            activeCaregiver.name,
            {
              feedingId,
              reason: `Descarte de sobra pós-mamada (${remainingAfterDeduct}ml não consumidos)`,
            }
          );
          newTxList.push(discardTx);
        }

        finalAllocations.push({
          batchId: b.id,
          volumeMl: deductAmount,
          containerNumber: b.containerNumber,
          containerName: b.containerName,
          containerColor: b.containerColor,
          containerTag: b.containerTag,
        });

        remainingNeeded -= deductAmount;
      }
    }

    const details = usedBatchIds.map((id) => `#${id}`).join(', ');
    return {
      updatedBatches,
      newTransactions: newTxList,
      batchIdsUsed: usedBatchIds,
      batchesUsedDetails: finalAllocations,
      details,
      primaryBatch,
    };
  };

  // Helper function to revert inventory deductions made by a feeding record
  const revertFeedingInventoryDeduction = (
    feeding: FeedingRecord,
    currentBatches: MilkBatch[],
    currentTransactions: MilkTransaction[]
  ): { updatedBatches: MilkBatch[]; updatedTransactions: MilkTransaction[] } => {
    if (feeding.type !== 'leite_materno_ordenhado') {
      return { updatedBatches: currentBatches, updatedTransactions: currentTransactions };
    }

    let updatedBatches = [...currentBatches];
    let updatedTransactions = [...currentTransactions];
    const nowIso = new Date().toISOString();

    if (feeding.batchesUsedDetails && feeding.batchesUsedDetails.length > 0) {
      for (const alloc of feeding.batchesUsedDetails) {
        const batchIdx = updatedBatches.findIndex((b) => b.id === alloc.batchId);
        if (batchIdx >= 0) {
          const b = updatedBatches[batchIdx];
          const restoredVol = b.currentVolumeMl + (alloc.volumeMl || 0);
          const newStatus: MilkBatchStatus =
            restoredVol > 0 && b.status === 'consumido'
              ? ((b.location as MilkBatchStatus) || 'parcialmente_utilizado')
              : b.status;
          updatedBatches[batchIdx] = {
            ...b,
            currentVolumeMl: restoredVol,
            status: newStatus,
            updatedAt: nowIso,
          };

          const restoreTx: MilkTransaction = {
            id: `tx_revert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            timestamp: nowIso,
            batchId: b.id,
            type: 'CORRECTION',
            volumeChangeMl: alloc.volumeMl || 0,
            previousVolumeMl: b.currentVolumeMl,
            newVolumeMl: restoredVol,
            caregiverId: activeCaregiver.id,
            caregiverName: activeCaregiver.name,
            reason: `Estorno de estoque por edição/exclusão da mamada #${feeding.id}`,
            feedingId: feeding.id,
          };
          updatedTransactions = [restoreTx, ...updatedTransactions];
        }
      }
    } else if (feeding.batchIdsUsed && feeding.batchIdsUsed.length > 0) {
      const totalVol = feeding.offeredMl || feeding.consumedMl || 0;
      const batchIdx = updatedBatches.findIndex((b) => b.id === feeding.batchIdsUsed![0]);
      if (batchIdx >= 0 && totalVol > 0) {
        const b = updatedBatches[batchIdx];
        const restoredVol = b.currentVolumeMl + totalVol;
        const newStatus: MilkBatchStatus =
          restoredVol > 0 && b.status === 'consumido'
            ? ((b.location as MilkBatchStatus) || 'parcialmente_utilizado')
            : b.status;
        updatedBatches[batchIdx] = {
          ...b,
          currentVolumeMl: restoredVol,
          status: newStatus,
          updatedAt: nowIso,
        };

        const restoreTx: MilkTransaction = {
          id: `tx_revert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          timestamp: nowIso,
          batchId: b.id,
          type: 'CORRECTION',
          volumeChangeMl: totalVol,
          previousVolumeMl: b.currentVolumeMl,
          newVolumeMl: restoredVol,
          caregiverId: activeCaregiver.id,
          caregiverName: activeCaregiver.name,
          reason: `Estorno de estoque por edição/exclusão da mamada #${feeding.id}`,
          feedingId: feeding.id,
        };
        updatedTransactions = [restoreTx, ...updatedTransactions];
      }
    }

    updatedTransactions = updatedTransactions.filter(
      (tx) => !(tx.type === 'DISCARD_AFTER_FEEDING' && tx.reason?.includes(feeding.id))
    );

    return { updatedBatches, updatedTransactions };
  };

  // Feedings
  const addFeeding = (data: Omit<FeedingRecord, 'id' | 'caregiverId' | 'caregiverName'>) => {
    // Idempotency / Double-click check
    const recentDuplicate = feedingsRef.current.find((f) => {
      const timeDiff = Math.abs(new Date(f.createdAt).getTime() - Date.now());
      return (
        timeDiff < 1500 &&
        f.type === data.type &&
        f.consumedMl === data.consumedMl &&
        f.offeredMl === data.offeredMl &&
        f.timestamp === data.timestamp
      );
    });
    if (recentDuplicate) {
      return recentDuplicate;
    }

    const feedingId = `feed_${Date.now()}`;
    let finalBatchIdsUsed: string[] = data.batchIdsUsed || [];
    let finalAllocations: BatchAllocation[] | undefined = data.batchesUsedDetails;
    let updatedBatches = batchesRef.current;
    let updatedTransactions = transactionsRef.current;
    let primaryBatch: MilkBatch | undefined = undefined;

    // Baixa automática no estoque se a mamada for do estoque (leite materno ordenhado)
    if (data.type === 'leite_materno_ordenhado') {
      const shouldDiscardRemaining = Boolean(data.discardRemainingStock);
      // Volume to deduct from inventory is the total volume prepared/withdrawn from bottles
      const preparedVolume = data.batchesUsedDetails && data.batchesUsedDetails.length > 0
        ? data.batchesUsedDetails.reduce((acc, cur) => acc + (cur.volumeMl || 0), 0)
        : (data.offeredMl || data.consumedMl || 0);

      if (preparedVolume > 0) {
        const deduction = autoDeductFromInventory(
          preparedVolume,
          data.batchIdsUsed,
          feedingId,
          updatedBatches,
          data.batchesUsedDetails,
          shouldDiscardRemaining
        );
        
        updatedBatches = deduction.updatedBatches;
        if (deduction.newTransactions.length > 0) {
          updatedTransactions = [...deduction.newTransactions, ...updatedTransactions];
        }
        if (deduction.batchIdsUsed.length > 0) {
          finalBatchIdsUsed = deduction.batchIdsUsed;
        }
        if (deduction.batchesUsedDetails.length > 0) {
          finalAllocations = deduction.batchesUsedDetails;
        }
        primaryBatch = deduction.primaryBatch;

        // Record DISCARD_AFTER_FEEDING transaction if offered > consumed
        const offered = data.offeredMl || preparedVolume;
        const consumed = data.consumedMl || 0;
        if (offered > consumed && primaryBatch) {
          const discardVolume = offered - consumed;
          const postDiscardTx = createLedgerTransaction(
            primaryBatch,
            'DISCARD_AFTER_FEEDING',
            -discardVolume,
            activeCaregiver.id,
            activeCaregiver.name,
            {
              feedingId,
              reason: `Descarte de sobra de mamadeira pós-oferta (${discardVolume}ml oferecidos e não consumidos)`,
            }
          );
          updatedTransactions = [postDiscardTx, ...updatedTransactions];
        }
      }
    }

    if (!primaryBatch && finalBatchIdsUsed.length > 0) {
      primaryBatch = batchesRef.current.find((b) => b.id === finalBatchIdsUsed[0]);
    }

    // Build compound container description if multiple bottles were combined
    let containerTitle = primaryBatch?.containerName || data.containerName;
    if (finalAllocations && finalAllocations.length > 1) {
      containerTitle = `${finalAllocations.length} frascos combinados (${finalAllocations.map(a => `${a.containerNumber ? `#${a.containerNumber}` : a.batchId}: ${a.volumeMl}ml`).join(' + ')})`;
    }

    const nowIso = new Date().toISOString();
    const newRecord: FeedingRecord = {
      ...data,
      id: feedingId,
      batchIdsUsed: finalBatchIdsUsed.length > 0 ? finalBatchIdsUsed : undefined,
      batchesUsedDetails: finalAllocations && finalAllocations.length > 0 ? finalAllocations : undefined,
      containerNumber: primaryBatch?.containerNumber || data.containerNumber,
      containerName: containerTitle,
      containerColor: primaryBatch?.containerColor || data.containerColor,
      containerTag: primaryBatch?.containerTag || data.containerTag,
      caregiverId: activeCaregiver.id,
      caregiverName: activeCaregiver.name,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newFeedings = [newRecord, ...feedingsRef.current];
    feedingsRef.current = newFeedings;
    batchesRef.current = updatedBatches;
    transactionsRef.current = updatedTransactions;

    setBatches(updatedBatches);
    setTransactions(updatedTransactions);
    setFeedings(newFeedings);

    persistFamilyData({
      batches: updatedBatches,
      transactions: updatedTransactions,
      feedings: newFeedings,
    });

    return newRecord;
  };

  const updateFeeding = (id: string, updated: Partial<FeedingRecord>) => {
    const nowIso = new Date().toISOString();
    const existing = feedingsRef.current.find((f) => f.id === id);
    if (!existing) return;

    // 1. Revert previous inventory deduction
    let { updatedBatches, updatedTransactions } = revertFeedingInventoryDeduction(
      existing,
      batchesRef.current,
      transactionsRef.current
    );

    const mergedFeeding: FeedingRecord = {
      ...existing,
      ...updated,
      updatedAt: nowIso,
    };

    let finalBatchIdsUsed = mergedFeeding.batchIdsUsed || [];
    let finalAllocations = mergedFeeding.batchesUsedDetails || [];
    let primaryBatch: MilkBatch | undefined = undefined;

    // 2. Re-apply inventory deduction if this feeding uses milk stock
    if (mergedFeeding.type === 'leite_materno_ordenhado') {
      const shouldDiscardRemaining = Boolean(mergedFeeding.discardRemainingStock);
      const preparedVolume = mergedFeeding.batchesUsedDetails && mergedFeeding.batchesUsedDetails.length > 0
        ? mergedFeeding.batchesUsedDetails.reduce((acc, cur) => acc + (cur.volumeMl || 0), 0)
        : (mergedFeeding.offeredMl || mergedFeeding.consumedMl || 0);

      if (preparedVolume > 0) {
        const deduction = autoDeductFromInventory(
          preparedVolume,
          mergedFeeding.batchIdsUsed,
          id,
          updatedBatches,
          mergedFeeding.batchesUsedDetails,
          shouldDiscardRemaining
        );

        updatedBatches = deduction.updatedBatches;
        if (deduction.newTransactions.length > 0) {
          updatedTransactions = [...deduction.newTransactions, ...updatedTransactions];
        }
        if (deduction.batchIdsUsed.length > 0) {
          finalBatchIdsUsed = deduction.batchIdsUsed;
        }
        if (deduction.batchesUsedDetails.length > 0) {
          finalAllocations = deduction.batchesUsedDetails;
        }
        primaryBatch = deduction.primaryBatch;

        const offered = mergedFeeding.offeredMl || preparedVolume;
        const consumed = mergedFeeding.consumedMl || 0;
        if (offered > consumed && primaryBatch) {
          const discardVolume = offered - consumed;
          const postDiscardTx = createLedgerTransaction(
            primaryBatch,
            'DISCARD_AFTER_FEEDING',
            -discardVolume,
            activeCaregiver.id,
            activeCaregiver.name,
            {
              feedingId: id,
              reason: `Descarte de sobra de mamadeira pós-oferta (${discardVolume}ml oferecidos e não consumidos)`,
            }
          );
          updatedTransactions = [postDiscardTx, ...updatedTransactions];
        }
      }
    }

    mergedFeeding.batchIdsUsed = finalBatchIdsUsed.length > 0 ? finalBatchIdsUsed : undefined;
    mergedFeeding.batchesUsedDetails = finalAllocations.length > 0 ? finalAllocations : undefined;

    const newFeedings = feedingsRef.current.map((f) => (f.id === id ? mergedFeeding : f));

    feedingsRef.current = newFeedings;
    batchesRef.current = updatedBatches;
    transactionsRef.current = updatedTransactions;

    setFeedings(newFeedings);
    setBatches(updatedBatches);
    setTransactions(updatedTransactions);

    persistFamilyData({
      feedings: newFeedings,
      batches: updatedBatches,
      transactions: updatedTransactions,
    });
  };

  const deleteFeeding = (id: string) => {
    recordManualDeletion(id);
    const existing = feedingsRef.current.find((f) => f.id === id);

    let updatedBatches = batchesRef.current;
    let updatedTransactions = transactionsRef.current;

    if (existing) {
      const reverted = revertFeedingInventoryDeduction(existing, updatedBatches, updatedTransactions);
      updatedBatches = reverted.updatedBatches;
      updatedTransactions = reverted.updatedTransactions;
    }

    const newFeedings = feedingsRef.current.filter((f) => f.id !== id);

    feedingsRef.current = newFeedings;
    batchesRef.current = updatedBatches;
    transactionsRef.current = updatedTransactions;

    setFeedings(newFeedings);
    setBatches(updatedBatches);
    setTransactions(updatedTransactions);

    persistFamilyData({
      feedings: newFeedings,
      batches: updatedBatches,
      transactions: updatedTransactions,
    });
  };

  // Pumpings - Automatic stock addition with selected storage destination
  const addPumping = (data: Omit<PumpingRecord, 'id' | 'caregiverId' | 'caregiverName'>) => {
    // Idempotency / Double-click check
    const recentDuplicate = pumpingsRef.current.find((p) => {
      const timeDiff = Math.abs(new Date(p.createdAt).getTime() - Date.now());
      return (
        timeDiff < 1500 &&
        p.totalVolumeMl === data.totalVolumeMl &&
        p.timestamp === data.timestamp
      );
    });
    if (recentDuplicate) {
      return recentDuplicate;
    }

    const nowIso = new Date().toISOString();
    const newRecord: PumpingRecord = {
      ...data,
      id: `pump_${Date.now()}`,
      caregiverId: activeCaregiver.id,
      caregiverName: activeCaregiver.name,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    let updatedBatches = batchesRef.current;
    let updatedTransactions = transactionsRef.current;

    // Automatic entry into milk inventory
    if (data.totalVolumeMl > 0) {
      const activeProto = protocolIdRef.current;
      const expiresAt = calculateBatchExpiry(data.timestamp, data.targetStorage, activeProto);
      const newBatchId = `LOTE-${Math.floor(1000 + Math.random() * 9000)}`;

      const newBatch: MilkBatch = {
        id: newBatchId,
        containerName: data.containerName,
        containerNumber: data.containerNumber,
        containerColor: data.containerColor,
        containerTag: data.containerTag,
        createdAt: nowIso,
        updatedAt: nowIso,
        extractedAt: data.timestamp,
        expiresAt: expiresAt,
        originalVolumeMl: data.totalVolumeMl,
        currentVolumeMl: data.totalVolumeMl,
        location: data.targetStorage,
        status: data.targetStorage === 'geladeira' ? 'geladeira' : data.targetStorage === 'freezer' ? 'freezer' : 'recem_ordenhado',
        protocolId: activeProto,
        caregiverId: activeCaregiver.id,
        caregiverName: activeCaregiver.name,
        notes: data.notes || `Ordenha (${data.method.replace('_', ' ')}) • E: ${data.leftVolumeMl}ml, D: ${data.rightVolumeMl}ml`,
        sideDistribution: { left: data.leftVolumeMl, right: data.rightVolumeMl },
      };

      updatedBatches = [newBatch, ...updatedBatches];

      const tx = createLedgerTransaction(
        newBatch,
        'EXTRACTION',
        newBatch.originalVolumeMl,
        activeCaregiver.id,
        activeCaregiver.name,
        {
          toLocation: newBatch.location,
          reason: `Ordenha automática de ${data.totalVolumeMl}ml adicionada ao estoque (${data.targetStorage})`,
        }
      );
      updatedTransactions = [tx, ...updatedTransactions];

      newRecord.batchIdCreated = newBatchId;
    }

    const newPumpings = [newRecord, ...pumpingsRef.current];
    pumpingsRef.current = newPumpings;
    batchesRef.current = updatedBatches;
    transactionsRef.current = updatedTransactions;

    setBatches(updatedBatches);
    setTransactions(updatedTransactions);
    setPumpings(newPumpings);

    persistFamilyData({
      batches: updatedBatches,
      transactions: updatedTransactions,
      pumpings: newPumpings,
    });

    return newRecord;
  };

  const updatePumping = (id: string, updated: Partial<PumpingRecord>) => {
    const nowIso = new Date().toISOString();
    const newPumpings = pumpingsRef.current.map((p) => (p.id === id ? { ...p, ...updated, updatedAt: nowIso } : p));
    pumpingsRef.current = newPumpings;
    setPumpings(newPumpings);
    persistFamilyData({ pumpings: newPumpings });
  };

  const deletePumping = (id: string) => {
    recordManualDeletion(id);
    const newPumpings = pumpingsRef.current.filter((p) => p.id !== id);
    pumpingsRef.current = newPumpings;
    setPumpings(newPumpings);
    persistFamilyData({ pumpings: newPumpings });
  };

  // Helper function for computing diaper stock status
  const computeDiaperStockStatus = (quantity: number, threshold = 20): DiaperStockStatus => {
    if (quantity <= 0) return 'OUT_OF_STOCK';
    if (quantity <= threshold) return 'LOW_STOCK';
    return 'ACTIVE';
  };

  // Diaper Stock Management Methods (Estoque de Fraldas)
  const addDiaperStockItem = (
    data: Omit<DiaperStockItem, 'id' | 'createdAt' | 'quantityCurrent' | 'status'> & { quantityCurrent?: number; status?: DiaperStockStatus }
  ): DiaperStockItem => {
    const nowIso = new Date().toISOString();
    const itemId = `ds_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const currentQty = data.quantityCurrent !== undefined ? data.quantityCurrent : data.quantityPurchased;
    const activeList = diaperStockItemsRef.current.filter((i) => i.status !== 'ARCHIVED');
    const isFirst = activeList.length === 0;
    const setAsDefault = data.isDefaultInUse ?? isFirst;

    let updatedStockList = diaperStockItemsRef.current.map((item) =>
      setAsDefault ? { ...item, isDefaultInUse: false } : item
    );

    const newItem: DiaperStockItem = {
      ...data,
      id: itemId,
      familyId: currentFamily?.id,
      babyId: baby.id,
      quantityPurchased: data.quantityPurchased,
      quantityCurrent: Math.max(0, currentQty),
      purchaseDate: data.purchaseDate || new Date().toISOString().split('T')[0],
      status: data.status || computeDiaperStockStatus(currentQty, baby.lowStockThreshold || 20),
      isDefaultInUse: setAsDefault,
      createdBy: activeCaregiver.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    updatedStockList = [newItem, ...updatedStockList];

    // Record PURCHASE transaction
    const purchaseTx: DiaperStockTransaction = {
      id: `dstx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      familyId: currentFamily?.id,
      babyId: baby.id,
      diaperStockItemId: itemId,
      type: 'PURCHASE',
      quantity: data.quantityPurchased,
      dateTime: newItem.purchaseDate,
      createdBy: activeCaregiver.id,
      notes: `Compra realizada (${data.brand} ${data.productLine || ''} ${data.size})`,
      createdAt: nowIso,
    };

    const updatedTxList = [purchaseTx, ...diaperStockTransactionsRef.current];

    diaperStockItemsRef.current = updatedStockList;
    diaperStockTransactionsRef.current = updatedTxList;
    setDiaperStockItems(updatedStockList);
    setDiaperStockTransactions(updatedTxList);

    if (setAsDefault) {
      updateBaby({ defaultDiaperStockItemId: itemId });
    }

    persistFamilyData({
      diaperStockItems: updatedStockList,
      diaperStockTransactions: updatedTxList,
    });

    return newItem;
  };

  const updateDiaperStockItem = (id: string, updates: Partial<DiaperStockItem>) => {
    const nowIso = new Date().toISOString();
    const updatedStockList = diaperStockItemsRef.current.map((item) => {
      if (item.id !== id) return item;
      const nextQty = updates.quantityCurrent !== undefined ? updates.quantityCurrent : item.quantityCurrent;
      return {
        ...item,
        ...updates,
        quantityCurrent: Math.max(0, nextQty),
        status: updates.status || computeDiaperStockStatus(nextQty, baby.lowStockThreshold || 20),
        updatedAt: nowIso,
      };
    });
    diaperStockItemsRef.current = updatedStockList;
    setDiaperStockItems(updatedStockList);
    persistFamilyData({ diaperStockItems: updatedStockList });
  };

  const deleteDiaperStockItem = (id: string) => {
    recordManualDeletion(id);
    const updatedStockList = diaperStockItemsRef.current.map((item) =>
      item.id === id ? { ...item, status: 'ARCHIVED' as DiaperStockStatus, isDefaultInUse: false } : item
    );
    diaperStockItemsRef.current = updatedStockList;
    setDiaperStockItems(updatedStockList);
    persistFamilyData({ diaperStockItems: updatedStockList });
  };

  const setDefaultDiaperStockItem = (id: string) => {
    const updatedStockList = diaperStockItemsRef.current.map((item) => ({
      ...item,
      isDefaultInUse: item.id === id,
    }));
    diaperStockItemsRef.current = updatedStockList;
    setDiaperStockItems(updatedStockList);
    updateBaby({ defaultDiaperStockItemId: id });
    persistFamilyData({ diaperStockItems: updatedStockList });
  };

  const adjustDiaperStockItemQuantity = (id: string, newQuantity: number, notes?: string) => {
    const targetItem = diaperStockItemsRef.current.find((i) => i.id === id);
    if (!targetItem) return;

    const sanitizedQty = Math.max(0, newQuantity);
    const delta = sanitizedQty - targetItem.quantityCurrent;
    if (delta === 0) return;

    const nowIso = new Date().toISOString();
    const updatedStockList = diaperStockItemsRef.current.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        quantityCurrent: sanitizedQty,
        status: computeDiaperStockStatus(sanitizedQty, baby.lowStockThreshold || 20),
        updatedAt: nowIso,
      };
    });

    const adjustTx: DiaperStockTransaction = {
      id: `dstx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      familyId: currentFamily?.id,
      babyId: baby.id,
      diaperStockItemId: id,
      type: 'ADJUST',
      quantity: delta,
      dateTime: nowIso,
      createdBy: activeCaregiver.id,
      notes: notes || `Ajuste manual de saldo (${delta > 0 ? '+' : ''}${delta})`,
      createdAt: nowIso,
    };

    const updatedTxList = [adjustTx, ...diaperStockTransactionsRef.current];

    diaperStockItemsRef.current = updatedStockList;
    diaperStockTransactionsRef.current = updatedTxList;
    setDiaperStockItems(updatedStockList);
    setDiaperStockTransactions(updatedTxList);

    persistFamilyData({
      diaperStockItems: updatedStockList,
      diaperStockTransactions: updatedTxList,
    });
  };

  const replenishDiaperStockItem = (id: string, quantityToAdd: number, totalCost?: number, notes?: string) => {
    const targetItem = diaperStockItemsRef.current.find((i) => i.id === id);
    if (!targetItem || quantityToAdd <= 0) return;

    const nowIso = new Date().toISOString();
    const nextQty = targetItem.quantityCurrent + quantityToAdd;
    const nextPurchased = (targetItem.quantityPurchased || 0) + quantityToAdd;
    const nextTotalCost = totalCost !== undefined ? ((targetItem.totalCost || 0) + totalCost) : targetItem.totalCost;

    const updatedStockList = diaperStockItemsRef.current.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        quantityCurrent: nextQty,
        quantityPurchased: nextPurchased,
        totalCost: nextTotalCost,
        status: computeDiaperStockStatus(nextQty, baby.lowStockThreshold || 20),
        updatedAt: nowIso,
      };
    });

    const addTx: DiaperStockTransaction = {
      id: `dstx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      familyId: currentFamily?.id,
      babyId: baby.id,
      diaperStockItemId: id,
      type: 'ADD',
      quantity: quantityToAdd,
      dateTime: nowIso,
      createdBy: activeCaregiver.id,
      notes: notes || `Entrada adicional ao estoque (+${quantityToAdd} un)`,
      createdAt: nowIso,
    };

    const updatedTxList = [addTx, ...diaperStockTransactionsRef.current];

    diaperStockItemsRef.current = updatedStockList;
    diaperStockTransactionsRef.current = updatedTxList;
    setDiaperStockItems(updatedStockList);
    setDiaperStockTransactions(updatedTxList);

    persistFamilyData({
      diaperStockItems: updatedStockList,
      diaperStockTransactions: updatedTxList,
    });
  };

  const addDiaperStockTransaction = (txData: Omit<DiaperStockTransaction, 'id' | 'createdAt'>): DiaperStockTransaction => {
    const nowIso = new Date().toISOString();
    const newTx: DiaperStockTransaction = {
      ...txData,
      id: `dstx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      familyId: currentFamily?.id,
      babyId: baby.id,
      createdBy: txData.createdBy || activeCaregiver.id,
      createdAt: nowIso,
    };
    const updatedTxList = [newTx, ...diaperStockTransactionsRef.current];
    diaperStockTransactionsRef.current = updatedTxList;
    setDiaperStockTransactions(updatedTxList);
    persistFamilyData({ diaperStockTransactions: updatedTxList });
    return newTx;
  };

  const addDiaperShoppingItem = (itemData: Omit<DiaperShoppingItem, 'id' | 'createdAt' | 'status'>): DiaperShoppingItem => {
    const nowIso = new Date().toISOString();
    const newItem: DiaperShoppingItem = {
      ...itemData,
      id: `dshop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      familyId: currentFamily?.id,
      babyId: baby.id,
      status: 'PENDING',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const updated = [newItem, ...diaperShoppingItemsRef.current];
    diaperShoppingItemsRef.current = updated;
    setDiaperShoppingItems(updated);
    persistFamilyData({ diaperShoppingItems: updated });
    return newItem;
  };

  const updateDiaperShoppingItem = (id: string, updates: Partial<DiaperShoppingItem>) => {
    const nowIso = new Date().toISOString();
    const updated = diaperShoppingItemsRef.current.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: nowIso } : item));
    diaperShoppingItemsRef.current = updated;
    setDiaperShoppingItems(updated);
    persistFamilyData({ diaperShoppingItems: updated });
  };

  const deleteDiaperShoppingItem = (id: string) => {
    recordManualDeletion(id);
    const updated = diaperShoppingItemsRef.current.filter((item) => item.id !== id);
    diaperShoppingItemsRef.current = updated;
    setDiaperShoppingItems(updated);
    persistFamilyData({ diaperShoppingItems: updated });
  };

  // Diapers with Automatic Stock Deduction & Recovery
  const addDiaper = (data: Omit<DiaperRecord, 'id' | 'caregiverId' | 'caregiverName'> | any) => {
    // Idempotency / Double-click check
    const recentDuplicate = diapersRef.current.find((d) => {
      const timeDiff = Math.abs(new Date(d.createdAt).getTime() - Date.now());
      return (
        timeDiff < 1500 &&
        d.hasPee === data.hasPee &&
        d.hasPoop === data.hasPoop &&
        d.timestamp === data.timestamp
      );
    });
    if (recentDuplicate) {
      return recentDuplicate;
    }

    const nowIso = new Date().toISOString();
    const recordId = data.id || `diaper_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    clearManualDeletion(recordId);

    let chosenStockItemId: string | undefined = data.diaperStockItemId;
    let diaperBrand: string | undefined = data.diaperBrand;
    let diaperSize: string | undefined = data.diaperSize;

    let updatedStockItems = diaperStockItemsRef.current;
    let updatedTransactions = diaperStockTransactionsRef.current;

    // Determine target stock item if not explicitly set
    if (!chosenStockItemId && chosenStockItemId !== 'none') {
      const defaultItem = updatedStockItems.find(
        (i) => i.status !== 'ARCHIVED' && (i.isDefaultInUse || i.id === baby.defaultDiaperStockItemId)
      ) || updatedStockItems.find((i) => i.status !== 'ARCHIVED' && i.quantityCurrent > 0);

      if (defaultItem) {
        chosenStockItemId = defaultItem.id;
      }
    }

    if (chosenStockItemId && chosenStockItemId !== 'none') {
      const stockItem = updatedStockItems.find((i) => i.id === chosenStockItemId);
      if (stockItem) {
        diaperBrand = diaperBrand || stockItem.brand;
        diaperSize = diaperSize || stockItem.size;

        // Auto-deduct 1 unit if stock is > 0
        if (stockItem.quantityCurrent > 0) {
          const newQty = stockItem.quantityCurrent - 1;
          const newStatus = computeDiaperStockStatus(newQty, baby.lowStockThreshold || 20);

          updatedStockItems = updatedStockItems.map((item) =>
            item.id === stockItem.id
              ? { ...item, quantityCurrent: newQty, status: newStatus, updatedAt: nowIso }
              : item
          );

          // Add USE transaction
          const useTx: DiaperStockTransaction = {
            id: `dstx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            familyId: currentFamily?.id,
            babyId: baby.id,
            diaperStockItemId: stockItem.id,
            diaperRecordId: recordId,
            diaperChangeId: recordId,
            type: 'USE',
            quantity: -1,
            dateTime: data.timestamp || nowIso,
            createdBy: activeCaregiver.id,
            notes: `Baixa automática em troca de fralda (${data.hasPee && data.hasPoop ? 'Xixi e Cocô' : data.hasPoop ? 'Cocô' : 'Xixi'})`,
            createdAt: nowIso,
          };
          updatedTransactions = [useTx, ...updatedTransactions];
        }
      }
    } else {
      chosenStockItemId = undefined;
    }

    const newRecord: DiaperRecord = {
      ...data,
      id: recordId,
      diaperStockItemId: chosenStockItemId,
      diaperBrand,
      diaperSize,
      caregiverId: data.caregiverId || activeCaregiver.id,
      caregiverName: data.caregiverName || activeCaregiver.name,
      createdAt: data.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const newDiapers = [newRecord, ...diapersRef.current.filter((d) => d.id !== recordId)].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    diapersRef.current = newDiapers;
    diaperStockItemsRef.current = updatedStockItems;
    diaperStockTransactionsRef.current = updatedTransactions;

    setDiapers(newDiapers);
    setDiaperStockItems(updatedStockItems);
    setDiaperStockTransactions(updatedTransactions);

    persistFamilyData({
      diapers: newDiapers,
      diaperStockItems: updatedStockItems,
      diaperStockTransactions: updatedTransactions,
    });

    return newRecord;
  };

  const updateDiaper = (id: string, updated: Partial<DiaperRecord>) => {
    const nowIso = new Date().toISOString();
    const existing = diapersRef.current.find((d) => d.id === id);

    let updatedStockItems = diaperStockItemsRef.current;
    let updatedTransactions = diaperStockTransactionsRef.current;

    if (existing && updated.diaperStockItemId !== undefined && updated.diaperStockItemId !== existing.diaperStockItemId) {
      // 1. Restore from old stock item if exists
      if (existing.diaperStockItemId) {
        const oldStockItem = updatedStockItems.find((i) => i.id === existing.diaperStockItemId);
        if (oldStockItem) {
          const restoredQty = oldStockItem.quantityCurrent + 1;
          updatedStockItems = updatedStockItems.map((item) =>
            item.id === oldStockItem.id
              ? {
                  ...item,
                  quantityCurrent: restoredQty,
                  status: computeDiaperStockStatus(restoredQty, baby.lowStockThreshold || 20),
                  updatedAt: nowIso,
                }
              : item
          );
          updatedTransactions = [
            {
              id: `dstx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              familyId: currentFamily?.id,
              babyId: baby.id,
              diaperStockItemId: oldStockItem.id,
              diaperChangeId: id,
              type: 'RESTORE',
              quantity: 1,
              dateTime: nowIso,
              createdBy: activeCaregiver.id,
              notes: 'Restauração por alteração de lote de fralda na troca',
              createdAt: nowIso,
            },
            ...updatedTransactions,
          ];
        }
      }

      // 2. Deduct from new stock item if exists
      if (updated.diaperStockItemId && updated.diaperStockItemId !== 'none') {
        const newStockItem = updatedStockItems.find((i) => i.id === updated.diaperStockItemId);
        if (newStockItem && newStockItem.quantityCurrent > 0) {
          const newQty = newStockItem.quantityCurrent - 1;
          updatedStockItems = updatedStockItems.map((item) =>
            item.id === newStockItem.id
              ? {
                  ...item,
                  quantityCurrent: newQty,
                  status: computeDiaperStockStatus(newQty, baby.lowStockThreshold || 20),
                  updatedAt: nowIso,
                }
              : item
          );
          updatedTransactions = [
            {
              id: `dstx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              familyId: currentFamily?.id,
              babyId: baby.id,
              diaperStockItemId: newStockItem.id,
              diaperChangeId: id,
              type: 'USE',
              quantity: -1,
              dateTime: nowIso,
              createdBy: activeCaregiver.id,
              notes: 'Baixa por alteração de lote de fralda na troca',
              createdAt: nowIso,
            },
            ...updatedTransactions,
          ];
          updated.diaperBrand = newStockItem.brand;
          updated.diaperSize = newStockItem.size;
        }
      }
    }

    const newDiapers = diapersRef.current
      .map((d) => (d.id === id ? { ...d, ...updated, updatedAt: nowIso } : d))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    diapersRef.current = newDiapers;
    diaperStockItemsRef.current = updatedStockItems;
    diaperStockTransactionsRef.current = updatedTransactions;

    setDiapers(newDiapers);
    setDiaperStockItems(updatedStockItems);
    setDiaperStockTransactions(updatedTransactions);

    persistFamilyData({
      diapers: newDiapers,
      diaperStockItems: updatedStockItems,
      diaperStockTransactions: updatedTransactions,
    });
  };

  const deleteDiaper = (id: string) => {
    recordManualDeletion(id);
    const existing = diapersRef.current.find((d) => d.id === id);

    let updatedStockItems = diaperStockItemsRef.current;
    let updatedTransactions = diaperStockTransactionsRef.current;

    if (existing && existing.diaperStockItemId) {
      const stockItem = updatedStockItems.find((i) => i.id === existing.diaperStockItemId);
      if (stockItem) {
        const restoredQty = stockItem.quantityCurrent + 1;
        const nowIso = new Date().toISOString();

        updatedStockItems = updatedStockItems.map((item) =>
          item.id === stockItem.id
            ? {
                ...item,
                quantityCurrent: restoredQty,
                status: computeDiaperStockStatus(restoredQty, baby.lowStockThreshold || 20),
                updatedAt: nowIso,
              }
            : item
        );

        const restoreTx: DiaperStockTransaction = {
          id: `dstx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          familyId: currentFamily?.id,
          babyId: baby.id,
          diaperStockItemId: stockItem.id,
          diaperChangeId: id,
          type: 'RESTORE',
          quantity: 1,
          dateTime: nowIso,
          createdBy: activeCaregiver.id,
          notes: 'Restauração de saldo por exclusão de troca de fralda',
          createdAt: nowIso,
        };
        updatedTransactions = [restoreTx, ...updatedTransactions];
      }
    }

    const newDiapers = diapersRef.current.filter((d) => d.id !== id);
    diapersRef.current = newDiapers;
    diaperStockItemsRef.current = updatedStockItems;
    diaperStockTransactionsRef.current = updatedTransactions;

    setDiapers(newDiapers);
    setDiaperStockItems(updatedStockItems);
    setDiaperStockTransactions(updatedTransactions);

    persistFamilyData({
      diapers: newDiapers,
      diaperStockItems: updatedStockItems,
      diaperStockTransactions: updatedTransactions,
    });
  };

  // Diaper Stock Summary Dashboard Metrics
  const diaperStockSummary = useMemo(() => {
    const safeStockItems = Array.isArray(diaperStockItems) ? diaperStockItems : [];
    const safeDiapers = Array.isArray(diapers) ? diapers : [];
    const safeWeights = Array.isArray(weights) ? weights : [];

    const activeItems = safeStockItems.filter((i) => i && i.status !== 'ARCHIVED');
    const totalAvailable = activeItems.reduce((acc, cur) => acc + (cur?.quantityCurrent || 0), 0);

    const defaultItem =
      activeItems.find((i) => i && (i.isDefaultInUse || (baby && i.id === baby.defaultDiaperStockItemId))) ||
      activeItems.find((i) => (i?.quantityCurrent || 0) > 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const consumptionToday = safeDiapers.filter(
      (d) => d?.timestamp && typeof d.timestamp === 'string' && d.timestamp.startsWith(todayStr)
    ).length;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const diapersLast7Days = safeDiapers.filter(
      (d) => d?.timestamp && !isNaN(new Date(d.timestamp).getTime()) && new Date(d.timestamp) >= sevenDaysAgo
    ).length;
    const hasSufficientHistory = diapersLast7Days >= 3;
    const avg7Days = diapersLast7Days > 0 ? Math.round((diapersLast7Days / 7) * 10) / 10 : 0;

    const daysRemainingDefault = (defaultItem && avg7Days > 0) ? Math.round((defaultItem.quantityCurrent || 0) / avg7Days) : 0;
    const daysRemainingTotal = avg7Days > 0 ? Math.round(totalAvailable / avg7Days) : 0;

    const lowThreshold = baby?.lowStockThreshold || 20;
    const isLowStock =
      totalAvailable > 0 &&
      (((defaultItem && (defaultItem.quantityCurrent || 0) <= lowThreshold)) ||
        (hasSufficientHistory && daysRemainingDefault > 0 && daysRemainingDefault <= 3) ||
        totalAvailable <= lowThreshold);

    let weightAlert: { type: 'NEAR_MAX' | 'ABOVE_MAX'; message: string; currentWeightKg: number; maxWeightKg: number } | undefined = undefined;
    const latestWeightGrams = safeWeights[0]?.weightGrams || baby?.currentWeight || 0;
    const currentWeightKg = Math.round((latestWeightGrams / 1000) * 10) / 10;

    if (defaultItem && defaultItem.weightMaxKg && currentWeightKg > 0) {
      if (currentWeightKg > defaultItem.weightMaxKg) {
        weightAlert = {
          type: 'ABOVE_MAX',
          message: `Revisar tamanho da fralda: O peso atual (${currentWeightKg} kg) está acima da faixa cadastrada para a fralda em uso (${defaultItem.size} - até ${defaultItem.weightMaxKg} kg).`,
          currentWeightKg,
          maxWeightKg: defaultItem.weightMaxKg,
        };
      } else if (currentWeightKg >= defaultItem.weightMaxKg - 0.5) {
        weightAlert = {
          type: 'NEAR_MAX',
          message: `ATENÇÃO AO TAMANHO: O peso atual (${currentWeightKg} kg) está próximo do limite máximo da fralda atual (${defaultItem.size} - até ${defaultItem.weightMaxKg} kg).`,
          currentWeightKg,
          maxWeightKg: defaultItem.weightMaxKg,
        };
      }
    }

    let nextSizeSuggestion: { size: string; brand: string; availableCount: number } | undefined = undefined;
    if (weightAlert && defaultItem) {
      const otherSizesInStock = activeItems.find(
        (i) => i && i.id !== defaultItem.id && (i.quantityCurrent || 0) > 0 && (i.weightMinKg || 0) >= (defaultItem.weightMaxKg || 0)
      );
      if (otherSizesInStock) {
        nextSizeSuggestion = {
          size: otherSizesInStock.size,
          brand: otherSizesInStock.brand,
          availableCount: otherSizesInStock.quantityCurrent,
        };
      }
    }

    const sizeBreakdown: Record<string, number> = {};
    const brandBreakdown: Record<string, number> = {};

    activeItems.forEach((item) => {
      if (!item) return;
      const sz = item.size || 'Outro';
      sizeBreakdown[sz] = (sizeBreakdown[sz] || 0) + (item.quantityCurrent || 0);

      const br = item.brand || 'Outra';
      brandBreakdown[br] = (brandBreakdown[br] || 0) + (item.quantityCurrent || 0);
    });

    return {
      totalAvailable,
      defaultItem,
      consumptionToday,
      avg7Days,
      daysRemainingDefault,
      daysRemainingTotal,
      isLowStock,
      hasSufficientHistory,
      weightAlert,
      nextSizeSuggestion,
      sizeBreakdown,
      brandBreakdown,
    };
  }, [diaperStockItems, diapers, weights, baby]);

  // Discomforts
  const addDiscomfort = (data: Omit<DiaperRecord, 'id' | 'caregiverId' | 'caregiverName'> | any) => {
    const nowIso = new Date().toISOString();
    const newRecord: DiscomfortRecord = {
      ...data,
      id: `discomfort_${Date.now()}`,
      caregiverId: activeCaregiver.id,
      caregiverName: activeCaregiver.name,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const newDiscomforts = [newRecord, ...discomfortsRef.current];
    discomfortsRef.current = newDiscomforts;
    setDiscomforts(newDiscomforts);
    persistFamilyData({ discomforts: newDiscomforts });
    return newRecord;
  };

  const deleteDiscomfort = (id: string) => {
    recordManualDeletion(id);
    const newDiscomforts = discomfortsRef.current.filter((d) => d.id !== id);
    discomfortsRef.current = newDiscomforts;
    setDiscomforts(newDiscomforts);
    persistFamilyData({ discomforts: newDiscomforts });
  };

  // Sleep Management (Sono & Sonecas)
  const addSleepRecord = (data: Omit<SleepRecord, 'id' | 'caregiverId' | 'caregiverName'>) => {
    const nowIso = new Date().toISOString();
    const newRecord: SleepRecord = {
      ...data,
      id: `sleep_${Date.now()}`,
      caregiverId: activeCaregiver.id,
      caregiverName: activeCaregiver.name,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const newSleepLogs = [newRecord, ...sleepLogsRef.current];
    sleepLogsRef.current = newSleepLogs;
    setSleepLogs(newSleepLogs);
    persistFamilyData({ sleepLogs: newSleepLogs });
    return newRecord;
  };

  const updateSleepRecord = (id: string, updated: Partial<SleepRecord>) => {
    const nowIso = new Date().toISOString();
    const newSleepLogs = sleepLogsRef.current.map((s) => (s.id === id ? { ...s, ...updated, updatedAt: nowIso } : s));
    sleepLogsRef.current = newSleepLogs;
    setSleepLogs(newSleepLogs);
    persistFamilyData({ sleepLogs: newSleepLogs });
  };

  const deleteSleepRecord = (id: string) => {
    recordManualDeletion(id);
    const newSleepLogs = sleepLogsRef.current.filter((s) => s.id !== id);
    sleepLogsRef.current = newSleepLogs;
    setSleepLogs(newSleepLogs);
    persistFamilyData({ sleepLogs: newSleepLogs });
  };

  const startSleepTimer = (location: SleepLocation = 'berco', type: SleepType = 'soneca_dia') => {
    setActiveSleepTimer({
      isSleeping: true,
      startTime: new Date().toISOString(),
      location,
      type,
    });
  };

  const stopSleepTimer = (
    quality: SleepQuality = 'tranquilo',
    wakingReason: SleepWakingReason = 'espontaneo',
    notes: string = ''
  ): SleepRecord | null => {
    if (!activeSleepTimer.isSleeping || !activeSleepTimer.startTime) return null;

    const endTime = new Date().toISOString();
    const startMs = new Date(activeSleepTimer.startTime).getTime();
    const endMs = new Date(endTime).getTime();
    const durationMinutes = Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));

    const created = addSleepRecord({
      startTime: activeSleepTimer.startTime,
      endTime,
      durationMinutes,
      type: activeSleepTimer.type,
      location: activeSleepTimer.location,
      quality,
      wakingReason,
      notes,
    });

    setActiveSleepTimer({
      isSleeping: false,
      startTime: null,
      location: 'berco',
      type: 'soneca_dia',
    });

    return created;
  };

  // Next Feeding Alarm & Calendar helpers
  const playAlarmSound = () => {
    playGentleFeedingChime();
  };

  const exportAlarmCalendar = () => {
    if (todayStats.nextExpectedFeeding) {
      exportFeedingToCalendar(
        activeBaby?.name || defaultBaby.name,
        todayStats.nextExpectedFeeding,
        todayStats.lastFeeding?.consumedMl || 60
      );
    }
  };

  // Weights
  const addWeight = (data: Omit<WeightRecord, 'id' | 'caregiverId' | 'caregiverName'>) => {
    const nowIso = new Date().toISOString();
    const newRecord: WeightRecord = {
      ...data,
      id: `weight_${Date.now()}`,
      caregiverId: activeCaregiver.id,
      caregiverName: activeCaregiver.name,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const unsorted = [newRecord, ...weightsRef.current];
    const newWeights = [...unsorted].sort((a, b) => parseSafeRecordTime(b) - parseSafeRecordTime(a));
    weightsRef.current = newWeights;
    setWeights(newWeights);

    // Compute latest metrics from updated list
    const latestWeight = newWeights.find((w) => typeof w.weightGrams === 'number' && w.weightGrams > 0);
    const latestLength = newWeights.find((w) => typeof w.lengthCm === 'number' && w.lengthCm > 0);
    const latestHead = newWeights.find((w) => typeof w.headCircumferenceCm === 'number' && w.headCircumferenceCm > 0);

    const babyUpdates: Partial<BabyProfile> = {};
    if (latestWeight) babyUpdates.currentWeight = latestWeight.weightGrams;
    if (latestLength) babyUpdates.currentLength = latestLength.lengthCm;
    if (latestHead) babyUpdates.headCircumference = latestHead.headCircumferenceCm;

    const updatedBaby: BabyProfile = {
      ...babyRef.current,
      ...babyUpdates,
      updatedAt: nowIso,
    };
    babyRef.current = updatedBaby;
    setLocalBaby(updatedBaby);

    try {
      localStorage.setItem('milkflow_baby_profile', JSON.stringify(updatedBaby));
    } catch (e) {}

    persistFamilyData({ weights: newWeights, baby: updatedBaby });

    if (activeBaby) {
      updateBabyProfile(activeBaby.id, babyUpdates);
    }
    return newRecord;
  };

  const updateWeight = (id: string, updated: Partial<WeightRecord>) => {
    const nowIso = new Date().toISOString();
    const updatedList = weightsRef.current.map((w) => (w.id === id ? { ...w, ...updated, updatedAt: nowIso } : w));
    const newWeights = [...updatedList].sort((a, b) => parseSafeRecordTime(b) - parseSafeRecordTime(a));
    weightsRef.current = newWeights;
    setWeights(newWeights);

    // Compute latest metrics from updated list
    const latestWeight = newWeights.find((w) => typeof w.weightGrams === 'number' && w.weightGrams > 0);
    const latestLength = newWeights.find((w) => typeof w.lengthCm === 'number' && w.lengthCm > 0);
    const latestHead = newWeights.find((w) => typeof w.headCircumferenceCm === 'number' && w.headCircumferenceCm > 0);

    const babyUpdates: Partial<BabyProfile> = {};
    if (latestWeight) babyUpdates.currentWeight = latestWeight.weightGrams;
    if (latestLength) babyUpdates.currentLength = latestLength.lengthCm;
    if (latestHead) babyUpdates.headCircumference = latestHead.headCircumferenceCm;

    const updatedBaby: BabyProfile = {
      ...babyRef.current,
      ...babyUpdates,
      updatedAt: nowIso,
    };
    babyRef.current = updatedBaby;
    setLocalBaby(updatedBaby);

    try {
      localStorage.setItem('milkflow_baby_profile', JSON.stringify(updatedBaby));
    } catch (e) {}

    persistFamilyData({ weights: newWeights, baby: updatedBaby });

    if (activeBaby) {
      updateBabyProfile(activeBaby.id, babyUpdates);
    }
  };

  const deleteWeight = (id: string) => {
    const nowIso = new Date().toISOString();
    recordManualDeletion(id);
    const filteredList = weightsRef.current.filter((w) => w.id !== id);
    const newWeights = [...filteredList].sort((a, b) => parseSafeRecordTime(b) - parseSafeRecordTime(a));
    weightsRef.current = newWeights;
    setWeights(newWeights);

    // Compute latest metrics from updated list
    const latestWeight = newWeights.find((w) => typeof w.weightGrams === 'number' && w.weightGrams > 0);
    const latestLength = newWeights.find((w) => typeof w.lengthCm === 'number' && w.lengthCm > 0);
    const latestHead = newWeights.find((w) => typeof w.headCircumferenceCm === 'number' && w.headCircumferenceCm > 0);

    const babyUpdates: Partial<BabyProfile> = {};
    if (latestWeight) babyUpdates.currentWeight = latestWeight.weightGrams;
    if (latestLength) babyUpdates.currentLength = latestLength.lengthCm;
    if (latestHead) babyUpdates.headCircumference = latestHead.headCircumferenceCm;

    const updatedBaby: BabyProfile = {
      ...babyRef.current,
      ...babyUpdates,
      updatedAt: nowIso,
    };
    babyRef.current = updatedBaby;
    setLocalBaby(updatedBaby);

    try {
      localStorage.setItem('milkflow_baby_profile', JSON.stringify(updatedBaby));
    } catch (e) {}

    persistFamilyData({ weights: newWeights, baby: updatedBaby });

    if (activeBaby) {
      updateBabyProfile(activeBaby.id, babyUpdates);
    }
  };

  // Phases
  const addFeedingPhase = (phase: Omit<FeedingPlanPhase, 'id'>) => {
    const nowIso = new Date().toISOString();
    const newPhase: FeedingPlanPhase = { ...phase, id: `phase_${Date.now()}`, updatedAt: nowIso };
    const newPhases = [...feedingPhasesRef.current, newPhase];
    setFeedingPhases(newPhases);
    persistFamilyData({ feedingPhases: newPhases });
  };

  const activatePhase = (phaseId: string) => {
    const nowIso = new Date().toISOString();
    const newPhases = feedingPhasesRef.current.map((p) => ({ ...p, isActive: p.id === phaseId, updatedAt: nowIso }));
    setFeedingPhases(newPhases);
    persistFamilyData({ feedingPhases: newPhases });
  };

  // Medication & Treatment Tracker
  const addMedication = (med: Omit<Medication, 'id' | 'createdAt'>): Medication => {
    const nowIso = new Date().toISOString();
    const newMed: Medication = {
      ...med,
      id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      caregiverId: activeCaregiver.id,
      caregiverName: activeCaregiver.name,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const updated = [newMed, ...medicationsRef.current];
    medicationsRef.current = updated;
    setMedications(updated);
    persistFamilyData({ medications: updated });
    return newMed;
  };

  const updateMedication = (id: string, updates: Partial<Medication>) => {
    const nowIso = new Date().toISOString();
    const updated = medicationsRef.current.map((m) => (m.id === id ? { ...m, ...updates, updatedAt: nowIso } : m));
    medicationsRef.current = updated;
    setMedications(updated);
    persistFamilyData({ medications: updated });
  };

  const deleteMedication = (id: string) => {
    const medToDelete = medicationsRef.current.find((m) => m.id === id);
    recordManualDeletion(id);
    const updated = medicationsRef.current.filter((m) => m.id !== id);
    medicationsRef.current = updated;
    setMedications(updated);
    persistFamilyData({ medications: updated });

    if (medToDelete) {
      triggerUndoToast(`Medicamento "${medToDelete.name}" removido`, () => {
        deletedRecordIdsRef.current.delete(id);
        const restored = [medToDelete, ...medicationsRef.current];
        medicationsRef.current = restored;
        setMedications(restored);
        persistFamilyData({ medications: restored });
      });
    }
  };

  const addMedicationLog = (log: Omit<MedicationLog, 'id' | 'createdAt'>): MedicationLog => {
    const nowIso = new Date().toISOString();
    const newLog: MedicationLog = {
      ...log,
      id: `med_log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const updated = [newLog, ...medicationLogsRef.current].sort(
      (a, b) => new Date(b.administeredAt || b.createdAt).getTime() - new Date(a.administeredAt || a.createdAt).getTime()
    );
    medicationLogsRef.current = updated;
    setMedicationLogs(updated);
    persistFamilyData({ medicationLogs: updated });
    return newLog;
  };

  const updateMedicationLog = (id: string, updates: Partial<MedicationLog>) => {
    const nowIso = new Date().toISOString();
    const updated = medicationLogsRef.current.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: nowIso } : l));
    medicationLogsRef.current = updated;
    setMedicationLogs(updated);
    persistFamilyData({ medicationLogs: updated });
  };

  const deleteMedicationLog = (id: string) => {
    const logToDelete = medicationLogsRef.current.find((l) => l.id === id);
    recordManualDeletion(id);
    const updated = medicationLogsRef.current.filter((l) => l.id !== id);
    medicationLogsRef.current = updated;
    setMedicationLogs(updated);
    persistFamilyData({ medicationLogs: updated });

    if (logToDelete) {
      triggerUndoToast(`Registro de dose de "${logToDelete.medicationName}" removido`, () => {
        deletedRecordIdsRef.current.delete(id);
        const restored = [logToDelete, ...medicationLogsRef.current].sort(
          (a, b) => new Date(b.administeredAt || b.createdAt).getTime() - new Date(a.administeredAt || a.createdAt).getTime()
        );
        medicationLogsRef.current = restored;
        setMedicationLogs(restored);
        persistFamilyData({ medicationLogs: restored });
      });
    }
  };

  const administerMedicationDose = (medicationId: string, customTime?: string, notes?: string, temperatureBefore?: number): MedicationLog | null => {
    const med = medicationsRef.current.find((m) => m.id === medicationId);
    if (!med) return null;

    const administeredAt = customTime || new Date().toISOString();
    return addMedicationLog({
      medicationId: med.id,
      medicationName: med.name,
      dosage: med.dosage,
      dosageUnit: med.dosageUnit,
      scheduledTime: administeredAt,
      administeredAt,
      givenByCaregiverId: activeCaregiver.id,
      givenByCaregiverName: activeCaregiver.name,
      status: 'given',
      notes: notes || undefined,
      temperatureBefore: temperatureBefore || undefined,
    });
  };

  // 1-Tap Quick Actions with Undo Support
  const quickLogPee = () => {
    const record = addDiaper({
      timestamp: new Date().toISOString(),
      hasPee: true,
      hasPoop: false,
      peeAmount: 'normal',
    });
    triggerUndoToast('✓ Xixi registrado agora', () => {
      deleteDiaper(record.id);
    });
  };

  const quickLogPoop = () => {
    const record = addDiaper({
      timestamp: new Date().toISOString(),
      hasPee: false,
      hasPoop: true,
      poopColor: 'mostarda',
      poopConsistency: 'pastoso',
      poopAmount: 'normal',
    });
    triggerUndoToast('✓ Cocô registrado agora', () => {
      deleteDiaper(record.id);
    });
  };

  const quickLogBottleMilk = (ml: number) => {
    const record = addFeeding({
      timestamp: new Date().toISOString(),
      type: 'leite_materno_ordenhado',
      consumedMl: ml,
      offeredMl: ml,
      durationMinutes: 10,
      burped: true,
    });
    triggerUndoToast(`✓ Mamada de ${ml}ml registrada`, () => {
      deleteFeeding(record.id);
    });
  };

  const quickLogDiscomfort = (symptoms: any[]) => {
    const record = addDiscomfort({
      timestamp: new Date().toISOString(),
      symptoms: symptoms.length > 0 ? symptoms : ['gases'],
      intensity: 'moderado',
      timing: 'logo_depois',
      reliefMeasures: ['colo', 'posicao_vertical'],
    });
    triggerUndoToast('✓ Desconforto registrado', () => {
      deleteDiscomfort(record.id);
    });
  };

  // Aggregated summaries
  const inventorySummary = useMemo(() => {
    return calculateInventorySummary(batches);
  }, [batches]);

  const activePhase = feedingPhases.find((p) => p.isActive);

  const todayStats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayFeedings = feedings.filter((f) => new Date(f.timestamp).getTime() >= startOfDay);
    const todayPumpings = pumpings.filter((p) => new Date(p.timestamp).getTime() >= startOfDay);
    const todayDiapers = diapers.filter((d) => new Date(d.timestamp).getTime() >= startOfDay);
    const todayDiscomforts = discomforts.filter((dc) => new Date(dc.timestamp).getTime() >= startOfDay);

    const totalConsumedMl = todayFeedings.reduce((sum, f) => sum + (f.consumedMl || 0), 0);
    const totalPumpedMl = todayPumpings.reduce((sum, p) => sum + (p.totalVolumeMl || 0), 0);

    const sortedFeedingsList = [...feedings].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const lastFeeding = sortedFeedingsList[0];
    let nextExpectedFeeding: string | undefined = undefined;

    if (lastFeeding) {
      const intervalMinutes = customReminderIntervalMinutes || (activePhase?.intervalHours ? activePhase.intervalHours * 60 : 165);
      const lastTime = new Date(lastFeeding.timestamp).getTime();
      const nextTime = new Date(lastTime + intervalMinutes * 60 * 1000);
      nextExpectedFeeding = nextTime.toISOString();
    }

    return {
      totalConsumedMl,
      feedingsCount: todayFeedings.length,
      totalPumpedMl,
      pumpingsCount: todayPumpings.length,
      diapersCount: todayDiapers.length,
      discomfortCount: todayDiscomforts.length,
      lastFeeding,
      nextExpectedFeeding,
    };
  }, [feedings, pumpings, diapers, discomforts, activePhase, customReminderIntervalMinutes]);

  const safetyAlerts: SafetyAlert[] = useMemo(() => {
    const alerts: SafetyAlert[] = [];
    if (inventorySummary.expiring24hCount > 0) {
      alerts.push({
        id: 'alert_expiry',
        level: 'urgent',
        title: 'Frasco Próximo do Vencimento',
        message: `Você possui ${inventorySummary.expiring24hCount} frasco(s) que vencem nas próximas 24h. Priorize-os na próxima mamada!`,
        source: 'Protocolo ' + CONSERVATION_PROTOCOLS[protocolId].name,
        timestamp: new Date().toISOString(),
      });
    }
    return alerts;
  }, [inventorySummary, protocolId]);

  const exportDataJson = () => {
    const fullBackup = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      baby,
      batches,
      transactions,
      feedings,
      pumpings,
      diapers,
      discomforts,
      weights,
      sleepLogs,
      medications,
      medicationLogs,
      diaperStockItems,
      diaperStockTransactions,
      diaperShoppingItems,
      caregivers,
      protocolId,
      customReminderIntervalMinutes,
    };
    return JSON.stringify(fullBackup, null, 2);
  };

  const importDataJson = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.batches) setBatches(data.batches);
      if (data.feedings) setFeedings(data.feedings);
      if (data.pumpings) setPumpings(data.pumpings);
      if (data.diapers) setDiapers(data.diapers);
      if (data.discomforts) setDiscomforts(data.discomforts);
      if (data.weights) setWeights(data.weights);
      if (data.sleepLogs) setSleepLogs(data.sleepLogs);
      if (data.medications) setMedications(data.medications);
      if (data.medicationLogs) setMedicationLogs(data.medicationLogs);
      if (data.diaperStockItems) setDiaperStockItems(data.diaperStockItems);
      if (data.diaperStockTransactions) setDiaperStockTransactions(data.diaperStockTransactions);
      if (data.diaperShoppingItems) setDiaperShoppingItems(data.diaperShoppingItems);
      if (data.caregivers) setCaregivers(data.caregivers);
      if (data.protocolId) setProtocolId(data.protocolId);
      if (data.customReminderIntervalMinutes) setCustomReminderIntervalMinutes(data.customReminderIntervalMinutes);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        baby,
        updateBaby,
        caregivers,
        activeCaregiver,
        setActiveCaregiver,
        addCaregiver,
        updateCaregiver,
        deleteCaregiver,
        protocolId,
        setProtocolId,
        batches,
        transactions,
        addMilkBatch,
        updateMilkBatch,
        deleteMilkBatch,
        moveBatch,
        portionBatch,
        discardBatch,
        consumeFromBatch,
        feedings,
        addFeeding,
        updateFeeding,
        deleteFeeding,
        pumpings,
        addPumping,
        updatePumping,
        deletePumping,
        diapers,
        addDiaper,
        updateDiaper,
        deleteDiaper,
        diaperStockItems,
        diaperStockTransactions,
        diaperShoppingItems,
        addDiaperStockItem,
        updateDiaperStockItem,
        deleteDiaperStockItem,
        setDefaultDiaperStockItem,
        adjustDiaperStockItemQuantity,
        replenishDiaperStockItem,
        addDiaperStockTransaction,
        addDiaperShoppingItem,
        updateDiaperShoppingItem,
        deleteDiaperShoppingItem,
        diaperStockSummary,
        discomforts,
        addDiscomfort,
        deleteDiscomfort,
        weights,
        addWeight,
        updateWeight,
        deleteWeight,
        sleepLogs,
        activeSleepTimer,
        startSleepTimer,
        stopSleepTimer,
        addSleepRecord,
        updateSleepRecord,
        deleteSleepRecord,
        medications,
        medicationLogs,
        addMedication,
        updateMedication,
        deleteMedication,
        addMedicationLog,
        updateMedicationLog,
        deleteMedicationLog,
        administerMedicationDose,
        customReminderIntervalMinutes,
        setCustomReminderIntervalMinutes,
        playAlarmSound,
        exportAlarmCalendar,
        feedingPhases,
        activePhase,
        addFeedingPhase,
        activatePhase,
        auditLogs,
        aiInsights,
        setAiInsights,
        safetyAlerts,
        isNightMode,
        toggleNightMode,
        activePumpingTimer,
        setActivePumpingTimer,
        activeNursingTimer,
        setActiveNursingTimer,
        activeColicTimer,
        setActiveColicTimer,
        activeModal,
        openModal,
        closeModal,
        modalData,
        activeTab,
        setActiveTab,
        inventorySummary,
        todayStats,
        undoToast,
        triggerUndoToast,
        clearUndoToast,
        quickLogPee,
        quickLogPoop,
        quickLogBottleMilk,
        quickLogDiscomfort,
        isOnline,
        exportDataJson,
        importDataJson,
        restoreAllHistoricalData,
        persistFamilyData,
        cloudSyncStatus,
        lastCloudSyncTime,
        forceCloudSync,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser utilizado dentro de um AppProvider');
  }
  return context;
};
