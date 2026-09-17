import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PumpingRecord, PumpingMethod, StorageLocationType } from '../types';
import { CONTAINER_COLORS } from '../constants/containers';
import { ContainerIdentificationEditor } from './ContainerIdentificationEditor';
import {
  X,
  Check,
  Trash2,
  AlertTriangle,
  Clock,
  Calendar,
  RotateCcw,
  Droplet,
  Tag,
} from 'lucide-react';

interface EditPumpingModalProps {
  pumping: PumpingRecord;
  onClose: () => void;
}

export const EditPumpingModal: React.FC<EditPumpingModalProps> = ({ pumping, onClose }) => {
  const { updatePumping, deletePumping, isNightMode, triggerUndoToast } = useApp();

  const getInitialDateTime = () => {
    const base = pumping.timestamp ? new Date(pumping.timestamp) : new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dStr = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
    const tStr = `${pad(base.getHours())}:${pad(base.getMinutes())}`;
    return { dStr, tStr };
  };

  const initial = getInitialDateTime();
  const [dateStr, setDateStr] = useState<string>(initial.dStr);
  const [timeStr, setTimeStr] = useState<string>(initial.tStr);

  const [totalVolumeMl, setTotalVolumeMl] = useState<number>(pumping.totalVolumeMl);
  const [leftVolumeMl, setLeftVolumeMl] = useState<number>(pumping.leftVolumeMl || 0);
  const [rightVolumeMl, setRightVolumeMl] = useState<number>(pumping.rightVolumeMl || 0);
  const [useSeparateSides, setUseSeparateSides] = useState<boolean>(
    Boolean((pumping.leftVolumeMl && pumping.leftVolumeMl > 0) || (pumping.rightVolumeMl && pumping.rightVolumeMl > 0))
  );

  const [method, setMethod] = useState<PumpingMethod>(pumping.method || 'eletrica_dupla');
  const [targetStorage, setTargetStorage] = useState<StorageLocationType | 'consumo_imediato'>(
    (pumping.targetStorage as any) || 'geladeira'
  );

  const [containerNumber, setContainerNumber] = useState<string>(pumping.containerNumber || '');
  const [containerName, setContainerName] = useState<string>(pumping.containerName || '');
  const [containerColor, setContainerColor] = useState<string>(pumping.containerColor || '#3b82f6');
  const [containerTag, setContainerTag] = useState<string>(pumping.containerTag || '');

  const [durationMinutes, setDurationMinutes] = useState<number>(pumping.durationMinutes || 15);
  const [notes, setNotes] = useState<string>(pumping.notes || '');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

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
    if (totalVolumeMl <= 0) return;

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const targetDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
    const isoTimestamp = targetDate.toISOString();

    const updates: Partial<PumpingRecord> = {
      timestamp: isoTimestamp,
      totalVolumeMl,
      leftVolumeMl: useSeparateSides ? leftVolumeMl : Math.round(totalVolumeMl / 2),
      rightVolumeMl: useSeparateSides ? rightVolumeMl : totalVolumeMl - Math.round(totalVolumeMl / 2),
      method,
      targetStorage,
      durationMinutes,
      containerNumber: containerNumber.trim() || undefined,
      containerName: containerName.trim() || undefined,
      containerColor,
      containerTag: containerTag.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    updatePumping(pumping.id, updates);
    triggerUndoToast('Registro de ordenha atualizado com sucesso!', () => {});
    onClose();
  };

  const handleDelete = () => {
    const previous = { ...pumping };
    deletePumping(pumping.id);
    triggerUndoToast(`Ordenha de ${pumping.totalVolumeMl}ml excluída`, () => {
      // Re-add on undo
      updatePumping(previous.id, previous);
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div
        className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border my-8 transition-colors ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
              🥛
            </div>
            <div>
              <h2 className="text-base font-black">Editar Registro de Ordenha</h2>
              <p className="text-xs text-slate-400">Modifique volume, método ou horário da extração</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showDeleteConfirm ? (
          <div className="py-6 space-y-4 text-center animate-in fade-in">
            <div className="w-14 h-14 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-base text-rose-600 dark:text-rose-400">
                Excluir registro de {pumping.totalVolumeMl} ml?
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Esta ação removerá este registro de ordenha das suas estatísticas.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className={`flex-1 py-3 rounded-2xl text-xs font-bold border ${
                  isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
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
            {/* Total Volume */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Volume Total Retirado
                </span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {totalVolumeMl} ml
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="1000"
                  step="5"
                  value={totalVolumeMl}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setTotalVolumeMl(val);
                    if (useSeparateSides) {
                      setLeftVolumeMl(Math.round(val / 2));
                      setRightVolumeMl(val - Math.round(val / 2));
                    }
                  }}
                  className={`w-full p-2.5 rounded-xl text-lg font-black border text-center ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  required
                />
                <span className="text-xs font-bold text-slate-400">ml</span>
              </div>

              {/* Quick volume chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[40, 60, 80, 100, 120, 150, 180, 200].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setTotalVolumeMl(v);
                      if (useSeparateSides) {
                        setLeftVolumeMl(Math.round(v / 2));
                        setRightVolumeMl(v - Math.round(v / 2));
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                      totalVolumeMl === v
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : isNightMode
                        ? 'bg-slate-900 border-slate-700 text-slate-300'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {v}ml
                  </button>
                ))}
              </div>
            </div>

            {/* Breast breakdown toggle */}
            <div className="p-3 rounded-2xl border bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold block">Divisão por Mama (Opcional)</span>
                  <span className="text-[10px] text-slate-400">Quantos ml saíram de cada peito</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !useSeparateSides;
                    setUseSeparateSides(next);
                    if (next) {
                      setLeftVolumeMl(Math.round(totalVolumeMl / 2));
                      setRightVolumeMl(totalVolumeMl - Math.round(totalVolumeMl / 2));
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
                      value={leftVolumeMl}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setLeftVolumeMl(val);
                        setTotalVolumeMl(val + rightVolumeMl);
                      }}
                      className={`w-full p-2 rounded-xl text-xs font-bold border text-center ${
                        isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
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
                      value={rightVolumeMl}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setRightVolumeMl(val);
                        setTotalVolumeMl(leftVolumeMl + val);
                      }}
                      className={`w-full p-2 rounded-xl text-xs font-bold border text-center ${
                        isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Date and Time Pickers with Quick Shortcuts */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Data e Horário da Retirada</span>
                </span>
                <button
                  type="button"
                  onClick={handleSetNow}
                  className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/20"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Agora</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">Data:</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    <input
                      type="date"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      className={`w-full pl-8 pr-2 py-2 rounded-xl text-xs font-bold border outline-none ${
                        isNightMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">Hora:</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    <input
                      type="time"
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                      className={`w-full pl-8 pr-2 py-2 rounded-xl text-xs font-bold border outline-none ${
                        isNightMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Time Offsets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">Atalhos:</span>
                <button
                  type="button"
                  onClick={() => handleAdjustMinutes(-30)}
                  className="py-1 px-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  -30 min
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustMinutes(-60)}
                  className="py-1 px-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  -1h
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustMinutes(-120)}
                  className="py-1 px-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  -2h
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterday}
                  className="py-1 px-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  Ontem
                </button>
              </div>
            </div>

            {/* Method & Target Storage */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  Método de Extração:
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PumpingMethod)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="eletrica_dupla">⚡ Elétrica Dupla</option>
                  <option value="eletrica_simples">⚡ Elétrica Simples</option>
                  <option value="manual">🖐️ Bomba Manual</option>
                  <option value="succao_passiva">🍼 Coletor / Sucção Passiva</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  Destino / Armazenamento:
                </label>
                <select
                  value={targetStorage}
                  onChange={(e) => setTargetStorage(e.target.value as any)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="geladeira">❄️ Geladeira</option>
                  <option value="freezer">🧊 Freezer</option>
                  <option value="consumo_imediato">🍼 Consumo Imediato</option>
                  <option value="descarte">🗑️ Descarte</option>
                </select>
              </div>
            </div>

            {/* Potinho Information */}
            <ContainerIdentificationEditor
              containerNumber={containerNumber}
              setContainerNumber={setContainerNumber}
              containerName={containerName}
              setContainerName={setContainerName}
              containerColor={containerColor}
              setContainerColor={setContainerColor}
              containerTag={containerTag}
              setContainerTag={setContainerTag}
              isNightMode={isNightMode}
              title="Identificação do Frasco / Potinho"
              showLivePreview={true}
            />

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Observações:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Boa fluidez, sem desconforto"
                className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                  isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-3 px-3.5 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Excluir ordenha"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs border ${
                    isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-3 px-6 rounded-2xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 flex items-center gap-2 active:scale-98 transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
