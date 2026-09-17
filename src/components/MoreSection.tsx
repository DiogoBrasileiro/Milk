import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Home,
  ArrowLeft,
  FileText,
  Scale,
  HeartCrack,
  Settings,
  Moon,
  Sun,
  Download,
  Users,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  BookOpen,
  QrCode,
  Droplet,
  Package,
  Milk,
  Baby,
  Pill,
} from 'lucide-react';
import { CONSERVATION_PROTOCOLS } from '../constants/medicalProtocols';
import { DataIntegrityModal } from './DataIntegrityModal';
import { checkDataIntegrity } from '../services/dataIntegrityService';
import { MedicationTrackerModal } from './medications/MedicationTrackerModal';

export const MoreSection: React.FC = () => {
  const {
    openModal,
    setActiveTab,
    isNightMode,
    toggleNightMode,
    protocolId,
    caregivers,
    restoreAllHistoricalData,
    batches,
    feedings,
    pumpings,
    diapers,
    discomforts,
    weights,
    sleepLogs,
    lastCloudSyncTime,
  } = useApp();

  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
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

  const currentProtocol = CONSERVATION_PROTOCOLS[protocolId];

  const menuItems = [
    {
      id: 'home',
      title: 'Dashboard Principal (Início)',
      subtitle: 'Painel geral, timers ativos, próximas mamadas e visão 24h',
      icon: Home,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
      action: () => setActiveTab('home'),
      highlight: true,
    },
    {
      id: 'integrity-audit',
      title: '🛡️ Verificação & Integridade dos Dados',
      subtitle: `Auditoria ativa: ${integrityReport.healthScore}% saudável (${integrityReport.issues.length} inconsistência(s))`,
      icon: integrityReport.healthStatus === 'healthy' ? ShieldCheck : ShieldAlert,
      color:
        integrityReport.healthStatus === 'healthy'
          ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60'
          : 'text-amber-600 bg-amber-100 dark:bg-amber-950/60',
      action: () => setShowIntegrityModal(true),
      highlight: integrityReport.healthStatus !== 'healthy',
    },
    {
      id: 'restore-data',
      title: '✨ Recuperar Registros & Lançamentos Históricos',
      subtitle: 'Restaura todos os registros anteriores, mamadas, ordenhas e estoque',
      icon: Sparkles,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/60',
      action: () => restoreAllHistoricalData(),
    },
    {
      id: 'baby-profile',
      title: 'Perfil & Dados do Bebê',
      subtitle: 'Informações de nascimento, pediatra, foto e troca de perfil',
      icon: Baby,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
      action: () => setActiveTab('bebe'),
    },
    {
      id: 'medications',
      title: '💊 Controle de Medicamentos & Doses',
      subtitle: 'Cadastro de remédios, horários, doses dadas e sincronização entre os pais',
      icon: Pill,
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40',
      action: () => setShowMedicationModal(true),
      highlight: true,
    },
    {
      id: 'sleep',
      title: 'Controle de Sono & Sonecas',
      subtitle: 'Cronômetro ao vivo, duração total, janela de vigília e histórico',
      icon: Moon,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40',
      action: () => setActiveTab('sono'),
    },
    {
      id: 'inventory',
      title: 'Estoque de Leite Ordenhado',
      subtitle: 'Controle FEFO (primeiro que vence), frascos congelados e lote',
      icon: Package,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
      action: () => setActiveTab('estoque'),
    },
    {
      id: 'diaper-inventory',
      title: '📦 Estoque de Fraldas',
      subtitle: 'Controle de lotes, saldo, previsão de duração, compras e alertas de peso',
      icon: Package,
      color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40',
      action: () => setActiveTab('estoque_fraldas'),
      highlight: true,
    },
    {
      id: 'reports',
      title: 'Painel de Relatório Geral',
      subtitle: 'Filtro por período e personalizado (Mamadas, Ordenhas, Fraldas e Sono)',
      icon: FileText,
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40',
      action: () => setActiveTab('relatorios'),
    },
    {
      id: 'growth',
      title: 'Curva de Crescimento OMS',
      subtitle: 'Ganho de peso g/dia, percentis e evolução ponderal',
      icon: Scale,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
      action: () => setActiveTab('crescimento'),
    },
    {
      id: 'discomfort',
      title: 'Desconfortos, Cólicas & Gases',
      subtitle: 'Histórico de episódios, intensidade e medidas de alívio',
      icon: HeartCrack,
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40',
      action: () => openModal('discomfort'),
    },
    {
      id: 'diapers',
      title: 'Fraldas (Xixi & Cocô)',
      subtitle: 'Registro de diurese e coloração das fezes',
      icon: Droplet,
      color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40',
      action: () => openModal('diaperDetail'),
    },
    {
      id: 'settings',
      title: 'Protocolos & Configurações',
      subtitle: `Ativo: ${currentProtocol?.name.split('—')[0] || 'MS Brasil'}`,
      icon: ShieldCheck,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
      action: () => openModal('settings'),
    },
    {
      id: 'caregivers',
      title: 'Cuidadores & Família',
      subtitle: `${caregivers.length} cadastrados (Mãe, Pai, Rede de Apoio)`,
      icon: Users,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
      action: () => openModal('caregivers'),
    },
  ];

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto px-4 pt-4 animate-in fade-in">
      {/* Back to Dashboard Breadcrumb Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('home')}
          className={`px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all border ${
            isNightMode
              ? 'bg-slate-900 border-slate-800 text-blue-400 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Voltar ao Dashboard (Início)</span>
        </button>

        {/* Night mode toggle */}
        <button
          onClick={toggleNightMode}
          className={`py-1.5 px-3 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
            isNightMode
              ? 'bg-amber-400/15 border-amber-400/30 text-amber-300'
              : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{isNightMode ? 'Modo Claro' : 'Modo Madrugada'}</span>
        </button>
      </div>

      {/* Top Header */}
      <div
        className={`p-6 rounded-3xl border shadow-sm flex items-center justify-between transition-colors ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900'
        }`}
      >
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Menu Geral & Ferramentas
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-0.5">Recursos & Análises</h2>
          <p className="text-xs text-slate-400 mt-1">
            Relatórios clínicos, crescimento, regras de conservação e cuidadores.
          </p>
        </div>
      </div>

      {/* Menu Cards List */}
      <div className="space-y-2.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={item.action}
              className={`p-4 rounded-3xl border cursor-pointer flex items-center justify-between transition-all hover:scale-[1.01] active:scale-98 ${
                item.highlight
                  ? isNightMode
                    ? 'bg-blue-950/40 border-blue-600/40 hover:bg-blue-900/40 ring-1 ring-blue-500/20'
                    : 'bg-blue-50/80 border-blue-300 hover:bg-blue-100/80 ring-1 ring-blue-500/20'
                  : isNightMode
                  ? 'bg-[#0f141c] border-slate-800 hover:bg-slate-800/60'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-2xl ${item.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {item.title}
                    {item.highlight && (
                      <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-black">
                        Atalho
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          );
        })}
      </div>

      {/* Conservation rules fast reference */}
      <div className="p-5 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
          <BookOpen className="w-4 h-4" />
          <span>Diretriz Médica Ativa: {currentProtocol?.name}</span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
          {currentProtocol?.description} • Geladeira: <strong>{currentProtocol?.fridgeHours}h</strong> • Freezer: <strong>{currentProtocol?.freezerDays} dias</strong> • Descongelado: <strong>{currentProtocol?.thawedFridgeHours}h</strong>.
        </p>
      </div>

      {/* MODAL: Auditoria e Integridade de Dados */}
      {showIntegrityModal && (
        <DataIntegrityModal
          report={integrityReport}
          isOpen={showIntegrityModal}
          onClose={() => setShowIntegrityModal(false)}
          onRefreshCheck={() => setIntegrityCheckKey((k) => k + 1)}
        />
      )}

      {/* MODAL: Controle de Medicamentos */}
      {showMedicationModal && (
        <MedicationTrackerModal
          isOpen={showMedicationModal}
          onClose={() => setShowMedicationModal(false)}
        />
      )}
    </div>
  );
};
