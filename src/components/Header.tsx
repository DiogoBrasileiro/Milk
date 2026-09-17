import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { calculateBabyAge } from '../utils/formatters';
import {
  Home,
  Moon,
  Sun,
  ChevronDown,
  Plus,
  Baby as BabyIcon,
  Wifi,
  WifiOff,
  LogOut,
  Trash2,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Download,
  Settings,
  Sparkles,
  Cloud,
  CloudOff,
  RefreshCw,
  Smartphone,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';
import { CONSERVATION_PROTOCOLS } from '../constants/medicalProtocols';
import { DataIntegrityModal } from './DataIntegrityModal';
import { checkDataIntegrity } from '../services/dataIntegrityService';

export const Header: React.FC = () => {
  const {
    baby,
    openModal,
    protocolId,
    activeTab,
    setActiveTab,
    isNightMode,
    toggleNightMode,
    isOnline,
    exportDataJson,
    cloudSyncStatus,
    lastCloudSyncTime,
    forceCloudSync,
    batches,
    feedings,
    pumpings,
    diapers,
    discomforts,
    weights,
    sleepLogs,
    caregivers,
  } = useApp();

  const {
    currentUser,
    currentFamily,
    babies,
    activeBabyId,
    setActiveBabyId,
    signOutUser,
    deleteAccount,
  } = useAuth();

  const [showBabyMenu, setShowBabyMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [integrityCheckKey, setIntegrityCheckKey] = useState(0);

  const integrityReport = useMemo(() => {
    return checkDataIntegrity({
      batches,
      feedings,
      pumpings,
      diapers,
      discomforts,
      weights,
      sleepLogs,
      caregivers,
      lastCloudSyncTime,
    });
  }, [
    batches,
    feedings,
    pumpings,
    diapers,
    discomforts,
    weights,
    sleepLogs,
    caregivers,
    lastCloudSyncTime,
    integrityCheckKey,
  ]);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await forceCloudSync();
    setTimeout(() => setIsManualSyncing(false), 600);
  };

  const handleCopyCode = () => {
    const code = currentFamily?.pairingCode || currentFamily?.id || '';
    if (navigator.clipboard && code) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const age = calculateBabyAge(baby.birthDate);
  const currentProtocol = CONSERVATION_PROTOCOLS[protocolId];

  const handleExport = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${baby.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowUserMenu(false);
  };

  const handleDeleteAccountConfirm = async () => {
    const confirmText = prompt('Esta ação é irreversível e excluirá todos os dados da família. Digite EXCLUIR para confirmar:');
    if (confirmText === 'EXCLUIR') {
      await deleteAccount();
    }
  };

  return (
    <header
      className={`sticky top-0 z-30 transition-colors duration-200 border-b pt-safe select-none ${
        isNightMode ? 'bg-[#080b10]/95 border-slate-800/80 backdrop-blur-md' : 'bg-white/95 border-slate-200/80 backdrop-blur-md'
      }`}
    >
      <div className="max-w-md sm:max-w-2xl mx-auto px-3.5 py-2.5 flex items-center justify-between gap-2">
        {/* Baby Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowBabyMenu(!showBabyMenu);
              setShowUserMenu(false);
            }}
            className={`flex items-center gap-2.5 p-1.5 pr-2.5 rounded-2xl transition-all border ${
              isNightMode
                ? 'bg-slate-900/90 border-slate-800 text-white hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                isNightMode
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {baby.photoUrl ? (
                <img src={baby.photoUrl} alt={baby.name} className="w-full h-full rounded-xl object-cover" />
              ) : (
                <BabyIcon className="w-5 h-5" />
              )}
            </div>

            <div className="text-left">
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-xs tracking-tight truncate max-w-[100px] sm:max-w-[140px]">
                  {baby.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {age.displayString} • {(baby.currentWeight / 1000).toFixed(3).replace('.', ',')} kg
                {baby.currentLength ? ` • ${baby.currentLength} cm` : ''}
              </div>
            </div>
          </button>

          {/* Baby Selector Modal/Dropdown */}
          {showBabyMenu && (
            <div
              className={`absolute left-0 mt-2 w-64 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 ${
                isNightMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Bebês da Família
              </div>

              <div className="space-y-1 my-1">
                {babies.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setActiveBabyId(b.id);
                      setShowBabyMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                      b.id === activeBabyId
                        ? isNightMode
                          ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30'
                          : 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BabyIcon className="w-4 h-4 text-blue-400" />
                      <span>{b.name}</span>
                    </div>
                    {b.id === activeBabyId && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-md">Ativo</span>}
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-800 my-1 pt-1 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowBabyMenu(false);
                    setActiveTab('home');
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-blue-400 hover:bg-slate-800 flex items-center gap-2 font-bold"
                >
                  <Home className="w-4 h-4" />
                  <span>Ir para o Dashboard Principal</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBabyMenu(false);
                    openModal('addBaby');
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 font-medium"
                >
                  <Plus className="w-4 h-4 text-slate-400" />
                  <span>Cadastrar Outro Bebê</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Home/Dashboard shortcut, Sync Status, Night Mode, Account Menu */}
        <div className="flex items-center gap-1.5">
          {/* Direct Dashboard / Início Button */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            id="header-home-btn"
            title="Ir para o Dashboard Principal"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl text-xs font-bold transition-all border ${
              activeTab === 'home'
                ? isNightMode
                  ? 'bg-blue-600/25 text-blue-300 border-blue-500/40 ring-1 ring-blue-500/30'
                  : 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-500/20'
                : isNightMode
                ? 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Home className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="font-bold hidden sm:inline">Início</span>
          </button>

          {/* Cloud Multi-Device Live Real-Time Sync Indicator */}
          <button
            type="button"
            onClick={handleManualSync}
            id="cloud-sync-status-btn"
            title={
              cloudSyncStatus === 'syncing' || isManualSyncing
                ? 'Sincronizando com a nuvem e outros aparelhos...'
                : cloudSyncStatus === 'offline'
                ? 'Offline - Os dados serão sincronizados assim que a conexão voltar'
                : `⚡ Sincronismo em Tempo Real Ativo! Última atualização às ${lastCloudSyncTime || 'agora'}. Clique para forçar atualização.`
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl text-[10px] font-bold transition-all border ${
              cloudSyncStatus === 'syncing' || isManualSyncing
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : cloudSyncStatus === 'offline'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : isNightMode
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-sm'
            }`}
          >
            {cloudSyncStatus === 'syncing' || isManualSyncing ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-blue-400 shrink-0" />
                <span className="hidden xs:inline">Sincronizando</span>
              </>
            ) : cloudSyncStatus === 'offline' ? (
              <>
                <CloudOff className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="hidden xs:inline">Offline</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Cloud className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="hidden xs:inline">Ao Vivo</span>
              </>
            )}
          </button>

          {/* Night Mode Toggle */}
          <button
            type="button"
            onClick={toggleNightMode}
            id="toggle-night-mode-btn"
            title={isNightMode ? 'Desativar Modo Madrugada' : 'Ativar Modo Madrugada (Dark Mode)'}
            className={`p-2 rounded-2xl transition-all border ${
              isNightMode
                ? 'bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Account Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowBabyMenu(false);
              }}
              id="user-account-menu-btn"
              className={`flex items-center gap-1.5 p-1.5 pl-2 rounded-2xl border transition-all ${
                isNightMode
                  ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div
                className="w-6 h-6 rounded-xl flex items-center justify-center text-[11px] font-black text-white"
                style={{ backgroundColor: currentUser?.avatarColor || '#3b82f6' }}
              >
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showUserMenu && (
              <div
                className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 ${
                  isNightMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {/* User Info Header */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 mb-2">
                  <div className="font-bold text-xs text-white truncate">{currentUser?.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{currentUser?.email}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300 border border-blue-500/30">
                      {currentUser?.role === 'OWNER' ? 'Proprietário (Owner)' : 'Cuidador'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">ID: {currentUser?.id.slice(-6)}</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      setActiveTab('home');
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 flex items-center gap-2 font-bold text-blue-400"
                  >
                    <Home className="w-4 h-4 text-blue-400" />
                    <span>Ir para o Dashboard (Início)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowPairingModal(true);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-between font-bold text-indigo-300"
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-400" />
                      <span>Conectar Outro Celular</span>
                    </div>
                    <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-mono">
                      {currentFamily?.pairingCode || 'Código'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleManualSync();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-800 flex items-center justify-between font-medium text-blue-400"
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`w-4 h-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
                      <span>Sincronizar Nuvem Agora</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Multi-aparelho</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowIntegrityModal(true);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-between font-bold text-emerald-300"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Auditoria & Integridade</span>
                    </div>
                    <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono">
                      {integrityReport.healthScore}%
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      openModal('caregivers');
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 font-medium"
                  >
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>Família e Cuidadores</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExport}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 font-medium"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Exportar Backup (JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      openModal('settings');
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 font-medium"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Configurações & Protocolos</span>
                  </button>

                  <div className="border-t border-slate-800 my-1 pt-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      signOutUser();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-800 flex items-center gap-2 text-slate-300 font-bold"
                  >
                    <LogOut className="w-4 h-4 text-amber-400" />
                    <span>Sair da Conta</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAccountConfirm}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-rose-500/10 flex items-center gap-2 text-rose-400 font-bold text-[11px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Conta e Dados</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Conectar Outro Celular / Pairing Code Guide */}
      {showPairingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
              isNightMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Conectar Outro Aparelho</h3>
                  <p className="text-[11px] text-slate-400">Celular, Tablet ou Computador</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPairingModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Option 1: 6-Digit Family Code */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-center space-y-2">
                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Método 1: Código de 6 Dígitos (Mais Fácil)
                </div>
                <div className="text-3xl font-black tracking-widest font-mono text-indigo-700 dark:text-indigo-300 py-1 select-all">
                  {currentFamily?.pairingCode || '849201'}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Código Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              {/* Option 2: Registered Email */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase">
                  Método 2: E-mail da Conta
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 break-all select-all">
                  {currentUser?.email}
                </div>
              </div>

              {/* Step-by-step instructions */}
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <div className="font-bold text-xs">Como acessar no 2º aparelho:</div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400">
                  <li>Abra o <strong>MilkFlow Baby</strong> no outro celular ou tablet.</li>
                  <li>Na tela de login, clique na aba <strong>"Código"</strong>.</li>
                  <li>Digite o código <strong>{currentFamily?.pairingCode || '849201'}</strong>.</li>
                  <li>Pronto! Todos os registros, timer e estoque de leite aparecem instantaneamente!</li>
                </ol>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPairingModal(false)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-2xl transition-all"
              >
                Entendi, fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Auditoria e Integridade de Dados */}
      {showIntegrityModal && (
        <DataIntegrityModal
          report={integrityReport}
          isOpen={showIntegrityModal}
          onClose={() => setShowIntegrityModal(false)}
          onRefreshCheck={() => setIntegrityCheckKey((k) => k + 1)}
        />
      )}
    </header>
  );
};
