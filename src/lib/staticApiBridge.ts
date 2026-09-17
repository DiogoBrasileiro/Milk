import { getClientSupabase, SUPABASE_URL } from './supabaseClient';

// Compatibility layer for the GitHub Pages build.
// It keeps the existing UI/API calls working while persistence remains in the
// existing Supabase milkflow_store table. No database rows are deleted/migrated.
const nativeFetch = window.fetch.bind(window);
const FAMILY_ID = 'fam_641306';
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

function familyEnvelope(data: any, caregiverName = 'Diogo Brasileiro') {
  const family = data?.family || {
    id: FAMILY_ID,
    name: 'Família MilkFlow',
    ownerId: 'usr_641306',
    createdAt: '2026-07-28T14:05:38.498Z',
    babyIds: data?.babies?.map((b: any) => b.id) || [],
    pairingCode: FAMILY_CODE,
  };
  const babies = data?.babies || (data?.baby ? [data.baby] : []);
  const user = {
    id: caregiverName === 'Diogo Brasileiro' ? 'usr_641306' : `usr_pages_${Date.now()}`,
    email: caregiverName === 'Diogo Brasileiro' ? 'diogobrasileirofotografia@gmail.com' : `${caregiverName.toLowerCase().replace(/\W+/g, '.')}@milkflow.local`,
    name: caregiverName,
    avatarColor: '#3b82f6',
    role: caregiverName === 'Diogo Brasileiro' ? 'OWNER' : 'CAREGIVER',
    currentFamilyId: FAMILY_ID,
    createdAt: new Date().toISOString(),
    emailVerified: true,
  };
  return { success: true, user, family, babies, familyData: data?.familyData || data };
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const url = new URL(raw, window.location.origin);
  if (!url.pathname.startsWith('/api/')) return nativeFetch(input, init);

  try {
    if (url.pathname === '/api/health') {
      return json({ status: 'ok', hosting: 'github-pages', supabase: { url: SUPABASE_URL } });
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
      const familyId = body.family?.id || FAMILY_ID;
      const cloud = await readFamilyData(familyId).catch(() => null);
      // Never replace an existing cloud snapshot with an empty local snapshot.
      if (!cloud && body.familyData && Object.keys(body.familyData).length > 0) {
        await writeFamilyData(familyId, { ...body.familyData, family: body.family, babies: body.babies });
      }
      const current = (await readFamilyData(familyId).catch(() => null)) || body.familyData || {};
      return json({ ...familyEnvelope(current, body.user?.name || 'Diogo Brasileiro'), family: body.family || familyEnvelope(current).family, babies: body.babies?.length ? body.babies : familyEnvelope(current).babies });
    }

    const familyMatch = url.pathname.match(/^\/api\/family\/([^/]+)\/sync$/);
    if (familyMatch) {
      const familyId = decodeURIComponent(familyMatch[1]);
      if ((init?.method || 'GET').toUpperCase() === 'GET') {
        const data = await readFamilyData(familyId);
        const env = familyEnvelope(data);
        return json({ success: true, family: env.family, babies: env.babies, familyData: env.familyData, serverTime: new Date().toISOString(), supabaseActive: true });
      }
      if ((init?.method || 'GET').toUpperCase() === 'POST') {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const existing = (await readFamilyData(familyId).catch(() => null)) || {};
        const next = { ...existing, ...(body.data || {}), family: body.family || existing.family, babies: body.babies || existing.babies };
        await writeFamilyData(familyId, next);
        return json({ success: true, family: next.family, babies: next.babies, familyData: next, serverTime: new Date().toISOString(), supabaseSynced: true });
      }
    }

    // Let existing AuthContext use its local/offline fallbacks for endpoints that
    // require the old Node credential store (email signup/login/reset).
    return json({ success: false, error: 'Função disponível apenas no modo local/Supabase desta versão.' }, 503);
  } catch (error: any) {
    console.error('GitHub Pages Supabase bridge error', error);
    return json({ success: false, error: error?.message || 'Falha de sincronização com Supabase.' }, 500);
  }
};
