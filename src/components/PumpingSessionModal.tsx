import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Play, Pause, Check, X, Droplet, Archive, Heart, Clock, Plus, Calendar, Tag, Palette } from 'lucide-react';
import { PumpingMethod, StorageLocationType } from '../types';
import { CONTAINER_COLORS, getContainerColorStyle } from '../constants/containers';
import { ContainerIdentificationEditor } from './ContainerIdentificationEditor';
import { calculateBatchExpiry } from '../utils/storageEngine';
import { formatDateTime } from '../utils/formatters';

export const PumpingSessionModal: React.FC = () => {
  const {
    closeModal,
    addPumping,
    activePumpingTimer,
    setActivePumpingTimer,
    protocolId,
    batches,
    isNightMode,
    triggerUndoToast,
  } = useApp();

  // Mode: 'quick_volume' (default, no timer required) vs 'with_timer'
  const [entryMode, setEntryMode] = useState<'quick_volume' | 'with_timer'>('quick_volume');

  // Date and time
  const [pumpingDateTime, setPumpingDateTime] = useState<string>(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  );

  // Volumes
  const [totalVolumeMl, setTotalVolumeMl] = useState<number>(80);
  const [useSeparateSides, setUseSeparateSides] = useState<boolean>(false);
  const [leftMl, setLeftMl] = useState<number>(40);
  const [rightMl, setRightMl] = useState<number>(40);

  // Method & Storage
  const [method, setMethod] = useState<PumpingMethod>('bomba_eletrica');
  const [storageDestination, setStorageDestination] = useState<StorageLocationType>('geladeira');
  const [notes, setNotes] = useState<string>('');

  // Potinho classification & identification
  const nextPotNumber = (batches.filter(b => b.currentVolumeMl > 0).length + 1).toString();
  const [containerNumber, setContainerNumber] = useState<string>(nextPotNumber);
  const [containerName, setContainerName] = useState<string>(`Potinho #${nextPotNumber}`);
  const [containerColor, setContainerColor] = useState<string>(CONTAINER_COLORS[0].hex);
  const [containerTag, setContainerTag] = useState<string>('Fresco');

  // Live calculation of expiration for this potinho
  const calculatedExpiryIso = calculateBatchExpiry(
    new Date(pumpingDateTime).toISOString(),
    storageDestination,
    protocolId
  );

  // Synchronize separate sides with total volume
  const handleLeftChange = (val: number) => {
    setLeftMl(val);
    setTotalVolumeMl(val + rightMl);
  };

  const handleRightChange = (val: number) => {
    setRightMl(val);
    setTotalVolumeMl(leftMl + val);
  };

  const handleTotalChange = (val: number) => {
    setTotalVolumeMl(val);
    if (useSeparateSides) {
      setLeftMl(Math.round(val / 2));
      setRightMl(Math.round(val / 2));
    }
  };

  // Timer ticker
  useEffect(() => {
    let interval: any = null;
    if (activePumpingTimer.isRunning) {
      interval = setInterval(() => {
        setActivePumpingTimer((prev) => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activePumpingTimer.isRunning, setActivePumpingTimer]);

  const toggleTimer = () => {
    if (!activePumpingTimer.isRunning) {
      setActivePumpingTimer((prev) => ({
        ...prev,
        isRunning: true,
        startTime: prev.startTime || Date.now(),
      }));
    } else {
      setActivePumpingTimer((prev) => ({
        ...prev,
        isRunning: false,
      }));
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSavePumping = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalVolumeMl <= 0) return;

    const recordedTimestamp = new Date(pumpingDateTime).toISOString();
    const finalLeft = useSeparateSides ? leftMl : Math.round(totalVolumeMl / 2);
    const finalRight = useSeparateSides ? rightMl : totalVolumeMl - finalLeft;
    const durationMinutes =
      entryMode === 'with_timer' && activePumpingTimer.elapsedSeconds > 0
        ? Math.max(1, Math.round(activePumpingTimer.elapsedSeconds / 60))
        : 15; // default reasonable estimate

    addPumping({
      timestamp: recordedTimestamp,
      durationMinutes,
      method,
      leftVolumeMl: finalLeft,
      rightVolumeMl: finalRight,
      totalVolumeMl,
      targetStorage: storageDestination,
      containerName: containerName.trim() || `Potinho #${containerNumber}`,
      containerNumber: containerNumber.trim() || undefined,
      containerColor,
      containerTag: containerTag || undefined,
      notes: notes.trim() || undefined,
    });

    // Reset timer
    setActivePumpingTimer({
      isRunning: false,
      elapsedSeconds: 0,
      startTime: null,
      breast: 'ambos',
    });

    triggerUndoToast(
      `🥛 ${totalVolumeMl}ml cadastrados no potinho "${containerName || `Pote #${containerNumber}`}" (${storageDestination})!`,
      () => {}
    );

    closeModal();
  };

  const selectedColorStyle = getContainerColorStyle(containerColor);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border max-h-[92vh] overflow-y-auto ${
          isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base">Registrar Ordenha & Potinho</h2>
              <p className="text-xs text-slate-400">Classificação por cor, número, nome e cálculo de validade</p>
            </div>
          </div>
          <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-200 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: Volume Direto (Padrão) vs Com Cronômetro */}
        <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 my-4">
          <button
            type="button"
            onClick={() => setEntryMode('quick_volume')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              entryMode === 'quick_volume'
                ? isNightMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Volume Direto
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('with_timer')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              entryMode === 'with_timer'
                ? isNightMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⏱️ Com Cronômetro
          </button>
        </div>

        <form onSubmit={handleSavePumping} className="space-y-4">
          {/* Optional Timer Section if mode is 'with_timer' */}
          {entryMode === 'with_timer' && (
            <div
              className={`p-4 rounded-2xl text-center border flex flex-col items-center justify-center transition-all ${
                activePumpingTimer.isRunning
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                  : isNightMode
                  ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="text-3xl font-mono font-black tracking-wider my-1">
                {formatTimer(activePumpingTimer.elapsedSeconds)}
              </div>
              <button
                type="button"
                onClick={toggleTimer}
                className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition-all ${
                  activePumpingTimer.isRunning
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {activePumpingTimer.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {activePumpingTimer.isRunning ? 'Pausar Cronômetro' : 'Iniciar Contagem'}
              </button>
            </div>
          )}

          {/* SECTION: IDENTIFICAÇÃO E CLASSIFICAÇÃO DO POTINHO */}
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
            title="Identificação do Potinho Ordenhado"
            showLivePreview={true}
          />

          {/* Date & Time of Extraction */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              Data e Hora da Extração:
            </label>
            <input
              type="datetime-local"
              value={pumpingDateTime}
              onChange={(e) => setPumpingDateTime(e.target.value)}
              className={`w-full p-3 rounded-2xl text-sm font-bold border-2 outline-none ${
                isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
              }`}
              required
            />
          </div>

          {/* Storage Destination & Live Expiration Calculation */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Destino do Armazenamento (Cálculo Automático de Validade):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'geladeira' as StorageLocationType,
                  title: '❄️ Geladeira',
                  desc: 'Até 12h (MS)',
                },
                {
                  id: 'freezer' as StorageLocationType,
                  title: '🧊 Freezer',
                  desc: 'Até 15 dias (MS)',
                },
                {
                  id: 'ambiente' as StorageLocationType,
                  title: '🌡️ Ambiente',
                  desc: 'Uso em até 2h',
                },
              ].map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setStorageDestination(loc.id)}
                  className={`p-2.5 rounded-2xl border-2 text-center transition-all ${
                    storageDestination === loc.id
                      ? isNightMode
                        ? 'bg-blue-600/20 border-blue-400 text-blue-300 ring-2 ring-blue-500/30 font-black'
                        : 'bg-blue-50 border-blue-600 text-blue-950 ring-2 ring-blue-500/20 font-black'
                      : isNightMode
                      ? 'bg-slate-900 border-slate-700 text-slate-300'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="text-xs font-black">{loc.title}</div>
                  <div className="text-xs font-bold opacity-80 mt-0.5">{loc.desc}</div>
                </button>
              ))}
            </div>

            {/* Live Expiry Summary Banner */}
            <div className="mt-2.5 p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-black">
                <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                Validade deste Potinho:
              </span>
              <strong className="text-slate-900 dark:text-white font-mono text-sm font-black">
                {formatDateTime(calculatedExpiryIso)}
              </strong>
            </div>
          </div>

          {/* Volume Total Retirado */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Volume no Potinho:</label>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                {totalVolumeMl} ml
              </span>
            </div>

            {/* Quick volume preset pills */}
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {[40, 60, 80, 100, 120, 140, 160, 180, 200, 250].map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => handleTotalChange(ml)}
                  className={`py-1.5 rounded-xl text-xs font-black border-2 transition-all ${
                    totalVolumeMl === ml
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : isNightMode
                      ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
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
                value={totalVolumeMl}
                onChange={(e) => handleTotalChange(Math.max(0, Number(e.target.value)))}
                className={`w-full p-3 rounded-2xl text-base font-black border-2 text-center outline-none ${
                  isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                }`}
                placeholder="Ex: 80"
                required
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">ml</span>
            </div>
          </div>

          {/* Optional: Detalhamento por Peito (Toggle) */}
          <div className="p-3.5 rounded-2xl border-2 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white block">Cadastrar quantidade por peito (Opcional)</span>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Ajuda a monitorar a produtividade mama esquerda vs direita
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextState = !useSeparateSides;
                  setUseSeparateSides(nextState);
                  if (nextState) {
                    setLeftMl(Math.round(totalVolumeMl / 2));
                    setRightMl(totalVolumeMl - Math.round(totalVolumeMl / 2));
                  }
                }}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  useSeparateSides ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {useSeparateSides && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700 animate-in fade-in">
                <div>
                  <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                    🤱 Mama Esquerda (ml):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={leftMl}
                    onChange={(e) => handleLeftChange(Math.max(0, Number(e.target.value)))}
                    className={`w-full p-2.5 rounded-xl text-sm font-black border-2 text-center outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-indigo-400' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-cyan-600 dark:text-cyan-400 block mb-1">
                    🤱 Mama Direita (ml):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={rightMl}
                    onChange={(e) => handleRightChange(Math.max(0, Number(e.target.value)))}
                    className={`w-full p-2.5 rounded-xl text-sm font-black border-2 text-center outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-cyan-400' : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Observações do Potinho (Opcional):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Posição na prateleira, esterilização, etc."
              className={`w-full p-3 rounded-xl text-sm font-semibold border-2 outline-none ${
                isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 placeholder:text-slate-400'
              }`}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 active:scale-95 transition-all"
          >
            <Archive className="w-4 h-4" />
            Salvar Potinho & Adicionar {totalVolumeMl}ml ao Estoque
          </button>
        </form>
      </div>
    </div>
  );
};
