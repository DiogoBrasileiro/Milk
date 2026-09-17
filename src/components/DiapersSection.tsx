import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../utils/formatters';
import {
  DiaperRecord,
  DiaperStockItem,
  DiaperPeeAmount,
  DiaperPoopAmount,
  DiaperPoopColor,
  DiaperPoopConsistency,
} from '../types';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Edit2,
  ArrowLeft,
  Package,
  AlertTriangle,
  ChevronRight,
  X,
  PlusCircle,
} from 'lucide-react';

export const DiapersSection: React.FC = () => {
  const {
    diapers,
    diaperStockItems,
    addDiaper,
    deleteDiaper,
    openModal,
    isNightMode,
    triggerUndoToast,
    setActiveTab,
    diaperStockSummary,
    baby,
    setDefaultDiaperStockItem,
    replenishDiaperStockItem,
    addDiaperStockItem,
  } = useApp();

  const [filterType, setFilterType] = useState<'todos' | 'xixi' | 'coco' | 'ambos'>('todos');

  // Safe arrays protecting against null/undefined
  const safeDiapers = Array.isArray(diapers) ? diapers : [];
  const safeStockItems = Array.isArray(diaperStockItems) ? diaperStockItems : [];
  const activeStockItems = safeStockItems.filter((i) => i && i.status !== 'ARCHIVED');

  const defaultStockItem =
    activeStockItems.find((i) => i.isDefaultInUse || (baby && i.id === baby.defaultDiaperStockItemId)) ||
    activeStockItems.find((i) => (i.quantityCurrent || 0) > 0);

  // View state for Diaper Stock expansion
  const [showStockView, setShowStockView] = useState(false);

  // Add Diaper Stock Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addBrand, setAddBrand] = useState('Pampers');
  const [addProductLine, setAddProductLine] = useState('Premium Care');
  const [addSize, setAddSize] = useState('P');
  const [addWeightMinKg, setAddWeightMinKg] = useState<string>('3.5');
  const [addWeightMaxKg, setAddWeightMaxKg] = useState<string>('6');
  const [addQuantity, setAddQuantity] = useState<number>(80);
  const [addPurchaseDate, setAddPurchaseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [addTotalCost, setAddTotalCost] = useState<string>('');
  const [addItemNotes, setAddItemNotes] = useState('');
  const [duplicateResolution, setDuplicateResolution] = useState<'merge' | 'separate'>('merge');

  // Quick Replenish Modal state
  const [replenishingItem, setReplenishingItem] = useState<DiaperStockItem | null>(null);
  const [replenishQty, setReplenishQty] = useState<number>(40);

  // Quick Inline Form Date & Time States
  const getNowFormatted = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
  };

  const [showQuickForm, setShowQuickForm] = useState(false);
  const [formDate, setFormDate] = useState(() => getNowFormatted().date);
  const [formTime, setFormTime] = useState(() => getNowFormatted().time);

  const [hasPee, setHasPee] = useState(true);
  const [peeAmount, setPeeAmount] = useState<DiaperPeeAmount>('normal');
  const [hasPoop, setHasPoop] = useState(false);
  const [poopAmount, setPoopAmount] = useState<DiaperPoopAmount>('normal');
  const [poopConsistency, setPoopConsistency] = useState<DiaperPoopConsistency>('pastoso');
  const [poopColor, setPoopColor] = useState<DiaperPoopColor>('mostarda');
  const [notes, setNotes] = useState('');

  // Selected Stock Item for the quick inline form
  const [selectedStockItemId, setSelectedStockItemId] = useState<string>(() => {
    return defaultStockItem ? defaultStockItem.id : activeStockItems[0]?.id || 'none';
  });
  const [isChangingDiaperModel, setIsChangingDiaperModel] = useState(false);

  const selectedStockItem = safeStockItems.find((i) => i && i.id === selectedStockItemId);

  const colorsList: Array<{ id: DiaperPoopColor; label: string; hex: string; desc?: string }> = [
    { id: 'mostarda', label: 'Mostarda', hex: '#d97706', desc: 'Típico leite materno' },
    { id: 'amarelo', label: 'Amarelo', hex: '#eab308' },
    { id: 'marrom', label: 'Marrom', hex: '#78350f', desc: 'Comum em fórmula' },
    { id: 'verde', label: 'Verde', hex: '#16a34a', desc: 'Pode ser trânsito rápido' },
    { id: 'preto', label: 'Preto / Mecônio', hex: '#1e293b', desc: 'Normal primeiros dias' },
    { id: 'vermelho', label: 'Vermelho / Sangue', hex: '#dc2626', desc: 'Atenção médica' },
    { id: 'branco', label: 'Branco / Claro', hex: '#cbd5e1', desc: 'Atenção médica' },
  ];

  const sizePresets: Array<{ size: string; min: number; max: number }> = [
    { size: 'RN', min: 2, max: 4.5 },
    { size: 'RN+', min: 3, max: 5 },
    { size: 'P', min: 3.5, max: 6 },
    { size: 'M', min: 5.5, max: 9.5 },
    { size: 'G', min: 9, max: 12.5 },
    { size: 'XG', min: 12, max: 15 },
    { size: 'XXG', min: 14, max: 18 },
  ];

  const handleSizeChange = (newSize: string) => {
    setAddSize(newSize);
    const preset = sizePresets.find((p) => p.size === newSize);
    if (preset) {
      setAddWeightMinKg(preset.min.toString());
      setAddWeightMaxKg(preset.max.toString());
    }
  };

  // Check if identical item already exists in stock
  const existingIdentical = activeStockItems.find(
    (i) =>
      addBrand.trim() &&
      i.brand.trim().toLowerCase() === addBrand.trim().toLowerCase() &&
      (i.productLine || '').trim().toLowerCase() === (addProductLine || '').trim().toLowerCase() &&
      i.size.trim().toUpperCase() === addSize.trim().toUpperCase()
  );

  const handleSaveAddDiaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBrand.trim()) return;
    if (addQuantity <= 0) return;

    const parsedCost = addTotalCost.trim() ? parseFloat(addTotalCost.replace(',', '.')) : undefined;
    const parsedMinWeight = addWeightMinKg.trim() ? parseFloat(addWeightMinKg.replace(',', '.')) : undefined;
    const parsedMaxWeight = addWeightMaxKg.trim() ? parseFloat(addWeightMaxKg.replace(',', '.')) : undefined;

    if (existingIdentical && duplicateResolution === 'merge') {
      replenishDiaperStockItem(existingIdentical.id, addQuantity, parsedCost, addItemNotes.trim() || undefined);
      triggerUndoToast(`+${addQuantity} un. adicionadas ao estoque de ${existingIdentical.brand} Tam ${existingIdentical.size}`, () => {});
    } else {
      addDiaperStockItem({
        brand: addBrand.trim(),
        productLine: addProductLine.trim() || undefined,
        size: addSize.trim().toUpperCase(),
        weightMinKg: parsedMinWeight,
        weightMaxKg: parsedMaxWeight,
        quantityPurchased: addQuantity,
        quantityCurrent: addQuantity,
        purchaseDate: addPurchaseDate || undefined,
        totalCost: parsedCost,
        notes: addItemNotes.trim() || undefined,
        status: 'ACTIVE',
        isDefaultInUse: activeStockItems.length === 0,
      });
      triggerUndoToast(`Estoque de ${addBrand.trim()} Tam ${addSize} cadastrado com sucesso!`, () => {});
    }

    setShowAddModal(false);
  };

  const handleConfirmReplenish = () => {
    if (!replenishingItem || replenishQty <= 0) return;
    replenishDiaperStockItem(replenishingItem.id, replenishQty);
    triggerUndoToast(`+${replenishQty} un. adicionadas ao estoque de ${replenishingItem.brand} Tam ${replenishingItem.size}!`, () => {});
    setReplenishingItem(null);
  };

  const handleSetNow = () => {
    const { date, time } = getNowFormatted();
    setFormDate(date);
    setFormTime(time);
  };

  const handleAdjustMinutes = (minutesDelta: number) => {
    const [year, month, day] = formDate.split('-').map(Number);
    const [h, m] = formTime.split(':').map(Number);
    const target = new Date(year, (month || 1) - 1, day || 1, h || 0, m || 0, 0, 0);
    target.setMinutes(target.getMinutes() + minutesDelta);

    const pad = (n: number) => n.toString().padStart(2, '0');
    setFormDate(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`);
    setFormTime(`${pad(target.getHours())}:${pad(target.getMinutes())}`);
  };

  const handleSetYesterday = () => {
    const target = new Date();
    target.setDate(target.getDate() - 1);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setFormDate(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`);
  };

  const handleSaveQuickDiaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPee && !hasPoop) return;

    const [year, month, day] = formDate.split('-').map(Number);
    const [hours, minutes] = formTime.split(':').map(Number);
    const targetDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
    const finalIso = targetDate.toISOString();

    const chosenStockItem = safeStockItems.find((i) => i && i.id === selectedStockItemId);

    addDiaper({
      timestamp: finalIso,
      hasPee,
      peeAmount: hasPee ? peeAmount : undefined,
      hasPoop,
      poopAmount: hasPoop ? poopAmount : undefined,
      poopConsistency: hasPoop ? poopConsistency : undefined,
      poopColor: hasPoop ? poopColor : undefined,
      notes: notes.trim() || undefined,
      diaperStockItemId: selectedStockItemId !== 'none' ? selectedStockItemId : undefined,
      diaperBrand: chosenStockItem?.brand,
      diaperSize: chosenStockItem?.size,
    });

    setNotes('');
    setShowQuickForm(false);
  };

  const handleDeleteWithUndo = (diaper: DiaperRecord) => {
    deleteDiaper(diaper.id);
    triggerUndoToast('Troca de fralda excluída', () => {
      addDiaper({
        timestamp: diaper.timestamp,
        hasPee: diaper.hasPee,
        peeAmount: diaper.peeAmount,
        hasPoop: diaper.hasPoop,
        poopAmount: diaper.poopAmount,
        poopConsistency: diaper.poopConsistency,
        poopColor: diaper.poopColor,
        notes: diaper.notes,
        diaperStockItemId: diaper.diaperStockItemId,
        diaperBrand: diaper.diaperBrand,
        diaperSize: diaper.diaperSize,
      });
    });
  };

  // Metrics for Today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDiapers = safeDiapers.filter(
    (d) => d?.timestamp && typeof d.timestamp === 'string' && d.timestamp.startsWith(todayStr)
  );
  const todayPee = todayDiapers.filter((d) => d && d.hasPee).length;
  const todayPoop = todayDiapers.filter((d) => d && d.hasPoop).length;

  const filteredDiapers = safeDiapers.filter((d) => {
    if (!d) return false;
    if (filterType === 'todos') return true;
    if (filterType === 'xixi') return d.hasPee && !d.hasPoop;
    if (filterType === 'coco') return d.hasPoop && !d.hasPee;
    if (filterType === 'ambos') return d.hasPee && d.hasPoop;
    return true;
  });

  const summary = diaperStockSummary || {
    totalAvailable: 0,
    defaultItem: undefined,
    consumptionToday: 0,
    avg7Days: 0,
    daysRemainingDefault: 0,
    daysRemainingTotal: 0,
    isLowStock: false,
    hasSufficientHistory: false,
    weightAlert: undefined,
  };

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto px-4 pt-4 animate-in fade-in">
      {/* 1. TOP HEADER & BREADCRUMB */}
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuickForm(!showQuickForm)}
            className={`py-2 px-3 rounded-2xl text-xs font-bold border transition-all ${
              isNightMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {showQuickForm ? 'Ocultar Rápida' : 'Troca Rápida'}
          </button>
          <button
            type="button"
            onClick={() => openModal('diaperDetail')}
            className="py-2 px-4 rounded-2xl font-bold text-xs flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nova Troca</span>
          </button>
        </div>
      </div>

      {/* 2. CARD: HOJE */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Hoje
            </span>
            <h2 className="text-xl font-black tracking-tight">FRALDAS</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {todayDiapers.length} {todayDiapers.length === 1 ? 'troca hoje' : 'trocas hoje'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20">
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 block">💧 Xixi</span>
            <strong className="text-2xl font-black text-sky-700 dark:text-sky-300 font-mono">
              {todayPee}
            </strong>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">💩 Cocô</span>
            <strong className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
              {todayPoop}
            </strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Total hoje</span>
            <strong className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
              {todayDiapers.length}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. CARD: FRALDA EM USO */}
      <div
        className={`p-5 rounded-3xl border transition-all ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400 text-slate-900">
              FRALDA EM USO
            </span>
            {summary.isLowStock && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                ⚠ Estoque baixo
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowStockView(!showStockView)}
            className="py-1.5 px-3 rounded-xl border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
          >
            {showStockView ? 'Ocultar estoque' : 'Ver estoque'}
          </button>
        </div>

        {summary.defaultItem ? (
          <div className="mt-3">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {summary.defaultItem.brand}{' '}
              {summary.defaultItem.productLine ? `${summary.defaultItem.productLine}` : ''}
            </h3>
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Tam {summary.defaultItem.size}
              </span>
              <span>•</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">
                {summary.defaultItem.quantityCurrent} unidades
              </span>
              {summary.hasSufficientHistory && summary.daysRemainingDefault > 0 && (
                <>
                  <span>•</span>
                  <span>≈ {summary.daysRemainingDefault} dias</span>
                </>
              )}
            </div>

            {summary.weightAlert && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{summary.weightAlert.message}</span>
              </div>
            )}
          </div>
        ) : activeStockItems.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs text-slate-400">Nenhuma fralda marcada como em uso.</p>
            <button
              type="button"
              onClick={() => setShowStockView(true)}
              className="mt-1 text-xs font-bold text-sky-600 dark:text-sky-400 underline"
            >
              Definir fralda em uso
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-xs text-slate-400">Nenhuma fralda cadastrada no estoque.</p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-2 py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all"
            >
              + Adicionar fraldas
            </button>
          </div>
        )}
      </div>

      {/* 4. SEÇÃO EXPANDÍVEL: ESTOQUE DE FRALDAS (Ao entrar em Ver estoque) */}
      {showStockView && (
        <div
          className={`p-5 rounded-3xl border transition-all animate-in slide-in-from-top-2 ${
            isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                ESTOQUE DE FRALDAS
              </h3>
              <span className="text-xs text-slate-400">
                {summary.totalAvailable} unidades disponíveis no total
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="py-2 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Adicionar fraldas</span>
            </button>
          </div>

          <div className="space-y-2">
            {activeStockItems.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.isDefaultInUse
                    ? 'border-sky-500/50 bg-sky-500/5'
                    : isNightMode
                    ? 'border-slate-800 bg-slate-900/40'
                    : 'border-slate-100 bg-slate-50/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-black">
                      {item.brand} {item.productLine ? `— ${item.productLine}` : ''}
                    </strong>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.size}
                    </span>
                    {item.isDefaultInUse && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-400 text-slate-900">
                        EM USO
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="font-bold text-sky-600 dark:text-sky-400">{item.quantityCurrent} un.</span>
                    {item.weightMinKg && item.weightMaxKg && (
                      <span> • {item.weightMinKg} a {item.weightMaxKg} kg</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!item.isDefaultInUse && (
                    <button
                      type="button"
                      onClick={() => setDefaultDiaperStockItem(item.id)}
                      className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs font-bold text-slate-600 dark:text-slate-300"
                    >
                      Marcar Em Uso
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setReplenishingItem(item);
                      setReplenishQty(40);
                    }}
                    className="py-1 px-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 text-xs font-bold"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. FORMULÁRIO DE TROCA RÁPIDA (quando aberto) */}
      {showQuickForm && (
        <div
          className={`p-5 rounded-3xl border shadow-lg space-y-4 animate-in slide-in-from-top-4 ${
            isNightMode ? 'bg-[#0e131d] border-sky-500/30 text-white' : 'bg-sky-50/50 border-sky-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <Package className="w-4 h-4" />
              Registrar Troca de Fralda
            </h3>
            <button
              type="button"
              onClick={() => setShowQuickForm(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
          </div>

          {/* Date & Time Selector */}
          <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>Data e Horário da Troca</span>
              </span>
              <button
                type="button"
                onClick={handleSetNow}
                className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
              >
                Agora
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className={`w-full p-2 rounded-xl text-xs border font-medium ${
                    isNightMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className={`w-full p-2 rounded-xl text-xs border font-medium ${
                    isNightMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Quick Time Adjusters */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
              <button
                type="button"
                onClick={handleSetYesterday}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                Ontem
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-15)}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                -15 min
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-30)}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                -30 min
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-60)}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                -1h
              </button>
            </div>
          </div>

          {/* Fralda Utilizada (Obrigatório / Visual com [ Alterar ]) */}
          <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-sky-500" />
                <span>FRALDA UTILIZADA</span>
              </span>
              <button
                type="button"
                onClick={() => setIsChangingDiaperModel(!isChangingDiaperModel)}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
              >
                {isChangingDiaperModel ? 'Fechar' : '[ Alterar ]'}
              </button>
            </div>

            {selectedStockItem && selectedStockItem.quantityCurrent > 0 ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {selectedStockItem.brand} {selectedStockItem.productLine ? `(${selectedStockItem.productLine})` : ''} — Tam {selectedStockItem.size}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Estoque atual: <strong className="text-sky-600 dark:text-sky-400 font-black">{selectedStockItem.quantityCurrent} un.</strong>
                    {selectedStockItem.isDefaultInUse && ' • (Em Uso)'}
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Baixar: -1 un
                </span>
              </div>
            ) : selectedStockItem && selectedStockItem.quantityCurrent <= 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-2 text-xs">
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  {selectedStockItem.brand} {selectedStockItem.productLine ? `— ${selectedStockItem.productLine}` : ''} Tam {selectedStockItem.size} está sem estoque.
                </div>
                <p className="text-amber-800 dark:text-amber-300">
                  Selecione outra fralda ou adicione estoque.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsChangingDiaperModel(true)}
                    className="py-1 px-2.5 rounded-lg bg-amber-600 text-white font-bold"
                  >
                    Selecionar outra
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplenishingItem(selectedStockItem);
                      setReplenishQty(40);
                    }}
                    className="py-1 px-2.5 rounded-lg border border-amber-300 text-amber-900 dark:text-amber-200 font-bold"
                  >
                    Adicionar estoque
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                Fralda avulsa (sem baixa automática)
              </div>
            )}

            {isChangingDiaperModel && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Selecione o modelo do estoque:
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {activeStockItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedStockItemId(item.id);
                        setIsChangingDiaperModel(false);
                      }}
                      className={`w-full p-2 rounded-xl text-left text-xs flex items-center justify-between border transition-all ${
                        selectedStockItemId === item.id
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 font-bold'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div>
                        <span>
                          {item.brand} {item.productLine ? `(${item.productLine})` : ''} — Tam {item.size}
                        </span>
                        {item.isDefaultInUse && (
                          <span className="ml-1 text-[10px] text-sky-500 font-black">[Em Uso]</span>
                        )}
                      </div>
                      <span className={`text-[11px] font-bold ${item.quantityCurrent <= 5 ? 'text-amber-500' : 'text-slate-500'}`}>
                        {item.quantityCurrent} un
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStockItemId('none');
                      setIsChangingDiaperModel(false);
                    }}
                    className={`w-full p-2 rounded-xl text-left text-xs border transition-all ${
                      selectedStockItemId === 'none'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Outra fralda (sem vínculo)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Type Checkboxes */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHasPee(!hasPee)}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                hasPee
                  ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold'
                  : isNightMode
                  ? 'border-slate-800 bg-slate-900 text-slate-400'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                  hasPee ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300'
                }`}
              >
                {hasPee && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <span className="text-xs">💧 Teve Xixi</span>
            </button>

            <button
              type="button"
              onClick={() => setHasPoop(!hasPoop)}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                hasPoop
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                  : isNightMode
                  ? 'border-slate-800 bg-slate-900 text-slate-400'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                  hasPoop ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'
                }`}
              >
                {hasPoop && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <span className="text-xs">💩 Teve Cocô</span>
            </button>
          </div>

          {/* Pee Details */}
          {hasPee && (
            <div className="p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/50 dark:border-sky-900/30 space-y-2">
              <label className="text-xs font-bold text-sky-800 dark:text-sky-300 block">Quantidade de Xixi:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['pouco', 'normal', 'muito'] as DiaperPeeAmount[]).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPeeAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      peeAmount === amt
                        ? 'border-sky-500 bg-sky-500 text-white'
                        : isNightMode
                        ? 'bg-slate-900 border-slate-800 text-slate-400'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Poop Details */}
          {hasPoop && (
            <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 space-y-3">
              <div>
                <label className="text-xs font-bold text-amber-800 dark:text-amber-300 block mb-1">
                  Quantidade de Cocô:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pouco', 'normal', 'muito'] as DiaperPoopAmount[]).map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPoopAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                        poopAmount === amt
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : isNightMode
                          ? 'bg-slate-900 border-slate-800 text-slate-400'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-amber-800 dark:text-amber-300 block mb-1">Consistência:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['liquido', 'pastoso', 'normal', 'ressecado'] as DiaperPoopConsistency[]).map((cons) => (
                    <button
                      key={cons}
                      type="button"
                      onClick={() => setPoopConsistency(cons)}
                      className={`py-1.5 px-1 rounded-xl text-[11px] font-medium border text-center transition-all ${
                        poopConsistency === cons
                          ? 'border-amber-500 bg-amber-500 text-white font-bold'
                          : isNightMode
                          ? 'bg-slate-900 border-slate-800 text-slate-400'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {cons === 'liquido' && 'Líquido'}
                      {cons === 'pastoso' && 'Pastoso'}
                      {cons === 'normal' && 'Normal'}
                      {cons === 'ressecado' && 'Duro'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-amber-800 dark:text-amber-300 block mb-1">
                  Coloração das Fezes:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {colorsList.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setPoopColor(col.id)}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all ${
                        poopColor === col.id
                          ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10 font-bold'
                          : isNightMode
                          ? 'bg-slate-900 border-slate-800 text-slate-400'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0 border" style={{ backgroundColor: col.hex }} />
                      <span className="text-[10px] truncate">{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Observações (opcional):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pomada de barreira aplicada, sem assadura"
              className={`w-full p-2.5 rounded-xl text-xs border ${
                isNightMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <button
            type="button"
            onClick={handleSaveQuickDiaper}
            disabled={!hasPee && !hasPoop}
            className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-600/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            Salvar Troca de Fralda
          </button>
        </div>
      )}

      {/* 6. FILTER TABS */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'todos', label: 'Todas as Trocas' },
          { id: 'xixi', label: '💧 Apenas Xixi' },
          { id: 'coco', label: '💩 Apenas Cocô' },
          { id: 'ambos', label: '💧💩 Xixi + Cocô' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id as any)}
            className={`py-2 px-3.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
              filterType === tab.id
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : isNightMode
                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 7. HISTÓRICO DE TROCAS */}
      <div className="space-y-3">
        {filteredDiapers.length === 0 ? (
          <div
            className={`p-8 rounded-3xl text-center border ${
              isNightMode ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <span className="text-3xl block mb-2">🧷</span>
            <p className="text-xs font-semibold">
              {filterType === 'todos'
                ? 'Você ainda não possui trocas de fralda registradas.'
                : 'Nenhuma troca encontrada para este filtro.'}
            </p>
            <button
              type="button"
              onClick={() => openModal('diaperDetail')}
              className="mt-3 py-2 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Troca</span>
            </button>
          </div>
        ) : (
          filteredDiapers.map((diaper) => (
            <div
              key={diaper.id}
              className={`p-4 rounded-3xl border transition-all flex items-center justify-between ${
                isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 ${
                    diaper.hasPee && diaper.hasPoop
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                      : diaper.hasPoop
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
                      : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600'
                  }`}
                >
                  {diaper.hasPee && diaper.hasPoop ? '💧💩' : diaper.hasPoop ? '💩' : '💧'}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-sm font-bold">
                      {diaper.hasPee && diaper.hasPoop
                        ? 'Xixi & Cocô'
                        : diaper.hasPoop
                        ? 'Fralda com Cocô'
                        : 'Fralda com Xixi'}
                    </strong>

                    {diaper.peeAmount && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        Xixi: {diaper.peeAmount}
                      </span>
                    )}

                    {diaper.poopConsistency && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {diaper.poopConsistency}
                      </span>
                    )}

                    {(() => {
                      const stockItem = safeStockItems.find((i) => i && i.id === diaper.diaperStockItemId);
                      const brandName = diaper.diaperBrand || stockItem?.brand;
                      const sizeName = diaper.diaperSize || stockItem?.size;
                      if (!brandName) {
                        return (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            🧷 Fralda não informada
                          </span>
                        );
                      }
                      return (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          🧷 {brandName} {sizeName ? `Tam ${sizeName}` : ''}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="text-xs text-slate-400 mt-0.5">
                    {formatDateTime(diaper.timestamp)} • Cuidador: {diaper.caregiverName || 'Mãe'}
                    {diaper.poopColor && ` • Cor: ${diaper.poopColor}`}
                    {diaper.notes && ` • "${diaper.notes}"`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openModal('diaperDetail', { diaper })}
                  className="p-2 rounded-xl text-slate-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors"
                  title="Editar data/hora e detalhes da fralda"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteWithUndo(diaper)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Excluir fralda"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 8. MODAL: ADICIONAR FRALDAS */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border max-h-[90vh] overflow-y-auto ${
              isNightMode ? 'bg-[#131924] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base">Adicionar Fraldas ao Estoque</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddDiaper} className="space-y-4 pt-4">
              {/* Marca */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Marca *
                </label>
                <input
                  type="text"
                  required
                  value={addBrand}
                  onChange={(e) => setAddBrand(e.target.value)}
                  placeholder="Ex: Pampers, Huggies, MamyPoko..."
                  className={`w-full p-2.5 rounded-xl text-xs border font-medium outline-none ${
                    isNightMode
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                  }`}
                />
              </div>

              {/* Linha / Modelo */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Linha / Modelo (opcional)
                </label>
                <input
                  type="text"
                  value={addProductLine}
                  onChange={(e) => setAddProductLine(e.target.value)}
                  placeholder="Ex: Premium Care, Supreme Care, Confort Sec..."
                  className={`w-full p-2.5 rounded-xl text-xs border font-medium outline-none ${
                    isNightMode
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                  }`}
                />
              </div>

              {/* Tamanho */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tamanho *
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {sizePresets.map((preset) => (
                    <button
                      key={preset.size}
                      type="button"
                      onClick={() => handleSizeChange(preset.size)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        addSize === preset.size
                          ? 'border-sky-500 bg-sky-600 text-white'
                          : isNightMode
                          ? 'bg-slate-900 border-slate-800 text-slate-400'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {preset.size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Faixa de Peso Opcional */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Peso Mín (kg)
                  </label>
                  <input
                    type="text"
                    value={addWeightMinKg}
                    onChange={(e) => setAddWeightMinKg(e.target.value)}
                    placeholder="Ex: 3.5"
                    className={`w-full p-2.5 rounded-xl text-xs border font-medium outline-none ${
                      isNightMode
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Peso Máx (kg)
                  </label>
                  <input
                    type="text"
                    value={addWeightMaxKg}
                    onChange={(e) => setAddWeightMaxKg(e.target.value)}
                    placeholder="Ex: 6.0"
                    className={`w-full p-2.5 rounded-xl text-xs border font-medium outline-none ${
                      isNightMode
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  />
                </div>
              </div>

              {/* Quantidade Adicionada */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Quantidade Adicionada (unidades) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(parseInt(e.target.value, 10) || 0)}
                  className={`w-full p-2.5 rounded-xl text-sm font-black border outline-none ${
                    isNightMode
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                  }`}
                />
                <div className="flex gap-1.5 mt-1.5">
                  {[20, 40, 80, 120, 160].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAddQuantity(q)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                        addQuantity === q
                          ? 'bg-sky-500/20 border-sky-500 text-sky-600 dark:text-sky-400'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {q} un
                    </button>
                  ))}
                </div>
              </div>

              {/* Data da Compra / Entrada */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Data da Compra / Entrada
                </label>
                <input
                  type="date"
                  value={addPurchaseDate}
                  onChange={(e) => setAddPurchaseDate(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border font-medium outline-none ${
                    isNightMode
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                  }`}
                />
              </div>

              {/* Valor Opcional */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Valor Total Pago (R$ opcional)
                </label>
                <input
                  type="text"
                  value={addTotalCost}
                  onChange={(e) => setAddTotalCost(e.target.value)}
                  placeholder="Ex: 89,90"
                  className={`w-full p-2.5 rounded-xl text-xs border font-medium outline-none ${
                    isNightMode
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                  }`}
                />
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Observações (opcional)
                </label>
                <input
                  type="text"
                  value={addItemNotes}
                  onChange={(e) => setAddItemNotes(e.target.value)}
                  placeholder="Ex: Pacote promocional Farmácia X"
                  className={`w-full p-2.5 rounded-xl text-xs border font-medium outline-none ${
                    isNightMode
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                  }`}
                />
              </div>

              {/* DUPLICATE CHECK PROMPT */}
              {existingIdentical && (
                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-2">
                  <div className="text-xs font-bold text-sky-800 dark:text-sky-300">
                    Já existe este modelo em estoque ({existingIdentical.brand} {existingIdentical.productLine || ''} Tam {existingIdentical.size} com {existingIdentical.quantityCurrent} un.):
                  </div>
                  <div className="space-y-1 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dupRes"
                        checked={duplicateResolution === 'merge'}
                        onChange={() => setDuplicateResolution('merge')}
                        className="text-sky-600"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Adicionar ao estoque existente (+{addQuantity} un.)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dupRes"
                        checked={duplicateResolution === 'separate'}
                        onChange={() => setDuplicateResolution('separate')}
                        className="text-sky-600"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Cadastrar como nova entrada / lote separado
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border ${
                    isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20"
                >
                  Salvar Fraldas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: REABASTECER ITEM ESPECÍFICO */}
      {replenishingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border ${
              isNightMode ? 'bg-[#131924] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-sm">Adicionar Unidades</h3>
                <span className="text-xs text-slate-400">
                  {replenishingItem.brand} {replenishingItem.productLine || ''} Tam {replenishingItem.size}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplenishingItem(null)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Quantidade a adicionar:
                </label>
                <input
                  type="number"
                  min="1"
                  value={replenishQty}
                  onChange={(e) => setReplenishQty(parseInt(e.target.value, 10) || 0)}
                  className={`w-full p-2.5 rounded-xl text-base font-black border outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex gap-1.5">
                {[20, 40, 60, 80].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setReplenishQty(q)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-500 hover:text-white transition-colors"
                  >
                    +{q}
                  </button>
                ))}
              </div>

              <div className="pt-2 text-xs text-slate-400">
                Saldo atual: <strong className="text-sky-600">{replenishingItem.quantityCurrent} un.</strong> → Novo saldo:{' '}
                <strong className="text-emerald-600">{replenishingItem.quantityCurrent + replenishQty} un.</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReplenishingItem(null)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReplenish}
                className="flex-1 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
