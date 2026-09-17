import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

export const SUPABASE_URL: string =
  metaEnv.VITE_SUPABASE_URL || 'https://poagmqrrbscemlqqccfe.supabase.co';
export const SUPABASE_ANON_KEY: string =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYWdtcXJyYnNjZW1scXFjY2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTEwODEsImV4cCI6MjEwMjU2NzA4MX0.BWmvH8WLYVkWoi-pCZcM-cPdvt9s5DzuUR2gGkE6E90';

let supabaseClient: SupabaseClient | null = null;

export function getClientSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseClient;
}

export interface SupabaseStatus {
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
 * Consulta a saúde da conexão do Supabase via backend seguro
 */
export async function checkSupabaseStatus(): Promise<SupabaseStatus> {
  try {
    const res = await fetch('/api/supabase/status');
    if (res.ok) {
      return await res.json();
    }
    throw new Error(`Status HTTP ${res.status}`);
  } catch (err: any) {
    return {
      connected: false,
      projectUrl: SUPABASE_URL,
      latencyMs: 0,
      message: err.message || 'Falha ao consultar servidor',
      testedAt: new Date().toISOString(),
    };
  }
}

/**
 * Salva diretamente no Supabase a partir do cliente (camada de redundância em tempo real)
 */
export async function directSaveFamilyToSupabase(familyId: string, familyData: any): Promise<boolean> {
  try {
    const client = getClientSupabase();
    const { error } = await client
      .from('milkflow_store')
      .upsert(
        {
          key: `family_data_${familyId}`,
          value: {
            ...familyData,
            _syncedAt: new Date().toISOString(),
            _clientDirect: true,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.warn('Direct Supabase save warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Direct Supabase exception:', err);
    return false;
  }
}

/**
 * Lê diretamente do Supabase
 */
export async function directLoadFamilyFromSupabase(familyId: string): Promise<any | null> {
  try {
    const client = getClientSupabase();
    const { data, error } = await client
      .from('milkflow_store')
      .select('value')
      .eq('key', `family_data_${familyId}`)
      .single();

    if (error || !data) {
      return null;
    }
    return data.value;
  } catch (err) {
    return null;
  }
}

/**
 * Escuta alterações no Supabase em tempo real diretamente pelo canal WebSocket
 */
export function subscribeToFamilyInSupabase(
  familyId: string,
  onUpdate: (payload: any) => void
): () => void {
  try {
    const client = getClientSupabase();
    const channel = client
      .channel(`rt_family_${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milkflow_store',
          filter: `key=eq.family_data_${familyId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).value) {
            onUpdate((payload.new as any).value);
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (e) {
    console.warn('Could not initialize Supabase Realtime channel:', e);
    return () => {};
  }
}
