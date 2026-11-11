import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FamilyWriteQueue, persistFamilySnapshot } from './familyPersistence';
import { classifySupabaseFailure, type SyncIssueCode } from '../src/lib/syncDiagnostics';

// No public API key should be embedded as an undocumented fallback. A stale
// hard-coded key silently causes "Invalid API key" after key rotation.
export const SUPABASE_CONFIG = {
  url: (process.env.SUPABASE_URL || '').trim(),
  anonKey: (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim(),
};

let supabaseClient: SupabaseClient | null = null;

function configError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

export function validatePublicSupabaseConfig(url: string, key: string): void {
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    throw configError('SUPABASE_URL deve conter a URL HTTPS do projeto de dados do Milk.', 'MILK_PROJECT_URL_MISSING');
  }
  if (!key) {
    throw configError('SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_ANON_KEY) não foi configurada.', 'MILK_PUBLIC_KEY_MISSING');
  }
  // The current server routes do not authenticate Supabase users. In particular,
  // exposing an elevated key here could bypass RLS for every request.
  if (key.startsWith('sb_secret_')) {
    throw configError('Chave secreta não autorizada para esta integração.', 'MILK_UNSAFE_KEY_TYPE');
  }
  if (key.startsWith('eyJ')) {
    try {
      const claims = JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString('utf8'));
      if (claims.role === 'service_role') {
        throw configError('Chave service_role não autorizada para esta integração.', 'MILK_UNSAFE_KEY_TYPE');
      }
    } catch (error: any) {
      if (error?.code === 'MILK_UNSAFE_KEY_TYPE') throw error;
      // A malformed public token must be rejected by the API, not treated as a
      // verified credential based on this untrusted, unsigned local decode.
    }
  }
}

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url = SUPABASE_CONFIG.url;
    const key = SUPABASE_CONFIG.anonKey;
    validatePublicSupabaseConfig(url, key);
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

export interface SupabaseHealthResult {
  connected: boolean;
  projectUrl: string;
  latencyMs: number;
  message: string;
  testedAt: string;
  issueCode?: SyncIssueCode;
  tableStatus?: {
    familyDataExists: boolean;
    usersExists: boolean;
  };
}

/**
 * Testa conectividade real com a instância do Supabase
 */
export async function testSupabaseHealth(): Promise<SupabaseHealthResult> {
  const start = Date.now();
  const at = new Date().toISOString();
  const projectUrl = SUPABASE_CONFIG.url;

  try {
    const client = getSupabase();
    // Health checks only prove this API key can SELECT a table; they do NOT
    // prove that a particular family is visible or that an INSERT will work.
    const { error } = await client.from('milkflow_store').select('key').limit(1);
    if (error) throw error;
    return {
      connected: true,
      projectUrl,
      latencyMs: Date.now() - start,
      testedAt: at,
      message: 'Leitura da tabela disponível. A gravação de cada família ainda precisa de confirmação própria.',
      tableStatus: { familyDataExists: true, usersExists: false },
    };
  } catch (error) {
    const issueCode = classifySupabaseFailure(error);
    const message: Record<SyncIssueCode, string> = {
      invalid_api_key: 'Chave API inválida. Configure a chave publishable/anon do mesmo projeto Supabase no servidor Milk.',
      missing_configuration: 'Configuração ausente: defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no ambiente do servidor.',
      unsafe_key_type: 'Chave secreta não permitida. Use apenas uma chave publishable/anon neste servidor.',
      permission_denied: 'Consulta ao Supabase recusada. Verifique autenticação e RLS, sem permitir acesso público irrestrito.',
      rate_limited: 'Supabase limitou requisições. Dados locais preservados; tente novamente mais tarde.',
      missing_table: 'Tabela milkflow_store indisponível. Não execute migrações antes de um backup auditado.',
      not_visible: 'A família não está visível no banco. Os registros locais foram preservados.',
      outdated_server: 'Atualização necessária do servidor Milk.',
      not_confirmed: 'Conexão ao banco não confirmada.',
      unavailable: 'Supabase indisponível. Verifique rede, URL e status do projeto.',
    };
    // Never send raw driver errors or credential material to the browser.
    return {
      connected: false,
      projectUrl,
      latencyMs: Date.now() - start,
      testedAt: at,
      issueCode,
      message: message[issueCode],
      ...(issueCode === 'missing_table' ? {
        tableStatus: { familyDataExists: false, usersExists: false },
      } : {}),
    };
  }
}

const familyWrites = new FamilyWriteQueue();

/** Only resolves after the database returns the row written by this attempt. */
export function persistFamilyDataToSupabase(familyId: string, familyData: any): Promise<any> {
  // Capture the request now; objects in the in-memory store can change while queued.
  const snapshot = JSON.parse(JSON.stringify(familyData));
  return familyWrites.run(familyId, async () => {
    const client = getSupabase();
    return persistFamilySnapshot({
      async read(key) {
        const { data, error } = await client.from('milkflow_store')
          .select('value,updated_at').eq('key', key).maybeSingle();
        if (error) throw error;
        return data ? { value: data.value, updatedAt: data.updated_at } : null;
      },
      async insert(key, value, updatedAt) {
        const { data, error } = await client.from('milkflow_store')
          .insert({ key, value, updated_at: updatedAt }).select('key');
        if (error?.code === '23505') return false; // A concurrent process inserted it.
        if (error) throw error;
        return data?.some(row => row.key === key) ?? false;
      },
      async replace(key, previousRevision, value, updatedAt) {
        let query = client.from('milkflow_store')
          .update({ value, updated_at: updatedAt }).eq('key', key);
        query = previousRevision === null
          ? query.is('updated_at', null)
          : query.eq('updated_at', previousRevision);
        const { data, error } = await query.select('key');
        if (error) throw error;
        return data?.some(row => row.key === key) ?? false;
      },
    }, familyId, snapshot);
  });
}

/** Compatibility wrapper for callers that only need a persistence ACK. */
export async function syncFamilyDataToSupabase(familyId: string, familyData: any): Promise<boolean> {
  try {
    await persistFamilyDataToSupabase(familyId, familyData);
    return true;
  } catch (error: any) {
    console.warn('Supabase family write was not confirmed:', error?.code || error?.name || 'write_failed');
    return false;
  }
}

/**
 * Carrega dados da família do Supabase se existirem
 */
export async function loadFamilyDataFromSupabase(familyId: string): Promise<any | null> {
  const client = getSupabase();
  const { data, error } = await client
    .from('milkflow_store')
    .select('value')
    .eq('key', `family_data_${familyId}`)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

/**
 * Salva usuário e credenciais com hash seguro no Supabase
 */
export async function syncUserToSupabase(user: any): Promise<boolean> {
  try {
    const client = getSupabase();
    const { error } = await client
      .from('milkflow_store')
      .upsert(
        {
          key: `user_${user.email.toLowerCase()}`,
          value: user,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) return false;
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * This legacy endpoint is intentionally non-executable. Publishing a policy
 * FOR ALL TO anon USING(true) would expose every family's records to the public.
 * Table policies must be reviewed and deployed as an authenticated migration.
 */
export function getSupabaseSchemaSql(): string {
  return '-- Por segurança, o Milk não gera políticas públicas de acesso.\\n' +
    '-- Verifique o backup e use somente as migrations autenticadas do projeto mamei.';
}
