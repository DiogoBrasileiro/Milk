import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SleepRecord, SleepType, SleepLocation, SleepQuality, SleepWakingReason } from '../types';
import { X, Moon, Sun, Clock, Bed, Sparkles, Trash2, Check, AlertTriangle, Play, Square } from 'lucide-react';

interface SleepLogModalProps {
  sleepRecord?: SleepRecord | null;
  onClose: () => void;
}

export const SleepLogModal: React.FC<SleepLogModalProps> = ({ sleepRecord, onClose }) => {
  const {
    addSleepRecord,
    updateSleepRecord,
    deleteSleepRecord,
    activeSleepTimer,
    startSleepTimer,
    stopSleepTimer,
    isNightMode,
    triggerUndoToast,
  } = useApp();

  const isEditing = Boolean(sleepRecord);

  const defaultStartTime = sleepRecord
    ? new Date(sleepRecord.startTime).toISOString().slice(0, 16)
    : new Date(Date.now() - 45 * 60 * 1000).toISOString().slice(0, 16);

  const defaultEndTime = sleepRecord
    ? new Date(sleepRecord.endTime).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);

  const [mode, setMode] = useState<'manual' | 'timer'>(
    activeSleepTimer.isSleeping ? 'timer' : 'manual'
  );
  const [type, setType] = useState<SleepType>(sleepRecord?.type || 'soneca_dia');
  const [location, setLocation] = useState<SleepLocation>(sleepRecord?.location || 'berco');
  const [quality, setQuality] = useState<SleepQuality>(sleepRecord?.quality || 'tranquilo');
  const [wakingReason, setWakingReason] = useState<SleepWakingReason>(
    sleepRecord?.wakingReason || 'espontaneo'
  );
  const [startTime, setStartTime] = useState<string>(defaultStartTime);
  const [endTime, setEndTime] = useState<string>(defaultEndTime);
  const [notes, setNotes] = useState<string>(sleepRecord?.notes || '');
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  // Compute duration preview
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const diffMinutes = Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));
  const durationHours = Math.floor(diffMinutes / 60);
  const durationRemMins = diffMinutes % 60;

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (endMs < startMs) {
      alert('O horário de acordar não pode ser anterior ao horário de dormir.');
      return;
    }

    if (isEditing && sleepRecord) {
      updateSleepRecord(sleepRecord.id, {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationMinutes: diffMinutes,
        type,
        location,
        quality,
        wakingReason,
        notes,
      });
      triggerUndoToast('✓ Registro de sono atualizado', () => {});
    } else {
      addSleepRecord({
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationMinutes: diffMinutes,
        type,
        location,
        quality,
        wakingReason,
        notes,
      });
      triggerUndoToast(`✓ Sono registrado (${durationHours > 0 ? `${durationHours}h ` : ''}${durationRemMins}min)`, () => {});
    }
    onClose();
  };

  const handleDelete = () => {
    if (sleepRecord) {
      deleteSleepRecord(sleepRecord.id);
      triggerUndoToast('✓ Registro de sono excluído', () => {});
    }
    onClose();
  };

  const handleStartLiveTimer = () => {
    startSleepTimer(location, type);
    triggerUndoToast('😴 Cronômetro de sono iniciado', () => {});
    onClose();
  };

  const handleStopLiveTimer = () => {
    stopSleepTimer(quality, wakingReason, notes);
    triggerUndoToast('✓ Bebê acordou! Sono salvo.', () => {});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl border shadow-2xl p-6 transition-all max-h-[90vh] overflow-y-auto pb-safe ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">
                {isEditing ? 'Editar Registro de Sono' : 'Controle de Sono & Sonecas'}
              </h2>
              <p className="text-xs text-slate-400">Monitore os ciclos de sono diurnos e noturnos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation */}
        {showConfirmDelete ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-rose-600 dark:text-rose-400">
                Excluir este registro de sono?
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Os dados de duração total e histórico serão recalculados.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {/* Mode Switcher (Timer vs Manual) - only if not editing past record */}
            {!isEditing && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                    mode === 'manual'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Registrar Horário
                </button>
                <button
                  type="button"
                  onClick={() => setMode('timer')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    mode === 'timer'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  {activeSleepTimer.isSleeping ? 'Sono em Andamento' : 'Cronômetro Ao Vivo'}
                </button>
              </div>
            )}

            {/* LIVE TIMER ACTIVE STATE */}
            {mode === 'timer' && activeSleepTimer.isSleeping && (
              <div className="p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  Bebê dormindo agora
                </div>
                <div className="text-2xl font-black text-indigo-400 font-mono">
                  Iniciou às {new Date(activeSleepTimer.startTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <p className="text-xs text-slate-400">
                  Local: <strong>{activeSleepTimer.location}</strong> • Tipo: <strong>{activeSleepTimer.type === 'soneca_dia' ? 'Soneca' : 'Sono Noturno'}</strong>
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStopLiveTimer}
                    className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    Bebê Acordou (Finalizar e Salvar)
                  </button>
                </div>
              </div>
            )}

            {/* LIVE TIMER NOT STARTED YET */}
            {mode === 'timer' && !activeSleepTimer.isSleeping && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('soneca_dia')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 ${
                      type === 'soneca_dia'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                    Soneca do Dia
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('sono_noturno')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 ${
                      type === 'sono_noturno'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <Moon className="w-5 h-5" />
                    Sono Noturno
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Onde o bebê está dormindo?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'berco', label: 'Berço', icon: '🛏️' },
                      { id: 'colo', label: 'Colo', icon: '🤱' },
                      { id: 'carrinho', label: 'Carrinho', icon: '🛒' },
                      { id: 'cama_compartilhada', label: 'Cama Pais', icon: '🛌' },
                      { id: 'ninho', label: 'Ninho/Redário', icon: '🧺' },
                      { id: 'outro', label: 'Outro', icon: '✨' },
                    ].map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setLocation(loc.id as SleepLocation)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 ${
                          location === loc.id
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <span>{loc.icon}</span>
                        <span>{loc.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartLiveTimer}
                  className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Colocar Bebê para Dormir Agora
                </button>
              </div>
            )}

            {/* MANUAL / EDIT FORM */}
            {mode === 'manual' && (
              <form onSubmit={handleSaveManual} className="space-y-4">
                {/* Sleep Type (Day nap vs Night Sleep) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    key="soneca"
                    type="button"
                    onClick={() => setType('soneca_dia')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      type === 'soneca_dia'
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    Soneca Diurna
                  </button>
                  <button
                    key="noite"
                    type="button"
                    onClick={() => setType('sono_noturno')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      type === 'sono_noturno'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    Sono Noturno
                  </button>
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Dormiu às
                    </label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={`w-full p-3 rounded-2xl border-2 text-sm font-bold outline-none ${
                        isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-indigo-400' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Acordou às
                    </label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={`w-full p-3 rounded-2xl border-2 text-sm font-bold outline-none ${
                        isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-indigo-400' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Calculated Duration Banner */}
                <div className="p-3 rounded-2xl bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">Duração Calculada:</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {durationHours > 0 ? `${durationHours}h ` : ''}
                    {durationRemMins} min
                  </span>
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 block">
                    Local do Sono
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'berco', label: 'Berço' },
                      { id: 'colo', label: 'Colo' },
                      { id: 'carrinho', label: 'Carrinho' },
                      { id: 'cama_compartilhada', label: 'Cama Pais' },
                      { id: 'ninho', label: 'Ninho' },
                      { id: 'outro', label: 'Outro' },
                    ].map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setLocation(loc.id as SleepLocation)}
                        className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                          location === loc.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : isNightMode
                            ? 'bg-slate-900 border-slate-700 text-slate-300'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sleep Quality */}
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 block">
                    Qualidade do Sono
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'tranquilo', label: '😴 Tranquilo e Calmo' },
                      { id: 'agitado', label: '🔄 Agitado / Mexeu muito' },
                      { id: 'muitos_despertares', label: '⚡ Vários despertares' },
                      { id: 'choro', label: '😢 Choramingos' },
                    ].map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setQuality(q.id as SleepQuality)}
                        className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                          quality === q.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : isNightMode
                            ? 'bg-slate-900 border-slate-700 text-slate-300'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1 block">
                    Observações
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: dormiu após arrotar, ruído branco ligado..."
                    className={`w-full p-3 rounded-2xl border-2 text-sm font-semibold outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-indigo-400 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500 placeholder:text-slate-400'
                    }`}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(true)}
                      className="p-3.5 rounded-2xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center gap-1 text-xs font-bold"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    {isEditing ? 'Salvar Alterações' : 'Salvar Sono'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
