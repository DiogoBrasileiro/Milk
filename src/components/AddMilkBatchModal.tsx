import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StorageLocationType } from '../types';
import { CONTAINER_COLORS } from '../constants/containers';
import { ContainerIdentificationEditor } from './ContainerIdentificationEditor';
import {
  X,
  Check,
  Clock,
  Calendar,
  RotateCcw,
  Tag,
  MapPin,
  Plus,
} from 'lucide-react';

interface AddMilkBatchModalProps {
  onClose: () => void;
}

export const AddMilkBatchModal: React.FC<AddMilkBatchModalProps> = ({ onClose }) => {
  const { addMilkBatch, isNightMode, triggerUndoToast } = useApp();

  const getInitialDateTime = () => {
    const base = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dStr = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
    const tStr = `${pad(base.getHours())}:${pad(base.getMinutes())}`;
    return { dStr, tStr };
  };

  const initial = getInitialDateTime();
  const [dateStr, setDateStr] = useState<string>(initial.dStr);
  const [timeStr, setTimeStr] = useState<string>(initial.tStr);

  const [volumeMl, setVolumeMl] = useState<number>(80);
  const [location, setLocation] = useState<StorageLocationType>('geladeira');
  const [subLocation, setSubLocation] = useState<string>('');

  const [containerNumber, setContainerNumber] = useState<string>('');
  const [containerName, setContainerName] = useState<string>('');
  const [containerColor, setContainerColor] = useState<string>('#3b82f6');
  const [containerTag, setContainerTag] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

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
    if (volumeMl <= 0) return;

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const targetDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
    const isoExtractedAt = targetDate.toISOString();

    const newBatch = addMilkBatch({
      extractedAt: isoExtractedAt,
      originalVolumeMl: volumeMl,
      currentVolumeMl: volumeMl,
      location,
      subLocation: subLocation.trim() || undefined,
      containerNumber: containerNumber.trim() || undefined,
      containerName: containerName.trim() || undefined,
      containerColor,
      containerTag: containerTag.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    triggerUndoToast(`Frasco #${newBatch.containerNumber || newBatch.id} (${volumeMl}ml) adicionado ao estoque!`, () => {});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden transition-colors ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-[#0f141c]/95 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate">Adicionar Frasco ao Estoque</h2>
              <p className="text-[11px] text-slate-400 truncate">Cadastre leite materno para controle FEFO</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          <form id="add-milk-batch-form" onSubmit={handleSave} className="space-y-4">
          {/* Volume */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Volume de Leite (ml)
              </span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                {volumeMl} ml
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="5"
                max="1000"
                step="5"
                value={volumeMl}
                onChange={(e) => setVolumeMl(Number(e.target.value) || 0)}
                className={`w-full p-2.5 rounded-xl text-lg font-black border text-center ${
                  isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
                required
              />
              <span className="text-xs font-bold text-slate-400">ml</span>
            </div>

            {/* Quick volume chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[30, 50, 60, 80, 100, 120, 150, 180, 200].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVolumeMl(v)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                    volumeMl === v
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

          {/* Storage Location */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5 block">
              Destino do Armazenamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'geladeira', label: '❄️ Geladeira', desc: 'Até 12h (Brasil)' },
                { id: 'freezer', label: '🧊 Freezer', desc: 'Até 15 dias' },
                { id: 'descongelando', label: '💧 Descongelar', desc: 'Em geladeira' },
                { id: 'ambiente', label: '🌡️ Ambiente', desc: 'Uso rápido' },
              ].map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setLocation(loc.id as StorageLocationType)}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-0.5 transition-all ${
                    location === loc.id
                      ? isNightMode
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-sm'
                        : 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm'
                      : isNightMode
                      ? 'bg-slate-900/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-black">{loc.label}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{loc.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-location */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
              Sub-local / Prateleira (Opcional):
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={subLocation}
                onChange={(e) => setSubLocation(e.target.value)}
                placeholder="Ex: Gaveta 1, Prateleira do meio"
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-bold border ${
                  isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Date and Time Pickers with Quick Shortcuts */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Data e Horário da Extração</span>
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

          {/* Container Identification */}
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
              placeholder="Ex: Primeira ordenha da manhã"
              className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          </form>
        </div>

        {/* Fixed Sticky Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-[#0f141c]/95 backdrop-blur-md flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className={`py-2.5 px-4 rounded-2xl font-bold text-xs border transition-colors ${
              isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="add-milk-batch-form"
            className="py-2.5 px-6 rounded-2xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 flex items-center gap-2 active:scale-98 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Adicionar ao Estoque</span>
          </button>
        </div>
      </div>
    </div>
  );
};
