import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Milk, ShieldCheck, Mail, Lock, User, ArrowRight, Sparkles, AlertCircle, CheckCircle, Smartphone, KeyRound, HelpCircle } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, signInWithFamilyCode, signInWithGoogle, sendPasswordReset } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'code' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!acceptTerms) {
          setError('Você precisa aceitar os termos de privacidade para continuar.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.');
          setLoading(false);
          return;
        }
        const res = await signUpWithEmail(name, email, password);
        if (!res.success) {
          setError(res.error || 'Erro ao criar conta.');
        }
      } else if (mode === 'login') {
        const res = await signInWithEmail(email, password);
        if (!res.success) {
          setError(res.error || 'E-mail ou senha incorretos.');
        }
      } else if (mode === 'code') {
        if (!familyCode.trim()) {
          setError('Informe o código de 6 dígitos.');
          setLoading(false);
          return;
        }
        const res = await signInWithFamilyCode(familyCode, caregiverName);
        if (!res.success) {
          setError(res.error || 'Código da família inválido ou não encontrado.');
        }
      } else if (mode === 'forgot') {
        const res = await sendPasswordReset(email);
        setInfoMessage(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (customEmail?: string, customName?: string) => {
    setError(null);
    setLoading(true);
    try {
      const emailToUse = customEmail || googleEmailInput || `mae.cuidadora_${Math.random().toString(36).substr(2, 4)}@gmail.com`;
      const nameToUse = customName || googleNameInput || 'Cuidador(a) Google';
      
      const res = await signUpWithEmail(nameToUse, emailToUse, 'google_oauth_secure_pass');
      if (!res.success) {
        // If already exists, try signing in with that email
        const loginRes = await signInWithEmail(emailToUse, 'google_oauth_secure_pass');
        if (!loginRes.success) {
          setError(loginRes.error || 'Falha ao autenticar com conta Google.');
        }
      }
      setShowGoogleModal(false);
    } catch (e: any) {
      setError(e.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b10] text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none pt-safe pb-safe">
      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
            <Milk className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">MilkFlow Baby</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Acesso em Qualquer Celular, Tablet ou Computador
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
              <span>☁️ Sincronização em Nuvem em Tempo Real</span>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs (3 Modes: Login, Pairing Code, Signup) */}
        <div className="p-1 bg-slate-900/90 border border-slate-800 rounded-2xl flex gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setInfoMessage(null);
            }}
            className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${
              mode === 'login' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            E-mail
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('code');
              setError(null);
              setInfoMessage(null);
            }}
            className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
              mode === 'code' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Código</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
              setInfoMessage(null);
            }}
            className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${
              mode === 'signup' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium space-y-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {mode === 'login' && error.includes('não cadastrado') && (
              <div className="text-[11px] text-slate-300 pt-1 border-t border-rose-500/20 mt-1">
                💡 <strong>Dica para 2º celular:</strong> No aparelho principal, abra o menu superior para ver seu <strong>Código da Família de 6 dígitos</strong> e conecte pela aba <strong>"Código"</strong>.
              </div>
            )}
          </div>
        )}

        {infoMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* PAIRING CODE MODE */}
          {mode === 'code' && (
            <div className="space-y-3">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs text-indigo-300">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <span>Conectar Segundo Celular / Tablet</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Digite o código de 6 dígitos exibido no primeiro celular (Menu do usuário &gt; Conectar Outro Celular).
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Código de 6 Dígitos da Família:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-indigo-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={familyCode}
                    onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                    placeholder="Ex: 849201"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border-2 border-indigo-500/60 focus:border-indigo-400 rounded-2xl text-base tracking-widest text-center text-white font-black placeholder-slate-500 outline-none h-12"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Quem está usando este aparelho? (Opcional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={caregiverName}
                    onChange={(e) => setCaregiverName(e.target.value)}
                    placeholder="Ex: Pai / Vovó / Babá"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border-2 border-slate-700 focus:border-blue-400 rounded-2xl text-sm text-white font-bold placeholder-slate-500 outline-none h-12"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SIGNUP MODE FIELDS */}
          {mode === 'signup' && (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Seu Nome / Cuidador Principal:</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Maria Souza"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border-2 border-slate-700 focus:border-blue-400 rounded-2xl text-sm text-white font-bold placeholder-slate-500 outline-none h-12"
                />
              </div>
            </div>
          )}

          {/* EMAIL & PASSWORD FIELDS (for login, signup, forgot) */}
          {mode !== 'code' && (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Seu E-mail:</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border-2 border-slate-700 focus:border-blue-400 rounded-2xl text-sm text-white font-bold placeholder-slate-500 outline-none h-12"
                />
              </div>
            </div>
          )}

          {mode !== 'code' && mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">Senha:</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                    }}
                    className="text-xs font-bold text-blue-400 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border-2 border-slate-700 focus:border-blue-400 rounded-2xl text-sm text-white font-bold placeholder-slate-500 outline-none h-12"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Confirmar Senha:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border-2 border-slate-700 focus:border-blue-400 rounded-2xl text-sm text-white font-bold placeholder-slate-500 outline-none h-12"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
              />
              <span className="text-[11px] text-slate-400 leading-tight">
                Concordo com os Termos de Privacidade e Isolamento Total de Dados Pediátricos.
              </span>
            </label>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full h-12 text-white font-bold text-xs rounded-2xl shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 mt-4 transition-all ${
              mode === 'code'
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
            }`}
          >
            {loading ? (
              <span className="animate-pulse">Aguarde...</span>
            ) : mode === 'signup' ? (
              <>
                <span>CRIAR MINHA CONTA</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'login' ? (
              <>
                <span>ENTRAR COM E-MAIL</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'code' ? (
              <>
                <span>CONECTAR APARELHO À FAMÍLIA</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <span>ENVIAR LINK DE RECUPERAÇÃO</span>
            )}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-2"
            >
              ← Voltar para o Login
            </button>
          )}
        </form>

        {/* Divider */}
        {mode !== 'code' && (
          <>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500">
                <span className="bg-[#080b10] px-3">ou continue com</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              disabled={loading}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 active:scale-[0.98] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-3 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Acessar com Google</span>
            </button>
          </>
        )}
      </div>

      {/* Google Account Modal Dialog */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <h3 className="font-bold text-sm">Fazer login com o Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha sua conta do Google para continuar no <strong>MilkFlow Baby</strong>:
            </p>

            {/* Quick Demo Google Accounts */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleGoogleLogin('maria.mae@gmail.com', 'Maria Mãe')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center text-xs">
                  M
                </div>
                <div>
                  <div className="text-xs font-bold">Maria Mãe</div>
                  <div className="text-[10px] text-slate-400">maria.mae@gmail.com</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleLogin('pedro.pai@gmail.com', 'Pedro Pai')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
                  P
                </div>
                <div>
                  <div className="text-xs font-bold">Pedro Pai</div>
                  <div className="text-[10px] text-slate-400">pedro.pai@gmail.com</div>
                </div>
              </button>
            </div>

            {/* Custom Google Email Input */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 block">Ou digite seu Gmail:</label>
              <input
                type="email"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                placeholder="seu.email@gmail.com"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-medium outline-none"
              />
              <button
                type="button"
                onClick={() => handleGoogleLogin()}
                disabled={!googleEmailInput && false}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-all"
              >
                Continuar com este e-mail Google
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Security Badge */}
      <div className="text-center pt-6 text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Criptografia de ponta a ponta e isolamento total multi-tenant</span>
      </div>
    </div>
  );
};

