import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthContext, AuthContextType } from './AuthContext';
import { getClientSupabase } from '../lib/supabaseClient';
import { normalizeCloudSnapshot } from '../lib/cloudSnapshot';
import { mergeFamilySnapshots, readPendingFamilyWrites } from '../lib/familyPersistence';
import type { AuthUser, BabyProfile, Family, FamilyMember, UserRole } from '../types';

type Membership = { family_id: string; role: UserRole; display_name: string | null };
const urlForReset = () => window.location.origin + import.meta.env.BASE_URL;

function authUser(user: User, member: Membership): AuthUser {
  return {
    id: user.id,
    email: user.email || '',
    name: member.display_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Cuidador(a)',
    avatarColor: '#2563eb',
    role: member.role === 'OWNER' ? 'OWNER' : 'CAREGIVER',
    currentFamilyId: member.family_id,
    createdAt: user.created_at || new Date().toISOString(),
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

export const CloudAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [activeBabyId, setActiveBabyIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [cloudAuthEmail, setCloudAuthEmail] = useState<string | null>(null);
  const [cloudAuthError, setCloudAuthError] = useState<string | null>(null);
  const verifiedIdentity = useRef<{ userId: string; familyId: string } | null>(null);
  const hydrationGeneration = useRef(0);
  const hydratingUserId = useRef<string | null | undefined>(undefined);
  const mounted = useRef(true);

  const clearIdentity = useCallback(() => {
    verifiedIdentity.current = null;
    setCurrentUser(null);
    setCurrentFamily(null);
    setBabies([]);
    setActiveBabyIdState(null);
    setFamilyMembers([]);
  }, []);

  const clearSession = useCallback(() => {
    // A pending request must never restore an account after logout.
    hydrationGeneration.current += 1;
    hydratingUserId.current = undefined;
    clearIdentity();
    setCloudUserId(null);
    setCloudAuthEmail(null);
    setCloudAuthError(null);
    setIsLoading(false);
  }, [clearIdentity]);

  const hydrateAccount = useCallback(async (uid?: string) => {
    const generation = ++hydrationGeneration.current;
    const isCurrent = () => mounted.current && hydrationGeneration.current === generation;
    const previousIdentity = verifiedIdentity.current;
    const isSameIdentity = Boolean(previousIdentity && (!uid || uid === previousIdentity.userId));
    let authenticationDenied = false;
    hydratingUserId.current = uid || null;
    if (!isSameIdentity) {
      clearIdentity();
      setIsLoading(true);
    }
    try {
      const client = getClientSupabase();
      // getUser contacts Auth server; do not trust a legacy localStorage session.
      const { data: identity, error: authError } = await client.auth.getUser();
      if (!isCurrent()) return;
      if (authError) {
        authenticationDenied = authError.name === 'AuthSessionMissingError' ||
          [400, 401, 403, 404, 422].includes(Number(authError.status));
        throw authError;
      }
      const user = identity.user;
      if (!user || (uid && user.id !== uid)) {
        clearSession();
        return;
      }
      if (previousIdentity && previousIdentity.userId !== user.id) clearIdentity();
      setCloudUserId(user.id);
      setCloudAuthEmail(user.email || null);
      const { data: membership, error: memberError } = await client
        .from('milkflow_family_members')
        .select('family_id,role,display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!isCurrent()) return;
      if (memberError) throw memberError;
      if (!membership?.family_id) {
        clearIdentity();
        setCloudAuthError('Conta autenticada, mas ainda não vinculada à família. Aguarde a autorização no Supabase.');
        return;
      }
      const m = membership as Membership;
      if (previousIdentity && previousIdentity.familyId !== m.family_id) {
        clearIdentity();
        setIsLoading(true);
      }
      const { data: record, error: recordError } = await client
        .from('milkflow_store')
        .select('value')
        .eq('key', 'family_data_' + m.family_id)
        .single();
      if (!isCurrent()) return;
      if (recordError) throw recordError;
      const remote = normalizeCloudSnapshot(record?.value);
      // Read at commit time, after the requests. A feeding/diaper recorded while
      // they were in flight must survive this hydration and the next reload.
      const cacheKey = 'milkflow_family_data_' + m.family_id;
      const cachedRaw = localStorage.getItem(cacheKey);
      let cachedApp: Record<string, any> = {};
      if (cachedRaw) {
        // Do not overwrite a corrupt or unreadable cache with an older server
        // snapshot. The error leaves the existing data available for recovery.
        const cached = JSON.parse(cachedRaw);
        if (!cached || typeof cached !== 'object' || Array.isArray(cached)) {
          throw new Error('O histórico salvo neste aparelho precisa ser recuperado.');
        }
        cachedApp = cached.data || cached.familyData || cached;
      }
      let app = mergeFamilySnapshots(cachedApp, remote.app);
      for (const pending of readPendingFamilyWrites(localStorage, m.family_id)) {
        app = mergeFamilySnapshots(app, pending.data);
      }
      const { babies: babyList } = normalizeCloudSnapshot({ data: app, babies: remote.babies });
      const storedFamily = remote.storedFamily;
      // The family_id from protected membership is canonical. Never use
      // the old 6-digit pairing code or a family ID typed by a visitor.
      const family: Family = {
        ...storedFamily,
        id: m.family_id,
        name: storedFamily?.name || 'Família MilkFlow',
        ownerId: storedFamily?.ownerId || user.id,
        createdAt: storedFamily?.createdAt || user.created_at || new Date().toISOString(),
        babyIds: babyList.map(b => b.id),
        pairingCode: undefined,
      };
      const member: FamilyMember = {
        userId: user.id,
        familyId: m.family_id,
        email: user.email || '',
        name: m.display_name || user.email || 'Cuidador(a)',
        role: m.role,
        avatarColor: '#2563eb',
        joinedAt: user.created_at || new Date().toISOString(),
      };
      // Only the verified membership may select the cache. Pending records are
      // retained by ID and are flushed separately by the persistence queue.
      localStorage.setItem(cacheKey, JSON.stringify(app));
      verifiedIdentity.current = { userId: user.id, familyId: m.family_id };
      setCurrentFamily(family);
      setCurrentUser(authUser(user, m));
      setFamilyMembers([member]);
      setBabies(babyList);
      setActiveBabyIdState(previous => babyList.some(b => b.id === previous) ? previous : babyList[0]?.id || null);
      setCloudAuthError(null);
    } catch (error: any) {
      if (!isCurrent()) return;
      const denied = authenticationDenied || [401, 403].includes(Number(error?.status)) ||
        ['42501', 'PGRST301', 'PGRST302', 'PGRST303', 'bad_jwt', 'session_not_found', 'user_not_found'].includes(error?.code);
      // A transient connection error does not mean the user signed out. Keep
      // the last verified identity; all database access still goes through RLS.
      // A different account or a confirmed access denial must clear it.
      if (!isSameIdentity || denied) clearIdentity();
      if (authenticationDenied) {
        setCloudUserId(null);
        setCloudAuthEmail(null);
      }
      setCloudAuthError('Não foi possível carregar a família: ' + (error?.message || 'erro de conexão'));
    } finally {
      if (isCurrent()) {
        hydratingUserId.current = undefined;
        setIsLoading(false);
      }
    }
  }, [clearIdentity, clearSession]);

  useEffect(() => {
    mounted.current = true;
    let authTimer: ReturnType<typeof setTimeout> | undefined;
    const client = getClientSupabase();
    void hydrateAccount();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (!mounted.current) return;
      if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session?.user)) {
        clearTimeout(authTimer);
        clearSession();
        return;
      }
      const uid = session?.user?.id;
      if (!uid) return;
      // Supabase emits SIGNED_IN on focus and TOKEN_REFRESHED periodically.
      // Neither is an instruction to replace the family's current local data.
      if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
        verifiedIdentity.current?.userId === uid) return;
      if (event === 'INITIAL_SESSION' && hydratingUserId.current !== undefined) return;
      if (verifiedIdentity.current && verifiedIdentity.current.userId !== uid) {
        clearSession();
        setIsLoading(true);
      }
      clearTimeout(authTimer);
      const generation = hydrationGeneration.current;
      // Schedule outside the Auth lock; never await a Supabase request from
      // within its onAuthStateChange callback.
      authTimer = setTimeout(() => {
        if (mounted.current && generation === hydrationGeneration.current && hydratingUserId.current !== uid) {
          void hydrateAccount(uid);
        }
      }, 0);
    });
    return () => {
      mounted.current = false;
      hydrationGeneration.current += 1;
      hydratingUserId.current = undefined;
      clearTimeout(authTimer);
      subscription.unsubscribe();
    };
  }, [hydrateAccount, clearSession]);

  const refreshCloudAccess = async () => {
    await hydrateAccount();
  };
  const signInWithEmail: AuthContextType['signInWithEmail'] = async (email, pass) => {
    try {
      const { data, error } = await getClientSupabase().auth.signInWithPassword({
        email: email.trim().toLowerCase(), password: pass,
      });
      if (error) return { success: false, error: error.message };
      await hydrateAccount(data.user?.id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao entrar na conta.' };
    }
  };
  const signUpWithEmail: AuthContextType['signUpWithEmail'] = async (name, email, pass) => {
    if (!name.trim() || !email.trim() || pass.length < 8) {
      return { success: false, error: 'Preencha o nome, e-mail e uma senha de pelo menos 8 caracteres.' };
    }
    try {
      const { data, error } = await getClientSupabase().auth.signUp({
        email: email.trim().toLowerCase(), password: pass,
        options: { data: { name: name.trim() }, emailRedirectTo: urlForReset() },
      });
      if (error) return { success: false, error: error.message };
      return {
        success: true,
        message: data.session
          ? 'Conta criada. É preciso vincular seu usuário à família original no Supabase.'
          : 'Confira o e-mail de confirmação. Após confirmar, sua conta deverá ser vinculada à família original.',
      };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Não foi possível criar a conta.' };
    }
  };
  const sendPasswordReset: AuthContextType['sendPasswordReset'] = async email => {
    try {
      const { error } = await getClientSupabase().auth.resetPasswordForEmail(
        email.trim().toLowerCase(), { redirectTo: urlForReset() }
      );
      if (error) throw error;
      return { success: true, message: 'Verifique seu e-mail para recuperar a senha.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Não foi possível enviar o e-mail.' };
    }
  };
  const signOutUser = () => {
    clearSession();
    void getClientSupabase().auth.signOut();
  };
  const unsupported = () => {
    window.alert('Nesta versão a administração de membros é feita no Supabase com autorização. Nenhuma alteração foi aplicada.');
  };
  const denyCodeLogin: AuthContextType['signInWithFamilyCode'] = async () => ({
    success: false, error: 'O código antigo não autentica no Supabase. Entre com e-mail e senha.',
  });
  const denyFakeGoogle: AuthContextType['signInWithGoogle'] = async () => ({
    success: false, error: 'Use e-mail e senha. Login Google não está configurado.',
  });
  const deleteAccount = async () => {
    window.alert('Exclusão de contas e dados desabilitada nesta edição. Contate o administrador familiar.');
  };
  const createBaby: AuthContextType['createBaby'] = _data => {
    throw new Error('Novo cadastro indisponível durante a migração. A família existente será preservada.');
  };
  const updateBabyProfile: AuthContextType['updateBabyProfile'] = (babyId, updates) => {
    setBabies(prev => prev.map(b => b.id === babyId ? { ...b, ...updates } : b));
    // The AppContext persists this edit through the authenticated cloud RPC.
  };
  const setActiveBabyId = (babyId: string) => {
    if (babies.some(b => b.id === babyId)) setActiveBabyIdState(babyId);
  };
  const syncIncomingFamilyState: AuthContextType['syncIncomingFamilyState'] = (incomingBabies, incomingFamily) => {
    if (incomingBabies?.length) {
      setBabies(prev => {
        const merged = new Map(prev.map(b => [b.id, b]));
        for (const b of incomingBabies) {
          if (b?.id) merged.set(b.id, { ...merged.get(b.id), ...b });
        }
        return Array.from(merged.values());
      });
    }
    if (incomingFamily && currentFamily && incomingFamily.id === currentFamily.id) {
      // Retain protected membership identity; only update safe metadata.
      setCurrentFamily(prev => prev ? { ...prev, name: incomingFamily.name || prev.name } : null);
    }
  };

  const value: AuthContextType = {
    currentUser, currentFamily, familyMembers, babies,
    activeBaby: babies.find(b => b.id === activeBabyId) || babies[0] || null,
    activeBabyId, setActiveBabyId, isLoading,
    // Never offer a blank new family if a protected record cannot be loaded.
    isOnboarding: false,
    cloudUserId, cloudAuthEmail, cloudAuthError, refreshCloudAccess,
    startLocalProfile: unsupported,
    signUpWithEmail, signInWithEmail, signInWithFamilyCode: denyCodeLogin,
    signInWithGoogle: denyFakeGoogle, sendPasswordReset, signOutUser,
    deleteAccount, createBaby, updateBabyProfile,
    deleteBaby: unsupported, inviteCaregiver: unsupported,
    removeCaregiver: unsupported, addFamilyMember: unsupported,
    updateFamilyMember: unsupported, removeFamilyMember: unsupported,
    updateFamilyName: unsupported, syncIncomingFamilyState,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
