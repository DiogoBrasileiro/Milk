import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Play, Pause, Square, Check, X, HeartCrack, Sparkles } from 'lucide-react';
import { DiscomfortIntensity, DiscomfortSymptom, DiscomfortTiming } from '../types';

export const DiscomfortModal: React.FC = () => {
  const {
    closeModal,
    addDiscomfort,
    activeColicTimer,
    setActiveColicTimer,
    isNightMode,
  } = useApp();

  const [symptoms, setSymptoms] = useState<DiscomfortSymptom[]>(['gases']);
  const [intensity, setIntensity] = useState<DiscomfortIntensity>('leve');
  const [timing, setTiming] = useState<DiscomfortTiming>('logo_depois');
  const [selectedReliefs, setSelectedReliefs] = useState<string[]>(['posicao_vertical', 'colo']);
  const [notes, setNotes] = useState<string>('');

  // Colic timer interval
  useEffect(() => {
    let interval: any = null;
    if (activeColicTimer.isRunning) {
      interval = setInterval(() => {
        setActiveColicTimer((prev) => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeColicTimer.isRunning, setActiveColicTimer]);

  const toggleColicTimer = () => {
    setActiveColicTimer((prev) => ({
      ...prev,
      isRunning: !prev.isRunning,
      startTime: prev.startTime || Date.now(),
    }));
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const toggleSymptom = (sym: DiscomfortSymptom) => {
    setSymptoms((prev) =>
      prev.includes(sym) ? (prev.length > 1 ? prev.filter((s) => s !== sym) : prev) : [...prev, sym]
    );
  };

  const toggleRelief = (rel: string) => {
    setSelectedReliefs((prev) =>
      prev.includes(rel) ? prev.filter((r) => r !== rel) : [...prev, rel]
    );
  };

  const handleSaveDiscomfort = () => {
    const durationMinutes =
      activeColicTimer.elapsedSeconds > 0
        ? Math.max(1, Math.round(activeColicTimer.elapsedSeconds / 60))
        : undefined;

    addDiscomfort({
      timestamp: new Date().toISOString(),
      symptoms,
      intensity,
      timing,
      durationMinutes,
      reliefMeasures: selectedReliefs,
      notes: notes || undefined,
    });

    // Reset colic timer
    setActiveColicTimer({
      isRunning: false,
      elapsedSeconds: 0,
      startTime: null,
    });

    closeModal();
  };

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
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <HeartCrack className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Desconforto / Cólica / Gases</h2>
              <p className="text-xs text-slate-400">Sintomas, momento e medidas que ajudaram</p>
            </div>
          </div>
          <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {/* Crying / Colic live stopwatch */}
          <div
            className={`p-4 rounded-2xl border text-center flex items-center justify-between ${
              activeColicTimer.isRunning
                ? 'bg-purple-500/15 border-purple-400'
                : isNightMode
                ? 'bg-slate-800/40 border-slate-700'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Cronômetro de Episódio
              </div>
              <div className="text-2xl font-mono font-bold mt-0.5">
                {formatTimer(activeColicTimer.elapsedSeconds)}
              </div>
            </div>

            <button
              onClick={toggleColicTimer}
              className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 ${
                activeColicTimer.isRunning
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {activeColicTimer.isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" /> Pausar
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {activeColicTimer.elapsedSeconds > 0 ? 'Continuar' : 'INICIAR EPISÓDIO'}
                </>
              )}
            </button>
          </div>

          {/* Symptoms chips */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-1.5">
              O que aconteceu? (Múltipla seleção)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'gases', label: '💨 Gases' },
                { id: 'colica_choro', label: '😭 Cólicas / Choro forte' },
                { id: 'regurgitou', label: '🥛 Regurgitou' },
                { id: 'vomitou', label: '⚠️ Vomitou' },
                { id: 'soluco', label: 'Soluço' },
                { id: 'arroto_dificil', label: 'Arroto difícil' },
                { id: 'irritacao', label: 'Irritação' },
                { id: 'barriga_distendida', label: 'Barriga distendida' },
                { id: 'choro_pos_mamada', label: 'Choro após mamar' },
              ].map((sym) => {
                const isSelected = symptoms.includes(sym.id as any);
                return (
                  <button
                    key={sym.id}
                    onClick={() => toggleSymptom(sym.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                      isSelected
                        ? isNightMode
                          ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-xs'
                          : 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : isNightMode
                        ? 'bg-slate-900 border-slate-700 text-slate-300'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    {sym.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity & Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Intensidade:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['leve', 'moderado', 'forte'] as DiscomfortIntensity[]).map((int) => (
                  <button
                    key={int}
                    onClick={() => setIntensity(int)}
                    className={`py-2.5 text-xs font-bold capitalize rounded-xl border-2 transition-all ${
                      intensity === int
                        ? isNightMode
                          ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                          : 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : isNightMode
                        ? 'bg-slate-900 border-slate-700 text-slate-300'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    {int}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Quando aconteceu?</label>
              <select
                value={timing}
                onChange={(e) => setTiming(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl text-sm font-bold border-2 outline-none ${
                  isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-purple-400' : 'bg-white border-slate-300 text-slate-900 focus:border-purple-500'
                }`}
              >
                <option value="logo_depois">Logo após mamar</option>
                <option value="30_60_min_depois">30 a 60 min depois</option>
                <option value="durante_mamada">Durante a mamada</option>
                <option value="antes_mamada">Antes da mamada</option>
                <option value="sem_relacao">Sem relação aparente</option>
              </select>
            </div>
          </div>

          {/* Relief measures that helped */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-1.5">
              O que pareceu ajudar?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'colo', label: 'Colo' },
                { id: 'posicao_vertical', label: 'Posição Vertical' },
                { id: 'arrotar', label: 'Arrotou' },
                { id: 'movimento', label: 'Movimento / Balanço' },
                { id: 'contato_peito', label: 'Pele a pele' },
                { id: 'eliminou_gases', label: 'Soltou gases' },
                { id: 'evacuou', label: 'Evacuou' },
                { id: 'troca_fralda', label: 'Troca de fralda' },
              ].map((rel) => {
                const isSel = selectedReliefs.includes(rel.id);
                return (
                  <button
                    key={rel.id}
                    onClick={() => toggleRelief(rel.id)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                      isSel
                        ? isNightMode
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-xs'
                          : 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : isNightMode
                        ? 'bg-slate-900 border-slate-700 text-slate-300'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    {rel.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Observações:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Aliviou após 10 min em pé"
              className={`w-full p-3 rounded-xl text-sm font-semibold border-2 outline-none ${
                isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-purple-400 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 focus:border-purple-500 placeholder:text-slate-400'
              }`}
            />
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={closeModal}
              className={`flex-1 py-3 rounded-2xl font-bold text-xs border ${
                isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveDiscomfort}
              className="flex-2 py-3 rounded-2xl font-bold text-sm bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 active:scale-98"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Salvar Desconforto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
