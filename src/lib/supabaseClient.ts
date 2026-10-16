import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { IS_STATIC_PAGES } from './deployment';

const metaEnv = import.meta.env;

// Never embed database endpoints and keys in a publicly compiled Pages bundle.
export const SUPABASE_URL: string = metaEnv.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY: string = metaEnv.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;

export function getClientSupabase(): SupabaseClient {
  if (IS_STATIC_PAGES || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase indisponível neste modo de execução.');
  }
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
  if (IS_STATIC_PAGES) {
    return {connected:false,projectUrl:'',latencyMs:0,message:'Modo local: sem sincronização com Supabase.',testedAt:new Date().toISOString()};
  }
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
  if (IS_STATIC_PAGES) return false;
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
  if (IS_STATIC_PAGES) return null;
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
  if (IS_STATIC_PAGES) return () => {};
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
