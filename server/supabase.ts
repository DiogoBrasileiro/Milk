import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FamilyWriteQueue, persistFamilySnapshot } from './familyPersistence';

const VALID_ANON_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYWdtcXJyYnNjZW1scXFjY2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTEwODEsImV4cCI6MjEwMjU2NzA4MX0.BWmvH8WLYVkWoi-pCZcM-cPdvt9s5DzuUR2gGkE6E90';

const DEFAULT_SUPABASE_URL = 'https://poagmqrrbscemlqqccfe.supabase.co';

function resolveAnonKey(): string {
  const envKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }
  return VALID_ANON_JWT;
}

export const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
  anonKey: resolveAnonKey(),
};

let supabaseClient: SupabaseClient | null = null;

export function updateSupabaseCredentials(url?: string, anonKey?: string) {
  if (url && url.trim()) {
    SUPABASE_CONFIG.url = url.trim();
  }
  if (anonKey && anonKey.trim()) {
    SUPABASE_CONFIG.anonKey = anonKey.trim();
  }
  supabaseClient = null; // Forces re-instantiation with new credentials
}

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url = SUPABASE_CONFIG.url;
    const key = SUPABASE_CONFIG.anonKey;
    if (!url || !key) {
      throw new Error('Supabase URL and Anon Key are required');
    }
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
  tableStatus?: {
    familyDataExists: boolean;
    usersExists: boolean;
  };
}

/**
 * Testa conectividade real com a instância do Supabase
 */
export async function testSupabaseHealth(): Promise<SupabaseHealthResult> {
  const startTime = Date.now();
  const testedAt = new Date().toISOString();
  const projectUrl = SUPABASE_CONFIG.url;

  try {
    const client = getSupabase();
    // Test basic ping/query to Supabase REST endpoint
    const { data, error } = await client.from('milkflow_store').select('key').limit(1);

    const latencyMs = Date.now() - startTime;

    if (error) {
      // Check if error is just missing table (PGRST116 / 42P01 / 404), which means Supabase is REACHABLE and responsive
      const isMissingTable =
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.code === 'PGRST204' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.message?.includes('not found');

      if (isMissingTable) {
        return {
          connected: false,
          projectUrl,
          latencyMs,
          message: 'Supabase acessível, mas a tabela milkflow_store está ausente ou indisponível. A gravação não está confirmada.',
          testedAt,
          tableStatus: {
            familyDataExists: false,
            usersExists: false,
          },
        };
      }

      return {
        connected: false,
        projectUrl,
        latencyMs,
        message: `Aviso Supabase: ${error.message}`,
        testedAt,
      };
    }

    return {
      connected: true,
      projectUrl,
      latencyMs,
      message: 'Supabase 100% online e conectado',
      testedAt,
      tableStatus: {
        familyDataExists: true,
        usersExists: true,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      connected: false,
      projectUrl,
      latencyMs,
      message: `Erro ao conectar no Supabase: ${err.message || 'Falha de rede'}`,
      testedAt,
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
 * Script SQL para criar a tabela no Supabase caso o usuário deseje executar no editor SQL do Supabase
 */
export function getSupabaseSchemaSql(): string {
  return `-- Tabela de Armazenamento Principal do MilkFlow no Supabase
CREATE TABLE IF NOT EXISTS public.milkflow_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar Row Level Security (RLS) permissivo para anon/authenticated
ALTER TABLE public.milkflow_store ENABLE ROW LEVEL SECURITY;

-- Política de Leitura e Gravação para clientes com Publishable Key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'milkflow_store' AND policyname = 'Acesso público MilkFlow'
    ) THEN
        CREATE POLICY "Acesso público MilkFlow" ON public.milkflow_store
            FOR ALL
            TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END
$$;
`;
}
