import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateBabyAge, formatDateTime } from '../utils/formatters';
import { ArrowLeft, Scale, TrendingUp, Plus, Trash2, Edit2, X, Calendar, Ruler, Clock } from 'lucide-react';
import { WHO_BOYS_WEIGHT, WHO_GIRLS_WEIGHT } from '../constants/whoGrowthData';
import { WeightRecord } from '../types';

export const GrowthSection: React.FC = () => {
  const { baby, weights, addWeight, updateWeight, deleteWeight, isNightMode, setActiveTab } = useApp();

  const getLocalDateTimeString = (dateObj: Date = new Date()) => {
    const d = new Date(dateObj);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [inputWeightGrams, setInputWeightGrams] = useState<number>(baby.currentWeight || 3250);
  const [inputLengthCm, setInputLengthCm] = useState<number>(baby.currentLength || 50);
  const [inputHeadCm, setInputHeadCm] = useState<number>(baby.headCircumference || 35);
  const [inputTimestamp, setInputTimestamp] = useState<string>(() => getLocalDateTimeString());
  const [inputNotes, setInputNotes] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingWeight, setEditingWeight] = useState<WeightRecord | null>(null);
  const [editTimestamp, setEditTimestamp] = useState<string>('');

  const age = calculateBabyAge(baby.birthDate);
  const whoTable = baby.gender === 'feminino' ? WHO_GIRLS_WEIGHT : WHO_BOYS_WEIGHT;

  const getLogTimestamp = (log: any): number => {
    if (!log) return 0;
    const t = new Date(log.timestamp || log.createdAt || log.date || 0).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Sorted logs
  const sortedLogsAsc = useMemo(
    () => [...weights].sort((a, b) => getLogTimestamp(a) - getLogTimestamp(b)),
    [weights]
  );
  const sortedLogsDesc = useMemo(
    () => [...weights].sort((a, b) => getLogTimestamp(b) - getLogTimestamp(a)),
    [weights]
  );

  const latestWeightLog = sortedLogsDesc.find((w) => typeof w.weightGrams === 'number' && w.weightGrams > 0);
  const currentWeightGrams = latestWeightLog?.weightGrams ?? baby.currentWeight;

  const latestLengthLog = sortedLogsDesc.find((w) => typeof w.lengthCm === 'number' && w.lengthCm > 0);
  const currentLengthCm = latestLengthLog?.lengthCm ?? baby.currentLength ?? baby.birthLength ?? 49;

  const latestHeadLog = sortedLogsDesc.find((w) => typeof w.headCircumferenceCm === 'number' && w.headCircumferenceCm > 0);
  const currentHeadCm = latestHeadLog?.headCircumferenceCm ?? baby.headCircumference;

  const firstLog = sortedLogsAsc[0];
  const lastLog = sortedLogsAsc[sortedLogsAsc.length - 1];

  let dailyGainGrams = 0;
  if (firstLog && lastLog && firstLog !== lastLog) {
    const daysDiff = Math.max(1, (getLogTimestamp(lastLog) - getLogTimestamp(firstLog)) / (1000 * 3600 * 24));
    const gramsDiff = lastLog.weightGrams - firstLog.weightGrams;
    dailyGainGrams = Math.round(gramsDiff / daysDiff);
  } else if (age.totalDays > 0) {
    dailyGainGrams = Math.round((currentWeightGrams - baby.birthWeight) / age.totalDays);
  }

  const weightDeltaGrams = currentWeightGrams - baby.birthWeight;
  const lengthDeltaCm = currentLengthCm - (baby.birthLength || 49);

  const handleOpenAddForm = () => {
    setInputTimestamp(getLocalDateTimeString());
    setShowAddForm(true);
  };

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    addWeight({
      timestamp: inputTimestamp ? new Date(inputTimestamp).toISOString() : new Date().toISOString(),
      weightGrams: inputWeightGrams,
      lengthCm: inputLengthCm || undefined,
      headCircumferenceCm: inputHeadCm || undefined,
      notes: inputNotes.trim() || undefined,
    });
    setInputNotes('');
    setShowAddForm(false);
  };

  const handleOpenEdit = (log: WeightRecord) => {
    setEditingWeight(log);
    const d = new Date(log.timestamp);
    setEditTimestamp(getLocalDateTimeString(isNaN(d.getTime()) ? new Date() : d));
  };

  const handleUpdateWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWeight) return;
    updateWeight(editingWeight.id, {
      timestamp: editTimestamp ? new Date(editTimestamp).toISOString() : editingWeight.timestamp,
      weightGrams: editingWeight.weightGrams,
      lengthCm: editingWeight.lengthCm || undefined,
      headCircumferenceCm: editingWeight.headCircumferenceCm || undefined,
      notes: editingWeight.notes || undefined,
    });
    setEditingWeight(null);
  };

  const handleDeleteWeight = (id: string) => {
    if (window.confirm('Deseja realmente excluir este registro de pesagem?')) {
      deleteWeight(id);
    }
  };

  // Helper to set preset dates in add / edit forms
  const setPresetDate = (type: 'now' | 'yesterday_morning' | 'today_morning', isEdit: boolean = false) => {
    const d = new Date();
    if (type === 'today_morning') {
      d.setHours(8, 0, 0, 0);
    } else if (type === 'yesterday_morning') {
      d.setDate(d.getDate() - 1);
      d.setHours(8, 0, 0, 0);
    }
    const val = getLocalDateTimeString(d);
    if (isEdit) {
      setEditTimestamp(val);
    } else {
      setInputTimestamp(val);
    }
  };

  // Calculate age at specific record date
  const getAgeAtDate = (isoDate: string) => {
    if (!baby.birthDate) return '';
    const birth = new Date(baby.birthDate).getTime();
    const target = new Date(isoDate).getTime();
    if (isNaN(birth) || isNaN(target)) return '';
    const diffDays = Math.floor((target - birth) / (1000 * 3600 * 24));
    if (diffDays < 0) return 'Antes do nascimento';
    if (diffDays === 0) return 'No dia do nascimento';
    if (diffDays < 30) return `${diffDays} dias de vida`;
    const months = Math.floor(diffDays / 30.4375);
    const remDays = Math.floor(diffDays % 30.4375);
    return `${months}m ${remDays}d de vida`;
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

      {/* Top Banner: Weight Summary, Length Summary & WHO Target */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border shadow-sm transition-colors ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Evolução & Curva de Crescimento OMS
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              {baby.gender === 'feminino' ? 'Meninas (OMS)' : 'Meninos (OMS)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {latestWeightLog && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Último registro: {formatDateTime(latestWeightLog.timestamp)}</span>
              </span>
            )}
            <button
              onClick={handleOpenAddForm}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Pesagem / Medida</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4">
          {/* Card 1: Peso Atual */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isNightMode ? 'bg-slate-900/60 border-slate-800' : 'bg-emerald-50/40 border-emerald-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-500" />
                Peso Atual
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                {currentWeightGrams} g
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                {(currentWeightGrams / 1000).toFixed(3).replace('.', ',')}
              </span>
              <span className="text-lg font-bold text-slate-500">kg</span>
            </div>

            <div className="flex flex-col gap-0.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Ao nascer:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {(baby.birthWeight / 1000).toFixed(3).replace('.', ',')} kg
                </span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span>Evolução:</span>
                <span className={weightDeltaGrams >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}>
                  {weightDeltaGrams >= 0 ? `+${weightDeltaGrams} g` : `${weightDeltaGrams} g`}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Medida Atual (Estatura) */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isNightMode ? 'bg-slate-900/60 border-slate-800' : 'bg-blue-50/40 border-blue-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-blue-500" />
                Medida Atual (Comprimento)
              </span>
              {currentHeadCm && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  PC: {currentHeadCm} cm
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400">
                {currentLengthCm}
              </span>
              <span className="text-lg font-bold text-slate-500">cm</span>
            </div>

            <div className="flex flex-col gap-0.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Ao nascer:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {baby.birthLength || 49} cm
                </span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span>Crescimento:</span>
                <span className={lengthDeltaCm >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600'}>
                  {lengthDeltaCm >= 0 ? `+${lengthDeltaCm.toFixed(1).replace('.0', '')} cm` : `${lengthDeltaCm} cm`}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Ganho Diário & Meta */}
          <div
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              dailyGainGrams >= 20
                ? isNightMode
                  ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700'
                : isNightMode
                ? 'bg-amber-950/20 border-amber-900/40 text-amber-400'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Ganho Médio Diário
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10">
                Meta OMS 20-30g
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl sm:text-4xl font-black">
                {dailyGainGrams > 0 ? `+${dailyGainGrams}` : dailyGainGrams}
              </span>
              <span className="text-lg font-bold opacity-80">g/dia</span>
            </div>

            <div className="text-xs font-semibold mt-2 flex items-center gap-1.5">
              {dailyGainGrams >= 20 ? (
                <span className="text-emerald-600 dark:text-emerald-400">✅ Dentro da meta esperada (20-30g/dia)</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">⚠️ Abaixo da meta sugerida (20-30g/dia)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WHO Percentiles Table & Target Visualizer */}
      <div
        className={`p-6 rounded-3xl border shadow-sm transition-colors ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base">Tabela de Referência da OMS</h3>
            <p className="text-xs text-slate-400">Percentis P3, P15, P50 (Mediana), P85 e P97</p>
          </div>
          <button
            onClick={handleOpenAddForm}
            className="py-2 px-3.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Incluir Pesagem</span>
          </button>
        </div>

        {/* Quick Add Form */}
        {showAddForm && (
          <form onSubmit={handleSaveWeight} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-500" />
                Incluir Nova Pesagem / Medição
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick date presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Atalhos de data:</span>
              <button
                type="button"
                onClick={() => setPresetDate('now', false)}
                className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white transition-colors"
              >
                Agora
              </button>
              <button
                type="button"
                onClick={() => setPresetDate('today_morning', false)}
                className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white transition-colors"
              >
                Hoje 08:00
              </button>
              <button
                type="button"
                onClick={() => setPresetDate('yesterday_morning', false)}
                className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white transition-colors"
              >
                Ontem 08:00
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  Data e Hora:
                </label>
                <input
                  type="datetime-local"
                  value={inputTimestamp}
                  onChange={(e) => setInputTimestamp(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-emerald-400' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                  required
                />
                {inputTimestamp && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {getAgeAtDate(inputTimestamp)}
                  </span>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mb-1">
                  <Scale className="w-3.5 h-3.5 text-emerald-500" />
                  Peso (Gramas):
                </label>
                <input
                  type="number"
                  step="1"
                  value={inputWeightGrams}
                  onChange={(e) => setInputWeightGrams(parseInt(e.target.value) || 0)}
                  placeholder="Ex: 3450"
                  className={`w-full p-2.5 rounded-xl text-base font-black border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-emerald-400' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Comprimento (cm):</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputLengthCm}
                  onChange={(e) => setInputLengthCm(parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 50.5"
                  className={`w-full p-2.5 rounded-xl text-base font-black border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-emerald-400' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Perímetro Cefálico (cm):</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputHeadCm}
                  onChange={(e) => setInputHeadCm(parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 35.5"
                  className={`w-full p-2.5 rounded-xl text-base font-black border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-emerald-400' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Observações (opcional):</label>
              <input
                type="text"
                value={inputNotes}
                onChange={(e) => setInputNotes(e.target.value)}
                placeholder="Ex: Consulta com pediatra, pós-vacina, pesagem em casa..."
                className={`w-full p-2.5 rounded-xl text-xs border-2 outline-none ${
                  isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-emerald-400' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                }`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="py-2 px-3.5 rounded-xl text-xs font-bold border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="py-2 px-4 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              >
                Salvar Medição
              </button>
            </div>
          </form>
        )}

        {/* WHO Reference Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2.5 font-bold">Idade OMS</th>
                <th className="py-2.5 font-semibold">P3 (Mínimo)</th>
                <th className="py-2.5 font-semibold">P15</th>
                <th className="py-2.5 font-bold text-emerald-500">P50 (Mediana)</th>
                <th className="py-2.5 font-semibold">P85</th>
                <th className="py-2.5 font-semibold">P97 (Máximo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {whoTable.map((row) => {
                const isCurrentAgeMatch = Math.round(age.totalDays / 30) === row.ageMonths;
                return (
                  <tr
                    key={row.ageMonths}
                    className={`transition-colors ${
                      isCurrentAgeMatch
                        ? 'bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <td className="py-3 font-semibold flex items-center gap-1.5">
                      {isCurrentAgeMatch && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      {row.label}
                    </td>
                    <td className="py-3 text-slate-400">{(row.p3 / 1000).toFixed(2)} kg</td>
                    <td className="py-3 text-slate-400">{(row.p15 / 1000).toFixed(2)} kg</td>
                    <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {(row.p50 / 1000).toFixed(2)} kg
                    </td>
                    <td className="py-3 text-slate-400">{(row.p85 / 1000).toFixed(2)} kg</td>
                    <td className="py-3 text-slate-400">{(row.p97 / 1000).toFixed(2)} kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weight History List */}
      <div
        className={`p-6 rounded-3xl border shadow-sm transition-colors ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base">Histórico de Pesagens ({weights.length})</h3>
          <span className="text-xs text-slate-400">Ordenado por data (mais recentes primeiro)</span>
        </div>

        {weights.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Nenhuma pesagem registrada até o momento.</p>
        ) : (
          <div className="space-y-2">
            {sortedLogsDesc.map((log) => (
              <div
                key={log.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  isNightMode ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200/70'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-base font-black text-slate-900 dark:text-white">
                      {(log.weightGrams / 1000).toFixed(3).replace('.', ',')} kg
                    </strong>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {log.weightGrams} g
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatDateTime(log.timestamp)}
                    </span>
                    <span>•</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {getAgeAtDate(log.timestamp)}
                    </span>
                    {log.lengthCm && (
                      <>
                        <span>•</span>
                        <span>{log.lengthCm} cm</span>
                      </>
                    )}
                    {log.headCircumferenceCm && (
                      <>
                        <span>•</span>
                        <span>PC: {log.headCircumferenceCm} cm</span>
                      </>
                    )}
                  </div>
                  {log.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg inline-block">
                      {log.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(log)}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                    title="Editar data, peso ou medição"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWeight(log.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Excluir pesagem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Weight Modal */}
      {editingWeight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl transition-all ${
              isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-500" />
                Editar Registro de Pesagem
              </h3>
              <button
                type="button"
                onClick={() => setEditingWeight(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateWeight} className="space-y-4">
              {/* Date & Time Editing */}
              <div>
                <label className="text-xs font-bold block mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  Data e Hora do Registro:
                </label>
                <input
                  type="datetime-local"
                  value={editTimestamp}
                  onChange={(e) => setEditTimestamp(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border-2 outline-none ${
                    isNightMode
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-400'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                  required
                />
                {editTimestamp && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>Idade na data: <strong className="text-slate-700 dark:text-slate-200">{getAgeAtDate(editTimestamp)}</strong></span>
                    <button
                      type="button"
                      onClick={() => setPresetDate('now', true)}
                      className="text-blue-500 hover:underline font-semibold"
                    >
                      Usar agora
                    </button>
                  </div>
                )}
              </div>

              {/* Weight */}
              <div>
                <label className="text-xs font-bold block mb-1 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-emerald-500" />
                  Peso (Gramas):
                </label>
                <input
                  type="number"
                  value={editingWeight.weightGrams}
                  onChange={(e) =>
                    setEditingWeight({ ...editingWeight, weightGrams: parseInt(e.target.value) || 0 })
                  }
                  className={`w-full p-2.5 rounded-xl text-base font-black border-2 outline-none ${
                    isNightMode
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-400'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Equivale a {((editingWeight.weightGrams || 0) / 1000).toFixed(3).replace('.', ',')} kg
                </span>
              </div>

              {/* Length and Head */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Comprimento (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingWeight.lengthCm || ''}
                    onChange={(e) =>
                      setEditingWeight({
                        ...editingWeight,
                        lengthCm: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className={`w-full p-2.5 rounded-xl text-sm font-bold border-2 outline-none ${
                      isNightMode
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-400'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Perímetro Cefálico (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingWeight.headCircumferenceCm || ''}
                    onChange={(e) =>
                      setEditingWeight({
                        ...editingWeight,
                        headCircumferenceCm: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className={`w-full p-2.5 rounded-xl text-sm font-bold border-2 outline-none ${
                      isNightMode
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-400'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Observações (opcional):</label>
                <input
                  type="text"
                  value={editingWeight.notes || ''}
                  onChange={(e) => setEditingWeight({ ...editingWeight, notes: e.target.value })}
                  placeholder="Ex: Consulta 1 mês, balança da farmácia..."
                  className={`w-full p-2.5 rounded-xl text-sm border-2 outline-none ${
                    isNightMode
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-400'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingWeight(null)}
                  className="py-2 px-4 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
