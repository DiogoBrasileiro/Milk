import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Play,
  Pause,
  Check,
  X,
  Milk,
  Clock,
  Calendar,
  AlertCircle,
  ArrowDownCircle,
  HeartHandshake,
  RotateCcw,
  Timer,
  Sliders,
  Tag,
  Sparkles,
  Trash2,
  Archive,
  CheckCircle2,
  Info,
  Plus,
  Minus,
} from 'lucide-react';
import { FeedingRecord, FeedingType, BatchAllocation } from '../types';
import { formatBatchIdentification } from '../utils/formatters';

export const DirectFeedingModal: React.FC = () => {
  const {
    closeModal,
    modalData,
    addFeeding,
    updateFeeding,
    inventorySummary,
    activeNursingTimer,
    setActiveNursingTimer,
    isNightMode,
  } = useApp();

  const existingFeeding: FeedingRecord | undefined = modalData?.feeding;
  const isEditing = Boolean(existingFeeding);

  // Date and Time calculation
  const getInitialDateTime = () => {
    const base = existingFeeding?.timestamp ? new Date(existingFeeding.timestamp) : new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dStr = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
    const tStr = `${pad(base.getHours())}:${pad(base.getMinutes())}`;
    return { dStr, tStr };
  };

  const initial = getInitialDateTime();
  const [dateStr, setDateStr] = useState<string>(initial.dStr);
  const [timeStr, setTimeStr] = useState<string>(initial.tStr);

  const [feedingType, setFeedingType] = useState<FeedingType>(
    existingFeeding?.type || (modalData?.defaultType as FeedingType) || 'leite_materno_ordenhado'
  );

  const [offeredMl, setOfferedMl] = useState<number>(
    existingFeeding?.offeredMl || existingFeeding?.consumedMl || 0
  );
  const [consumedMl, setConsumedMl] = useState<number>(existingFeeding?.consumedMl || 0);
  const [remainingMl, setRemainingMl] = useState<number>(existingFeeding?.remainingMl || 0);

  // Multi-bottle selection state: NONE pre-selected by default for new feedings!
  const initialBatchIds = existingFeeding?.batchIdsUsed?.length
    ? existingFeeding.batchIdsUsed
    : [];

  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>(initialBatchIds);
  const [bottleAllocations, setBottleAllocations] = useState<Record<string, number>>(() => {
    const initAlloc: Record<string, number> = {};
    if (existingFeeding?.batchesUsedDetails?.length) {
      existingFeeding.batchesUsedDetails.forEach((a) => {
        initAlloc[a.batchId] = a.volumeMl;
      });
    }
    return initAlloc;
  });

  // Discard remainder option (defaults to false so leftover stays in stock unless user explicitly chooses to discard)
  const [discardRemainingStock, setDiscardRemainingStock] = useState<boolean>(
    existingFeeding?.discardRemainingStock ?? false
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  const [formulaBrand, setFormulaBrand] = useState<string>(existingFeeding?.formulaBrand || 'Aptamil Profutura 1');
  const [burped, setBurped] = useState<boolean>(existingFeeding?.burped ?? true);
  const [satietySigns, setSatietySigns] = useState<boolean>(existingFeeding?.satietySignsAfter ?? true);
  const [notes, setNotes] = useState<string>(existingFeeding?.notes || '');

  // Direct Nursing Manual & Stopwatch state
  const [directInputMode, setDirectInputMode] = useState<'stopwatch' | 'manual'>(
    existingFeeding?.type === 'amamentacao_direta' ? 'manual' : 'stopwatch'
  );
  const [manualLeftMinutes, setManualLeftMinutes] = useState<number>(
    existingFeeding?.directNursing?.leftMinutes || 10
  );
  const [manualRightMinutes, setManualRightMinutes] = useState<number>(
    existingFeeding?.directNursing?.rightMinutes || 10
  );
  const [manualLastSide, setManualLastSide] = useState<'esquerdo' | 'direito' | 'ambos'>(
    existingFeeding?.directNursing?.lastSide || 'esquerdo'
  );

  // Update remaining when offered / consumed changes
  useEffect(() => {
    setRemainingMl(Math.max(0, offeredMl - consumedMl));
  }, [offeredMl, consumedMl]);

  // Helper: auto-distribute target consumed volume across selected bottles in FEFO order
  const autoDistributeAcrossSelected = (targetVolume: number, candidateIds: string[]) => {
    if (candidateIds.length === 0) return;
    let remaining = targetVolume;
    const newAlloc: Record<string, number> = {};

    // Sort candidate IDs according to fefoList position
    const sorted = [...candidateIds].sort((a, b) => {
      const idxA = inventorySummary.fefoList.findIndex((item) => item.id === a);
      const idxB = inventorySummary.fefoList.findIndex((item) => item.id === b);
      return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
    });

    for (const bId of sorted) {
      const bObj = inventorySummary.fefoList.find((b) => b.id === bId);
      const maxVol = bObj ? bObj.currentVolumeMl : 0;
      const take = Math.min(maxVol, remaining);
      newAlloc[bId] = take;
      remaining -= take;
    }

    setBottleAllocations(newAlloc);
    const sum: number = Object.values(newAlloc).reduce((acc: number, val: number) => acc + (Number(val) || 0), 0);
    if (sum > 0) {
      setConsumedMl(sum);
      setOfferedMl((prev: number) => Math.max(prev, sum));
    }
  };

  // Toggle selection of a single bottle (defaults to full volume of selected bottle)
  const handleToggleBatch = (batchId: string) => {
    setValidationError(null);
    let nextIds: string[];
    if (selectedBatchIds.includes(batchId)) {
      nextIds = selectedBatchIds.filter((id) => id !== batchId);
    } else {
      nextIds = [...selectedBatchIds, batchId];
    }
    setSelectedBatchIds(nextIds);

    if (nextIds.length === 0) {
      setBottleAllocations({});
      setOfferedMl(0);
      setConsumedMl(0);
    } else {
      const newAlloc: Record<string, number> = {};
      let totalAvailable = 0;
      for (const id of nextIds) {
        const b = inventorySummary.fefoList.find((item) => item.id === id);
        const maxVol = b ? b.currentVolumeMl : 0;
        newAlloc[id] = maxVol;
        totalAvailable += maxVol;
      }
      setBottleAllocations(newAlloc);
      setOfferedMl(totalAvailable);
      setConsumedMl(totalAvailable); // Default: consumed full bottle volume
    }
  };

  // Manual adjustment of a specific bottle's mL
  const handleBatchVolumeChange = (batchId: string, value: number) => {
    setValidationError(null);
    const bObj = inventorySummary.fefoList.find((b) => b.id === batchId);
    const maxVol = bObj ? bObj.currentVolumeMl : 999;
    const clamped = Math.max(0, Math.min(maxVol, value));

    const updated: Record<string, number> = { ...bottleAllocations, [batchId]: clamped };
    setBottleAllocations(updated);

    const sum: number = Object.values(updated).reduce((acc: number, val: number) => acc + (Number(val) || 0), 0);
    setConsumedMl(sum);
  };

  // Direct nursing stopwatch ticker
  useEffect(() => {
    let interval: any = null;
    if (activeNursingTimer.isRunning && activeNursingTimer.currentSide) {
      interval = setInterval(() => {
        setActiveNursingTimer((prev) => {
          if (prev.currentSide === 'esquerdo') {
            return { ...prev, leftSeconds: prev.leftSeconds + 1 };
          } else if (prev.currentSide === 'direito') {
            return { ...prev, rightSeconds: prev.rightSeconds + 1 };
          }
          return prev;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeNursingTimer.isRunning, activeNursingTimer.currentSide, setActiveNursingTimer]);

  const toggleNursingSide = (side: 'esquerdo' | 'direito') => {
    setActiveNursingTimer((prev) => {
      if (prev.currentSide === side && prev.isRunning) {
        return { ...prev, isRunning: false };
      }
      return {
        ...prev,
        isRunning: true,
        currentSide: side,
      };
    });
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSetNow = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    setDateStr(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    setTimeStr(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  };

  const handleAdjustMinutes = (minutesDelta: number) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [h, m] = timeStr.split(':').map(Number);
    const target = new Date(year, (month || 1) - 1, day || 1, h || 0, m || 0, 0, 0);
    target.setMinutes(target.getMinutes() + minutesDelta);

    const pad = (n: number) => n.toString().padStart(2, '0');
    setDateStr(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`);
    setTimeStr(`${pad(target.getHours())}:${pad(target.getMinutes())}`);
  };

  const handleSetYesterday = () => {
    const target = new Date();
    target.setDate(target.getDate() - 1);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setDateStr(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`);
  };

  const totalNursingMinutes =
    directInputMode === 'manual'
      ? Math.max(1, manualLeftMinutes + manualRightMinutes)
      : Math.max(
          1,
          Math.round((activeNursingTimer.leftSeconds + activeNursingTimer.rightSeconds) / 60)
        );

  const selectedBatchObj =
    inventorySummary.fefoList.find((b) => selectedBatchIds.includes(b.id)) || inventorySummary.recommendedBatch;

  const handleSaveFeeding = () => {
    setValidationError(null);

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const targetDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
    const finalIso = targetDate.toISOString();

    let feedingPayload: any = {
      timestamp: finalIso,
      type: feedingType,
      burped,
      satietySignsAfter: satietySigns,
      notes: notes.trim() || undefined,
    };

    if (feedingType === 'amamentacao_direta') {
      const leftMins =
        directInputMode === 'manual'
          ? manualLeftMinutes
          : Math.round(activeNursingTimer.leftSeconds / 60);
      const rightMins =
        directInputMode === 'manual'
          ? manualRightMinutes
          : Math.round(activeNursingTimer.rightSeconds / 60);
      const lastSide =
        directInputMode === 'manual'
          ? manualLastSide
          : activeNursingTimer.currentSide || 'ambos';

      feedingPayload = {
        ...feedingPayload,
        durationMinutes: leftMins + rightMins,
        directNursing: {
          leftMinutes: leftMins,
          rightMinutes: rightMins,
          lastSide,
        },
      };

      // Reset direct timer if was running
      setActiveNursingTimer({
        isRunning: false,
        leftSeconds: 0,
        rightSeconds: 0,
        currentSide: null,
      });
    } else if (feedingType === 'leite_materno_ordenhado') {
      if (inventorySummary.fefoList.length > 0 && selectedBatchIds.length === 0) {
        setValidationError('Por favor, toque em ao menos um frasquinho do estoque para registrar a mamada.');
        return;
      }

      if (consumedMl <= 0 && offeredMl <= 0) {
        setValidationError('Por favor, informe a quantidade mamada em ml.');
        return;
      }

      // Build allocation details from selected bottles
      const allocations: BatchAllocation[] = [];
      let totalAllocatedMl = 0;

      for (const bId of selectedBatchIds) {
        const bObj = inventorySummary.fefoList.find((b) => b.id === bId);
        if (!bObj) continue;
        const vol = bottleAllocations[bId] !== undefined ? bottleAllocations[bId] : bObj.currentVolumeMl;
        if (vol > 0) {
          totalAllocatedMl += vol;
          allocations.push({
            batchId: bId,
            volumeMl: vol,
            containerNumber: bObj.containerNumber,
            containerName: bObj.containerName,
            containerColor: bObj.containerColor,
            containerTag: bObj.containerTag,
          });
        }
      }

      // If user didn't manually assign individual allocations, fallback to auto FEFO allocation
      const finalAllocations = allocations.length > 0 ? allocations : undefined;
      const primaryBatchObj = inventorySummary.fefoList.find((b) => b.id === selectedBatchIds[0]) || inventorySummary.recommendedBatch;

      let compoundContainerName = primaryBatchObj?.containerName;
      if (allocations.length > 1) {
        compoundContainerName = `${allocations.length} frascos (${allocations.map(a => `${a.containerNumber ? `#${a.containerNumber}` : a.batchId}: ${a.volumeMl}ml`).join(' + ')})`;
      }

      feedingPayload = {
        ...feedingPayload,
        offeredMl,
        consumedMl,
        remainingMl,
        discardRemainingStock,
        batchIdsUsed: selectedBatchIds.length > 0 ? selectedBatchIds : undefined,
        batchesUsedDetails: finalAllocations,
        containerNumber: primaryBatchObj?.containerNumber,
        containerName: compoundContainerName,
        containerColor: primaryBatchObj?.containerColor,
        containerTag: primaryBatchObj?.containerTag,
      };
    } else if (feedingType === 'formula') {
      if (consumedMl <= 0 && offeredMl <= 0) {
        setValidationError('Por favor, informe a quantidade consumida de fórmula em ml.');
        return;
      }

      feedingPayload = {
        ...feedingPayload,
        offeredMl,
        consumedMl,
        remainingMl,
        formulaBrand,
      };
    }

    if (isEditing && existingFeeding) {
      updateFeeding(existingFeeding.id, feedingPayload);
    } else {
      addFeeding(feedingPayload);
    }

    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border max-h-[92vh] overflow-y-auto ${
          isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <Milk className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                {isEditing ? 'Editar Registro' : 'Novo Registro'}
              </span>
              <h2 className="font-extrabold text-base">
                {isEditing ? 'Editar Mamada' : 'Registrar Mamada'}
              </h2>
              <p className="text-xs text-slate-400">Data e hora retroativa, no peito ou estoque FEFO</p>
            </div>
          </div>
          <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-200 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {/* RETROACTIVE DATE AND TIME SECTION */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>Data e Horário da Mamada</span>
              </span>
              <button
                type="button"
                onClick={handleSetNow}
                className="text-xs font-black text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/20"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Agora</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  Data:
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-300 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className={`w-full pl-8 pr-2 py-2.5 rounded-xl text-sm font-bold border-2 outline-none transition-all ${
                      isNightMode
                        ? 'bg-slate-900 border-slate-600 text-white focus:border-rose-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  Hora:
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-600 dark:text-slate-300 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className={`w-full pl-8 pr-2 py-2.5 rounded-xl text-sm font-bold border-2 outline-none transition-all ${
                      isNightMode
                        ? 'bg-slate-900 border-slate-600 text-white focus:border-rose-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Quick Time Offsets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mr-1">Atalhos:</span>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-15)}
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors shadow-xs"
              >
                -15 min
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-30)}
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors shadow-xs"
              >
                -30 min
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-60)}
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors shadow-xs"
              >
                -1h
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-120)}
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors shadow-xs"
              >
                -2h
              </button>
              <button
                type="button"
                onClick={handleSetYesterday}
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors shadow-xs"
              >
                Ontem
              </button>
            </div>
          </div>

          {/* Main Selection: Peito vs Estoque vs Fórmula */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFeedingType('amamentacao_direta')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                feedingType === 'amamentacao_direta'
                  ? isNightMode
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 ring-2 ring-purple-500/30'
                    : 'bg-purple-50 border-purple-600 text-purple-800 ring-2 ring-purple-500/20 font-bold'
                  : isNightMode
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="text-xl">🤱</span>
              <span className="text-xs font-bold leading-tight">No Peito</span>
              <span className="text-[10px] text-slate-400">Direto na mama</span>
            </button>

            <button
              type="button"
              onClick={() => setFeedingType('leite_materno_ordenhado')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                feedingType === 'leite_materno_ordenhado'
                  ? isNightMode
                    ? 'bg-blue-500/20 border-blue-400 text-blue-300 ring-2 ring-blue-500/30'
                    : 'bg-blue-50 border-blue-600 text-blue-800 ring-2 ring-blue-500/20 font-bold'
                  : isNightMode
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="text-xl">🍼</span>
              <span className="text-xs font-bold leading-tight">Do Estoque</span>
              <span className="text-[10px] text-blue-400 font-semibold">Baixa automática</span>
            </button>

            <button
              type="button"
              onClick={() => setFeedingType('formula')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                feedingType === 'formula'
                  ? isNightMode
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-500/30'
                    : 'bg-amber-50 border-amber-600 text-amber-800 ring-2 ring-amber-500/20 font-bold'
                  : isNightMode
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="text-xl">🥣</span>
              <span className="text-xs font-bold leading-tight">Fórmula</span>
              <span className="text-[10px] text-slate-400">Leite em pó</span>
            </button>
          </div>

          {/* Type: Direct Nursing (Live Stopwatch or Retroactive Manual Duration) */}
          {feedingType === 'amamentacao_direta' && (
            <div className="space-y-3.5 animate-in fade-in">
              {/* Toggle Mode: Cronômetro vs Manual Retroativo */}
              <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDirectInputMode('stopwatch')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    directInputMode === 'stopwatch'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  Cronômetro ao Vivo
                </button>
                <button
                  type="button"
                  onClick={() => setDirectInputMode('manual')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    directInputMode === 'manual'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Preencher Minutos (Retroativo)
                </button>
              </div>

              {directInputMode === 'stopwatch' ? (
                /* LIVE STOPWATCH MODE */
                <div className="grid grid-cols-2 gap-3">
                  {/* Left Breast */}
                  <div
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      activeNursingTimer.currentSide === 'esquerdo' && activeNursingTimer.isRunning
                        ? 'bg-purple-500/15 border-purple-400 text-purple-400 ring-2 ring-purple-400/20'
                        : isNightMode
                        ? 'bg-slate-900/60 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider block mb-1">Mama Esquerda</span>
                    <div className="text-2xl font-mono font-bold my-1">
                      {formatTimer(activeNursingTimer.leftSeconds)}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNursingSide('esquerdo')}
                      className={`mt-2 py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 mx-auto ${
                        activeNursingTimer.currentSide === 'esquerdo' && activeNursingTimer.isRunning
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {activeNursingTimer.currentSide === 'esquerdo' && activeNursingTimer.isRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" /> Pausar
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" /> Iniciar E
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right Breast */}
                  <div
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      activeNursingTimer.currentSide === 'direito' && activeNursingTimer.isRunning
                        ? 'bg-purple-500/15 border-purple-400 text-purple-400 ring-2 ring-purple-400/20'
                        : isNightMode
                        ? 'bg-slate-900/60 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider block mb-1">Mama Direita</span>
                    <div className="text-2xl font-mono font-bold my-1">
                      {formatTimer(activeNursingTimer.rightSeconds)}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNursingSide('direito')}
                      className={`mt-2 py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 mx-auto ${
                        activeNursingTimer.currentSide === 'direito' && activeNursingTimer.isRunning
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {activeNursingTimer.currentSide === 'direito' && activeNursingTimer.isRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" /> Pausar
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" /> Iniciar D
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* RETROACTIVE MANUAL DURATION INPUTS */
                <div className="space-y-3 p-3.5 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border-2 border-purple-300 dark:border-purple-800">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider block mb-1.5">
                      Lado Final da Mamada:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'esquerdo', label: 'Esq (Esquerdo)' },
                        { id: 'direito', label: 'Dir (Direito)' },
                        { id: 'ambos', label: 'Ambos os lados' },
                      ].map((side) => (
                        <button
                          key={side.id}
                          type="button"
                          onClick={() => setManualLastSide(side.id as any)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border-2 transition-all ${
                            manualLastSide === side.id
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : isNightMode
                              ? 'bg-slate-800 border-slate-600 text-slate-200'
                              : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          {side.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Mama Esquerda (min):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={manualLeftMinutes}
                        onChange={(e) => setManualLeftMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                        className={`w-full p-2.5 rounded-xl text-base font-black text-center border-2 outline-none ${
                          isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-purple-400' : 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Mama Direita (min):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={manualRightMinutes}
                        onChange={(e) => setManualRightMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                        className={`w-full p-2.5 rounded-xl text-base font-black text-center border-2 outline-none ${
                          isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-purple-400' : 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-800 dark:text-purple-200 flex items-center gap-2 font-medium">
                <HeartHandshake className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
                <span>
                  ⏱️ Tempo total: <strong>{totalNursingMinutes} min</strong> no peito. A amamentação direta não consome frascos do estoque.
                </span>
              </div>
            </div>
          )}

          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-start gap-2.5 shadow-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-rose-900 dark:text-rose-100">Atenção</strong>
                <span>{validationError}</span>
              </div>
            </div>
          )}

          {/* Expressed milk from inventory or Formula */}
          {feedingType !== 'amamentacao_direta' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Leite Materno do Estoque - Section */}
              {feedingType === 'leite_materno_ordenhado' && (
                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/25 border-2 border-blue-200 dark:border-blue-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                      <ArrowDownCircle className="w-4 h-4" />
                      Frascos de Leite Ordenhado no Estoque
                    </span>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                      Disponível: {inventorySummary.totalMl} ml
                    </span>
                  </div>

                  {inventorySummary.fefoList.length > 0 ? (
                    <div className="space-y-3">
                      {/* Guidance banner when no bottle is selected */}
                      {selectedBatchIds.length === 0 ? (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-amber-950 dark:text-amber-100">
                              Nenhum frasquinho selecionado como padrão.
                            </span>
                            <span className="text-[11px] text-amber-800 dark:text-amber-300">
                              Toque no frasco abaixo que você vai oferecer ao bebê. O volume total dele será carregado automaticamente.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-blue-100/60 dark:bg-blue-900/40 text-xs">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-bold text-blue-900 dark:text-blue-100">
                              {selectedBatchIds.length === 1
                                ? '1 frasco selecionado'
                                : `${selectedBatchIds.length} frascos combinados`}
                            </span>
                            <span className="font-black text-blue-700 dark:text-blue-300 ml-1">
                              ({offeredMl} ml preparados)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBatchIds([]);
                              setBottleAllocations({});
                              setOfferedMl(0);
                              setConsumedMl(0);
                            }}
                            className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            Desmarcar
                          </button>
                        </div>
                      )}

                      {/* Visual Interactive Cards for each bottle in inventory */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1 pb-1">
                        {inventorySummary.fefoList.map((b, idx) => {
                          const isSelected = selectedBatchIds.includes(b.id);
                          const ident = formatBatchIdentification(b);
                          const isRecommended = idx === 0;
                          const currentAlloc = bottleAllocations[b.id] !== undefined
                            ? bottleAllocations[b.id]
                            : isSelected
                            ? b.currentVolumeMl
                            : 0;

                          const willRemainMl = Math.max(0, b.currentVolumeMl - currentAlloc);

                          return (
                            <div
                              key={b.id}
                              onClick={() => handleToggleBatch(b.id)}
                              className={`p-3 rounded-2xl border-2 transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/25 shadow-sm'
                                  : isNightMode
                                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-white opacity-85'
                                  : 'bg-white border-slate-200 hover:border-blue-300 text-slate-900 opacity-90'
                              }`}
                            >
                              {/* Top row: Checkbox, Bottle Name & recommendation */}
                              <div className="flex items-start justify-between gap-1.5 w-full">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {/* Custom Checkbox indicator */}
                                  <div
                                    className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                                      isSelected
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </div>

                                  <span
                                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white/50 ring-1 ring-black/10"
                                    style={{ backgroundColor: ident.colorHex }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono font-black text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded text-slate-900 dark:text-slate-100">
                                        {b.containerNumber ? `Frasco #${b.containerNumber}` : `Frasco #${b.id}`}
                                      </span>
                                      {b.containerName && (
                                        <strong className="text-xs sm:text-sm font-black truncate text-slate-900 dark:text-white">
                                          {b.containerName}
                                        </strong>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {isRecommended && (
                                  <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                    ⭐ 1º FEFO
                                  </span>
                                )}
                              </div>

                              {/* Prominent Tag / Classification Pill */}
                              <div className="flex flex-wrap items-center gap-1.5 w-full">
                                {ident.tag ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black border"
                                    style={{
                                      backgroundColor: `${ident.colorHex}18`,
                                      borderColor: `${ident.colorHex}50`,
                                      color: ident.colorHex,
                                    }}
                                  >
                                    <Tag className="w-3 h-3" />
                                    <span>{ident.tag}</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-medium italic">Sem etiqueta</span>
                                )}
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                  {b.location === 'freezer' ? '🧊 Freezer' : b.location === 'descongelado' ? '💧 Descong.' : '❄️ Geladeira'}
                                </span>
                              </div>

                              {/* Bottom row */}
                              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] w-full">
                                <span className="font-black text-slate-700 dark:text-slate-300">
                                  Disponível no pote: {b.currentVolumeMl} ml
                                </span>
                                <span className={`text-[11px] font-bold ${
                                  isSelected ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-500 hover:text-blue-600'
                                }`}>
                                  {isSelected ? '✓ Selecionado' : '+ Toque para usar'}
                                </span>
                              </div>

                              {/* Withdrawal Volume Controls when selected */}
                              {isSelected && (
                                <div className="mt-2 pt-2 border-t border-blue-100 dark:border-blue-900/50 space-y-2 w-full animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-extrabold text-blue-900 dark:text-blue-200">
                                      Quanto retirar deste pote?
                                    </span>
                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                                      {bottleAllocations[b.id] || 0} ml
                                    </span>
                                  </div>

                                  {/* Quick Volume Shortcuts */}
                                  <div className="flex flex-wrap items-center gap-1">
                                    {[20, 30, 40, 50, 60].map((v) => {
                                      if (v > b.currentVolumeMl) return null;
                                      const isCurr = (bottleAllocations[b.id] || 0) === v;
                                      return (
                                        <button
                                          key={v}
                                          type="button"
                                          onClick={() => handleBatchVolumeChange(b.id, v)}
                                          className={`py-0.5 px-2 rounded-lg text-[11px] font-black border transition-all ${
                                            isCurr
                                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-blue-50'
                                          }`}
                                        >
                                          {v}ml
                                        </button>
                                      );
                                    })}
                                    <button
                                      type="button"
                                      onClick={() => handleBatchVolumeChange(b.id, b.currentVolumeMl)}
                                      className={`py-0.5 px-2 rounded-lg text-[11px] font-black border transition-all ${
                                        (bottleAllocations[b.id] || 0) === b.currentVolumeMl
                                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                      }`}
                                    >
                                      Tudo ({b.currentVolumeMl}ml)
                                    </button>
                                  </div>

                                  {/* Custom Volume Input */}
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={bottleAllocations[b.id] || 0}
                                      min={1}
                                      max={b.currentVolumeMl}
                                      onChange={(e) => handleBatchVolumeChange(b.id, parseInt(e.target.value) || 0)}
                                      className={`w-full p-2 rounded-xl text-xs font-black text-center border outline-none ${
                                        isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                      }`}
                                    />
                                    <span className="text-xs font-bold text-slate-500">ml</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-600 dark:text-amber-300 font-bold">
                      ⚠️ Nenhum frasco no estoque no momento. O registro de consumo em ml será salvo no histórico do bebê.
                    </div>
                  )}
                </div>
              )}

              {/* Formula Brand */}
              {feedingType === 'formula' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block mb-1.5">
                    Marca da Fórmula (Opcional):
                  </label>
                  <input
                    type="text"
                    value={formulaBrand}
                    onChange={(e) => setFormulaBrand(e.target.value)}
                    placeholder="Ex: Aptamil 1, Nan Supreme, Enfamil"
                    className={`w-full p-3 rounded-xl text-sm font-bold border-2 outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-amber-400' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                    }`}
                  />
                </div>
              )}

              {/* Consumption & Volume Section */}
              <div className="space-y-3">
                {/* Quick adjustment if a bottle is selected */}
                {selectedBatchIds.length > 0 && offeredMl > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Volume total no(s) frasco(s): <strong>{offeredMl} ml</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setConsumedMl(offeredMl)}
                      className={`text-xs font-black px-2.5 py-1 rounded-lg border transition-all ${
                        consumedMl === offeredMl
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 border-slate-300 dark:border-slate-600 hover:bg-blue-50'
                      }`}
                    >
                      🍼 Mamou tudo ({offeredMl}ml)
                    </button>
                  </div>
                )}

                {/* Volumes: Offered vs Consumed */}
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-1.5">
                    {feedingType === 'leite_materno_ordenhado' ? 'Quantidade Ofertada e Mamada:' : 'Volume Consumido em ml:'}
                  </label>

                  {/* Increment / Preset buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    <span className="text-xs font-bold text-slate-500 mr-0.5">Ajustar mamada:</span>
                    <button
                      type="button"
                      onClick={() => setConsumedMl((c) => Math.max(0, c - 20))}
                      className="py-1 px-2 rounded-lg text-xs font-black bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                    >
                      -20ml
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsumedMl((c) => Math.max(0, c - 10))}
                      className="py-1 px-2 rounded-lg text-xs font-black bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                    >
                      -10ml
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsumedMl((c) => Math.max(0, c - 5))}
                      className="py-1 px-2 rounded-lg text-xs font-black bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                    >
                      -5ml
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsumedMl((c) => Math.min(offeredMl || 999, c + 10))}
                      className="py-1 px-2 rounded-lg text-xs font-black bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                    >
                      +10ml
                    </button>
                    {[30, 60, 90, 120, 150].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setConsumedMl(v);
                          if (feedingType === 'formula' || selectedBatchIds.length === 0) {
                            setOfferedMl(v);
                          }
                        }}
                        className={`py-1 px-2 rounded-lg text-xs font-black border transition-all ${
                          consumedMl === v
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {v}ml
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-2xl border-2 ${isNightMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                        Oferecido (Total):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={offeredMl}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setOfferedMl(val);
                            if (consumedMl > val) setConsumedMl(val);
                          }}
                          className={`w-full p-2.5 rounded-xl text-lg font-black text-center border-2 outline-none ${
                            isNightMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                          }`}
                        />
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">ml</span>
                      </div>
                    </div>

                    <div className={`p-3 rounded-2xl border-2 ${isNightMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                        Efetivo Mamado:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={consumedMl}
                          onChange={(e) => setConsumedMl(Math.max(0, parseInt(e.target.value) || 0))}
                          className={`w-full p-2.5 rounded-xl text-lg font-black text-center border-2 outline-none ${
                            isNightMode ? 'bg-slate-900 border-slate-600 text-blue-300' : 'bg-white border-blue-400 text-blue-700 focus:border-blue-600'
                          }`}
                        />
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">ml</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LEFTOVER & DISCARD DECISION CARD (for Expressed Milk from inventory) */}
                {feedingType === 'leite_materno_ordenhado' && selectedBatchIds.length > 0 && (
                  <div>
                    {remainingMl > 0 ? (
                      <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            Sobra pós-mamada: <strong>{remainingMl} ml</strong> (de {offeredMl} ml oferecidos)
                          </span>
                        </div>

                        <p className="text-xs text-amber-900/90 dark:text-amber-200/90 font-medium leading-relaxed">
                          Conforme o protocolo do Ministério da Saúde / Rede BLH (Brasil), o leite aquecido e oferecido na mamadeira <strong>não retorna ao frasco de estoque</strong> devido ao risco de proliferação bacteriana.
                        </p>

                        <div className="p-2 rounded-xl bg-amber-100/80 dark:bg-amber-900/40 text-[11px] font-bold text-amber-950 dark:text-amber-200">
                          📦 O leite mantido no frasco original do estoque (que não foi aquecido/oferecido) continua seguro no seu estoque normalmente.
                        </div>

                        {/* Optional checkbox if user explicitly wants to ALSO discard the unheated remaining volume in the original bottle */}
                        <label className="flex items-center gap-2 pt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={discardRemainingStock}
                            onChange={(e) => setDiscardRemainingStock(e.target.checked)}
                            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                          />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Descartar também o restante do frasco original no estoque (esvaziar totalmente o pote)
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          Volume retirado totalmente mamado pelo bebê ({offeredMl} ml).
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Remaining badge for formula */}
                {feedingType === 'formula' && remainingMl > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs mt-2 font-bold">
                    <span className="text-slate-600 dark:text-slate-300">Sobra / Restante não consumido:</span>
                    <span className="font-black text-slate-900 dark:text-white">{remainingMl} ml</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Behavior / signs chips */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={burped}
                onChange={(e) => setBurped(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <span>Arrotou após mamada</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={satietySigns}
                onChange={(e) => setSatietySigns(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <span>Sinais de saciedade</span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Observações:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pegou bem a pega, sem regurgitação"
              className={`w-full p-3 rounded-xl text-sm font-semibold border-2 outline-none ${
                isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-rose-400 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500 placeholder:text-slate-400'
              }`}
            />
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className={`flex-1 py-3 rounded-2xl font-bold text-xs border ${
                isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveFeeding}
              className="flex-2 py-3 rounded-2xl font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 active:scale-98"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              {isEditing
                ? 'Salvar Alterações'
                : feedingType === 'leite_materno_ordenhado'
                ? 'Salvar & Dar Baixa no Estoque'
                : 'Salvar Mamada'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
