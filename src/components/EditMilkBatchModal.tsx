import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MilkBatch, StorageLocationType, MilkBatchStatus } from '../types';
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
  Snowflake,
  Flame,
  Tag,
  MapPin,
  HelpCircle,
  FileText,
} from 'lucide-react';

interface EditMilkBatchModalProps {
  batch: MilkBatch;
  onClose: () => void;
}

export const EditMilkBatchModal: React.FC<EditMilkBatchModalProps> = ({ batch, onClose }) => {
  const { updateMilkBatch, deleteMilkBatch, discardBatch, isNightMode, triggerUndoToast } = useApp();

  // Extraction Date & Time
  const getInitialDateTime = () => {
    const base = batch.extractedAt ? new Date(batch.extractedAt) : new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dStr = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
    const tStr = `${pad(base.getHours())}:${pad(base.getMinutes())}`;
    return { dStr, tStr };
  };

  const initial = getInitialDateTime();
  const [dateStr, setDateStr] = useState<string>(initial.dStr);
  const [timeStr, setTimeStr] = useState<string>(initial.tStr);

  // Volumes
  const [currentVolumeMl, setCurrentVolumeMl] = useState<number>(batch.currentVolumeMl);
  const [originalVolumeMl, setOriginalVolumeMl] = useState<number>(batch.originalVolumeMl);

  // Storage Location & Details
  const [location, setLocation] = useState<StorageLocationType>(batch.location);
  const [subLocation, setSubLocation] = useState<string>(batch.subLocation || '');
  const [status, setStatus] = useState<MilkBatchStatus>(batch.status);

  // Container Identification
  const [containerNumber, setContainerNumber] = useState<string>(batch.containerNumber || '');
  const [containerName, setContainerName] = useState<string>(batch.containerName || '');
  const [containerColor, setContainerColor] = useState<string>(batch.containerColor || '#3b82f6');
  const [containerTag, setContainerTag] = useState<string>(batch.containerTag || '');

  // Notes
  const [notes, setNotes] = useState<string>(batch.notes || '');

  // Delete & Discard confirmation steps
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);
  const [discardReason, setDiscardReason] = useState<string>('Passou do prazo de validade');

  // Date and Time shortcuts
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
    const isoExtractedAt = targetDate.toISOString();

    const updates: Partial<MilkBatch> = {
      extractedAt: isoExtractedAt,
      currentVolumeMl: Math.max(0, currentVolumeMl),
      originalVolumeMl: Math.max(currentVolumeMl, originalVolumeMl),
      location,
      subLocation: subLocation.trim() || undefined,
      status,
      containerNumber: containerNumber.trim() || undefined,
      containerName: containerName.trim() || undefined,
      containerColor,
      containerTag: containerTag.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    updateMilkBatch(batch.id, updates);
    triggerUndoToast('Lote de leite materno atualizado com sucesso!', () => {});
    onClose();
  };

  const handleDelete = () => {
    const previousBatch = { ...batch };
    if (deleteMilkBatch) {
      deleteMilkBatch(batch.id);
    }
    triggerUndoToast(`Frasco #${batch.containerNumber || batch.id} excluído do estoque`, () => {
      // Re-insert if undone
      updateMilkBatch(previousBatch.id, previousBatch);
    });
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
              🍼
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate">Editar Frasco de Leite</h2>
              <p className="text-[11px] text-slate-400 truncate">
                {containerNumber ? `Potinho #${containerNumber}` : `Lote #${batch.id}`} • Coletado em {new Date(batch.extractedAt).toLocaleDateString('pt-BR')}
              </p>
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

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
          {showDeleteConfirm ? (
            <div className="py-4 space-y-4 text-center animate-in fade-in">
              <div className="w-14 h-14 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-base text-rose-600 dark:text-rose-400">
                  Excluir Registro do Frasco #{batch.containerNumber || batch.id}?
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Esta ação apagará permanentemente este item do estoque. Se você deseja apenas registrar que o leite não está mais apto para consumo, use a opção <strong>Descartar Leite</strong>.
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
          ) : showDiscardConfirm ? (
            <div className="py-4 space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="text-center">
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Confirmar Descarte de Leite ({currentVolumeMl} ml)?
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  O leite será removido do <strong>estoque ativo</strong>, mas o <strong>registro original da ordenha continuará 100% preservado</strong> para seus relatórios e estatísticas.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Motivo do descarte:
                </label>
                <select
                  value={discardReason}
                  onChange={(e) => setDiscardReason(e.target.value)}
                  className={`w-full p-3 rounded-2xl text-xs font-bold border ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="Passou do prazo de validade (12h geladeira / 15d freezer)">Passou do prazo de validade (12h geladeira / 15d freezer)</option>
                  <option value="Sobra de mamadeira após 1h de oferta">Sobra de mamadeira após 1h de oferta</option>
                  <option value="Falha de refrigeração ou oscilação térmica">Falha de refrigeração ou oscilação térmica</option>
                  <option value="Cheiro, coloração ou alteração perceptível">Cheiro, coloração ou alteração perceptível</option>
                  <option value="Descarte voluntário / outro">Descarte voluntário / outro</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className={`flex-1 py-3 rounded-2xl text-xs font-bold border ${
                    isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    discardBatch(batch.id, discardReason);
                    onClose();
                  }}
                  className="flex-1 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-lg shadow-amber-600/30 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar Descarte</span>
                </button>
              </div>
            </div>
          ) : (
            <form id="edit-milk-form" onSubmit={handleSave} className="space-y-4">
              {/* Volume Editing */}
              <div className="p-4 rounded-3xl bg-blue-50/60 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800/60 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                      Volume de Leite Armazenado
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      currentVolumeMl === 0
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                        : currentVolumeMl < originalVolumeMl
                        ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                        : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {currentVolumeMl === 0
                        ? 'Esvaziado / 0 ml'
                        : currentVolumeMl < originalVolumeMl
                        ? `Parcial (${currentVolumeMl} de ${originalVolumeMl}ml)`
                        : 'Frasco Cheio'}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                    {currentVolumeMl} <span className="text-sm font-semibold">ml</span>
                  </span>
                </div>

                {/* Stepper + Input */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Quantidade Atual Restante no Frasquinho (ml):
                  </label>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentVolumeMl((v) => Math.max(0, v - 20))}
                      className="px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black text-xs text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 active:scale-95 transition-all"
                      title="Diminuir 20ml"
                    >
                      -20
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentVolumeMl((v) => Math.max(0, v - 10))}
                      className="px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black text-xs text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 active:scale-95 transition-all"
                      title="Diminuir 10ml"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentVolumeMl((v) => Math.max(0, v - 5))}
                      className="px-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black text-xs text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 active:scale-95 transition-all"
                      title="Diminuir 5ml"
                    >
                      -5
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        step="1"
                        value={currentVolumeMl}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setCurrentVolumeMl(val);
                          if (val > originalVolumeMl) setOriginalVolumeMl(val);
                        }}
                        className={`w-full p-2.5 rounded-xl text-center text-xl font-black font-mono border-2 outline-none transition-all ${
                          isNightMode
                            ? 'bg-slate-900 border-blue-500/80 text-white focus:ring-2 focus:ring-blue-500'
                            : 'bg-white border-blue-500 text-blue-900 focus:ring-2 focus:ring-blue-400'
                        }`}
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                        ml
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = currentVolumeMl + 5;
                        setCurrentVolumeMl(next);
                        if (next > originalVolumeMl) setOriginalVolumeMl(next);
                      }}
                      className="px-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 active:scale-95 transition-all"
                      title="Aumentar 5ml"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = currentVolumeMl + 10;
                        setCurrentVolumeMl(next);
                        if (next > originalVolumeMl) setOriginalVolumeMl(next);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 active:scale-95 transition-all"
                      title="Aumentar 10ml"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = currentVolumeMl + 20;
                        setCurrentVolumeMl(next);
                        if (next > originalVolumeMl) setOriginalVolumeMl(next);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 active:scale-95 transition-all"
                      title="Aumentar 20ml"
                    >
                      +20
                    </button>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>0 ml (Esvaziado)</span>
                    <span>{Math.max(200, originalVolumeMl, currentVolumeMl)} ml</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(200, originalVolumeMl, currentVolumeMl)}
                    step="5"
                    value={currentVolumeMl}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setCurrentVolumeMl(val);
                      if (val > originalVolumeMl) setOriginalVolumeMl(val);
                    }}
                    className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Quick Presets */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                    Volumes comuns de frascos / mamadas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[15, 30, 45, 60, 80, 100, 120, 150, 180, 200, 250].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setCurrentVolumeMl(v);
                          if (v > originalVolumeMl) setOriginalVolumeMl(v);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all active:scale-95 ${
                          currentVolumeMl === v
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : isNightMode
                            ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {v}ml
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick actions: Restore original / Zero out */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-200/60 dark:border-blue-900/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setCurrentVolumeMl(originalVolumeMl)}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar {originalVolumeMl}ml original</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentVolumeMl(0)}
                    className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Zerar Frasco (0 ml)</span>
                  </button>
                </div>

                {/* Volume Original Input (collapsible / advanced) */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Volume Original da Coleta:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        step="5"
                        value={originalVolumeMl}
                        onChange={(e) => setOriginalVolumeMl(Number(e.target.value) || 0)}
                        className={`w-24 p-1.5 rounded-lg text-xs font-black border text-center ${
                          isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-400">ml</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Preserva o histórico exato do volume ordenhado originalmente nos relatórios estatísticos.
                  </p>
                </div>

                {/* Zero volume notification banner */}
                {currentVolumeMl === 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      Ao salvar com 0ml, o frasco será marcado como <strong>consumido/esvaziado</strong> no estoque, mantendo seu registro original preservado.
                    </span>
                  </div>
                )}
              </div>

              {/* Storage Location */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5 block">
                  Local de Armazenamento
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'geladeira', label: '❄️ Geladeira', desc: 'Até 12h (MS/Fiocruz)' },
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
                    placeholder="Ex: Gaveta 1, Prateleira do meio, Cesta freezer"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold border ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Date and Time Pickers with Quick Shortcuts */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Data e Hora da Coleta (Início da Validade)</span>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    -30 min
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustMinutes(-60)}
                    className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    -1h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustMinutes(-120)}
                    className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    -2h
                  </button>
                  <button
                    type="button"
                    onClick={handleSetYesterday}
                    className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    Ontem
                  </button>
                </div>
              </div>

              {/* Container Custom Identification & Visual Color Palette */}
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
                title="Editar Identificação do Frasco / Potinho"
                showLivePreview={true}
              />

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  Observações Adicionais:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Leite ordenhado após banho morno, boa gordura"
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </form>
          )}
        </div>

        {/* Fixed Sticky Footer */}
        {!showDeleteConfirm && !showDiscardConfirm && (
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-[#0f141c]/95 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 justify-between sm:justify-start">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(true)}
                className="py-2.5 px-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Descartar leite preservando histórico de ordenha"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Descartar Leite</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-2.5 px-2.5 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold transition-colors"
                title="Excluir este item do estoque"
              >
                Excluir
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 sm:flex-none py-2.5 px-4 rounded-2xl font-bold text-xs border ${
                  isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-milk-form"
                className="flex-1 sm:flex-none py-2.5 px-6 rounded-2xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
