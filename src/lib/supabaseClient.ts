import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IS_CLOUD_PAGES, IS_STATIC_PAGES } from './deployment';

// Publishable/legacy anon keys are PUBLIC browser configuration. Never put a
// service_role key, secret key, password or family pairing code in Vite env.
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

let supabaseClient: SupabaseClient | null = null;

export function getClientSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || IS_STATIC_PAGES) {
    throw new Error('Supabase não configurado para esta publicação.');
  }
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
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
  tableStatus?: { familyDataExists: boolean; usersExists: boolean };
}

export async function checkSupabaseStatus(): Promise<SupabaseStatus> {
  const at = new Date().toISOString();
  if (IS_STATIC_PAGES) {
    return { connected: false, projectUrl: '', latencyMs: 0, testedAt: at, message: 'Modo local, sem sincronização.' };
  }
  if (IS_CLOUD_PAGES) {
    const started = Date.now();
    try {
      const client = getClientSupabase();
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      return {
        connected: Boolean(data.user),
        projectUrl: SUPABASE_URL,
        latencyMs: Date.now() - started,
        testedAt: new Date().toISOString(),
        message: data.user ? 'Sessão autenticada no Supabase.' : 'Entre na sua conta para sincronizar.',
      };
    } catch (error: any) {
      return { connected: false, projectUrl: SUPABASE_URL, latencyMs: Date.now() - started, testedAt: at, message: error?.message || 'Falha ao validar sessão.' };
    }
  }
  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) throw new Error('Status HTTP ' + res.status);
    return await res.json();
  } catch (error: any) {
    return { connected: false, projectUrl: SUPABASE_URL, latencyMs: 0, testedAt: at, message: error?.message || 'Servidor indisponível.' };
  }
}

// In the Pages cloud edition only the membership-verified RPC can write.
// The RPC executes an atomic merge, preserving unrelated family records.
export async function directSaveFamilyToSupabase(familyId: string, familyData: any): Promise<boolean> {
  if (IS_STATIC_PAGES) return false;
  try {
    const client = getClientSupabase();
    if (IS_CLOUD_PAGES) {
      const { error } = await client.rpc('milkflow_merge_snapshot', {
        p_family_id: familyId,
        p_snapshot: familyData,
      });
      if (error) throw error;
      return true;
    }
    const { error } = await client
      .from('milkflow_store')
      .upsert({
        key: 'family_data_' + familyId,
        value: { ...familyData, _syncedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('Não foi possível salvar no Supabase:', error);
    return false;
  }
}

export async function directLoadFamilyFromSupabase(familyId: string): Promise<any | null> {
  if (IS_STATIC_PAGES) return null;
  try {
    const client = getClientSupabase();
    const { data, error } = await client
      .from('milkflow_store')
      .select('value')
      .eq('key', 'family_data_' + familyId)
      .single();
    if (error) throw error;
    return data?.value ?? null;
  } catch (error) {
    console.warn('Não foi possível carregar a família no Supabase:', error);
    return null;
  }
}

export function subscribeToFamilyInSupabase(
  familyId: string,
  onUpdate: (payload: any) => void
): () => void {
  if (IS_STATIC_PAGES) return () => {};
  try {
    const client = getClientSupabase();
    const channel = client.channel('rt_family_' + familyId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'milkflow_store',
        filter: 'key=eq.family_data_' + familyId,
      }, payload => {
        if (payload.new && (payload.new as any).value) {
          onUpdate((payload.new as any).value);
        }
      })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  } catch (error) {
    console.warn('Supabase Realtime indisponível:', error);
    return () => {};
  }
}
