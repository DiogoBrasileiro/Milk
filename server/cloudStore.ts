import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface CloudUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  avatarColor: string;
  role: string;
  familyId: string;
  createdAt: string;
}

interface CloudFamily {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  babyIds: string[];
  pairingCode?: string; // 6-digit code for connecting multiple devices easily
}

interface CloudBaby {
  id: string;
  familyId: string;
  createdBy: string;
  name: string;
  birthDate: string;
  gender: string;
  birthWeight: number;
  currentWeight: number;
  birthLength: number;
  currentLength: number;
  pediatricianName?: string;
  bloodType?: string;
  allergies?: string[];
  photoUrl?: string;
}

interface CloudFamilyData {
  familyId: string;
  protocolId?: string;
  batches?: any[];
  transactions?: any[];
  feedings?: any[];
  pumpings?: any[];
  diapers?: any[];
  discomforts?: any[];
  weights?: any[];
  sleepLogs?: any[];
  medications?: any[];
  medicationLogs?: any[];
  diaperStockItems?: any[];
  diaperStockTransactions?: any[];
  diaperShoppingItems?: any[];
  feedingPhases?: any[];
  auditLogs?: any[];
  aiInsights?: any[];
  customReminderIntervalMinutes?: number;
  caregivers?: any[];
  deletedItemIds?: Record<string, string>; // ID -> ISO timestamp of deletion
  lastUpdatedAt: string;
}

export function getModificationTimestamp(item: any): number {
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
}

export function getEventTimestamp(item: any): number {
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
}

export function getItemTimestamp(item: any): number {
  return getModificationTimestamp(item);
}

export function mergeListsLWW<T extends { id: string }>(
  existingList?: T[],
  incomingList?: T[],
  deletedMap?: Record<string, string>
): T[] {
  const map = new Map<string, T>();

  if (Array.isArray(existingList)) {
    for (const item of existingList) {
      if (!item || !item.id) continue;
      if (deletedMap && deletedMap[item.id]) {
        const delTime = new Date(deletedMap[item.id]).getTime();
        if (getModificationTimestamp(item) <= delTime) continue;
      }
      map.set(item.id, item);
    }
  }

  if (Array.isArray(incomingList)) {
    for (const item of incomingList) {
      if (!item || !item.id) continue;
      if (deletedMap && deletedMap[item.id]) {
        const delTime = new Date(deletedMap[item.id]).getTime();
        if (getModificationTimestamp(item) <= delTime) continue;
      }
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
      } else {
        const existingTime = getModificationTimestamp(existing);
        const incomingTime = getModificationTimestamp(item);
        if (incomingTime >= existingTime) {
          map.set(item.id, item);
        }
      }
    }
  }

  const result = Array.from(map.values());
  return result.sort((a, b) => getEventTimestamp(b) - getEventTimestamp(a));
}

interface DatabaseSchema {
  users: Record<string, CloudUser>; // key: email lowercase
  families: Record<string, CloudFamily>; // key: familyId
  babies: Record<string, CloudBaby[]>; // key: familyId
  familyData: Record<string, CloudFamilyData>; // key: familyId
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'milkflow_cloud_database.json');

