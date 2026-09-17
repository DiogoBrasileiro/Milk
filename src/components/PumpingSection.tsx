import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../utils/formatters';
import { PumpingRecord, PumpingMethod, StorageLocationType } from '../types';
import {
  ArrowLeft,
  Droplet,
  Plus,
  Play,
  Clock,
  Calendar,
  Archive,
  CheckCircle2,
  Trash2,
  TrendingUp,
  BarChart3,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Tag,
  Edit2,
} from 'lucide-react';
import { CONTAINER_COLORS, CONTAINER_TAGS } from '../constants/containers';
import { EditPumpingModal } from './EditPumpingModal';

export const PumpingSection: React.FC = () => {
  const {
    pumpings,
    addPumping,
    deletePumping,
    openModal,
    isNightMode,
    triggerUndoToast,
    setActiveTab,
  } = useApp();

  // Selected pumping to edit
  const [selectedPumpingToEdit, setSelectedPumpingToEdit] = useState<PumpingRecord | null>(null);

  // Period Filter for Reports
  const [period, setPeriod] = useState<'24h' | '7d' | '30d' | 'tudo'>('7d');

  // Quick In-Page Logging State
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [pumpingDateTime, setPumpingDateTime] = useState<string>(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  );
  const [quickVolumeMl, setQuickVolumeMl] = useState<number>(80);
  const [useSeparateSides, setUseSeparateSides] = useState<boolean>(false);
  const [leftMl, setLeftMl] = useState<number>(40);
  const [rightMl, setRightMl] = useState<number>(40);
  const [quickStorage, setQuickStorage] = useState<StorageLocationType>('geladeira');
  const [quickMethod, setQuickMethod] = useState<PumpingMethod>('bomba_eletrica');
  const [quickNotes, setQuickNotes] = useState<string>('');

  // Potinho Identification
  const [containerNumber, setContainerNumber] = useState<string>('');
  const [containerName, setContainerName] = useState<string>('');
  const [containerColor, setContainerColor] = useState<string>('azul');
  const [containerTag, setContainerTag] = useState<string>('');

  // Handle Quick In-Page Form Submission
  const handleSaveQuickPumping = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickVolumeMl <= 0) return;

    const recordedTimestamp = new Date(pumpingDateTime).toISOString();
    const finalLeft = useSeparateSides ? leftMl : Math.round(quickVolumeMl / 2);
    const finalRight = useSeparateSides ? rightMl : quickVolumeMl - finalLeft;

    addPumping({
      timestamp: recordedTimestamp,
      durationMinutes: 15,
      method: quickMethod,
      leftVolumeMl: finalLeft,
      rightVolumeMl: finalRight,
      totalVolumeMl: quickVolumeMl,
      targetStorage: quickStorage,
      containerNumber: containerNumber.trim() || undefined,
      containerName: containerName.trim() || undefined,
      containerColor: containerColor || undefined,
      containerTag: containerTag || undefined,
      notes: quickNotes.trim() || undefined,
    });

    const potinhoLabel = containerNumber ? `Potinho #${containerNumber}` : (containerName || 'Estoque');

    triggerUndoToast(
      `🥛 ${quickVolumeMl}ml adicionados ao ${potinhoLabel} (${quickStorage}) com sucesso!`,
      () => {}
    );

    setShowQuickForm(false);
    setContainerNumber('');
    setContainerName('');
    setContainerTag('');
    setQuickNotes('');
  };

  const handleDeleteWithUndo = (pumping: PumpingRecord) => {
    deletePumping(pumping.id);
    triggerUndoToast('Registro de ordenha excluído', () => {
      addPumping({
        timestamp: pumping.timestamp,
        durationMinutes: pumping.durationMinutes,
        method: pumping.method,
        leftVolumeMl: pumping.leftVolumeMl,
        rightVolumeMl: pumping.rightVolumeMl,
        totalVolumeMl: pumping.totalVolumeMl,
        targetStorage: pumping.targetStorage,
        notes: pumping.notes,
      });
    });
  };

  // Filter pumpings based on selected period
  const cutoffTime = new Date();
  if (period === '24h') cutoffTime.setHours(cutoffTime.getHours() - 24);
  if (period === '7d') cutoffTime.setDate(cutoffTime.getDate() - 7);
  if (period === '30d') cutoffTime.setDate(cutoffTime.getDate() - 30);

  const filteredPumpings =
    period === 'tudo'
      ? pumpings
      : pumpings.filter((p) => new Date(p.timestamp) >= cutoffTime);

  // Metrics calculation
  const totalVolume = filteredPumpings.reduce((acc, p) => acc + (p.totalVolumeMl || 0), 0);
  const totalLeft = filteredPumpings.reduce((acc, p) => acc + (p.leftVolumeMl || 0), 0);
  const totalRight = filteredPumpings.reduce((acc, p) => acc + (p.rightVolumeMl || 0), 0);
  const sessionsCount = filteredPumpings.length;
  const avgPerSession = sessionsCount > 0 ? Math.round(totalVolume / sessionsCount) : 0;
  const avgLeftPerSession = sessionsCount > 0 ? Math.round(totalLeft / sessionsCount) : 0;
  const avgRightPerSession = sessionsCount > 0 ? Math.round(totalRight / sessionsCount) : 0;

  const leftPercent = totalVolume > 0 ? Math.round((totalLeft / totalVolume) * 100) : 50;
  const rightPercent = totalVolume > 0 ? Math.round((totalRight / totalVolume) * 100) : 50;

  // Productivity by Time of Day (Turnos)
  const shiftStats = {
    madrugada: { label: 'Madrugada (00h-06h)', icon: Moon, volume: 0, count: 0, color: 'text-indigo-400' },
    manha: { label: 'Manhã (06h-12h)', icon: Sunrise, volume: 0, count: 0, color: 'text-amber-400' },
    tarde: { label: 'Tarde (12h-18h)', icon: Sun, volume: 0, count: 0, color: 'text-orange-400' },
    noite: { label: 'Noite (18h-00h)', icon: Sunset, volume: 0, count: 0, color: 'text-purple-400' },
  };

  filteredPumpings.forEach((p) => {
    const hour = new Date(p.timestamp).getHours();
    if (hour >= 0 && hour < 6) {
      shiftStats.madrugada.volume += p.totalVolumeMl;
      shiftStats.madrugada.count += 1;
    } else if (hour >= 6 && hour < 12) {
      shiftStats.manha.volume += p.totalVolumeMl;
      shiftStats.manha.count += 1;
    } else if (hour >= 12 && hour < 18) {
      shiftStats.tarde.volume += p.totalVolumeMl;
      shiftStats.tarde.count += 1;
    } else {
      shiftStats.noite.volume += p.totalVolumeMl;
      shiftStats.noite.count += 1;
    }
  });

  // Find most productive shift
  let bestShift = 'manha';
  let maxVolume = -1;
  (Object.keys(shiftStats) as Array<keyof typeof shiftStats>).forEach((key) => {
    if (shiftStats[key].volume > maxVolume) {
      maxVolume = shiftStats[key].volume;
      bestShift = key;
    }
  });

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto px-4 pt-4 animate-in fade-in">
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

      {/* Top Banner */}
      <div
        className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900'
        }`}
      >
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
            Controle de Ordenha & Estoque
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-0.5">Produção de Leite & Estoque</h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre o volume retirado com dia e hora para alimentar o estoque automaticamente e gerar relatórios de produtividade.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuickForm(!showQuickForm)}
            className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            {showQuickForm ? 'Fechar Cadastro' : 'Registrar Volume'}
          </button>

          <button
            type="button"
            onClick={() => openModal('pumpingSession')}
            className="py-3 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all shrink-0"
            title="Abrir com cronômetro ou opções avançadas"
          >
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="hidden sm:inline">Modo Completo</span>
          </button>
        </div>
      </div>

      {/* Quick In-Page Volume Registration Form */}
      {showQuickForm && (
        <form
          onSubmit={handleSaveQuickPumping}
          className={`p-6 rounded-3xl border shadow-xl space-y-4 animate-in slide-in-from-top-4 ${
            isNightMode ? 'bg-[#0e131d] border-blue-500/30 text-white' : 'bg-blue-50/50 border-blue-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between border-b border-blue-200/50 dark:border-slate-800 pb-3">
            <h3 className="font-black text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Droplet className="w-4 h-4" />
              Cadastro Rápido de Volume Retirado (Entrada no Estoque)
            </h3>
            <button
              type="button"
              onClick={() => setShowQuickForm(false)}
              className="text-xs text-slate-400 hover:text-slate-200 font-semibold"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dia e Hora */}
            <div>
              <label className="text-xs font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Dia e Hora da Retirada:
              </label>
              <input
                type="datetime-local"
                value={pumpingDateTime}
                onChange={(e) => setPumpingDateTime(e.target.value)}
                className={`w-full p-2.5 rounded-2xl text-xs font-bold border ${
                  isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
                required
              />
            </div>

            {/* Destino no Estoque */}
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Destino do Armazenamento (Estoque):
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'geladeira' as StorageLocationType, label: '❄️ Geladeira (12h)' },
                  { id: 'freezer' as StorageLocationType, label: '🧊 Freezer (15d)' },
                  { id: 'ambiente' as StorageLocationType, label: '🌡️ Ambiente (2h)' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setQuickStorage(s.id)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border text-center transition-all ${
                      quickStorage === s.id
                        ? isNightMode
                          ? 'bg-blue-600/20 border-blue-400 text-blue-300 ring-2 ring-blue-500/30'
                          : 'bg-blue-100 border-blue-600 text-blue-950 ring-2 ring-blue-500/20'
                        : isNightMode
                        ? 'bg-slate-900 border-slate-800 text-slate-400'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Volume Total Retirado */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-400">Volume Total Retirado:</label>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                {quickVolumeMl} ml
              </span>
            </div>

            {/* Quick volume buttons */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 mb-2">
              {[40, 60, 80, 100, 120, 140, 160, 180, 200, 250].map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => {
                    setQuickVolumeMl(ml);
                    if (useSeparateSides) {
                      setLeftMl(Math.round(ml / 2));
                      setRightMl(Math.round(ml / 2));
                    }
                  }}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    quickVolumeMl === ml
                      ? isNightMode
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-blue-600 text-white border-blue-600'
                      : isNightMode
                      ? 'bg-slate-900 border-slate-800 text-slate-400'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {ml}ml
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="5"
                max="800"
                step="5"
                value={quickVolumeMl}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value));
                  setQuickVolumeMl(val);
                  if (useSeparateSides) {
                    setLeftMl(Math.round(val / 2));
                    setRightMl(val - Math.round(val / 2));
                  }
                }}
                className={`w-full p-2.5 rounded-2xl text-sm font-black border text-center ${
                  isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
                placeholder="Ex: 80"
                required
              />
              <span className="text-xs font-bold text-slate-400">ml</span>
            </div>
          </div>

          {/* Optional Breast Split */}
          <div className="p-3 rounded-2xl border bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold block">Cadastrar quantidade por peito (Opcional)</span>
                <span className="text-[10px] text-slate-400">
                  Desmembra os ml da Mama Esquerda e Mama Direita
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextState = !useSeparateSides;
                  setUseSeparateSides(nextState);
                  if (nextState) {
                    setLeftMl(Math.round(quickVolumeMl / 2));
                    setRightMl(quickVolumeMl - Math.round(quickVolumeMl / 2));
                  }
                }}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  useSeparateSides ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {useSeparateSides && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in">
                <div>
                  <label className="text-[11px] font-bold text-indigo-500 block mb-1">
                    🤱 Mama Esquerda (ml):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={leftMl}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setLeftMl(val);
                      setQuickVolumeMl(val + rightMl);
                    }}
                    className={`w-full p-2 rounded-xl text-xs font-bold border text-center ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-cyan-500 block mb-1">
                    🤱 Mama Direita (ml):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={rightMl}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setRightMl(val);
                      setQuickVolumeMl(leftMl + val);
                    }}
                    className={`w-full p-2 rounded-xl text-xs font-bold border text-center ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Optional Potinho Classification */}
          <div className="p-3 rounded-2xl border bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                Identificação do Potinho / Frasco (Opcional)
              </span>
              <span className="text-[10px] text-slate-400">Classifique por cor, número ou nome</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Número do Potinho:</label>
                <input
                  type="text"
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value)}
                  placeholder="Ex: 01, 12, P-3"
                  className={`w-full p-2 rounded-xl text-xs font-bold border ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Nome / Rótulo:</label>
                <input
                  type="text"
                  value={containerName}
                  onChange={(e) => setContainerName(e.target.value)}
                  placeholder="Ex: Potinho Avent, Vidro Tampa Roxa"
                  className={`w-full p-2 rounded-xl text-xs font-bold border ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Classificação / Tag:</label>
                <select
                  value={containerTag}
                  onChange={(e) => setContainerTag(e.target.value)}
                  className={`w-full p-2 rounded-xl text-xs font-bold border ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="">Sem tag</option>
                  {CONTAINER_TAGS.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Container Color Picker */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5">Cor da Tampa / Rótulo:</label>
              <div className="flex flex-wrap gap-2">
                {CONTAINER_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setContainerColor(c.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                      containerColor === c.id
                        ? isNightMode
                          ? 'bg-slate-800 border-blue-400 text-white ring-2 ring-blue-500/30'
                          : 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                        : isNightMode
                        ? 'bg-slate-900 border-slate-800 text-slate-400'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${c.bgClass}`} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 active:scale-95"
          >
            <Archive className="w-4 h-4" />
            Salvar e Adicionar {quickVolumeMl}ml ao Estoque Automaticamente
          </button>
        </form>
      )}

      {/* RELATÓRIOS COMPLETOS DE CONTROLE DE ORDENHA */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h3 className="font-extrabold text-base">Relatório Completo de Produtividade de Ordenha</h3>
          </div>

          {/* Period selector */}
          <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
            {[
              { id: '24h', label: 'Hoje (24h)' },
              { id: '7d', label: '7 Dias' },
              { id: '30d', label: '30 Dias' },
              { id: 'tudo', label: 'Total Geral' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id as any)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  period === p.id
                    ? isNightMode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            className={`p-4 rounded-2xl border ${
              isNightMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <span className="text-xs font-semibold text-slate-400 block">Total Retirado</span>
            <strong className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {totalVolume} ml
            </strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">{sessionsCount} retiradas</span>
          </div>

          <div
            className={`p-4 rounded-2xl border ${
              isNightMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <span className="text-xs font-semibold text-slate-400 block">Média por Sessão</span>
            <strong className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {avgPerSession} ml
            </strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">Rendimento médio</span>
          </div>

          <div
            className={`p-4 rounded-2xl border ${
              isNightMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <span className="text-xs font-semibold text-indigo-500 block">Mama Esquerda</span>
            <strong className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {totalLeft} ml
            </strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {leftPercent}% do total • ~{avgLeftPerSession}ml/sessão
            </span>
          </div>

          <div
            className={`p-4 rounded-2xl border ${
              isNightMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <span className="text-xs font-semibold text-cyan-500 block">Mama Direita</span>
            <strong className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
              {totalRight} ml
            </strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {rightPercent}% do total • ~{avgRightPerSession}ml/sessão
            </span>
          </div>
        </div>

        {/* Visual Comparison: Left vs Right Breast Productivity */}
        <div
          className={`p-5 rounded-3xl border shadow-sm space-y-3 ${
            isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Distribuição e Simetria por Peito:
            </span>
            <span className="text-xs font-bold text-blue-500">
              {Math.abs(leftPercent - rightPercent) <= 10 ? '✨ Produção Simétrica e Equilibrada' : 'Mama dominante identificada'}
            </span>
          </div>

          {/* Double Progress Bar */}
          <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            <div
              style={{ width: `${leftPercent}%` }}
              className="bg-indigo-500 h-full transition-all flex items-center justify-center text-[10px] font-bold text-white"
            >
              {leftPercent > 15 ? `E: ${leftPercent}%` : ''}
            </div>
            <div
              style={{ width: `${rightPercent}%` }}
              className="bg-cyan-500 h-full transition-all flex items-center justify-center text-[10px] font-bold text-white"
            >
              {rightPercent > 15 ? `D: ${rightPercent}%` : ''}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />
              <span>Mama Esquerda: <strong>{totalLeft} ml</strong> ({leftPercent}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" />
              <span>Mama Direita: <strong>{totalRight} ml</strong> ({rightPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Productivity by Turno (Horários do Dia) */}
        <div
          className={`p-5 rounded-3xl border shadow-sm space-y-3 ${
            isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Produtividade por Horário / Turno de Extração:
            </span>
            <span className="text-xs font-bold text-amber-500">
              ⭐ Melhor rendimento: {shiftStats[bestShift as keyof typeof shiftStats]?.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {(Object.keys(shiftStats) as Array<keyof typeof shiftStats>).map((key) => {
              const item = shiftStats[key];
              const Icon = item.icon;
              const isBest = bestShift === key && item.volume > 0;

              return (
                <div
                  key={key}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    isBest
                      ? isNightMode
                        ? 'bg-amber-500/15 border-amber-500/30'
                        : 'bg-amber-50 border-amber-300'
                      : isNightMode
                      ? 'bg-slate-900/60 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-xs font-bold">{key.toUpperCase()}</span>
                  </div>
                  <strong className="text-lg font-black text-slate-800 dark:text-white block">
                    {item.volume} ml
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {item.count} extrações {isBest ? '• ⭐ Campeão' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* History List */}
      <div
        className={`p-6 rounded-3xl border shadow-sm transition-colors ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">Histórico Detalhado de Retiradas</h3>
          <span className="text-xs text-slate-400">{filteredPumpings.length} registros</span>
        </div>

        {filteredPumpings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma ordenha registrada neste período. Use o botão acima para cadastrar a retirada.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPumpings.map((pumping) => (
              <div
                key={pumping.id}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
                  isNightMode ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200/70'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl shrink-0">
                    🥛
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-base font-black">{pumping.totalVolumeMl} ml retirados</strong>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 capitalize">
                        {pumping.targetStorage}
                      </span>
                      {pumping.containerNumber && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          #{pumping.containerNumber}
                        </span>
                      )}
                      {pumping.containerName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                          {pumping.containerName}
                        </span>
                      )}
                      {pumping.containerTag && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                          {pumping.containerTag}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatDateTime(pumping.timestamp)} • {pumping.method.replace('_', ' ')}
                      {pumping.notes && ` • "${pumping.notes}"`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                      {pumping.leftVolumeMl}ml E / {pumping.rightVolumeMl}ml D
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Cuidador: {pumping.caregiverName || 'Mãe'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPumpingToEdit(pumping)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                    title="Editar registro de ordenha"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteWithUndo(pumping)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Excluir ordenha"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Pumping Modal */}
      {selectedPumpingToEdit && (
        <EditPumpingModal
          pumping={selectedPumpingToEdit}
          onClose={() => setSelectedPumpingToEdit(null)}
        />
      )}
    </div>
  );
};
