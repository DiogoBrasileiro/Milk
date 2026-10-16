import type { BabyProfile } from '../types';

// No account data is ever bundled. This helper accepts a JSON object loaded
// under the caller's verified, RLS-protected membership.
export function normalizeCloudSnapshot(raw: any): {
  app: Record<string, any>;
  babies: BabyProfile[];
  storedFamily: Record<string, any>;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('O registro da família não contém um JSON válido.');
  }
  const app = raw.data || raw.familyData || raw;
  if (!app || typeof app !== 'object' || Array.isArray(app)) {
    throw new Error('O registro da família não contém os dados do aplicativo.');
  }
  const baseBabies: BabyProfile[] = Array.isArray(raw.babies) ? raw.babies
    : Array.isArray(app.babies) ? app.babies : [];
  const fromData: BabyProfile | undefined = app.baby?.id ? app.baby : undefined;
  const babies = baseBabies.filter((b) => Boolean(b?.id));
  if (fromData) {
    const idx = babies.findIndex(b => b.id === fromData.id);
    if (idx < 0) babies.unshift(fromData);
    else babies[idx] = { ...babies[idx], ...fromData };
  }
  if (!babies.length) {
    throw new Error('Nenhum perfil de bebê encontrado. A recuperação exige conferência do banco.');
  }
  return { app, babies, storedFamily: raw.family || app.family || {} };
}
