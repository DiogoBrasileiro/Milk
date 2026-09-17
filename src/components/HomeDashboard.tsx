import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  formatDateTime,
  getDetailedExpiryCountdown,
} from '../utils/formatters';
import {
  Milk,
  Droplet,
  Clock,
  Plus,
  ChevronRight,
  Moon,
  Sun,
  Bell,
  Hourglass,
  BookOpen,
  Edit2,
  Snowflake,
  Refrigerator,
  Users,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Cloud,
  RefreshCw,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { requestNotificationPermission, sendLocalNotification } from '../utils/reminderAlarm';
import { MilkShelfLifeReferenceModal } from './MilkShelfLifeReferenceModal';
import { EditMilkBatchModal } from './EditMilkBatchModal';
import { FamilyGroupModal } from './FamilyGroupModal';
import { DataIntegrityModal } from './DataIntegrityModal';
import { DataIntegrityBanner } from './DataIntegrityBanner';
import { checkDataIntegrity } from '../services/dataIntegrityService';
import { CONTAINER_COLORS } from '../constants/containers';
import { MilkBatch } from '../types';
import { checkSupabaseStatus, SupabaseStatus } from '../lib/supabaseClient';
import { MedicationQuickWidget } from './medications/MedicationQuickWidget';
import { MedicationTrackerModal } from './medications/MedicationTrackerModal';
import { BabyAgeHighlightCard } from './BabyAgeHighlightCard';

export const HomeDashboard: React.FC = () => {
  const {
    baby,
    updateBaby,
    todayStats,
    feedings,
    pumpings,
    diapers,
    diaperStockSummary,
    batches,
    discomforts,
    weights,
    sleepLogs,
    inventorySummary,
    openModal,
    activeNursingTimer,
    activePumpingTimer,
    activeColicTimer,
    activeSleepTimer,
    isNightMode,
    toggleNightMode,
    setActiveTab,
    exportAlarmCalendar,
    triggerUndoToast,
    activeCaregiver,
    caregivers,
    lastCloudSyncTime,
  } = useApp();

  const { currentFamily } = useAuth();

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isIntegrityModalOpen, setIsIntegrityModalOpen] = useState(false);
  const [integrityCheckKey, setIntegrityCheckKey] = useState(0);
  const [selectedBatchToEdit, setSelectedBatchToEdit] = useState<MilkBatch | null>(null);
  const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);

  // Monitoramento do status do Supabase em tempo real
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus | null>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);

  const fetchSupabaseHealth = async () => {
    setIsCheckingSupabase(true);
    try {
      const status = await checkSupabaseStatus();
      setSupabaseStatus(status);
    } catch (e) {
      console.warn('Erro ao consultar status do Supabase', e);
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  useEffect(() => {
    fetchSupabaseHealth();
    const interval = setInterval(fetchSupabaseHealth, 30000); // Checagem a cada 30s
    return () => clearInterval(interval);
  }, [lastCloudSyncTime]);

  // Verificação de Integridade de Dados em tempo real
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

  // Update clock ticker every 1 second for live countdowns
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine theme mode (Girl / Rose vs Boy / Blue)
  const isGirl = baby.gender === 'feminino';

  const handleToggleGender = () => {
    const nextGender = isGirl ? 'masculino' : 'feminino';
    updateBaby({ gender: nextGender });
    triggerUndoToast(
      `Tema alterado para ${nextGender === 'feminino' ? '🌸 Menina (Tons de Rosa)' : '💙 Menino (Tons de Azul)'}`,
      () => updateBaby({ gender: isGirl ? 'feminino' : 'masculino' })
    );
  };

  // Today's breakdown metrics
  const todayMetrics = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayFeedings = feedings.filter((f) => new Date(f.timestamp).getTime() >= startOfDay);
    const todayPumpings = pumpings.filter((p) => new Date(p.timestamp).getTime() >= startOfDay);
    const todayDiapers = diapers.filter((d) => new Date(d.timestamp).getTime() >= startOfDay);

    const totalConsumedMl = todayFeedings.reduce((sum, f) => sum + (f.consumedMl || 0), 0);
    const totalDirectMinutes = todayFeedings
      .filter((f) => f.type === 'amamentacao_direta')
      .reduce((sum, f) => sum + (f.durationMinutes || 15), 0);
    const totalPumpedMl = todayPumpings.reduce((sum, p) => sum + (p.totalVolumeMl || 0), 0);

    return {
      totalConsumedMl,
      totalDirectMinutes,
      totalPumpedMl,
      feedingsCount: todayFeedings.length,
      pumpingsCount: todayPumpings.length,
      diapersCount: todayDiapers.length,
    };
  }, [feedings, pumpings, diapers]);

  // Last records sorted by timestamp
  const sortedFeedings = useMemo(() => {
    return [...feedings].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [feedings]);
  const lastFeeding = sortedFeedings[0];

  const sortedPumpings = useMemo(() => {
    return [...pumpings].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [pumpings]);
  const lastPumping = sortedPumpings[0];

  const sortedDiapers = useMemo(() => {
    return [...diapers].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [diapers]);
  const lastDiaper = sortedDiapers[0];

  // Critical expiring batch (FEFO - First Expired, First Out)
  const criticalBatch = useMemo(() => {
    const active = batches.filter(
      (b) => b.currentVolumeMl > 0 && b.status !== 'consumido' && b.status !== 'descartado'
    );
    if (active.length === 0) return null;
    return [...active].sort(
      (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
    )[0];
  }, [batches]);

  // Active batches for inventory overview
  const fridgeBatches = useMemo(() => {
    return batches.filter(
      (b) => b.currentVolumeMl > 0 && b.location === 'geladeira' && b.status !== 'consumido' && b.status !== 'descartado'
    );
  }, [batches]);

  const freezerBatches = useMemo(() => {
    return batches.filter(
      (b) => b.currentVolumeMl > 0 && b.location === 'freezer' && b.status !== 'consumido' && b.status !== 'descartado'
    );
  }, [batches]);

  const fridgeVolumeMl = useMemo(() => {
    return fridgeBatches.reduce((sum, b) => sum + b.currentVolumeMl, 0);
  }, [fridgeBatches]);

  const freezerVolumeMl = useMemo(() => {
    return freezerBatches.reduce((sum, b) => sum + b.currentVolumeMl, 0);
  }, [freezerBatches]);

  // Elapsed time helper
  const getElapsedFormatted = (isoTimestamp?: string) => {
    if (!isoTimestamp) return null;
    const startMs = new Date(isoTimestamp).getTime();
    const diffMs = Math.max(0, currentTime - startMs);
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `há ${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `há ${minutes}m`;
    }
    return `há menos de 1m`;
  };

  // Next feeding calculation & countdown
  let nextFeedingCountdownText = 'Aguardando registro';
  let nextFeedingTimeFormatted = '--:--';
  let isFeedingOverdue = false;
  let nextFeedingProgressPercent = 50;

  if (todayStats.nextExpectedFeeding) {
    const targetMs = new Date(todayStats.nextExpectedFeeding).getTime();
    nextFeedingTimeFormatted = new Date(targetMs).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const diffMs = targetMs - currentTime;
    const diffSeconds = Math.round(diffMs / 1000);

    if (lastFeeding) {
      const lastMs = new Date(lastFeeding.timestamp).getTime();
      const totalIntervalMs = Math.max(1, targetMs - lastMs);
      const elapsedFromLast = currentTime - lastMs;
      nextFeedingProgressPercent = Math.min(100, Math.max(0, (elapsedFromLast / totalIntervalMs) * 100));
    }

    if (diffSeconds <= 0) {
      isFeedingOverdue = true;
      const overdueSec = Math.abs(diffSeconds);
      const h = Math.floor(overdueSec / 3600);
      const m = Math.floor((overdueSec % 3600) / 60);
      const s = overdueSec % 60;
      nextFeedingCountdownText = `Atrasada há ${h > 0 ? `${h}h ` : ''}${m}m ${s < 10 ? '0' + s : s}s`;
    } else {
      const h = Math.floor(diffSeconds / 3600);
      const m = Math.floor((diffSeconds % 3600) / 60);
      const s = diffSeconds % 60;
      nextFeedingCountdownText = `Faltam ${h > 0 ? `${h}h ` : ''}${m < 10 && h > 0 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
    }
  }

  // Handle Alarm / Notification
  const handleConnectAlarm = async () => {
    exportAlarmCalendar();
    const granted = await requestNotificationPermission();
    if (granted && todayStats.nextExpectedFeeding) {
      sendLocalNotification(
        `Lembrete de Mamada - ${baby.name}`,
        `Próxima mamada agendada para ${nextFeedingTimeFormatted}.`
      );
    }
    triggerUndoToast('📅 Alarme e lembrete sincronizados!', () => {});
  };

  // Critical batch countdown & color
  const criticalCountdown = criticalBatch
    ? getDetailedExpiryCountdown(criticalBatch.expiresAt, criticalBatch.extractedAt, currentTime)
    : null;
  const criticalColor = criticalBatch
    ? CONTAINER_COLORS.find((c) => c.id === criticalBatch.containerColor) || CONTAINER_COLORS[0]
    : null;

  return (
    <div
      className={`min-h-screen pb-28 pt-3 px-4 sm:px-6 max-w-5xl mx-auto space-y-5 animate-in fade-in duration-300 ${
        isGirl
          ? isNightMode
            ? 'bg-[#0E0A0D] text-slate-100'
            : 'bg-[#FFF8FA] text-slate-900'
          : isNightMode
          ? 'bg-[#0B0F17] text-slate-100'
          : 'bg-[#F6F9FD] text-slate-900'
      }`}
    >
      {/* 1. TOP HEADER CLEAN: BABY + FAMILY GROUP + THEME SWITCHER */}
      <header className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <div
            onClick={handleToggleGender}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs cursor-pointer active:scale-95 transition-all ${
              isGirl
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
            title="Alternar tema Menina / Menino"
          >
            {baby.photoUrl ? (
              <img
                src={baby.photoUrl}
                alt={baby.name}
                className="w-full h-full object-cover rounded-2xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{isGirl ? '👧' : '👦'}</span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Olá, {activeCaregiver?.name || 'Cuidador'}
              </span>
              <button
                type="button"
                onClick={() => setIsFamilyModalOpen(true)}
                className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 flex items-center gap-1 transition-all"
                title="Gerenciar Grupo Familiar e Cuidadores"
              >
                <Users className="w-3 h-3 text-blue-500" />
                <span>Grupo Familiar ({caregivers.length})</span>
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {baby.name}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* SUPABASE LIVE CONNECTION BADGE */}
          <button
            type="button"
            onClick={() => setIsIntegrityModalOpen(true)}
            className={`px-2.5 py-2 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
              supabaseStatus?.connected
                ? isNightMode
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70 shadow-xs'
                : isCheckingSupabase
                ? isNightMode
                  ? 'bg-slate-900 border-slate-800 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-500'
                : isNightMode
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/50 animate-pulse'
                : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 shadow-xs animate-pulse'
            }`}
            title={
              supabaseStatus?.connected
                ? `✓ Supabase Conectado e Sincronizado (${supabaseStatus.latencyMs}ms) • ${supabaseStatus.message}`
                : isCheckingSupabase
                ? 'Verificando conexão com o Supabase...'
                : `⚠️ Supabase Não Sincronizado: ${supabaseStatus?.message || 'Verifique sua conexão'}`
            }
          >
            <Cloud className={`w-3.5 h-3.5 ${supabaseStatus?.connected ? 'text-emerald-500' : isCheckingSupabase ? 'text-slate-400 animate-spin' : 'text-rose-500'}`} />
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseStatus?.connected
                  ? 'bg-emerald-500 animate-pulse'
                  : isCheckingSupabase
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="hidden sm:inline text-[11px] font-semibold">
              {supabaseStatus?.connected ? 'Supa OK' : isCheckingSupabase ? 'Verificando' : 'Supa Offline'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsFamilyModalOpen(true)}
            className={`p-2.5 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
              isNightMode
                ? 'bg-slate-900 border-slate-800 text-blue-400 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-blue-600 hover:bg-blue-50 shadow-xs'
            }`}
            title="Gerenciar Cuidadores e Família"
          >
            <Users className="w-4 h-4" />
            <span className="hidden md:inline">Família</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReferenceModalOpen(true)}
            className={`p-2.5 rounded-2xl border transition-all ${
              isNightMode
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title="Guia de Conservação do Leite"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsIntegrityModalOpen(true)}
            className={`p-2.5 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
              integrityReport.healthStatus === 'healthy'
                ? isNightMode
                  ? 'bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50 shadow-xs'
                : 'bg-amber-500 text-white border-amber-600 animate-pulse'
            }`}
            title={`Auditoria de Dados: ${integrityReport.healthScore}% de Integridade (${integrityReport.summaryMessage})`}
          >
            {integrityReport.healthStatus === 'healthy' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-white" />
            )}
            <span className="hidden md:inline font-mono">{integrityReport.healthScore}%</span>
          </button>

          <button
            type="button"
            onClick={toggleNightMode}
            className={`p-2.5 rounded-2xl border transition-all ${
              isNightMode
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title={isNightMode ? 'Modo Claro' : 'Modo Noturno'}
          >
            {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* BANNER DE INTEGRIDADE & CONFLITOS DE DADOS (Se houver qualquer inconsistência detectada) */}
      <DataIntegrityBanner
        report={integrityReport}
        onOpenModal={() => setIsIntegrityModalOpen(true)}
      />

      {/* 2. ACTIVE RUNNING TIMERS FLOATING BAR (If any timer is active) */}
      {(activeNursingTimer.isRunning ||
        activePumpingTimer.isRunning ||
        activeColicTimer.isRunning ||
        activeSleepTimer.isSleeping) && (
        <div
          className={`p-3.5 rounded-2xl text-white flex items-center justify-between shadow-md animate-pulse ${
            isGirl ? 'bg-gradient-to-r from-rose-600 to-pink-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>
              {activeNursingTimer.isRunning
                ? '🤱 Amamentação ao Peito em Andamento...'
                : activePumpingTimer.isRunning
                ? '🥛 Sessão de Ordenha em Andamento...'
                : activeSleepTimer.isSleeping
                ? '😴 Bebê Dormindo...'
                : '😣 Episódio de Cólica / Desconforto...'}
            </span>
          </div>
          <button
            onClick={() => {
              if (activeNursingTimer.isRunning) openModal('feedingDetail');
              else if (activePumpingTimer.isRunning) openModal('pumpingSession');
              else if (activeSleepTimer.isSleeping) setActiveTab('sleep');
              else openModal('discomfort');
            }}
            className="py-1 px-3 bg-white text-slate-900 rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all"
          >
            Abrir
          </button>
        </div>
      )}

      {/* 1º DESTAQUE PRINCIPAL DO DASHBOARD: PRÓXIMA MAMADA (TEMPO QUE FALTA + CONTAGEM REGRESSIVA + HORÁRIO + REGISTRO RÁPIDO) */}
      <section
        id="next-feeding-card"
        className={`p-5 sm:p-6 rounded-3xl text-white shadow-xl transition-all relative overflow-hidden ${
          isGirl
            ? 'bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 shadow-rose-500/20'
            : 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 shadow-blue-500/20'
        }`}
      >
        <div className="relative z-10 space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold">
                <Milk className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-white/95">
                Próxima Mamada
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-md border ${
                  isFeedingOverdue
                    ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse'
                    : 'bg-white/20 text-white border-white/30'
                }`}
              >
                {isFeedingOverdue ? '⚠️ Hora de Mamar!' : `Previsão: ${nextFeedingTimeFormatted}`}
              </span>

              <button
                type="button"
                onClick={handleConnectAlarm}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors"
                title="Sincronizar Lembrete no Celular"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Countdown Display & Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white/80 block">
                Tempo que falta para a próxima mamada:
              </span>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight text-white drop-shadow-xs mt-0.5">
                {nextFeedingCountdownText}
              </div>
              <p className="text-xs text-white/90 mt-1">
                {isFeedingOverdue
                  ? '⚠️ Horário previsto ultrapassado! Ofereça o peito ou mamadeira ao bebê.'
                  : `Horário previsto: ${nextFeedingTimeFormatted} • Intervalo ideal para ganho de peso`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => openModal('feedingDetail')}
              className="py-2.5 px-4 rounded-2xl bg-white text-slate-900 hover:bg-white/90 font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Dar de Mamar Agora</span>
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden backdrop-blur-sm">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isFeedingOverdue ? 'bg-amber-300' : 'bg-white'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, nextFeedingProgressPercent))}%` }}
            />
          </div>

          {/* 3 Solicitados: Hora da Última Mamada | Última Ordenha | Horário Próxima Mamada */}
          <div className="pt-2 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {/* 1. Hora da Última Mamada */}
            <div className="flex items-center gap-2.5 bg-black/10 backdrop-blur-sm p-2.5 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Milk className="w-4 h-4 text-white" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-white/70 block uppercase font-bold">Última Mamada</span>
                <span className="font-bold text-white text-xs">
                  {lastFeeding
                    ? `${new Date(lastFeeding.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${getElapsedFormatted(lastFeeding.timestamp)})`
                    : 'Sem registro hoje'}
                </span>
              </div>
            </div>

            {/* 2. Última Ordenha */}
            <div className="flex items-center gap-2.5 bg-black/10 backdrop-blur-sm p-2.5 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Droplet className="w-4 h-4 text-white" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-white/70 block uppercase font-bold">Última Ordenha</span>
                <span className="font-bold text-white text-xs">
                  {lastPumping
                    ? `${new Date(lastPumping.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${lastPumping.totalVolumeMl} ml)`
                    : 'Sem ordenha hoje'}
                </span>
              </div>
            </div>

            {/* 3. Horário Previsto Próxima Mamada */}
            <div className="flex items-center gap-2.5 bg-black/10 backdrop-blur-sm p-2.5 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-white/70 block uppercase font-bold">Próx. Horário</span>
                <span className="font-bold text-white text-xs">
                  {nextFeedingTimeFormatted} ({isFeedingOverdue ? 'Atrasada' : 'No Horário'})
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2º DESTAQUE: IDADE, DIAS DE VIDA E EVOLUÇÃO (PESO E MEDIDAS ATUALIZADOS) */}
      <BabyAgeHighlightCard />

      {/* 3.5 WIDGET RÁPIDO DE MEDICAMENTOS & DOSES */}
      <MedicationQuickWidget onOpenFullModal={() => setIsMedicationModalOpen(true)} />

      {/* 4. ALERTA DE PRIORIDADE DE USO DO FRASQUINHO MAIS PRÓXIMO DO VENCIMENTO (FEFO) */}
      {criticalBatch && criticalCountdown ? (
        <section
          id="fefo-priority-alert-card"
          className={`p-4 sm:p-5 rounded-3xl border transition-all ${
            criticalCountdown.urgency === 'critico' || criticalCountdown.isExpired
              ? 'bg-rose-500/10 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
              : 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md">
                  Prioridade de Uso (FEFO)
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  Frasco #{criticalBatch.containerNumber || criticalBatch.id}
                  {criticalBatch.containerName ? ` • ${criticalBatch.containerName}` : ''}
                </span>
                {criticalColor && (
                  <span
                    className={`w-3 h-3 rounded-full ${criticalColor.bgClass} inline-block`}
                    title={criticalColor.name}
                  />
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {criticalBatch.currentVolumeMl} <span className="text-sm font-semibold text-slate-400">ml</span>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Armazenado em: <strong className="capitalize text-slate-800 dark:text-slate-100">{criticalBatch.location}</strong> ({criticalBatch.location === 'geladeira' ? '12h limite' : '15 dias limite'})
                </span>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 font-mono font-black text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-xl border border-rose-500/20">
                  <Hourglass className="w-3.5 h-3.5 animate-spin shrink-0" style={{ animationDuration: '3s' }} />
                  <span>{criticalCountdown.formattedCountdown} para vencer</span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Vence: {formatDateTime(criticalBatch.expiresAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => setSelectedBatchToEdit(criticalBatch)}
                className="py-2.5 px-3 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 text-xs font-black flex items-center gap-1.5 transition-all border border-blue-300 dark:border-blue-800"
                title="Editar quantidade (ml) do frasco"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar ml</span>
              </button>

              <button
                type="button"
                onClick={() => openModal('feedingDetail')}
                className="py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm active:scale-95 transition-all"
              >
                Oferecer na Mamada
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className={`p-4 rounded-2xl border text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between ${
          isNightMode ? 'bg-[#131924] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <span>Nenhum frasco de leite próximo ao vencimento no momento.</span>
          <button
            type="button"
            onClick={() => openModal('addMilkBatch')}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
          >
            + Adicionar Frasco
          </button>
        </section>
      )}

      {/* 5. ACESSO RÁPIDO AO ESTOQUE DE LEITE ARMAZENADO */}
      <section
        id="milk-inventory-quick-card"
        className={`p-5 rounded-3xl border transition-all ${
          isNightMode ? 'bg-[#131924] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Estoque de Leite Armazenado</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total de <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-black">{inventorySummary.totalMl} ml</strong> disponíveis em {batches.filter(b => b.currentVolumeMl > 0).length} potes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openModal('addMilkBatch')}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
            >
              + Novo Frasco
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('estoque')}
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
            >
              <span>Ver Todo o Estoque</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Fridge / Freezer Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
          {/* Geladeira */}
          <div
            onClick={() => setActiveTab('estoque')}
            className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all hover:scale-[1.01] ${
              isNightMode ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center font-bold">
                <Refrigerator className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Geladeira (12h)</span>
                <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                  {fridgeVolumeMl} ml <span className="text-xs font-normal text-slate-400">({fridgeBatches.length} potes)</span>
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* Freezer */}
          <div
            onClick={() => setActiveTab('estoque')}
            className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all hover:scale-[1.01] ${
              isNightMode ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500 flex items-center justify-center font-bold">
                <Snowflake className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Freezer (15 dias)</span>
                <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                  {freezerVolumeMl} ml <span className="text-xs font-normal text-slate-400">({freezerBatches.length} potes)</span>
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </section>

      {/* 5.1 CARD COMPACTO: ESTOQUE DE FRALDAS */}
      <section
        id="compact-diaper-stock-card"
        onClick={() => setActiveTab('fraldas')}
        className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all hover:scale-[1.005] ${
          isNightMode ? 'bg-[#131924] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  FRALDAS
                </span>
                {diaperStockSummary?.isLowStock && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    ⚠ Estoque baixo
                  </span>
                )}
              </div>
              {diaperStockSummary?.defaultItem ? (
                <div className="mt-0.5">
                  <strong className="text-sm font-black block">
                    {diaperStockSummary.defaultItem.brand}{' '}
                    {diaperStockSummary.defaultItem.productLine ? `${diaperStockSummary.defaultItem.productLine} ` : ''}
                    Tam {diaperStockSummary.defaultItem.size}
                  </strong>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {diaperStockSummary.defaultItem.quantityCurrent} disponíveis
                    </span>
                    {diaperStockSummary.hasSufficientHistory && diaperStockSummary.daysRemainingDefault > 0 && (
                      <>
                        <span>•</span>
                        <span>≈ {diaperStockSummary.daysRemainingDefault} dias</span>
                      </>
                    )}
                    {diaperStockSummary.totalAvailable !== diaperStockSummary.defaultItem.quantityCurrent && (
                      <>
                        <span>•</span>
                        <span>Total: {diaperStockSummary.totalAvailable} un</span>
                      </>
                    )}
                  </div>
                </div>
              ) : diaperStockSummary && diaperStockSummary.totalAvailable > 0 ? (
                <div className="mt-0.5">
                  <strong className="text-sm font-black block">
                    {diaperStockSummary.totalAvailable} fraldas em estoque
                  </strong>
                  <span className="text-xs text-slate-400">Toque para definir a fralda em uso</span>
                </div>
              ) : (
                <div className="mt-0.5">
                  <strong className="text-sm font-black block">Nenhuma fralda cadastrada</strong>
                  <span className="text-xs text-slate-400">Toque para cadastrar seu estoque</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openModal('diaperDetail');
              }}
              className="py-1.5 px-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 text-sky-700 dark:text-sky-300 text-xs font-bold transition-colors"
            >
              + Troca
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('fraldas');
              }}
              className="py-1.5 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black flex items-center gap-1 shadow-xs transition-colors"
            >
              <span>Ver Estoque</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 6. DADOS DO DIA: 4 MÉTRICAS SOLICITADAS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Resumo do Dia
          </h2>
          <span className="text-xs text-slate-400">Hoje, {new Date().toLocaleDateString('pt-BR')}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Leite Ingerido Hoje */}
          <div
            onClick={() => openModal('feedingDetail')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between gap-2 ${
              isNightMode ? 'bg-[#131924] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Ingerido Hoje</span>
              <Milk className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {todayMetrics.totalConsumedMl > 0
                ? `${todayMetrics.totalConsumedMl} ml`
                : todayMetrics.totalDirectMinutes > 0
                ? `${todayMetrics.totalDirectMinutes} min`
                : '0 ml'}
            </div>
            <span className="text-[11px] text-slate-400">
              {todayMetrics.feedingsCount} mamadas realizadas
            </span>
          </div>

          {/* 2. Ordenha de Hoje */}
          <div
            onClick={() => openModal('pumping')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between gap-2 ${
              isNightMode ? 'bg-[#131924] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Ordenha Hoje</span>
              <Droplet className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
              {todayMetrics.totalPumpedMl} ml
            </div>
            <span className="text-[11px] text-slate-400">
              {todayMetrics.pumpingsCount} sessões de coleta
            </span>
          </div>

          {/* 3. Fraldas de Hoje */}
          <div
            onClick={() => openModal('diaperDetail')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between gap-2 ${
              isNightMode ? 'bg-[#131924] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">Fraldas Hoje</span>
              <span className="text-sm">💧</span>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {todayMetrics.diapersCount} trocas
            </div>
            <span className="text-[11px] text-slate-400">
              {todayMetrics.diapersCount >= 5 ? '✓ Hidratação ideal' : 'Acompanhando'}
            </span>
          </div>

          {/* 4. Estoque Ativo Total */}
          <div
            onClick={() => setActiveTab('estoque')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between gap-2 ${
              isNightMode ? 'bg-[#131924] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Estoque Ativo</span>
              <Snowflake className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {inventorySummary.totalMl} ml
            </div>
            <span className="text-[11px] text-slate-400">
              {batches.filter(b => b.currentVolumeMl > 0).length} frascos ativos
            </span>
          </div>
        </div>
      </section>

      {/* 7. HISTÓRICO: ÚLTIMA MAMADA, ÚLTIMA ORDENHA, ÚLTIMA TROCA DE FRALDA */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Histórico Recente
          </h2>
          <button
            type="button"
            onClick={() => setActiveTab('relatorios')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
          >
            <span>Ver Todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Última Mamada */}
          <div
            className={`p-4 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all ${
              isNightMode ? 'bg-[#131924] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center font-bold">
                  <Milk className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Última Mamada</span>
                  <span className="font-black text-xs text-slate-900 dark:text-white">
                    {lastFeeding
                      ? lastFeeding.type === 'amamentacao_direta'
                        ? `Ao Peito (${lastFeeding.durationMinutes || 15} min)`
                        : `${lastFeeding.consumedMl} ml`
                      : 'Sem registro hoje'}
                  </span>
                </div>
              </div>

              {lastFeeding && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {new Date(lastFeeding.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {lastFeeding ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Decorrido:</span>
                  <strong className="text-slate-700 dark:text-slate-200 font-mono">{getElapsedFormatted(lastFeeding.timestamp)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Cuidador:</span>
                  <strong className="text-slate-700 dark:text-slate-200">{lastFeeding.caregiverName || 'Mãe'}</strong>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 pt-1">Nenhuma mamada registrada</p>
            )}

            <button
              type="button"
              onClick={() => openModal('feedingDetail')}
              className="w-full py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-all"
            >
              + Registrar Mamada
            </button>
          </div>

          {/* 2. Última Ordenha */}
          <div
            className={`p-4 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all ${
              isNightMode ? 'bg-[#131924] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center font-bold">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block">Última Ordenha</span>
                  <span className="font-black text-xs text-slate-900 dark:text-white">
                    {lastPumping ? `${lastPumping.totalVolumeMl} ml Extraídos` : 'Sem registro hoje'}
                  </span>
                </div>
              </div>

              {lastPumping && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {new Date(lastPumping.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {lastPumping ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Divisão:</span>
                  <strong className="text-slate-700 dark:text-slate-200 font-mono">{lastPumping.leftVolumeMl}ml E / {lastPumping.rightVolumeMl}ml D</strong>
                </div>
                <div className="flex justify-between">
                  <span>Destino:</span>
                  <strong className="text-slate-700 dark:text-slate-200 capitalize">{lastPumping.targetStorage}</strong>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 pt-1">Nenhuma ordenha registrada</p>
            )}

            <button
              type="button"
              onClick={() => openModal('pumping')}
              className="w-full py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold transition-all"
            >
              + Registrar Ordenha
            </button>
          </div>

          {/* 3. Última Fralda */}
          <div
            className={`p-4 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all ${
              isNightMode ? 'bg-[#131924] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center font-bold text-sm">
                  💧
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500 block">Última Fralda</span>
                  <span className="font-black text-xs text-slate-900 dark:text-white">
                    {lastDiaper
                      ? lastDiaper.hasPoop && lastDiaper.hasPee
                        ? 'Xixi e Cocô'
                        : lastDiaper.hasPoop
                        ? 'Cocô'
                        : 'Xixi'
                      : 'Sem registro hoje'}
                  </span>
                </div>
              </div>

              {lastDiaper && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {new Date(lastDiaper.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {lastDiaper ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Decorrido:</span>
                  <strong className="text-slate-700 dark:text-slate-200 font-mono">{getElapsedFormatted(lastDiaper.timestamp)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Cuidador:</span>
                  <strong className="text-slate-700 dark:text-slate-200">{lastDiaper.caregiverName || 'Mãe'}</strong>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 pt-1">Nenhuma fralda registrada</p>
            )}

            <button
              type="button"
              onClick={() => openModal('diaperDetail')}
              className="w-full py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 text-xs font-bold transition-all"
            >
              + Registrar Fralda
            </button>
          </div>
        </div>
      </section>

      {/* 8. MODAL DE REFERÊNCIA DE VALIDADE DO LEITE */}
      {isReferenceModalOpen && (
        <MilkShelfLifeReferenceModal onClose={() => setIsReferenceModalOpen(false)} />
      )}

      {/* 9. MODAL DE EDIÇÃO DE QUANTIDADE DO FRASQUINHO */}
      {selectedBatchToEdit && (
        <EditMilkBatchModal
          batch={selectedBatchToEdit}
          onClose={() => setSelectedBatchToEdit(null)}
        />
      )}

      {/* 10. MODAL DE GRUPO FAMILIAR E CUIDADORES (INCLUIR / EDITAR / EXCLUIR) */}
      {isFamilyModalOpen && (
        <FamilyGroupModal onClose={() => setIsFamilyModalOpen(false)} />
      )}

      {/* 11. MODAL DE AUDITORIA E INTEGRIDADE DE DADOS */}
      {isIntegrityModalOpen && (
        <DataIntegrityModal
          report={integrityReport}
          isOpen={isIntegrityModalOpen}
          onClose={() => setIsIntegrityModalOpen(false)}
          onRefreshCheck={() => setIntegrityCheckKey((k) => k + 1)}
        />
      )}

      {/* 12. MODAL DE CONTROLE DE MEDICAMENTOS */}
      {isMedicationModalOpen && (
        <MedicationTrackerModal
          isOpen={isMedicationModalOpen}
          onClose={() => setIsMedicationModalOpen(false)}
        />
      )}
    </div>
  );
};
