import { getClientSupabase, SUPABASE_URL } from './supabaseClient';

// GitHub Pages compatibility bridge.
// Uses the EXISTING Supabase row and never migrates/deletes database records.
const nativeFetch = window.fetch.bind(window);
const FAMILY_ID = 'fam_1786815802222_lu7tvw';
const FAMILY_CODE = '641306';

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function readFamilyData(familyId = FAMILY_ID) {
  const client = getClientSupabase();
  const { data, error } = await client
    .from('milkflow_store')
    .select('value')
    .eq('key', `family_data_${familyId}`)
    .single();
  if (error) throw error;
  return data?.value || null;
}

async function writeFamilyData(familyId: string, value: any) {
  const client = getClientSupabase();
  const { error } = await client.from('milkflow_store').upsert(
    {
      key: `family_data_${familyId}`,
      value: { ...value, _syncedAt: new Date().toISOString(), _githubPages: true },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );
  if (error) throw error;
}

function normalizeStoredData(raw: any) {
  if (!raw) return {};
  // Old server snapshots may wrap application data in `data` or `familyData`.
  const applicationData = raw.familyData || raw.data || raw;
  return { raw, applicationData };
}

function familyEnvelope(raw: any, caregiverName = 'Diogo Brasileiro') {
  const { applicationData } = normalizeStoredData(raw);
  const storedBaby = raw?.baby || applicationData?.baby;
  const babies = raw?.babies || applicationData?.babies || (storedBaby ? [storedBaby] : []);
  const family = raw?.family || applicationData?.family || {
    id: FAMILY_ID,
    name: 'Família MilkFlow',
    ownerId: 'usr_milkflow_owner',
    createdAt: new Date().toISOString(),
    babyIds: babies.map((b: any) => b.id),
    pairingCode: FAMILY_CODE,
  };
  // Force the canonical existing family id so every subsequent sync hits the same row.
  family.id = FAMILY_ID;
  family.pairingCode = family.pairingCode || FAMILY_CODE;

  const user = {
    id: family.ownerId || 'usr_milkflow_owner',
    email: 'diogobrasileirofotografia@gmail.com',
    name: caregiverName,
    avatarColor: '#3b82f6',
    role: 'OWNER',
    currentFamilyId: FAMILY_ID,
    createdAt: family.createdAt || new Date().toISOString(),
    emailVerified: true,
  };

  return { success: true, user, family, babies, familyData: applicationData };
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const url = new URL(rawUrl, window.location.origin);
  if (!url.pathname.startsWith('/api/')) return nativeFetch(input, init);

  try {
    if (url.pathname === '/api/health') {
      return json({ status: 'ok', hosting: 'github-pages', supabase: { url: SUPABASE_URL }, familyId: FAMILY_ID });
    }

    if (url.pathname === '/api/supabase/status') {
      const started = Date.now();
      await readFamilyData();
      return json({
        connected: true,
        projectUrl: SUPABASE_URL,
        latencyMs: Date.now() - started,
        message: 'Supabase conectado diretamente pelo GitHub Pages',
        testedAt: new Date().toISOString(),
        tableStatus: { familyDataExists: true, usersExists: true },
      });
    }

    if (url.pathname === '/api/auth/login-code' && (init?.method || 'GET').toUpperCase() === 'POST') {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (String(body.code || '') !== FAMILY_CODE) return json({ success: false, error: 'Código da família inválido.' }, 400);
      const data = await readFamilyData();
      return json(familyEnvelope(data, body.caregiverName || 'Diogo Brasileiro'));
    }

    if (url.pathname === '/api/auth/sync-session' && (init?.method || 'GET').toUpperCase() === 'POST') {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      // Always pull the canonical existing family. Never let a stale browser session redirect
      // the app to fam_641306 or create another family row.
      const cloud = await readFamilyData();
      const env = familyEnvelope(cloud, body.user?.name || 'Diogo Brasileiro');
      return json(env);
    }

    const familyMatch = url.pathname.match(/^\/api\/family\/([^/]+)\/sync$/);
    if (familyMatch) {
      // Regardless of stale family id in localStorage, use the canonical existing Supabase row.
      if ((init?.method || 'GET').toUpperCase() === 'GET') {
        const data = await readFamilyData();
        const env = familyEnvelope(data);
        return json({ success: true, family: env.family, babies: env.babies, familyData: env.familyData, serverTime: new Date().toISOString(), supabaseActive: true });
      }
      if ((init?.method || 'GET').toUpperCase() === 'POST') {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const existingRaw = (await readFamilyData().catch(() => null)) || {};
        const { applicationData: existingData } = normalizeStoredData(existingRaw);
        const nextData = { ...existingData, ...(body.data || {}) };
        // Preserve the storage envelope when one already exists.
        const nextRaw = existingRaw?.data !== undefined
          ? { ...existingRaw, data: nextData, family: body.family || existingRaw.family, babies: body.babies || existingRaw.babies }
          : existingRaw?.familyData !== undefined
          ? { ...existingRaw, familyData: nextData, family: body.family || existingRaw.family, babies: body.babies || existingRaw.babies }
          : { ...nextData, family: body.family || existingRaw.family, babies: body.babies || existingRaw.babies };
        await writeFamilyData(FAMILY_ID, nextRaw);
        const env = familyEnvelope(nextRaw);
        return json({ success: true, family: env.family, babies: env.babies, familyData: env.familyData, serverTime: new Date().toISOString(), supabaseSynced: true });
      }
    }

    return json({ success: false, error: 'Função disponível apenas no modo local/Supabase desta versão.' }, 503);
  } catch (error: any) {
    console.error('GitHub Pages Supabase bridge error', error);
    return json({ success: false, error: error?.message || 'Falha de sincronização com Supabase.' }, 500);
  }
};
