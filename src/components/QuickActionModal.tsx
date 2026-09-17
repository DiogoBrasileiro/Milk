import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Milk,
  Droplet,
  HeartCrack,
  Scale,
  Clock,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  Moon,
  ArrowDownCircle,
  Pill,
} from 'lucide-react';

export const QuickActionModal: React.FC = () => {
  const {
    closeModal,
    openModal,
    addFeeding,
    quickLogPee,
    quickLogPoop,
    quickLogBottleMilk,
    quickLogDiscomfort,
    inventorySummary,
    isNightMode,
  } = useApp();

  const [feedMode, setFeedMode] = useState<'root' | 'choose_type' | 'bottle_options'>('root');

  const handleBottleOption = (ml: number) => {
    quickLogBottleMilk(ml);
    closeModal();
  };

  const handlePee1Tap = () => {
    quickLogPee();
    closeModal();
  };

  const handlePoop1Tap = () => {
    quickLogPoop();
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in select-none pb-safe">
      <div
        className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border transition-all ${
          isNightMode ? 'bg-[#080b10] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            {feedMode !== 'root' && (
              <button
                type="button"
                onClick={() => setFeedMode(feedMode === 'bottle_options' ? 'choose_type' : 'root')}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-blue-400">
                Menu Rápido • 1 Toque
              </span>
              <h2 className="text-lg font-black tracking-tight mt-0.5">
                {feedMode === 'bottle_options'
                  ? '🍼 Do Estoque (Baixa Automática)'
                  : feedMode === 'choose_type'
                  ? 'Como foi a Mamada?'
                  : 'Registrar Agora'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedMode === 'choose_type' ? (
          /* Step: Choose Breast vs Stock vs Formula */
          <div className="py-4 space-y-3 animate-in fade-in">
            <div className="text-xs text-slate-400 font-medium">
              Escolha onde o bebê mamou:
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  closeModal();
                  openModal('feedingDetail');
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-98 ${
                  isNightMode
                    ? 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 text-white'
                    : 'bg-purple-50 border-purple-200 text-purple-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤱</span>
                  <div>
                    <div className="font-bold text-sm">Direto no Peito</div>
                    <div className="text-[11px] text-slate-400">Cronômetro de sucção por mama (não consome estoque)</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400" />
              </button>

              <button
                type="button"
                onClick={() => setFeedMode('bottle_options')}
                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-98 ${
                  isNightMode
                    ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-white'
                    : 'bg-blue-50 border-blue-200 text-blue-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍼</span>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1.5">
                      Do Estoque de Leite
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-black uppercase">
                        Baixa Auto
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Saldo disponível: {inventorySummary.totalMl} ml (deduz pelo método FEFO)
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  closeModal();
                  openModal('feedingDetail');
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-98 ${
                  isNightMode
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥣</span>
                  <div>
                    <div className="font-bold text-sm">Fórmula Infantil</div>
                    <div className="text-[11px] text-slate-400">Preparo com pó e água</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        ) : feedMode === 'bottle_options' ? (
          /* Fast Bottle ML Selector with automatic inventory deduction */
          <div className="py-4 space-y-3 animate-in fade-in">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs text-blue-400">
              <span className="flex items-center gap-1.5 font-bold">
                <ArrowDownCircle className="w-4 h-4" />
                Baixa Automática FEFO Ativa
              </span>
              <span className="font-bold">Saldo: {inventorySummary.totalMl} ml</span>
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Escolha a quantidade consumida (salvamento imediato + baixa no frasco mais antigo):
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[30, 45, 60, 75, 90, 120].map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => handleBottleOption(ml)}
                  className={`py-3.5 px-2 rounded-2xl font-black text-sm border transition-all active:scale-95 flex flex-col items-center justify-center min-h-[56px] ${
                    isNightMode
                      ? 'bg-slate-900 border-slate-800 hover:border-blue-500 hover:bg-blue-600/10 text-white'
                      : 'bg-blue-50/80 border-blue-100 text-blue-950 hover:bg-blue-100'
                  }`}
                >
                  <span>{ml} ml</span>
                  <span className="text-[9px] font-normal text-blue-400 mt-0.5">Baixa Auto</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                closeModal();
                openModal('feedingDetail');
              }}
              className="w-full py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-blue-400 hover:text-blue-300 text-center block mt-2"
            >
              Outro volume personalizado →
            </button>
          </div>
        ) : (
          /* 6 Essential Quick Actions Grid */
          <div className="py-4 space-y-3">
            {/* Action 1 & 2: Mamada & Ordenha */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFeedMode('choose_type')}
                id="btn-quick-mamada"
                className={`p-3.5 rounded-2xl text-left border flex flex-col justify-between transition-all active:scale-95 min-h-[88px] ${
                  isNightMode
                    ? 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 text-white'
                    : 'bg-rose-50 border-rose-100 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                    <Milk className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                    Mamada
                  </span>
                </div>
                <div className="mt-2">
                  <div className="font-extrabold text-xs">🍼 Mamada</div>
                  <div className="text-[10px] text-slate-400 truncate">Peito ou Estoque (Auto)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeModal();
                  openModal('pumpingSession');
                }}
                id="btn-quick-ordenha"
                className={`p-3.5 rounded-2xl text-left border flex flex-col justify-between transition-all active:scale-95 min-h-[88px] ${
                  isNightMode
                    ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 text-white'
                    : 'bg-blue-50 border-blue-100 text-blue-950'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                    <Droplet className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                    Auto-Estoque
                  </span>
                </div>
                <div className="mt-2">
                  <div className="font-extrabold text-xs">🥛 Ordenha</div>
                  <div className="text-[10px] text-slate-400 truncate">Entrada direta no estoque</div>
                </div>
              </button>
            </div>

            {/* Action 3 & 4: Xixi & Cocô (1-Tap Instant Logging) */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handlePee1Tap}
                id="btn-quick-xixi"
                className={`p-3 rounded-2xl text-left border flex items-center gap-3 transition-all active:scale-95 min-h-[64px] ${
                  isNightMode
                    ? 'bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20 text-white'
                    : 'bg-sky-50 border-sky-100 text-sky-950'
                }`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-500 text-white text-base font-bold shrink-0">
                  💧
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs">Xixi (1 Toque)</div>
                  <div className="text-[10px] text-slate-400 truncate">Salva agora + Desfazer</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handlePoop1Tap}
                id="btn-quick-coco"
                className={`p-3 rounded-2xl text-left border flex items-center gap-3 transition-all active:scale-95 min-h-[64px] ${
                  isNightMode
                    ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-white'
                    : 'bg-amber-50 border-amber-100 text-amber-950'
                }`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-600 text-white text-base font-bold shrink-0">
                  💩
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs">Cocô (1 Toque)</div>
                  <div className="text-[10px] text-slate-400 truncate">Salva agora + Desfazer</div>
                </div>
              </button>
            </div>

            {/* Action 5, 6, 7 & 8: Sono, Medicamentos, Desconforto & Peso */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  closeModal();
                  openModal('medications');
                }}
                id="btn-quick-meds"
                className={`p-3 rounded-2xl text-left border flex items-center gap-2.5 transition-all active:scale-95 min-h-[56px] ${
                  isNightMode ? 'bg-rose-500/10 border-rose-500/20 text-white' : 'bg-rose-50 border-rose-100 text-rose-950'
                }`}
              >
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                  <Pill className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs">💊 Remédios</div>
                  <div className="text-[10px] text-slate-400 truncate">Dar dose & horários</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeModal();
                  openModal('sleepLog');
                }}
                id="btn-quick-sono"
                className={`p-3 rounded-2xl text-left border flex items-center gap-2.5 transition-all active:scale-95 min-h-[56px] ${
                  isNightMode ? 'bg-indigo-500/10 border-indigo-500/20 text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-950'
                }`}
              >
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                  <Moon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs">🌙 Sono</div>
                  <div className="text-[10px] text-slate-400 truncate">Soneca & noites</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeModal();
                  openModal('discomfort');
                }}
                id="btn-quick-desconforto"
                className={`p-3 rounded-2xl text-left border flex items-center gap-2.5 transition-all active:scale-95 min-h-[56px] ${
                  isNightMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                  <HeartCrack className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs">Desconforto</div>
                  <div className="text-[10px] text-slate-400 truncate">Gases, cólica, refluxo</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeModal();
                  openModal('weightDetail');
                }}
                id="btn-quick-peso"
                className={`p-3 rounded-2xl text-left border flex items-center gap-2.5 transition-all active:scale-95 min-h-[56px] ${
                  isNightMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs">Peso & Curva</div>
                  <div className="text-[10px] text-slate-400 truncate">Evolução OMS</div>
                </div>
              </button>
            </div>

            {/* Manual Retroactive Bar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  closeModal();
                  openModal('retroactiveLog');
                }}
                className={`w-full py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
                  isNightMode
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Registrar Evento com Data/Hora Passada</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
