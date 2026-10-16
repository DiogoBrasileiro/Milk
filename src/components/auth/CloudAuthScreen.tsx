import React, { useEffect, useState } from 'react';
import { Milk, ShieldCheck, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getClientSupabase } from '../../lib/supabaseClient';

type Mode = 'login' | 'signup' | 'reset' | 'new-password';

export const CloudAuthScreen: React.FC = () => {
  const {
    signInWithEmail, signUpWithEmail, sendPasswordReset, signOutUser,
    cloudUserId, cloudAuthEmail, cloudAuthError, refreshCloudAccess,
  } = useAuth();
  const [mode, setMode] = useState<Mode>(
    window.location.hash.includes('type=recovery') ? 'new-password' : 'login'
  );
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = getClientSupabase().auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('new-password');
        setInfo('Defina uma nova senha de acesso à sua conta.');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'new-password') {
        const { error: authError } = await getClientSupabase().auth.updateUser({ password });
        if (authError) throw authError;
        setInfo('Senha alterada. Faça login com sua nova senha.');
        setMode('login');
        await getClientSupabase().auth.signOut();
        return;
      }
      if (mode === 'reset') {
        const result = await sendPasswordReset(email);
        if (!result.success) setError(result.message);
        else setInfo(result.message);
        return;
      }
      const result = mode === 'signup'
        ? await signUpWithEmail(name, email, password)
        : await signInWithEmail(email, password);
      if (!result.success) setError(result.error || 'Não foi possível autenticar.');
      else setInfo(result.message || 'Autenticação concluída.');
    } catch (e: any) {
      setError(e?.message || 'Não foi possível autenticar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100 flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-3"><Milk size={25} /></div>
          <div>
            <h1 className="text-xl font-extrabold">MilkFlow Baby</h1>
            <p className="text-sm text-slate-400">Acesso familiar com Supabase</p>
          </div>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-3 text-xs text-blue-100 flex items-start gap-2">
          <ShieldCheck size={18} className="shrink-0" />
          O histórico existente é mantido no Supabase. Acesso permitido somente após vinculação da conta à família autorizada.
        </div>

        {cloudUserId && mode !== 'new-password' ? (
          <section className="space-y-3 border border-amber-500/30 bg-amber-500/10 rounded-xl p-4">
            <h2 className="font-bold text-amber-100">Aguardando liberação da família</h2>
            <p className="text-sm text-amber-100">
              {cloudAuthError || 'Sua conta está autenticada, mas ainda não tem permissão para abrir os registros.'}
            </p>
            <p className="text-xs text-slate-300">Conta: {cloudAuthEmail || 'e-mail autenticado'}</p>
            <p className="text-xs text-slate-300 break-all">UID da conta: <code className="select-all">{cloudUserId}</code></p>
            <p className="text-xs text-slate-400">O administrador deve vincular este UID no Supabase. Não é necessário criar outra família.</p>
            <button
              type="button"
              onClick={() => { setBusy(true); void refreshCloudAccess?.().finally(() => setBusy(false)); }}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-bold disabled:opacity-50"
            ><RefreshCw size={16} /> Verificar acesso novamente</button>
            <button type="button" onClick={signOutUser} className="flex w-full items-center justify-center gap-2 p-2 text-slate-200">
              <LogOut size={16} /> Sair da conta
            </button>
          </section>
        ) : (
          <>
            <div className="flex gap-2 text-sm">
              <button className={mode === 'login' ? 'flex-1 rounded-lg bg-blue-600 p-2 font-bold' : 'flex-1 rounded-lg bg-slate-800 p-2'}
                onClick={() => { setMode('login'); setError(null); setInfo(null); }}>Entrar</button>
              <button className={mode === 'signup' ? 'flex-1 rounded-lg bg-blue-600 p-2 font-bold' : 'flex-1 rounded-lg bg-slate-800 p-2'}
                onClick={() => { setMode('signup'); setError(null); setInfo(null); }}>Criar conta</button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              {mode === 'signup' && (
                <label className="block space-y-1 text-sm">
                  <span>Nome</span>
                  <input className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3"
                    value={name} onChange={e => setName(e.target.value)} required maxLength={80} autoComplete="name"/>
                </label>
              )}
              {mode !== 'new-password' && (
                <label className="block space-y-1 text-sm">
                  <span>E-mail</span>
                  <input type="email" autoComplete="email" required
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3"
                    value={email} onChange={e => setEmail(e.target.value)}/>
                </label>
              )}
              {mode !== 'reset' && (
                <label className="block space-y-1 text-sm">
                  <span>{mode === 'new-password' ? 'Nova senha' : 'Senha'}</span>
                  <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={8} required className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3"
                    value={password} onChange={e => setPassword(e.target.value)}/>
                </label>
              )}
              {error && <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-950 p-3 text-sm text-red-200">
                <AlertCircle size={16}/>{error}</p>}
              {info && <p role="status" className="rounded-xl bg-green-950 p-3 text-sm text-green-100">{info}</p>}
              <button type="submit" disabled={busy}
                className="w-full rounded-xl bg-blue-600 p-3 text-sm font-bold disabled:opacity-50">
                {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar com e-mail' : mode === 'signup' ? 'Criar conta familiar' :
                  mode === 'reset' ? 'Enviar recuperação' : 'Salvar nova senha'}
              </button>
              <button type="button" onClick={() => { setMode(mode === 'reset' ? 'login' : 'reset'); setInfo(null); setError(null); }}
                className="w-full p-1 text-xs text-slate-400">
                {mode === 'reset' ? 'Voltar ao login' : 'Esqueci minha senha'}
              </button>
            </form>
          </>
        )}
        <p className="text-xs text-slate-500">
          O antigo código numérico não é uma senha. Nenhum registro familiar é liberado sem associação autenticada no Supabase.
        </p>
      </div>
    </main>
  );
};
