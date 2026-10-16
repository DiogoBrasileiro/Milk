import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthContext, AuthContextType } from './AuthContext';
import { getClientSupabase } from '../lib/supabaseClient';
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

function safeSnapshot(raw: any) {
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

  const clearIdentity = useCallback(() => {
    setCurrentUser(null);
    setCurrentFamily(null);
    setBabies([]);
    setActiveBabyIdState(null);
    setFamilyMembers([]);
  }, []);

  const hydrateAccount = useCallback(async (uid?: string) => {
    setIsLoading(true);
    try {
      const client = getClientSupabase();
      // getUser contacts Auth server; do not trust a legacy localStorage session.
      const { data: identity, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      const user = identity.user;
      if (!user || (uid && user.id !== uid)) {
        clearIdentity();
        setCloudUserId(null);
        setCloudAuthEmail(null);
        setCloudAuthError(null);
        return;
      }
      setCloudUserId(user.id);
      setCloudAuthEmail(user.email || null);
      const { data: membership, error: memberError } = await client
        .from('milkflow_family_members')
        .select('family_id,role,display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (memberError) throw memberError;
      if (!membership?.family_id) {
        clearIdentity();
        setCloudAuthError('Conta autenticada, mas ainda não vinculada à família. Aguarde a autorização no Supabase.');
        return;
      }
      const m = membership as Membership;
      const { data: record, error: recordError } = await client
        .from('milkflow_store')
        .select('value')
        .eq('key', 'family_data_' + m.family_id)
        .single();
      if (recordError) throw recordError;
      const { app, babies: babyList, storedFamily } = safeSnapshot(record?.value);
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
      // Persist only this authenticated family's snapshot, not a global
      // backup or a fake login session.
      localStorage.setItem('milkflow_family_data_' + m.family_id, JSON.stringify(app));
      setCurrentFamily(family);
      setCurrentUser(authUser(user, m));
      setFamilyMembers([member]);
      setBabies(babyList);
      setActiveBabyIdState(babyList[0]?.id || null);
      setCloudAuthError(null);
    } catch (error: any) {
      clearIdentity();
      setCloudAuthError('Não foi possível carregar a família: ' + (error?.message || 'erro de conexão'));
    } finally {
      setIsLoading(false);
    }
  }, [clearIdentity]);

  useEffect(() => {
    let mounted = true;
    const client = getClientSupabase();
    void hydrateAccount();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      // Avoid awaiting a Supabase database request inside the Auth callback.
      Promise.resolve().then(() => {
        if (mounted) void hydrateAccount(session?.user?.id);
      });
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [hydrateAccount]);

  const refreshCloudAccess = async () => {
    await hydrateAccount();
  };
  const signInWithEmail: AuthContextType['signInWithEmail'] = async (email, pass) => {
    try {
      const { error } = await getClientSupabase().auth.signInWithPassword({
        email: email.trim().toLowerCase(), password: pass,
      });
      if (error) return { success: false, error: error.message };
      await hydrateAccount();
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
    clearIdentity();
    setCloudUserId(null);
    setCloudAuthEmail(null);
    setCloudAuthError(null);
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
