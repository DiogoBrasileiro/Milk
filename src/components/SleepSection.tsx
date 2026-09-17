import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateBabyAge, formatDateTime } from '../utils/formatters';
import { SleepRecord } from '../types';
import {
  ArrowLeft,
  Moon,
  Sun,
  Clock,
  Plus,
  Play,
  Square,
  Edit2,
  Trash2,
  Sparkles,
  Bed,
  Info,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { SleepLogModal } from './SleepLogModal';

export const SleepSection: React.FC = () => {
  const {
    baby,
    sleepLogs,
    activeSleepTimer,
    startSleepTimer,
    stopSleepTimer,
    deleteSleepRecord,
    isNightMode,
    openModal,
    setActiveTab,
  } = useApp();

  const [selectedRecordToEdit, setSelectedRecordToEdit] = useState<SleepRecord | null>(null);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);

  const age = calculateBabyAge(baby.birthDate);

  // Compute today's sleep totals
  const todayDateStr = new Date().toDateString();
  const todaySleeps = sleepLogs.filter((s) => new Date(s.startTime).toDateString() === todayDateStr);

  const totalMinutesToday = todaySleeps.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHoursToday = Math.floor(totalMinutesToday / 60);
  const totalRemMinsToday = totalMinutesToday % 60;

  const dayNaps = todaySleeps.filter((s) => s.type === 'soneca_dia');
  const nightSleeps = todaySleeps.filter((s) => s.type === 'sono_noturno');

  const dayMinutes = dayNaps.reduce((acc, s) => acc + s.durationMinutes, 0);
  const nightMinutes = nightSleeps.reduce((acc, s) => acc + s.durationMinutes, 0);

  // Longest stretch today
  const longestStretchMins = todaySleeps.length > 0
    ? Math.max(...todaySleeps.map((s) => s.durationMinutes))
    : 0;

  // Last wake / sleep event
  const sortedSleeps = [...sleepLogs].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
  const lastSleep = sortedSleeps[0];

  // Time awake since last sleep ended
  let wakeTimeText = 'Calculando...';
  if (lastSleep && !activeSleepTimer.isSleeping) {
    const diffMs = Date.now() - new Date(lastSleep.endTime).getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    wakeTimeText = hours > 0 ? `${hours}h ${mins}min acordado(a)` : `${mins} min acordado(a)`;
  }

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto px-4 pt-4 animate-in fade-in">
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

      {/* Top Banner: Sleep Overview & Active Timer */}
      <div
        className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          activeSleepTimer.isSleeping
            ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
            : isNightMode
            ? 'bg-[#0f141c] border-slate-800 text-white'
            : 'bg-white border-slate-200/80 text-slate-900'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Controle de Sono & Sonecas
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeSleepTimer.isSleeping
                  ? 'bg-indigo-500 text-white animate-pulse'
                  : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {activeSleepTimer.isSleeping ? 'Dormindo Agora' : wakeTimeText}
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-black tracking-tight flex items-baseline gap-2">
            <span>
              {totalHoursToday}h {totalRemMinsToday}min
            </span>
            <span className="text-sm font-semibold text-slate-400">dormidos hoje</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Meta recomendada para {age.displayString}: <strong>14h a 17h/dia</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSleepTimer.isSleeping ? (
            <button
              onClick={() => setShowLogModal(true)}
              className="py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 active:scale-95 animate-bounce"
            >
              <Square className="w-4 h-4 fill-white" />
              Bebê Acordou!
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedRecordToEdit(null);
                setShowLogModal(true);
              }}
              className="py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Registrar Sono / Soneca
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards (Day Naps vs Night Sleep vs Longest Stretch) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Day Naps */}
        <div
          className={`p-4 rounded-3xl border transition-all ${
            isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Sonecas Diurnas</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Sun className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black mt-2">
            {Math.floor(dayMinutes / 60)}h {dayMinutes % 60}m
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{dayNaps.length} sonecas hoje</div>
        </div>

        {/* Night Sleep */}
        <div
          className={`p-4 rounded-3xl border transition-all ${
            isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Sono Noturno</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Moon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black mt-2">
            {Math.floor(nightMinutes / 60)}h {nightMinutes % 60}m
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{nightSleeps.length} blocos de sono</div>
        </div>

        {/* Longest Continuous Stretch */}
        <div
          className={`p-4 rounded-3xl border col-span-2 sm:col-span-1 transition-all ${
            isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Maior Trecho</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black mt-2">
            {Math.floor(longestStretchMins / 60)}h {longestStretchMins % 60}m
          </div>
          <div className="text-[11px] text-emerald-500 font-semibold mt-0.5">Sem despertares</div>
        </div>
      </div>

      {/* Sleep History & Detail Logs */}
      <div
        className={`p-6 rounded-3xl border shadow-sm transition-colors ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base">Histórico Completo de Sono</h3>
            <p className="text-xs text-slate-400">Todas as sonecas e sonos noturnos registrados</p>
          </div>
          <button
            onClick={() => {
              setSelectedRecordToEdit(null);
              setShowLogModal(true);
            }}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            + Adicionar Sono
          </button>
        </div>

        {sleepLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <Moon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p>Nenhum registro de sono ainda.</p>
            <button
              onClick={() => setShowLogModal(true)}
              className="py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              Registrar Primeira Soneca
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSleeps.map((record) => {
              const startFormatted = formatDateTime(record.startTime);
              const endFormatted = new Date(record.endTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const hours = Math.floor(record.durationMinutes / 60);
              const mins = record.durationMinutes % 60;

              return (
                <div
                  key={record.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
                    isNightMode
                      ? 'bg-slate-800/40 border-slate-700/80 hover:bg-slate-800/70'
                      : 'bg-slate-50 border-slate-200/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-2xl ${
                        record.type === 'soneca_dia'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-indigo-500/10 text-indigo-400'
                      }`}
                    >
                      {record.type === 'soneca_dia' ? (
                        <Sun className="w-5 h-5" />
                      ) : (
                        <Moon className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        <span>
                          {record.type === 'soneca_dia' ? 'Soneca do Dia' : 'Sono Noturno'}
                        </span>
                        <span className="font-mono text-slate-400 font-normal">
                          {startFormatted.split(',')[1] || startFormatted} às {endFormatted}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Local: <strong className="capitalize">{record.location}</strong></span>
                        <span>•</span>
                        <span>Qualidade: <strong className="capitalize">{record.quality}</strong></span>
                        {record.notes && (
                          <>
                            <span>•</span>
                            <span className="italic">"{record.notes}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      {hours > 0 ? `${hours}h ` : ''}
                      {mins}m
                    </span>
                    <button
                      onClick={() => {
                        setSelectedRecordToEdit(record);
                        setShowLogModal(true);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      title="Editar registro"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pediatric Sleep Guidelines / Janelas de Sono */}
      <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-3.5 text-xs text-slate-600 dark:text-slate-300">
        <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-indigo-500 block">
            Orientações Pediátricas: Janela de Sono & Vigília
          </span>
          <p>
            Bebês de <strong>0 a 3 meses</strong> toleram de <strong>45 a 90 minutos acordados</strong> entre sonecas. Ultrapassar essa janela pode levar ao esgotamento e dificultar o adormecer.
          </p>
        </div>
      </div>

      {/* Modal for Sleep Registration & Editing */}
      {showLogModal && (
        <SleepLogModal
          sleepRecord={selectedRecordToEdit}
          onClose={() => {
            setShowLogModal(false);
            setSelectedRecordToEdit(null);
          }}
        />
      )}
    </div>
  );
};
