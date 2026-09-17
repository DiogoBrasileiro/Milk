import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateBabyAge, AgeDisplayFormat } from '../utils/formatters';
import {
  Calendar,
  Clock,
  Scale,
  Ruler,
  TrendingUp,
  RotateCw,
  Plus,
  ChevronRight,
  Sparkles,
  Heart,
} from 'lucide-react';
import { QuickWeightMeasurementModal } from './QuickWeightMeasurementModal';

export const BabyAgeHighlightCard: React.FC = () => {
  const { baby, weights, isNightMode, setActiveTab } = useApp();

  const isGirl = baby.gender === 'feminino';

  // Opções de formato: 'days' | 'weeks_days' | 'months_days' | 'auto'
  type ModeWithAuto = AgeDisplayFormat | 'auto';

  const [displayMode, setDisplayMode] = useState<ModeWithAuto>(() => {
    const saved = localStorage.getItem('milkflow_age_display_mode') as ModeWithAuto;
    if (saved && ['days', 'weeks_days', 'months_days', 'auto'].includes(saved)) {
      return saved;
    }
    return 'days'; // Padrão focado em dias de vida conforme solicitado
  });

  // Modo ativo quando em rotação automática
  const [autoSubMode, setAutoSubMode] = useState<AgeDisplayFormat>('weeks_days');
  const [isWeightModalOpen, setIsWeightModalOpen] = useState<boolean>(false);

  const age = calculateBabyAge(baby.birthDate);

  // Ciclo automático quando displayMode === 'auto'
  useEffect(() => {
    if (displayMode !== 'auto') return;

    const modesOrder: AgeDisplayFormat[] = ['weeks_days', 'days', 'months_days'];
    const timer = setInterval(() => {
      setAutoSubMode((current) => {
        const nextIdx = (modesOrder.indexOf(current) + 1) % modesOrder.length;
        return modesOrder[nextIdx];
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [displayMode]);

  // Formato efetivo a ser exibido no momento
  const effectiveMode: AgeDisplayFormat = displayMode === 'auto' ? autoSubMode : displayMode;

  const handleSelectMode = (mode: ModeWithAuto) => {
    setDisplayMode(mode);
    localStorage.setItem('milkflow_age_display_mode', mode);
  };

  // Alternar ao clicar no próprio texto da idade
  const handleCycleNext = () => {
    const cycleList: ModeWithAuto[] = ['days', 'weeks_days', 'months_days', 'auto'];
    const nextIdx = (cycleList.indexOf(displayMode) + 1) % cycleList.length;
    handleSelectMode(cycleList[nextIdx]);
  };

  const getLogTimestamp = (log: any): number => {
    if (!log) return 0;
    const t = new Date(log.timestamp || log.createdAt || log.date || 0).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Calcular peso e medida mais recentes diretamente dos registros
  const sortedWeightsAsc = React.useMemo(
    () => [...weights].sort((a, b) => getLogTimestamp(a) - getLogTimestamp(b)),
    [weights]
  );
  const sortedWeightsDesc = React.useMemo(
    () => [...weights].sort((a, b) => getLogTimestamp(b) - getLogTimestamp(a)),
    [weights]
  );

  const latestWeightLog = sortedWeightsDesc.find((w) => typeof w.weightGrams === 'number' && w.weightGrams > 0);
  const currentWeightGrams = latestWeightLog?.weightGrams ?? baby.currentWeight;

  const latestLengthLog = sortedWeightsDesc.find((w) => typeof w.lengthCm === 'number' && w.lengthCm > 0);
  const currentLengthCm = latestLengthLog?.lengthCm ?? baby.currentLength ?? baby.birthLength ?? 50;

  const firstLog = sortedWeightsAsc[0];
  const lastLog = sortedWeightsAsc[sortedWeightsAsc.length - 1];

  let dailyGainGrams = 0;
  if (firstLog && lastLog && firstLog !== lastLog) {
    const daysDiff = Math.max(
      1,
      (getLogTimestamp(lastLog) - getLogTimestamp(firstLog)) / (1000 * 3600 * 24)
    );
    dailyGainGrams = Math.round((lastLog.weightGrams - firstLog.weightGrams) / daysDiff);
  } else if (age.totalDays > 0) {
    dailyGainGrams = Math.round((currentWeightGrams - baby.birthWeight) / age.totalDays);
  }

  // Formatador da data de nascimento por extenso
  const formatBirthDateExtended = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      }
    } catch (e) {}
    return dateStr;
  };

  // Obter texto principal da idade
  const getAgeMainText = () => {
    switch (effectiveMode) {
      case 'days':
        return age.daysOnlyString;
      case 'weeks_days':
        return age.weeksDaysString;
      case 'months_days':
        return age.monthsDaysString;
      default:
        return age.displayString;
    }
  };

  // Obter badge descritivo do formato atual
  const getModeLabel = () => {
    switch (effectiveMode) {
      case 'days':
        return 'Contagem em Dias';
      case 'weeks_days':
        return 'Semanas & Dias';
      case 'months_days':
        return 'Meses & Dias';
      default:
        return 'Idade Atual';
    }
  };

  return (
    <>
      <section
        id="baby-age-highlight-card"
        className={`p-5 sm:p-6 rounded-3xl border transition-all duration-300 shadow-sm relative overflow-hidden ${
          isGirl
            ? isNightMode
              ? 'bg-gradient-to-br from-rose-950/40 via-[#161017] to-[#120c13] border-rose-900/40 text-rose-50'
              : 'bg-gradient-to-br from-rose-50/90 via-pink-50/50 to-white border-rose-200/80 text-rose-950'
            : isNightMode
            ? 'bg-gradient-to-br from-blue-950/40 via-[#0e131d] to-[#0c1018] border-blue-900/40 text-blue-50'
            : 'bg-gradient-to-br from-blue-50/90 via-sky-50/50 to-white border-blue-200/80 text-blue-950'
        }`}
      >
        {/* Top subtle bar: Baby Name & Birthdate */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <span
              className={`p-1.5 rounded-xl ${
                isGirl
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
            </span>
            <span className="text-xs font-black tracking-wide uppercase">
              Tempo de Vida de {baby.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Nascimento: {formatBirthDateExtended(baby.birthDate)}</span>
          </div>
        </div>

        {/* Highlight Main Display: Big Typography with Click to Cycle */}
        <div className="py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div
            onClick={handleCycleNext}
            title="Toque para intercalar o formato de idade"
            className="cursor-pointer group select-none transition-transform active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isGirl
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                {getModeLabel()}
                {displayMode === 'auto' && (
                  <span className="text-[10px] font-bold opacity-80 flex items-center gap-0.5 ml-1">
                    <RotateCw className="w-2.5 h-2.5 animate-spin" /> (Alternando)
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                (toque para intercalar)
              </span>
            </div>

            <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight flex items-baseline gap-2 flex-wrap">
              <span className="transition-all duration-300 animate-in fade-in">
                {getAgeMainText()}
              </span>
            </div>

            {/* Subtext with the other 2 formats as compact pills */}
            <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Também equivale a:</span>
              {effectiveMode !== 'days' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectMode('days');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 font-bold transition-all text-slate-700 dark:text-slate-200"
                >
                  {age.daysOnlyString}
                </button>
              )}
              {effectiveMode !== 'weeks_days' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectMode('weeks_days');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 font-bold transition-all text-slate-700 dark:text-slate-200"
                >
                  {age.weeksDaysString}
                </button>
              )}
              {effectiveMode !== 'months_days' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectMode('months_days');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 font-bold transition-all text-slate-700 dark:text-slate-200"
                >
                  {age.monthsDaysString}
                </button>
              )}
            </div>
          </div>

          {/* Format Selector Pills (Abas de seleção rápida) */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black/5 dark:bg-white/5 self-start md:self-center">
            <button
              type="button"
              id="btn-age-format-days"
              onClick={() => handleSelectMode('days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                displayMode === 'days'
                  ? isGirl
                    ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30 scale-102'
                    : 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 scale-102'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Dias
            </button>

            <button
              type="button"
              id="btn-age-format-weeks-days"
              onClick={() => handleSelectMode('weeks_days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                displayMode === 'weeks_days'
                  ? isGirl
                    ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30 scale-102'
                    : 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 scale-102'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Semanas + Dias
            </button>

            <button
              type="button"
              id="btn-age-format-months-days"
              onClick={() => handleSelectMode('months_days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                displayMode === 'months_days'
                  ? isGirl
                    ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30 scale-102'
                    : 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 scale-102'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Mês + Dias
            </button>

            <button
              type="button"
              id="btn-age-format-auto"
              onClick={() => handleSelectMode('auto')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
                displayMode === 'auto'
                  ? isGirl
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30 scale-102'
                    : 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 scale-102'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              title="Alterna automaticamente a cada 4 segundos entre os 3 formatos"
            >
              <RotateCw className="w-3 h-3" />
              <span>Alternar Auto</span>
            </button>
          </div>
        </div>

        {/* Bottom Bar: Peso Atualizado + Medida Atualizada + Ação Rápida */}
        <div className="pt-3 border-t border-black/5 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 items-center">
          {/* Peso Atual */}
          <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/5">
            <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <Scale className="w-3 h-3 text-emerald-500" />
              Peso Atual
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {(currentWeightGrams / 1000).toFixed(3).replace('.', ',')} kg
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              Nasceu: {(baby.birthWeight / 1000).toFixed(3).replace('.', ',')} kg
            </div>
          </div>

          {/* Medida / Comprimento */}
          <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/5">
            <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <Ruler className="w-3 h-3 text-blue-500" />
              Medida Atual
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {currentLengthCm} cm
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              Nasceu: {baby.birthLength || 49} cm
            </div>
          </div>

          {/* Ganho Diário */}
          <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/5">
            <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              Ganho Médio
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {dailyGainGrams > 0 ? `+${dailyGainGrams} g/dia` : `${dailyGainGrams} g/dia`}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
              {dailyGainGrams >= 20 ? 'Meta OMS atingida' : 'Acompanhamento'}
            </div>
          </div>

          {/* Ação rápida: Registrar Nova Pesagem & Medida */}
          <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
            <button
              type="button"
              id="btn-quick-add-weight-dashboard"
              onClick={() => setIsWeightModalOpen(true)}
              className={`w-full py-2.5 px-3 rounded-2xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all ${
                isGirl
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Pesar / Medir</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('crescimento')}
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-0.5 transition-colors"
            >
              <span>Ver Curva OMS</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Modal Rápido de Pesagem & Medição */}
      <QuickWeightMeasurementModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
      />
    </>
  );
};
