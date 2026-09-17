import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FeedingRecord, FeedingType } from '../types';
import { X, Trash2, Check, Clock, Calendar, Milk, AlertTriangle, RotateCcw } from 'lucide-react';

interface EditFeedingModalProps {
  feeding: FeedingRecord;
  onClose: () => void;
}

export const EditFeedingModal: React.FC<EditFeedingModalProps> = ({ feeding, onClose }) => {
  const { updateFeeding, deleteFeeding, isNightMode, triggerUndoToast } = useApp();

  const getInitialDateTime = () => {
    const base = feeding.timestamp ? new Date(feeding.timestamp) : new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dStr = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
    const tStr = `${pad(base.getHours())}:${pad(base.getMinutes())}`;
    return { dStr, tStr };
  };

  const initial = getInitialDateTime();
  const [dateStr, setDateStr] = useState<string>(initial.dStr);
  const [timeStr, setTimeStr] = useState<string>(initial.tStr);

  const [type, setType] = useState<FeedingType>(feeding.type);
  const [consumedMl, setConsumedMl] = useState<number>(feeding.consumedMl || 45);
  const [durationMinutes, setDurationMinutes] = useState<number>(feeding.durationMinutes || 15);

  const [lastSide, setLastSide] = useState<'esquerdo' | 'direito' | 'ambos'>(
    feeding.directNursing?.lastSide || 'esquerdo'
  );
  const [leftMinutes, setLeftMinutes] = useState<number>(feeding.directNursing?.leftMinutes || 10);
  const [rightMinutes, setRightMinutes] = useState<number>(feeding.directNursing?.rightMinutes || 10);
  const [burped, setBurped] = useState<boolean>(feeding.burped ?? true);
  const [notes, setNotes] = useState<string>(feeding.notes || '');

  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const targetDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);

    const totalDur =
      type === 'amamentacao_direta'
        ? Number(leftMinutes) + Number(rightMinutes)
        : Number(durationMinutes);

    updateFeeding(feeding.id, {
      type,
      timestamp: targetDate.toISOString(),
      consumedMl: type !== 'amamentacao_direta' ? Number(consumedMl) : undefined,
      offeredMl: type !== 'amamentacao_direta' ? Number(consumedMl) : undefined,
      durationMinutes: totalDur,
      burped,
      notes: notes.trim() || undefined,
      batchIdsUsed: feeding.batchIdsUsed,
      batchesUsedDetails: feeding.batchesUsedDetails,
      containerNumber: feeding.containerNumber,
      containerName: feeding.containerName,
      containerColor: feeding.containerColor,
      containerTag: feeding.containerTag,
      directNursing:
        type === 'amamentacao_direta'
          ? {
              leftMinutes: Number(leftMinutes),
              rightMinutes: Number(rightMinutes),
              lastSide,
            }
          : undefined,
    });
    triggerUndoToast('✓ Mamada atualizada com sucesso', () => {});
    onClose();
  };

  const handleDelete = () => {
    deleteFeeding(feeding.id);
    triggerUndoToast('✓ Mamada excluída', () => {});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl border shadow-2xl p-5 sm:p-6 transition-all max-h-[92vh] overflow-y-auto pb-safe ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500">
              <Milk className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Editar Registro de Mamada</h2>
              <p className="text-xs text-slate-400">Ajuste data, hora, duração, volume ou remova</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showConfirmDelete ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-rose-600 dark:text-rose-400">
                Excluir esta mamada permanentemente?
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Esta ação removerá o registro dos relatórios e reajustará as estatísticas do dia.
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
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            {/* Feeding Type Selector */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Tipo de Alimentação
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'leite_materno_ordenhado', label: 'Leite Materno', icon: '🍼' },
                  { id: 'amamentacao_direta', label: 'Peito Direto', icon: '🤱' },
                  { id: 'formula', label: 'Fórmula', icon: '🥣' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id as FeedingType)}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      type === t.id
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-center">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date and Time Pickers with Quick Shortcuts */}
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

            {/* Volume in ML (if bottle or formula) */}
            {type !== 'amamentacao_direta' && (
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 block">
                  Volume Consumido (ml)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="5"
                    max="400"
                    step="5"
                    value={consumedMl}
                    onChange={(e) => setConsumedMl(Number(e.target.value))}
                    className="flex-1 p-3 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base font-black outline-none focus:border-rose-500"
                    required
                  />
                  <div className="flex gap-1.5">
                    {[30, 45, 60, 90, 120].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setConsumedMl(quick)}
                        className={`px-3 py-2.5 rounded-xl border-2 text-xs font-black transition-all ${
                          consumedMl === quick
                            ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {quick}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Direct Nursing Sides & Durations */}
            {type === 'amamentacao_direta' && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-rose-500/5 dark:bg-rose-950/20 border-2 border-rose-300 dark:border-rose-800">
                <label className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                  Lado e Duração no Peito
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'esquerdo', label: 'Esq (Esquerdo)' },
                    { id: 'direito', label: 'Dir (Direito)' },
                    { id: 'ambos', label: 'Ambos os lados' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setLastSide(s.id as any)}
                      className={`p-2.5 rounded-xl border-2 text-xs font-black transition-all ${
                        lastSide === s.id
                          ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      Minutos Peito Esq.
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="90"
                      value={leftMinutes}
                      onChange={(e) => setLeftMinutes(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-black text-center outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      Minutos Peito Dir.
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="90"
                      value={rightMinutes}
                      onChange={(e) => setRightMinutes(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-black text-center outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Total Duration & Burp Checkbox */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 block">
                  Duração Total (min)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="120"
                  value={type === 'amamentacao_direta' ? leftMinutes + rightMinutes : durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  disabled={type === 'amamentacao_direta'}
                  className={`w-full p-3 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-black outline-none focus:border-rose-500 ${
                    type === 'amamentacao_direta' ? 'opacity-70' : ''
                  }`}
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 p-3 rounded-2xl border-2 border-slate-300 dark:border-slate-600 cursor-pointer bg-white dark:bg-slate-900">
                  <input
                    type="checkbox"
                    checked={burped}
                    onChange={(e) => setBurped(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Arrotou após mamar</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 block">
                Observações
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: mamou com calma, pegou bem o bico..."
                className="w-full p-3 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-semibold outline-none focus:border-rose-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="p-3.5 rounded-2xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center gap-1.5 text-xs font-bold"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95"
              >
                <Check className="w-4 h-4" />
                Salvar Alterações
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
