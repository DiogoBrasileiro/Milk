import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MilkBatch, StorageLocationType } from '../types';
import { CONSERVATION_PROTOCOLS } from '../constants/medicalProtocols';
import { formatBatchIdentification } from '../utils/formatters';
import {
  AlertTriangle,
  Clock,
  Snowflake,
  Refrigerator,
  Milk,
  ArrowRight,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  ShieldAlert,
  Flame,
  Check,
  RotateCcw,
} from 'lucide-react';

export const SmartExpirationAlert: React.FC = () => {
  const {
    batches,
    protocolId,
    moveBatch,
    discardBatch,
    openModal,
    triggerUndoToast,
    isNightMode,
  } = useApp();

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'fridge' | 'freezer'>('all');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Live timer tick every 3 seconds for countdowns
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 3000);
    return () => clearInterval(timer);
  }, []);

  const activeProtocol = CONSERVATION_PROTOCOLS[protocolId] || CONSERVATION_PROTOCOLS.brasil_ms;

  // Classify all active batches
  const expirationAnalysis = useMemo(() => {
    const activeBatches = batches.filter(
      (b) => b.currentVolumeMl > 0 && b.status !== 'consumido' && b.status !== 'descartado'
    );

    const expired: { batch: MilkBatch; remainingMs: number; diffHours: number }[] = [];
    const critical: { batch: MilkBatch; remainingMs: number; diffHours: number }[] = [];
    const warning: { batch: MilkBatch; remainingMs: number; diffHours: number }[] = [];
    const safe: { batch: MilkBatch; remainingMs: number; diffHours: number }[] = [];

    let totalVolumeInRiskMl = 0;
    let fridgeVolumeInRiskMl = 0;

    for (const b of activeBatches) {
      const expTime = new Date(b.expiresAt).getTime();
      const remainingMs = expTime - currentTime;
      const diffHours = remainingMs / (1000 * 60 * 60);

      if (remainingMs <= 0) {
        // Expired
        expired.push({ batch: b, remainingMs, diffHours });
        totalVolumeInRiskMl += b.currentVolumeMl;
      } else if (b.location === 'geladeira') {
        // Fridge rule (12h standard): Critical if <= 4h remaining, Warning if <= 8h
        if (diffHours <= 4) {
          critical.push({ batch: b, remainingMs, diffHours });
          totalVolumeInRiskMl += b.currentVolumeMl;
          fridgeVolumeInRiskMl += b.currentVolumeMl;
        } else if (diffHours <= 8) {
          warning.push({ batch: b, remainingMs, diffHours });
          fridgeVolumeInRiskMl += b.currentVolumeMl;
        } else {
          safe.push({ batch: b, remainingMs, diffHours });
        }
      } else if (b.location === 'freezer') {
        // Freezer rule (15 days standard): Critical if <= 48h (2 days) remaining
        if (diffHours <= 48) {
          critical.push({ batch: b, remainingMs, diffHours });
          totalVolumeInRiskMl += b.currentVolumeMl;
        } else if (diffHours <= 96) {
          warning.push({ batch: b, remainingMs, diffHours });
        } else {
          safe.push({ batch: b, remainingMs, diffHours });
        }
      } else if (b.location === 'ambiente' || b.location === 'bolsa_termica') {
        // Room temp (2h standard): Critical if <= 45 mins
        if (diffHours <= 0.75) {
          critical.push({ batch: b, remainingMs, diffHours });
          totalVolumeInRiskMl += b.currentVolumeMl;
        } else {
          warning.push({ batch: b, remainingMs, diffHours });
        }
      } else if (b.location === 'descongelando' || b.location === 'descongelado') {
        if (diffHours <= 4) {
          critical.push({ batch: b, remainingMs, diffHours });
          totalVolumeInRiskMl += b.currentVolumeMl;
        } else {
          warning.push({ batch: b, remainingMs, diffHours });
        }
      }
    }

    // Sort by earliest expiration
    const sortByExpiry = (a: { remainingMs: number }, b: { remainingMs: number }) => a.remainingMs - b.remainingMs;
    expired.sort(sortByExpiry);
    critical.sort(sortByExpiry);
    warning.sort(sortByExpiry);

    return {
      expired,
      critical,
      warning,
      safe,
      totalActiveCount: activeBatches.length,
      totalVolumeInRiskMl,
      fridgeVolumeInRiskMl,
      hasAlerts: expired.length > 0 || critical.length > 0 || warning.length > 0,
    };
  }, [batches, currentTime]);

  if (!expirationAnalysis.hasAlerts) {
    return null;
  }

  // Format countdown string
  const formatCountdown = (remainingMs: number) => {
    if (remainingMs <= 0) {
      const pastMs = Math.abs(remainingMs);
      const pastHours = Math.floor(pastMs / (1000 * 60 * 60));
      const pastMins = Math.floor((pastMs % (1000 * 60 * 60)) / (1000 * 60));
      if (pastHours > 0) return `Venceu há ${pastHours}h ${pastMins}m`;
      return `Venceu há ${pastMins}m`;
    }

    const totalMinutes = Math.floor(remainingMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const days = Math.floor(hours / 24);

    if (days >= 2) {
      return `Vence em ${days} dias (${hours % 24}h)`;
    }
    if (hours > 0) {
      return `Vence em ${hours}h ${mins < 10 ? '0' : ''}${mins}m`;
    }
    return `Vence em ${mins} min!`;
  };

  // Quick Action 1: Move to Freezer to extend shelf-life to 15 days
  const handleFreezeBatch = (batch: MilkBatch) => {
    moveBatch(batch.id, 'freezer');
    setActionSuccessMessage(`✓ Potinho #${batch.containerNumber || batch.id} transferido para o Freezer! Validade estendida para 15 dias.`);
    setTimeout(() => setActionSuccessMessage(null), 6000);
  };

  // Quick Action 2: Use in Next Feeding
  const handleUseInFeeding = (batch: MilkBatch) => {
    openModal('quickAction', {
      preselectedBatchId: batch.id,
      preselectedVolumeMl: batch.currentVolumeMl,
      containerName: batch.containerName,
      containerNumber: batch.containerNumber,
    });
  };

  // Quick Action 3: Move all fridge batches in risk to freezer
  const handleFreezeAllFridgeInRisk = () => {
    const fridgeBatches = [...expirationAnalysis.critical, ...expirationAnalysis.warning]
      .map((item) => item.batch)
      .filter((b) => b.location === 'geladeira');

    if (fridgeBatches.length === 0) return;

    let count = 0;
    let totalMl = 0;
    for (const b of fridgeBatches) {
      moveBatch(b.id, 'freezer');
      count++;
      totalMl += b.currentVolumeMl;
    }

    setActionSuccessMessage(`❄️ Sucesso! ${count} potinho(s) (${totalMl}ml) transferidos para o Freezer com validade de 15 dias.`);
    setTimeout(() => setActionSuccessMessage(null), 6000);
  };

  // Combine items to display
  const displayItems = [
    ...expirationAnalysis.expired.map((i) => ({ ...i, severity: 'expired' as const })),
    ...expirationAnalysis.critical.map((i) => ({ ...i, severity: 'critical' as const })),
    ...expirationAnalysis.warning.map((i) => ({ ...i, severity: 'warning' as const })),
  ].filter((item) => {
    if (activeFilter === 'fridge') return item.batch.location === 'geladeira';
    if (activeFilter === 'freezer') return item.batch.location === 'freezer';
    return true;
  });

  const isSevere = expirationAnalysis.expired.length > 0 || expirationAnalysis.critical.length > 0;

  return (
    <section
      id="smart-expiration-alert"
      className={`rounded-3xl border transition-all duration-300 overflow-hidden shadow-lg mb-5 ${
        isSevere
          ? isNightMode
            ? 'bg-gradient-to-b from-rose-950/40 via-[#151016] to-[#0f141c] border-rose-500/40 shadow-rose-950/30'
            : 'bg-gradient-to-b from-rose-50/90 via-amber-50/40 to-white border-rose-200 shadow-rose-100/50'
          : isNightMode
          ? 'bg-gradient-to-b from-amber-950/30 via-[#151310] to-[#0f141c] border-amber-500/30 shadow-amber-950/20'
          : 'bg-gradient-to-b from-amber-50/80 via-white to-white border-amber-200 shadow-amber-100/40'
      }`}
    >
      {/* Banner Top Header */}
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black shrink-0 ${
                isSevere
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
                  : 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
              }`}
            >
              {isSevere ? <ShieldAlert className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isSevere
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  }`}
                >
                  {isSevere ? '🚨 Alerta de Validade Crítico' : '⏰ Alerta de Validade Inteligente'}
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Regra Oficial: 12h Geladeira • 15 Dias Freezer
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                <span>Evite Desperdício de Leite Materno</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-all"
              title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
            >
              <span className="hidden sm:inline">{isExpanded ? 'Recolher' : 'Ver Lotes'}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total em Risco</span>
              <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400">
                {expirationAnalysis.totalVolumeInRiskMl} ml
              </span>
            </div>
            <Milk className="w-4 h-4 text-rose-400" />
          </div>

          <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Geladeira (&lt; 4h)</span>
              <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
                {expirationAnalysis.critical.filter((i) => i.batch.location === 'geladeira').length} lote(s)
              </span>
            </div>
            <Refrigerator className="w-4 h-4 text-amber-400" />
          </div>

          <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Freezer (&lt; 48h)</span>
              <span className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400">
                {expirationAnalysis.critical.filter((i) => i.batch.location === 'freezer').length} lote(s)
              </span>
            </div>
            <Snowflake className="w-4 h-4 text-blue-400" />
          </div>

          <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Vencidos</span>
              <span className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-200">
                {expirationAnalysis.expired.length} lote(s)
              </span>
            </div>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Success Action Feedback Banner */}
        {actionSuccessMessage && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Global Quick Actions Bar */}
        {expirationAnalysis.fridgeVolumeInRiskMl > 0 && (
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 font-medium">
              <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                <strong>Dica Inteligente:</strong> Você tem <strong>{expirationAnalysis.fridgeVolumeInRiskMl}ml</strong> de leite na geladeira perto das 12h. Congele no freezer para estender a validade para 15 dias!
              </span>
            </div>
            <button
              onClick={handleFreezeAllFridgeInRisk}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black shrink-0 flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
            >
              <Snowflake className="w-3.5 h-3.5" />
              <span>Congelar Todos no Freezer (+15d)</span>
            </button>
          </div>
        )}
      </div>

      {/* Expanded Content: Batches List with Filter */}
      {isExpanded && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-slate-200/60 dark:border-slate-800/80 pt-3 space-y-3">
          {/* Location Filter Tabs */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({displayItems.length})
              </button>
              <button
                onClick={() => setActiveFilter('fridge')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  activeFilter === 'fridge'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Refrigerator className="w-3 h-3 text-amber-500" />
                <span>Geladeira (12h)</span>
              </button>
              <button
                onClick={() => setActiveFilter('freezer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  activeFilter === 'freezer'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Snowflake className="w-3 h-3 text-blue-500" />
                <span>Freezer (15d)</span>
              </button>
            </div>

            <span className="text-[11px] font-bold text-slate-400">
              Protocolo: {activeProtocol.name}
            </span>
          </div>

          {/* Batches Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {displayItems.map(({ batch, remainingMs, severity }) => {
              const ident = formatBatchIdentification(batch);
              const extractedDate = new Date(batch.extractedAt);
              const expiresDate = new Date(batch.expiresAt);

              const isExpired = severity === 'expired';
              const isCritical = severity === 'critical';

              return (
                <div
                  key={batch.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isExpired
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50'
                      : isCritical
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/50'
                      : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Top: Identification and Countdown */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white/50"
                        style={{ backgroundColor: ident.colorHex }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {ident.summaryDescription}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                            {batch.location === 'geladeira' ? '❄️ Geladeira' : batch.location === 'freezer' ? '🧊 Freezer' : batch.location}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          Coleta: {extractedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às{' '}
                          {extractedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {batch.currentVolumeMl} ml
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          isExpired
                            ? 'bg-rose-500 text-white animate-pulse'
                            : isCritical
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {formatCountdown(remainingMs)}
                      </span>
                    </div>
                  </div>

                  {/* Expiration detail text */}
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-black/5 dark:bg-white/5 p-2 rounded-xl flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Limite: <strong>{expiresDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {expiresDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {batch.caregiverName ? `Por ${batch.caregiverName}` : ''}
                    </span>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {!isExpired ? (
                      <>
                        <button
                          onClick={() => handleUseInFeeding(batch)}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition-all"
                        >
                          <Milk className="w-3 h-3" />
                          <span>Usar na Mamada</span>
                        </button>

                        {batch.location === 'geladeira' && (
                          <button
                            onClick={() => handleFreezeBatch(batch)}
                            className="flex-1 py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition-all"
                            title="Congela o pote no freezer, estendendo a validade de 12h para 15 dias"
                          >
                            <Snowflake className="w-3 h-3" />
                            <span>Mover p/ Freezer (+15d)</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          if (window.confirm(`Deseja descartar o pote #${batch.containerNumber || batch.id} (${batch.currentVolumeMl}ml) por expiração de validade?`)) {
                            discardBatch(batch.id, 'Validade expirada');
                          }
                        }}
                        className="w-full py-2 px-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-600 dark:text-rose-400 text-[11px] font-bold flex items-center justify-center gap-1.5 border border-rose-500/30 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Registrar Descarte Seguro do Lote Vencido</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
