import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MilkBatch, StorageLocationType } from '../types';
import { formatDateTime, formatTimeRemaining, getDetailedExpiryCountdown } from '../utils/formatters';
import {
  ArrowLeft,
  Archive,
  ArrowRightLeft,
  Snowflake,
  Flame,
  Trash2,
  QrCode,
  Plus,
  Clock,
  MapPin,
  AlertTriangle,
  Scissors,
  CheckCircle2,
  ChevronDown,
  X,
  Tag,
  Search,
  Edit2,
  BookOpen,
  Hourglass,
  Sparkles,
} from 'lucide-react';
import { CONSERVATION_PROTOCOLS } from '../constants/medicalProtocols';
import { CONTAINER_COLORS } from '../constants/containers';
import { EditMilkBatchModal } from './EditMilkBatchModal';
import { AddMilkBatchModal } from './AddMilkBatchModal';
import { MilkShelfLifeReferenceModal } from './MilkShelfLifeReferenceModal';

export const InventorySection: React.FC = () => {
  const {
    batches,
    inventorySummary,
    moveBatch,
    portionBatch,
    discardBatch,
    openModal,
    protocolId,
    isNightMode,
    setActiveTab,
  } = useApp();

  // Live timer tick to update second-by-second countdown
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [filterLocation, setFilterLocation] = useState<'todos' | 'geladeira' | 'freezer' | 'descongelando' | 'vencendo'>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBatchForAction, setSelectedBatchForAction] = useState<MilkBatch | null>(null);
  const [actionType, setActionType] = useState<'move' | 'portion' | 'discard' | null>(null);
  const [portionVolume, setPortionVolume] = useState<number>(30);
  const [targetLocation, setTargetLocation] = useState<StorageLocationType>('geladeira');
  const [discardReason, setDiscardReason] = useState<string>('Passou do prazo de validade');

  const [selectedBatchToEdit, setSelectedBatchToEdit] = useState<MilkBatch | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState<boolean>(false);

  const currentProtocol = CONSERVATION_PROTOCOLS[protocolId] || CONSERVATION_PROTOCOLS.brasil_ms;

  const filteredBatches = batches.filter((b) => {
    if (b.currentVolumeMl <= 0 || b.status === 'consumido' || b.status === 'descartado') return false;

    if (filterLocation === 'geladeira' && b.location !== 'geladeira') return false;
    if (filterLocation === 'freezer' && b.location !== 'freezer') return false;
    if (filterLocation === 'descongelando' && b.location !== 'descongelando' && b.location !== 'descongelado') return false;
    if (filterLocation === 'vencendo') {
      const remaining = getDetailedExpiryCountdown(b.expiresAt, b.extractedAt, nowTimestamp);
      if (!(remaining.urgency === 'critico' || remaining.urgency === 'atencao' || remaining.isExpired)) {
        return false;
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNumber = b.containerNumber?.toLowerCase().includes(term);
      const matchName = b.containerName?.toLowerCase().includes(term);
      const matchColor = b.containerColor?.toLowerCase().includes(term);
      const matchTag = b.containerTag?.toLowerCase().includes(term);
      const matchId = b.id.toLowerCase().includes(term);
      if (!matchNumber && !matchName && !matchColor && !matchTag && !matchId) {
        return false;
      }
    }

    return true;
  });

  const handleExecuteAction = () => {
    if (!selectedBatchForAction) return;

    if (actionType === 'move') {
      moveBatch(selectedBatchForAction.id, targetLocation);
    } else if (actionType === 'portion') {
      portionBatch(selectedBatchForAction.id, portionVolume, targetLocation);
    } else if (actionType === 'discard') {
      discardBatch(selectedBatchForAction.id, discardReason);
    }

    setSelectedBatchForAction(null);
    setActionType(null);
  };

  return (
    <div className="space-y-5 pb-20 max-w-5xl mx-auto px-4 pt-4 animate-in fade-in">
      {/* Breadcrumb Back */}
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
      </div>

      {/* Top Banner: Total Volume & Breakdown */}
      <div
        className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Estoque Inteligente FEFO
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              {currentProtocol.name.split('—')[0]}
            </span>
            <button
              type="button"
              onClick={() => setIsReferenceModalOpen(true)}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 ml-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ver Regras de Validade</span>
            </button>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-black text-blue-600 dark:text-amber-400">
              {inventorySummary.totalMl}
            </span>
            <span className="text-xl font-bold text-slate-500">ml armazenados</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Equivalente a aprox. <strong>{(inventorySummary.totalMl / 350).toFixed(1)} dias</strong> de consumo registrado
          </p>
        </div>

        {/* Breakdown chips */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className={`p-3 rounded-2xl border text-center ${isNightMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] font-semibold text-slate-400 block">❄️ Geladeira</span>
            <strong className="text-base font-black text-blue-600 dark:text-blue-400">{inventorySummary.fridgeMl} ml</strong>
            <span className="text-[9px] text-slate-400 block mt-0.5">{protocolId === 'brasil_ms' ? '12h máx' : '4d máx'}</span>
          </div>
          <div className={`p-3 rounded-2xl border text-center ${isNightMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] font-semibold text-slate-400 block">🧊 Freezer</span>
            <strong className="text-base font-black text-cyan-600 dark:text-cyan-400">{inventorySummary.freezerMl} ml</strong>
            <span className="text-[9px] text-slate-400 block mt-0.5">{protocolId === 'brasil_ms' ? '15d máx' : '6m máx'}</span>
          </div>
          <div className={`p-3 rounded-2xl border text-center ${isNightMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] font-semibold text-slate-400 block">⚡ Pronto</span>
            <strong className="text-base font-black text-emerald-600 dark:text-emerald-400">{inventorySummary.readyToUseMl} ml</strong>
            <span className="text-[9px] text-slate-400 block mt-0.5">Uso imediato</span>
          </div>
        </div>
      </div>

      {/* Recommended FEFO "USAR PRIMEIRO" Section with Live Countdown Timer */}
      {inventorySummary.recommendedBatch && (() => {
        const fefoCountdown = getDetailedExpiryCountdown(
          inventorySummary.recommendedBatch.expiresAt,
          inventorySummary.recommendedBatch.extractedAt,
          nowTimestamp
        );

        return (
          <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>USAR PRIMEIRO (RECOMENDAÇÃO FEFO)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fefoCountdown.statusBadgeBg} ${fefoCountdown.statusBadgeColor} border ${fefoCountdown.statusBorderColor}`}>
                  {fefoCountdown.statusText}
                </span>
                <span className="text-[10px] font-mono text-slate-400">First Expire, First Out</span>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-amber-500/20 backdrop-blur-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg">
                      #{inventorySummary.recommendedBatch.containerNumber ? `Potinho ${inventorySummary.recommendedBatch.containerNumber}` : inventorySummary.recommendedBatch.id}
                    </span>
                    <strong className="text-xl font-black text-slate-900 dark:text-white">
                      {inventorySummary.recommendedBatch.currentVolumeMl} ml
                    </strong>
                    <span className="text-xs text-slate-500 capitalize font-semibold">
                      • {inventorySummary.recommendedBatch.location} ({inventorySummary.recommendedBatch.location === 'geladeira' ? (protocolId === 'brasil_ms' ? '12h' : '4 dias') : (protocolId === 'brasil_ms' ? '15 dias' : '6 meses')})
                    </span>
                  </div>

                  {/* Live countdown ticker */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 font-mono font-black text-sm sm:text-base text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-xl border border-rose-500/20 shadow-xs">
                      <Hourglass className="w-4 h-4 animate-spin shrink-0" style={{ animationDuration: '3s' }} />
                      <span>{fefoCountdown.formattedCountdown}</span>
                    </div>
                    <span className="text-xs text-slate-400">tempo restante para consumo seguro</span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-1">
                    Ordenhado em: {formatDateTime(inventorySummary.recommendedBatch.extractedAt)} • Vence em: {formatDateTime(inventorySummary.recommendedBatch.expiresAt)}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => setSelectedBatchToEdit(inventorySummary.recommendedBatch!)}
                    className="py-2 px-3 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="Editar Frasco"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => openModal('bottleLabel', { batch: inventorySummary.recommendedBatch })}
                    className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Etiqueta QR
                  </button>
                  <button
                    onClick={() => openModal('feedingDetail')}
                    className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md active:scale-95"
                  >
                    Oferecer na Mamada
                  </button>
                </div>
              </div>

              {/* Visual Shelf Life Progress Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Vida útil restante: <strong>{fefoCountdown.progressPercent}%</strong></span>
                  <span>Limite do protocolo: <strong>{inventorySummary.recommendedBatch.location === 'geladeira' ? (protocolId === 'brasil_ms' ? '12 horas' : '4 dias') : (protocolId === 'brasil_ms' ? '15 dias' : '6 meses')}</strong></span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      fefoCountdown.urgency === 'critico' || fefoCountdown.isExpired
                        ? 'bg-rose-500'
                        : fefoCountdown.urgency === 'atencao'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${fefoCountdown.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Search & Filter Bar & Reference Quick Button */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search by container */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nº potinho, cor, nome ou tag..."
            className={`w-full pl-9 pr-8 py-2 rounded-2xl text-xs font-semibold border ${
              isNightMode
                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setIsReferenceModalOpen(true)}
            className="py-2.5 px-3 rounded-2xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
            title="Ver referências médicas de validade (Geladeira e Freezer)"
          >
            <BookOpen className="w-4 h-4" />
            <span>Guia de Validade</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="py-2.5 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
            title="Adicionar frasco/lote manualmente ao estoque"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Incluir Frasco
          </button>
          <button
            onClick={() => openModal('pumpingSession')}
            className="py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Nova Ordenha
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto py-1">
        {[
          { id: 'todos', label: `Todos (${batches.filter((b) => b.currentVolumeMl > 0).length})` },
          { id: 'geladeira', label: 'Geladeira' },
          { id: 'freezer', label: 'Freezer' },
          { id: 'descongelando', label: 'Descongelando' },
          { id: 'vencendo', label: '⚠️ Próximos de Vencer' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterLocation(tab.id as any)}
            className={`py-2 px-3.5 rounded-2xl text-xs font-semibold transition-all shrink-0 ${
              filterLocation === tab.id
                ? isNightMode
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-blue-600 text-white shadow-sm'
                : isNightMode
                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Batch Cards Grid */}
      {filteredBatches.length === 0 ? (
        <div className="py-12 text-center border rounded-3xl border-dashed border-slate-300 dark:border-slate-800">
          <Archive className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhum frasco nesta categoria</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm
              ? `Nenhum potinho corresponde à busca "${searchTerm}".`
              : 'Realize uma nova ordenha para alimentar o estoque inteligente.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {filteredBatches.map((batch) => {
            const expCountdown = getDetailedExpiryCountdown(batch.expiresAt, batch.extractedAt, nowTimestamp);
            const isFefoWinner = inventorySummary.recommendedBatch?.id === batch.id;
            const colorConfig = CONTAINER_COLORS.find((c) => c.id === batch.containerColor) || CONTAINER_COLORS[0];

            return (
              <div
                key={batch.id}
                className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                  isFefoWinner
                    ? isNightMode
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-sm ring-1 ring-amber-500/30'
                      : 'bg-amber-50/50 border-amber-300 shadow-sm ring-1 ring-amber-300'
                    : isNightMode
                    ? 'bg-[#0f141c] border-slate-800 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div>
                  {/* Top card bar with Container ID & Color */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-xs border border-white/40 ring-1 ring-black/10"
                        style={{ backgroundColor: colorConfig.hex }}
                        title={`Tampa/Rótulo: ${colorConfig.name} (${colorConfig.hex})`}
                      />
                      <span className="font-mono font-black text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-lg text-slate-900 dark:text-slate-100">
                        {batch.containerNumber ? `Frasco #${batch.containerNumber}` : `Frasco #${batch.id}`}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        batch.location === 'geladeira'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : batch.location === 'freezer'
                          ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}
                    >
                      {batch.location.toUpperCase()}
                    </span>
                  </div>

                  {/* Explicit Custom Pot Name and Tag */}
                  <div className="flex flex-col gap-1 mt-2">
                    {batch.containerName && (
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <span className="text-[11px] text-slate-500 font-bold">Pote:</span>
                        <span className="truncate">{batch.containerName}</span>
                      </div>
                    )}
                    {batch.containerTag && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className="text-[11px] font-black px-2 py-0.5 rounded-lg border inline-flex items-center gap-1"
                          style={{
                            backgroundColor: `${colorConfig.hex}18`,
                            borderColor: `${colorConfig.hex}40`,
                            color: colorConfig.hex,
                          }}
                        >
                          <Tag className="w-3 h-3" />
                          <span>{batch.containerTag}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Volume display with direct edit trigger */}
                  <div className="mt-3">
                    <div
                      onClick={() => setSelectedBatchToEdit(batch)}
                      className="group inline-flex items-baseline gap-2 cursor-pointer p-1 -ml-1 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all"
                      title="Clique para editar a quantidade (ml) deste frasquinho"
                    >
                      <div className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 font-mono transition-colors">
                        {batch.currentVolumeMl} <span className="text-base font-semibold text-slate-400">ml</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-900/40 px-2 py-0.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Edit2 className="w-2.5 h-2.5" />
                        <span>Editar ml</span>
                      </div>
                    </div>
                    {batch.subLocation && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{batch.subLocation}</span>
                      </div>
                    )}
                  </div>

                  {/* Real-Time Countdown Timer Ticker */}
                  <div
                    className={`mt-3 p-2.5 rounded-2xl text-xs space-y-1.5 border transition-all ${
                      expCountdown.urgency === 'critico' || expCountdown.isExpired
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border-rose-500/30'
                        : expCountdown.urgency === 'atencao'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold border-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Hourglass className={`w-3.5 h-3.5 shrink-0 ${expCountdown.urgency === 'critico' ? 'animate-spin' : ''}`} />
                        <span className="font-mono font-black text-xs tracking-tight">
                          {expCountdown.formattedCountdown}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-black/5 dark:bg-white/10">
                        {expCountdown.statusText}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          expCountdown.urgency === 'critico' || expCountdown.isExpired
                            ? 'bg-rose-500'
                            : expCountdown.urgency === 'atencao'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${expCountdown.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Coleta: {formatDateTime(batch.extractedAt)}</span>
                    <span className="font-mono text-slate-500">Vence: {formatDateTime(batch.expiresAt)}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedBatchToEdit(batch)}
                      title="Editar Frasco / Lote"
                      className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openModal('bottleLabel', { batch })}
                      title="Ver Etiqueta com QR Code"
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedBatchForAction(batch);
                        setActionType('move');
                        setTargetLocation(batch.location === 'geladeira' ? 'freezer' : 'geladeira');
                      }}
                      title="Mover / Descongelar"
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedBatchForAction(batch);
                        setActionType('portion');
                        setPortionVolume(Math.min(30, batch.currentVolumeMl));
                      }}
                      title="Dividir / Porcionar Lote"
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <Scissors className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedBatchForAction(batch);
                        setActionType('discard');
                      }}
                      title="Descartar"
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Action Dialog Modal (Move, Portion, Discard) */}
      {selectedBatchForAction && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-6 shadow-2xl border ${
              isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base">
                {actionType === 'move'
                  ? `Mover Lote #${selectedBatchForAction.id}`
                  : actionType === 'portion'
                  ? `Porcionar Lote #${selectedBatchForAction.id}`
                  : `Descartar Lote #${selectedBatchForAction.id}`}
              </h3>
              <button
                onClick={() => {
                  setSelectedBatchForAction(null);
                  setActionType(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {actionType === 'move' && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                    Novo local de armazenamento:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'geladeira', label: '❄️ Geladeira' },
                      { id: 'freezer', label: '🧊 Freezer' },
                      { id: 'descongelando', label: '💧 Descongelar' },
                    ].map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => setTargetLocation(loc.id as any)}
                        className={`p-3 rounded-2xl border text-xs font-bold text-center ${
                          targetLocation === loc.id
                            ? isNightMode
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                              : 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {actionType === 'portion' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Volume a separar (ml):
                    </label>
                    <input
                      type="number"
                      max={selectedBatchForAction.currentVolumeMl}
                      min={5}
                      value={portionVolume}
                      onChange={(e) => setPortionVolume(parseInt(e.target.value) || 0)}
                      className={`w-full p-2.5 rounded-xl text-lg font-bold border ${
                        isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
                      }`}
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Saldo restante no lote original: {selectedBatchForAction.currentVolumeMl - portionVolume} ml
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Destino da nova porção:
                    </label>
                    <select
                      value={targetLocation}
                      onChange={(e) => setTargetLocation(e.target.value as any)}
                      className={`w-full p-2.5 rounded-xl text-xs border ${
                        isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
                      }`}
                    >
                      <option value="geladeira">❄️ Geladeira</option>
                      <option value="ambiente">🍼 Mamadeira / Uso Imediato</option>
                      <option value="freezer">🧊 Freezer</option>
                    </select>
                  </div>
                </div>
              )}

              {actionType === 'discard' && (
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Confirmar descarte de {selectedBatchForAction.currentVolumeMl} ml</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      O leite será removido do <strong>estoque ativo</strong>, mas o <strong>registro da ordenha original continuará salvo</strong> para todos os relatórios e gráficos.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Motivo do descarte:</label>
                    <select
                      value={discardReason}
                      onChange={(e) => setDiscardReason(e.target.value)}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                        isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="Passou do prazo de validade (12h geladeira / 15d freezer)">Passou do prazo de validade (12h geladeira / 15d freezer)</option>
                      <option value="Sobra de mamadeira após 1h de oferta">Sobra de mamadeira após 1h de oferta</option>
                      <option value="Falha de refrigeração ou oscilação térmica">Falha de refrigeração ou oscilação térmica</option>
                      <option value="Cheiro, coloração ou alteração perceptível">Cheiro, coloração ou alteração perceptível</option>
                      <option value="Descarte voluntário / outro">Descarte voluntário / outro</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedBatchForAction(null);
                  setActionType(null);
                }}
                className={`flex-1 py-3 rounded-2xl font-bold text-xs border ${
                  isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteAction}
                className={`flex-2 py-3 rounded-2xl font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-md active:scale-98 ${
                  actionType === 'discard' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Operação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Milk Batch Modal */}
      {selectedBatchToEdit && (
        <EditMilkBatchModal
          batch={selectedBatchToEdit}
          onClose={() => setSelectedBatchToEdit(null)}
        />
      )}

      {/* Add Milk Batch Modal */}
      {isAddModalOpen && (
        <AddMilkBatchModal
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {/* Medical Shelf Life Reference Modal */}
      {isReferenceModalOpen && (
        <MilkShelfLifeReferenceModal
          onClose={() => setIsReferenceModalOpen(false)}
        />
      )}
    </div>
  );
};