// Simple secure hash with salt
export function hashPassword(password: string): string {
  const salt = 'milkflow_secure_salt_v2';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

class CloudStore {
  private db: DatabaseSchema = {
    users: {},
    families: {},
    babies: {},
    familyData: {},
  };
  private isLoaded = false;

  constructor() {
    this.ensureDataDir();
    this.loadFromDisk();
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.error('Error creating data directory:', err);
    }
  }

  private generatePairingCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private ensureSeedAccount641306() {
    const famId = 'fam_641306';
    const pairingCode = '641306';
    const email = 'diogobrasileirofotografia@gmail.com';
    const userId = 'usr_641306';
    const babyId = 'baby_gabriel';

    const now = Date.now();
    const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();

    const seededUser: CloudUser = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash: hashPassword('641306'),
      name: 'Diogo Brasileiro',
      avatarColor: '#3b82f6',
      role: 'OWNER',
      familyId: famId,
      createdAt: daysAgo(20),
    };

    const seededFamily: CloudFamily = {
      id: famId,
      name: 'Família Gabriel (641306)',
      ownerId: userId,
      createdAt: daysAgo(20),
      babyIds: [babyId],
      pairingCode: pairingCode,
    };

    const seededBaby: CloudBaby = {
      id: babyId,
      familyId: famId,
      createdBy: userId,
      name: 'Gabriel',
      birthDate: daysAgo(18).split('T')[0],
      gender: 'masculino',
      birthWeight: 3045,
      currentWeight: 3210,
      birthLength: 49,
      currentLength: 51.5,
      bloodType: 'A+',
      pediatricianName: 'Dra. Patrícia',
      allergies: [],
    };

    const cleanInitialFamilyData: CloudFamilyData = {
      familyId: famId,
      protocolId: 'brasil_ms',
      batches: [],
      transactions: [],
      feedings: [],
      pumpings: [],
      diapers: [],
      discomforts: [],
      weights: [],
      sleepLogs: [],
      medications: [],
      medicationLogs: [],
      feedingPhases: [],
      auditLogs: [],
      aiInsights: [],
      customReminderIntervalMinutes: 165,
      caregivers: [
        { id: 'usr_1', name: 'Maria (Mãe)', role: 'mae', avatarColor: '#ec4899' },
        { id: 'usr_2', name: 'Diogo Brasileiro (Pai)', role: 'pai', avatarColor: '#3b82f6' },
      ],
      lastUpdatedAt: new Date().toISOString(),
    };

    // Store in memory database if not already present
    if (!this.db.users[email.toLowerCase()]) {
      this.db.users[email.toLowerCase()] = seededUser;
    }
    if (!this.db.users['641306@milkflow.local']) {
      this.db.users['641306@milkflow.local'] = { ...seededUser, email: '641306@milkflow.local' };
    }
    if (!this.db.users['fam_641306@milkflow.local']) {
      this.db.users['fam_641306@milkflow.local'] = { ...seededUser, email: 'fam_641306@milkflow.local' };
    }
    if (!this.db.families[famId]) {
      this.db.families[famId] = seededFamily;
    }
    if (!this.db.babies[famId] || this.db.babies[famId].length === 0) {
      this.db.babies[famId] = [seededBaby];
    }
    if (!this.db.familyData[famId]) {
      this.db.familyData[famId] = cleanInitialFamilyData;
    }

    // Save to disk
    this.saveToDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (raw.trim()) {
          this.db = JSON.parse(raw);
          // Ensure all families have pairing code
          let hasChanges = false;
          if (this.db.families) {
            for (const famId of Object.keys(this.db.families)) {
              if (!this.db.families[famId].pairingCode) {
                this.db.families[famId].pairingCode = this.generatePairingCode();
                hasChanges = true;
              }
            }
          }
          if (hasChanges) {
            this.saveToDisk();
          }
        }
      }
      this.ensureSeedAccount641306();
      this.isLoaded = true;
    } catch (err) {
      console.error('Error reading cloud database from disk:', err);
      this.ensureSeedAccount641306();
      this.isLoaded = true;
    }
  }

  private saveToDisk() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving cloud database to disk:', err);
    }
  }

  public registerUser(name: string, email: string, password: string): {
    user: CloudUser;
    family: CloudFamily;
    babies: CloudBaby[];
    familyData: CloudFamilyData;
  } {
    const cleanEmail = email.trim().toLowerCase();
    const passwordHash = hashPassword(password);

    if (this.db.users[cleanEmail]) {
      throw new Error('Já existe uma conta cadastrada com este e-mail.');
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const familyId = `fam_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const colors = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const pairingCode = this.generatePairingCode();

    const user: CloudUser = {
      id: userId,
      email: cleanEmail,
      passwordHash,
      name: name.trim(),
      avatarColor: randomColor,
      role: 'OWNER',
      familyId,
      createdAt: new Date().toISOString(),
    };

    const family: CloudFamily = {
      id: familyId,
      name: `Família de ${name.trim().split(' ')[0]}`,
      ownerId: userId,
      createdAt: new Date().toISOString(),
      babyIds: [],
      pairingCode,
    };

    const initialFamilyData: CloudFamilyData = {
      familyId,
      protocolId: 'brasil_ms',
      batches: [],
      transactions: [],
      feedings: [],
      pumpings: [],
      diapers: [],
      discomforts: [],
      weights: [],
      sleepLogs: [],
      medications: [],
      medicationLogs: [],
      feedingPhases: [],
      auditLogs: [],
      customReminderIntervalMinutes: 165,
      caregivers: [
        { id: `cg_${userId}`, name: name.trim(), role: 'mae', avatarColor: randomColor },
      ],
      lastUpdatedAt: new Date().toISOString(),
    };

    this.db.users[cleanEmail] = user;
    this.db.families[familyId] = family;
    this.db.babies[familyId] = [];
    this.db.familyData[familyId] = initialFamilyData;

    this.saveToDisk();

    return {
      user,
      family,
      babies: [],
      familyData: initialFamilyData,
    };
  }

  // Sincroniza sessão ativa de qualquer aparelho aberto para a nuvem
  public syncOrUpsertSession(payload: {
    user: any;
    family: any;
    babies?: any[];
    familyData?: any;
    password?: string;
  }): {
    user: CloudUser;
    family: CloudFamily;
    babies: CloudBaby[];
    familyData: CloudFamilyData;
  } {
    const cleanEmail = (payload.user?.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('E-mail do usuário não fornecido para sincronização.');
    }

    const familyId = payload.family?.id || payload.user?.currentFamilyId || `fam_${Date.now()}`;
    let existingUser = this.db.users[cleanEmail];
    let passwordHash = existingUser?.passwordHash;

    if (!passwordHash) {
      passwordHash = payload.password ? hashPassword(payload.password) : hashPassword('default_milkflow_pass_2026');
    }

    const updatedUser: CloudUser = {
      id: payload.user.id || existingUser?.id || `usr_${Date.now()}`,
      email: cleanEmail,
      passwordHash,
      name: payload.user.name || existingUser?.name || 'Cuidador(a)',
      avatarColor: payload.user.avatarColor || existingUser?.avatarColor || '#3b82f6',
      role: payload.user.role || existingUser?.role || 'OWNER',
      familyId,
      createdAt: payload.user.createdAt || existingUser?.createdAt || new Date().toISOString(),
    };

    let existingFamily = this.db.families[familyId];
    const pairingCode = existingFamily?.pairingCode || payload.family?.pairingCode || this.generatePairingCode();

    const updatedFamily: CloudFamily = {
      id: familyId,
      name: payload.family?.name || existingFamily?.name || `Família de ${updatedUser.name}`,
      ownerId: payload.family?.ownerId || existingFamily?.ownerId || updatedUser.id,
      createdAt: payload.family?.createdAt || existingFamily?.createdAt || new Date().toISOString(),
      babyIds: payload.babies ? payload.babies.map((b: any) => b.id) : existingFamily?.babyIds || [],
      pairingCode,
    };

    const updatedBabies: CloudBaby[] =
      payload.babies && payload.babies.length > 0
        ? payload.babies
        : this.db.babies[familyId] && this.db.babies[familyId].length > 0
        ? this.db.babies[familyId]
        : payload.babies || [];

    this.db.users[cleanEmail] = updatedUser;
    this.db.families[familyId] = updatedFamily;
    if (updatedBabies && updatedBabies.length > 0) {
      this.db.babies[familyId] = updatedBabies;
    }

    const mergedFamilyData = this.saveFamilyData(familyId, {
      family: updatedFamily,
      babies: updatedBabies,
      data: payload.familyData || {},
    });

    return {
      user: updatedUser,
      family: this.db.families[familyId] || updatedFamily,
      babies: this.db.babies[familyId] || updatedBabies,
      familyData: mergedFamilyData,
    };
  }

  public loginUser(email: string, password: string): {
    user: CloudUser;
    family: CloudFamily;
    babies: CloudBaby[];
    familyData: CloudFamilyData;
  } {
    const cleanEmail = email.trim().toLowerCase();
    let user = this.db.users[cleanEmail];

    // Loose lookup if exact match not found (e.g. slight casing or extra trim)
    if (!user) {
      const allEmails = Object.keys(this.db.users);
      const match = allEmails.find((k) => k.trim().toLowerCase() === cleanEmail);
      if (match) {
        user = this.db.users[match];
      }
    }

    if (!user) {
      throw new Error('E-mail não cadastrado neste servidor. Se cadastrou em outro celular, conecte o outro aparelho à internet ou use o Código da Família de 6 dígitos.');
    }

    const passwordHash = hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      throw new Error('Senha incorreta. Verifique e tente novamente.');
    }

    let family = this.db.families[user.familyId];
    if (!family) {
      family = {
        id: user.familyId,
        name: `Família de ${user.name}`,
        ownerId: user.id,
        createdAt: user.createdAt,
        babyIds: [],
        pairingCode: this.generatePairingCode(),
      };
      this.db.families[user.familyId] = family;
      this.saveToDisk();
    } else if (!family.pairingCode) {
      family.pairingCode = this.generatePairingCode();
      this.saveToDisk();
    }

    const babies = this.db.babies[user.familyId] || [];
    const familyData = this.db.familyData[user.familyId] || {
      familyId: user.familyId,
      lastUpdatedAt: new Date().toISOString(),
    };

    return {
      user,
      family,
      babies,
      familyData,
    };
  }

  // Conecta diretamente outro celular via código de 6 dígitos da família
  public loginWithFamilyCode(code: string, caregiverName?: string): {
    user: CloudUser;
    family: CloudFamily;
    babies: CloudBaby[];
    familyData: CloudFamilyData;
  } {
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanCode) {
      throw new Error('Informe o código da família de 6 dígitos.');
    }

    // Search by pairingCode or familyId
    let foundFamily: CloudFamily | undefined;
    for (const fam of Object.values(this.db.families)) {
      if (fam.pairingCode?.toUpperCase() === cleanCode || fam.id.toUpperCase().endsWith(cleanCode)) {
        foundFamily = fam;
        break;
      }
    }

    if (!foundFamily) {
      throw new Error(`Nenhuma família encontrada com o código "${cleanCode}". Verifique o código exibido no outro celular.`);
    }

    // Find owner or create caregiver user for this device
    const ownerUser = Object.values(this.db.users).find((u) => u.id === foundFamily!.ownerId && u.familyId === foundFamily!.id)
      || Object.values(this.db.users).find((u) => u.familyId === foundFamily!.id);

    let activeUser: CloudUser;
    if (ownerUser && !caregiverName) {
      activeUser = ownerUser;
    } else {
      const newId = `usr_pair_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      activeUser = {
        id: newId,
        email: ownerUser ? `cuidador_${newId}@milkflow.local` : `fam_${cleanCode}@milkflow.local`,
        name: caregiverName?.trim() || ownerUser?.name || 'Cuidador Adicional',
        avatarColor: '#10b981',
        role: 'CAREGIVER',
        familyId: foundFamily.id,
        createdAt: new Date().toISOString(),
        passwordHash: ownerUser?.passwordHash || hashPassword('default_pair_pass'),
      };
      this.db.users[activeUser.email] = activeUser;
      this.saveToDisk();
    }

    const babies = this.db.babies[foundFamily.id] || [];
    const familyData = this.db.familyData[foundFamily.id] || {
      familyId: foundFamily.id,
      lastUpdatedAt: new Date().toISOString(),
    };

    return {
      user: activeUser,
      family: foundFamily,
      babies,
      familyData,
    };
  }

  public getFamilyData(familyId: string): {
    family?: CloudFamily;
    babies: CloudBaby[];
    familyData: CloudFamilyData;
  } {
    const family = this.db.families[familyId];
    const babies = this.db.babies[familyId] || [];
    const familyData = this.db.familyData[familyId] || {
      familyId,
      lastUpdatedAt: new Date().toISOString(),
    };

    return { family, babies, familyData };
  }

  public saveFamilyData(familyId: string, payload: {
    family?: Partial<CloudFamily>;
    babies?: CloudBaby[];
    data?: Partial<CloudFamilyData>;
  }): CloudFamilyData {
    if (payload.family && this.db.families[familyId]) {
      this.db.families[familyId] = {
        ...this.db.families[familyId],
        ...payload.family,
        id: familyId,
      };
    }

    const currentData = this.db.familyData[familyId] || {
      familyId,
      lastUpdatedAt: new Date().toISOString(),
    };

    const incoming = payload.data || {};

    // Consolidate deletedItemIds map
    const mergedDeletedMap: Record<string, string> = {
      ...(currentData.deletedItemIds || {}),
      ...(incoming.deletedItemIds || {}),
    };

    // Merge babies
    if (payload.babies) {
      const mergedBabies = mergeListsLWW(
        this.db.babies[familyId] || [],
        payload.babies,
        mergedDeletedMap
      );
      this.db.babies[familyId] = mergedBabies;
      if (this.db.families[familyId]) {
        this.db.families[familyId].babyIds = mergedBabies.map((b) => b.id);
      }
    }

    const updatedData: CloudFamilyData = {
      ...currentData,
      ...incoming,
      protocolId: incoming.protocolId !== undefined ? incoming.protocolId : currentData.protocolId || 'brasil_ms',
      batches: mergeListsLWW(currentData.batches, incoming.batches, mergedDeletedMap),
      transactions: mergeListsLWW(currentData.transactions, incoming.transactions, mergedDeletedMap),
      feedings: mergeListsLWW(currentData.feedings, incoming.feedings, mergedDeletedMap),
      pumpings: mergeListsLWW(currentData.pumpings, incoming.pumpings, mergedDeletedMap),
      diapers: mergeListsLWW(currentData.diapers, incoming.diapers, mergedDeletedMap),
      discomforts: mergeListsLWW(currentData.discomforts, incoming.discomforts, mergedDeletedMap),
      weights: mergeListsLWW(currentData.weights, incoming.weights, mergedDeletedMap),
      sleepLogs: mergeListsLWW(currentData.sleepLogs, incoming.sleepLogs, mergedDeletedMap),
      medications: mergeListsLWW(currentData.medications, incoming.medications, mergedDeletedMap),
      medicationLogs: mergeListsLWW(currentData.medicationLogs, incoming.medicationLogs, mergedDeletedMap),
      diaperStockItems: mergeListsLWW(currentData.diaperStockItems, incoming.diaperStockItems, mergedDeletedMap),
      diaperStockTransactions: mergeListsLWW(currentData.diaperStockTransactions, incoming.diaperStockTransactions, mergedDeletedMap),
      diaperShoppingItems: mergeListsLWW(currentData.diaperShoppingItems, incoming.diaperShoppingItems, mergedDeletedMap),
      feedingPhases: mergeListsLWW(currentData.feedingPhases, incoming.feedingPhases, mergedDeletedMap),
      auditLogs: mergeListsLWW(currentData.auditLogs, incoming.auditLogs, mergedDeletedMap),
      aiInsights: incoming.aiInsights !== undefined ? incoming.aiInsights : currentData.aiInsights || [],
      caregivers: mergeListsLWW(currentData.caregivers, incoming.caregivers, mergedDeletedMap),
      deletedItemIds: mergedDeletedMap,
      customReminderIntervalMinutes:
        incoming.customReminderIntervalMinutes !== undefined
          ? incoming.customReminderIntervalMinutes
          : currentData.customReminderIntervalMinutes || 165,
      familyId,
      lastUpdatedAt: new Date().toISOString(),
    };

    // Enforce Invariants & Sanitization across all domain entities
    if (Array.isArray(updatedData.batches)) {
      updatedData.batches = updatedData.batches.map((b) => ({
        ...b,
        familyId,
        currentVolumeMl: Math.max(0, b.currentVolumeMl || 0),
      }));
    }

    if (Array.isArray(updatedData.diaperStockItems)) {
      updatedData.diaperStockItems = updatedData.diaperStockItems.map((item) => ({
        ...item,
        familyId,
        quantityCurrent: Math.max(0, item.quantityCurrent || 0),
      }));
    }

    if (Array.isArray(updatedData.feedings)) {
      updatedData.feedings = updatedData.feedings.map((f) => ({
        ...f,
        familyId,
        consumedMl: f.offeredMl ? Math.min(f.consumedMl || 0, f.offeredMl) : f.consumedMl,
      }));
    }

    const enforceFamilyIdOnList = (list?: any[]) => {
      if (!Array.isArray(list)) return list;
      return list.map((item) => (item ? { ...item, familyId } : item));
    };

    updatedData.transactions = enforceFamilyIdOnList(updatedData.transactions);
    updatedData.pumpings = enforceFamilyIdOnList(updatedData.pumpings);
    updatedData.diapers = enforceFamilyIdOnList(updatedData.diapers);
    updatedData.diaperStockTransactions = enforceFamilyIdOnList(updatedData.diaperStockTransactions);
    updatedData.diaperShoppingItems = enforceFamilyIdOnList(updatedData.diaperShoppingItems);

    this.db.familyData[familyId] = updatedData;
    this.saveToDisk();

    return updatedData;
  }

  public resetPassword(email: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.db.users[cleanEmail];
    if (!user) {
      // Don't leak user existence, return true
      return true;
    }
    return true;
  }
}

export const cloudStore = new CloudStore();
