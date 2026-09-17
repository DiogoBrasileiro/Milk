import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Check, X, Calendar, Clock, AlertCircle, RotateCcw, Trash2, AlertTriangle, Package } from 'lucide-react';
import { DiaperPeeAmount, DiaperPoopAmount, DiaperPoopColor, DiaperPoopConsistency, DiaperRecord } from '../types';

export const DiaperTrackerModal: React.FC = () => {
  const { closeModal, openModal, modalData, addDiaper, updateDiaper, deleteDiaper, triggerUndoToast, isNightMode, diaperStockItems, baby } = useApp();

  const existingDiaper: DiaperRecord | undefined = modalData?.diaper;
  const isEditing = Boolean(existingDiaper);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isChangingDiaper, setIsChangingDiaper] = useState<boolean>(false);

  const activeStockItems = diaperStockItems.filter((i) => i.status !== 'ARCHIVED');
  const defaultInUseItem = activeStockItems.find((i) => i.isDefaultInUse || i.id === baby.defaultDiaperStockItemId);

  const [selectedStockItemId, setSelectedStockItemId] = useState<string>(() => {
    if (existingDiaper?.diaperStockItemId) return existingDiaper.diaperStockItemId;
    if (defaultInUseItem) return defaultInUseItem.id;
    const availableItem = activeStockItems.find((i) => i.quantityCurrent > 0);
    return availableItem ? availableItem.id : activeStockItems[0]?.id || 'none';
  });

  const selectedStockItem = activeStockItems.find((i) => i.id === selectedStockItemId);

  // Date and Time calculation
  const getInitialDateTime = () => {
    const base = existingDiaper?.timestamp ? new Date(existingDiaper.timestamp) : new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dStr = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
    const tStr = `${pad(base.getHours())}:${pad(base.getMinutes())}`;
    return { dStr, tStr };
  };

  const initial = getInitialDateTime();
  const [dateStr, setDateStr] = useState<string>(initial.dStr);
  const [timeStr, setTimeStr] = useState<string>(initial.tStr);

  const [hasPee, setHasPee] = useState<boolean>(
    existingDiaper ? existingDiaper.hasPee : modalData?.defaultType !== 'poop'
  );
  const [peeAmount, setPeeAmount] = useState<DiaperPeeAmount>(existingDiaper?.peeAmount || 'normal');

  const [hasPoop, setHasPoop] = useState<boolean>(
    existingDiaper ? existingDiaper.hasPoop : modalData?.defaultType === 'poop' || false
  );
  const [poopAmount, setPoopAmount] = useState<DiaperPoopAmount>(existingDiaper?.poopAmount || 'normal');
  const [poopConsistency, setPoopConsistency] = useState<DiaperPoopConsistency>(
    existingDiaper?.poopConsistency || 'pastoso'
  );
  const [poopColor, setPoopColor] = useState<DiaperPoopColor>(existingDiaper?.poopColor || 'mostarda');
  const [notes, setNotes] = useState<string>(existingDiaper?.notes || '');

  const colorsList: Array<{ id: DiaperPoopColor; label: string; hex: string; desc?: string }> = [
    { id: 'mostarda', label: 'Mostarda', hex: '#d97706', desc: 'Típico leite materno' },
    { id: 'amarelo', label: 'Amarelo', hex: '#eab308' },
    { id: 'marrom', label: 'Marrom', hex: '#78350f', desc: 'Comum em fórmula' },
    { id: 'verde', label: 'Verde', hex: '#16a34a', desc: 'Pode ser trânsito rápido' },
    { id: 'preto', label: 'Preto / Mecônio', hex: '#1e293b', desc: 'Normal primeiros dias' },
    { id: 'vermelho', label: 'Vermelho / Sangue', hex: '#dc2626', desc: 'Atenção / Pediatra' },
    { id: 'branco', label: 'Branco / Claro', hex: '#cbd5e1', desc: 'Atenção / Pediatra' },
  ];

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

  const handleDelete = () => {
    if (!existingDiaper) return;
    const previous = { ...existingDiaper };
    deleteDiaper(existingDiaper.id);
    triggerUndoToast('Registro de fralda excluído', () => {
      addDiaper(previous);
    });
    closeModal();
  };

  const handleSaveDiaper = () => {
    if (!hasPee && !hasPoop) return;

    // Requirement: New records must have a diaperStockItemId linked if active stock items exist
    if (!isEditing && activeStockItems.length > 0 && (selectedStockItemId === 'none' || !selectedStockItemId)) {
      alert('Por favor, selecione qual fralda foi utilizada para registrar a troca.');
      setIsChangingDiaper(true);
      return;
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const targetDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
    const isoTimestamp = targetDate.toISOString();

    const diaperPayload = {
      timestamp: isoTimestamp,
      hasPee,
      peeAmount: hasPee ? peeAmount : undefined,
      hasPoop,
      poopAmount: hasPoop ? poopAmount : undefined,
      poopConsistency: hasPoop ? poopConsistency : undefined,
      poopColor: hasPoop ? poopColor : undefined,
      notes: notes.trim() || undefined,
      diaperStockItemId: selectedStockItemId === 'none' ? undefined : selectedStockItemId,
    };

    if (isEditing && existingDiaper) {
      updateDiaper(existingDiaper.id, diaperPayload);
      triggerUndoToast('Registro de fralda atualizado com sucesso!', () => {});
    } else {
      addDiaper(diaperPayload);
      triggerUndoToast('Troca de fralda registrada com sucesso!', () => {});
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
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
              {isEditing ? 'Editar Registro' : 'Novo Registro'}
            </span>
            <h2 className="font-black text-lg tracking-tight">
              {isEditing ? 'Editar Troca de Fralda' : 'Troca de Fralda'}
            </h2>
            <p className="text-xs text-slate-400">Data, hora, xixi, evacuação e características</p>
          </div>
          <button
            onClick={closeModal}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
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
                Excluir este registro de fralda?
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Esta ação removerá este registro do histórico. Você poderá desfazer logo após.
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
          <div className="py-4 space-y-4">
          {/* DATE AND TIME SECTION */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>Data e Horário da Troca</span>
              </span>
              <button
                type="button"
                onClick={handleSetNow}
                className="text-xs font-black text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-500/20"
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
                        ? 'bg-slate-900 border-slate-600 text-white focus:border-sky-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
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
                        ? 'bg-slate-900 border-slate-600 text-white focus:border-sky-400'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
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
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-colors shadow-xs"
              >
                -15 min
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-30)}
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-colors shadow-xs"
              >
                -30 min
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-60)}
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-colors shadow-xs"
              >
                -1h
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-120)}
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-colors shadow-xs"
              >
                -2h
              </button>
              <button
                type="button"
                onClick={handleSetYesterday}
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-colors shadow-xs"
              >
                Ontem
              </button>
            </div>
          </div>

          {/* Main Switches: Xixi / Cocô */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHasPee(!hasPee)}
              className={`p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center ${
                hasPee
                  ? isNightMode
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-black ring-2 ring-sky-500/30'
                    : 'bg-sky-50 border-sky-600 text-sky-900 font-black ring-2 ring-sky-500/20'
                  : isNightMode
                  ? 'bg-slate-800/40 border-slate-700 text-slate-400 opacity-60'
                  : 'bg-slate-100 border-slate-300 text-slate-600 opacity-60'
              }`}
            >
              <span className="text-3xl mb-1">💧</span>
              <span className="text-sm font-black">Teve Xixi</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{hasPee ? 'Marcado' : 'Toque para marcar'}</span>
            </button>

            <button
              type="button"
              onClick={() => setHasPoop(!hasPoop)}
              className={`p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center ${
                hasPoop
                  ? isNightMode
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black ring-2 ring-amber-500/30'
                    : 'bg-amber-50 border-amber-600 text-amber-950 font-black ring-2 ring-amber-500/20'
                  : isNightMode
                  ? 'bg-slate-800/40 border-slate-700 text-slate-400 opacity-60'
                  : 'bg-slate-100 border-slate-300 text-slate-600 opacity-60'
              }`}
            >
              <span className="text-3xl mb-1">💩</span>
              <span className="text-sm font-black">Teve Cocô</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{hasPoop ? 'Marcado' : 'Toque para marcar'}</span>
            </button>
          </div>

          {/* Pee Volume if active */}
          {hasPee && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Quantidade de Xixi:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['pouco', 'normal', 'muito'] as DiaperPeeAmount[]).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPeeAmount(amt)}
                    className={`py-2 px-1 rounded-xl text-xs font-black capitalize border-2 transition-all ${
                      peeAmount === amt
                        ? isNightMode
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                          : 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : isNightMode
                        ? 'bg-slate-800 border-slate-700 text-slate-300'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Poop details if active */}
          {hasPoop && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in">
              {/* Consistency */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">Consistência:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'pastoso', label: 'Pastoso (Ideal)' },
                    { id: 'liquido', label: 'Líquido' },
                    { id: 'normal', label: 'Normal' },
                    { id: 'ressecado', label: 'Ressecado' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPoopConsistency(c.id as any)}
                      className={`py-2 px-1 rounded-xl text-xs font-black border-2 transition-all ${
                        poopConsistency === c.id
                          ? isNightMode
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : isNightMode
                          ? 'bg-slate-800 border-slate-700 text-slate-300'
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color selector */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">Coloração:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {colorsList.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setPoopColor(col.id)}
                      className={`p-2.5 rounded-xl border-2 flex items-center gap-2 text-left transition-all ${
                        poopColor === col.id
                          ? isNightMode
                            ? 'bg-slate-800 border-amber-400 text-white font-black ring-1 ring-amber-400'
                            : 'bg-amber-50 border-amber-600 text-slate-900 font-black shadow-xs'
                          : isNightMode
                          ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0 shadow-xs"
                        style={{ backgroundColor: col.hex }}
                      />
                      <div className="overflow-hidden">
                        <div className="text-xs truncate font-bold">{col.label}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {(poopColor === 'vermelho' || poopColor === 'branco') && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Coloração atípica: registre e converse com o pediatra para avaliação.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FRALDA UTILIZADA SECTION */}
          {activeStockItems.length > 0 ? (
            <div className="space-y-2">
              {selectedStockItem && selectedStockItem.quantityCurrent > 0 && !isChangingDiaper ? (
                /* Card Fralda Utilizada (Estoque Disponível) */
                <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-300 dark:border-sky-700 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-sky-500" />
                      <span>Fralda utilizada</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsChangingDiaper(true)}
                      className="text-xs font-black text-sky-600 dark:text-sky-400 hover:underline px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800 shadow-xs transition-colors"
                    >
                      Alterar
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <strong className="text-sm font-black text-slate-900 dark:text-white block">
                        {selectedStockItem.brand} {selectedStockItem.productLine ? `— ${selectedStockItem.productLine}` : ''} — Tam {selectedStockItem.size}
                      </strong>
                      <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
                        Estoque atual: {selectedStockItem.quantityCurrent} un.
                      </span>
                    </div>
                    {selectedStockItem.isDefaultInUse && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-200/80 dark:bg-sky-900/80 text-sky-800 dark:text-sky-200">
                        EM USO
                      </span>
                    )}
                  </div>
                </div>
              ) : selectedStockItem && selectedStockItem.quantityCurrent <= 0 && !isChangingDiaper ? (
                /* Card Fralda sem Estoque */
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{selectedStockItem.brand} {selectedStockItem.productLine ? `— ${selectedStockItem.productLine}` : ''} Tam {selectedStockItem.size} está sem estoque.</span>
                  </div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    Selecione outra fralda ou adicione estoque.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsChangingDiaper(true)}
                      className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      Selecionar outra
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeModal();
                        openModal('diaperStockAdd');
                      }}
                      className="py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Adicionar estoque
                    </button>
                  </div>
                </div>
              ) : (
                /* Lista de Seleção de Fraldas */
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-sky-500" />
                      <span>Selecione a fralda utilizada</span>
                    </label>
                    {isChangingDiaper && selectedStockItem && (
                      <button
                        type="button"
                        onClick={() => setIsChangingDiaper(false)}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                    {activeStockItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedStockItemId(item.id);
                          setIsChangingDiaper(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left border-2 flex items-center justify-between text-xs transition-all ${
                          selectedStockItemId === item.id
                            ? 'bg-sky-600 text-white border-sky-600 font-black shadow-xs'
                            : item.quantityCurrent <= 0
                            ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-sky-300'
                        }`}
                      >
                        <div>
                          <span className="font-bold">{item.brand} {item.productLine ? `— ${item.productLine}` : ''}</span>
                          <span className="ml-1 opacity-90 font-bold">Tam {item.size}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{item.quantityCurrent} un.</span>
                          {item.isDefaultInUse && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-900">EM USO</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Sem Estoque Cadastrado */
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Nenhuma fralda no estoque</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  closeModal();
                  openModal('diaperStockAdd');
                }}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
              >
                + Adicionar estoque
              </button>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Observações:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Troca tranquila, sem assaduras"
              className={`w-full p-3 rounded-xl text-sm font-semibold border-2 outline-none ${
                isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-sky-400 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500 placeholder:text-slate-400'
              }`}
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-2 pt-2">
            {isEditing && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-3 px-3.5 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                title="Excluir fralda"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            )}

            <div className="flex items-center gap-2 flex-1 justify-end">
              <button
                type="button"
                onClick={closeModal}
                className={`py-3 px-4 rounded-2xl font-bold text-xs border ${
                  isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveDiaper}
                disabled={!hasPee && !hasPoop}
                className={`py-3 px-5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg active:scale-98 ${
                  !hasPee && !hasPoop
                    ? 'bg-slate-400 opacity-60 cursor-not-allowed'
                    : 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                {isEditing ? 'Salvar Alterações' : 'Salvar Fralda'}
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
