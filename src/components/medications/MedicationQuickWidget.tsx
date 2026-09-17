import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Medication } from '../../types';
import { Pill, Clock, Plus, CheckCircle2, Check, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';

interface MedicationQuickWidgetProps {
  onOpenFullModal: () => void;
}

export const MedicationQuickWidget: React.FC<MedicationQuickWidgetProps> = ({
  onOpenFullModal,
}) => {
  const { medications, medicationLogs, administerMedicationDose, openModal } = useApp();
  const [justGivenId, setJustGivenId] = useState<string | null>(null);

  const activeMeds = medications.filter((m) => m.active !== false);

  const handleQuickGive = (med: Medication, e: React.MouseEvent) => {
    e.stopPropagation();
    administerMedicationDose(med.id);
    setJustGivenId(med.id);
    setTimeout(() => setJustGivenId(null), 3000);
  };

  if (activeMeds.length === 0) {
    return (
      <div
        onClick={onOpenFullModal}
        className="p-4 rounded-3xl bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-purple-500/10 border border-rose-200/60 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-800 transition-all cursor-pointer shadow-sm group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                  Controle de Medicamentos
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold">
                  Novo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cadastre os remédios do bebê para horários e lembretes compartilhados
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm flex-shrink-0 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
              Medicamentos & Tratamentos
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              Sincronizado em tempo real entre os aparelhos
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenFullModal}
          className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-0.5"
        >
          <span>Ver Todos ({activeMeds.length})</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid of quick medicine cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {activeMeds.slice(0, 4).map((med) => {
          const logs = medicationLogs.filter((l) => l.medicationId === med.id);
          const lastLog = logs[0];
          const isJustGiven = justGivenId === med.id;

          let lastText = 'Nenhuma dose ainda';
          let nextText = '';
          if (lastLog) {
            const date = new Date(lastLog.administeredAt || lastLog.createdAt);
            const isToday = date.toDateString() === new Date().toDateString();
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            lastText = isToday
              ? `Última: hoje às ${timeStr} (${lastLog.givenByCaregiverName?.split(' ')[0] || 'Cuidador'})`
              : `Última: ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${timeStr}`;

            if (med.scheduleType === 'interval' && med.intervalHours) {
              const nextTime = new Date(date.getTime() + med.intervalHours * 60 * 60 * 1000);
              const isDue = Date.now() >= nextTime.getTime();
              const nextTimeStr = nextTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              nextText = isDue ? `⚠️ Devida às ${nextTimeStr}` : `Próx: ${nextTimeStr}`;
            }
          } else if (med.scheduleType === 'interval' && med.intervalHours) {
            nextText = `A cada ${med.intervalHours}h`;
          } else if (med.scheduleType === 'specific_times' && med.specificTimes) {
            nextText = `Horários: ${med.specificTimes.join(', ')}`;
          } else {
            nextText = 'Sob demanda (SOS)';
          }

          return (
            <div
              key={med.id}
              onClick={onOpenFullModal}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                isJustGiven
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-rose-300 dark:hover:border-rose-800'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 text-xs shadow-sm"
                  style={{ backgroundColor: med.color || '#ec4899' }}
                >
                  💊
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h5 className="font-bold text-xs truncate text-slate-800 dark:text-slate-200">
                      {med.name}
                    </h5>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    <strong className="text-rose-500 font-bold">{med.dosage} {med.dosageUnit}</strong>
                    {nextText && <span> • {nextText}</span>}
                  </div>
                  <div className="text-[9px] text-slate-400 truncate mt-0.5">
                    {lastText}
                  </div>
                </div>
              </div>

              {/* 1-Tap Give Dose Button */}
              <button
                type="button"
                onClick={(e) => handleQuickGive(med, e)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 flex-shrink-0 transition-all shadow-sm ${
                  isJustGiven
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                }`}
                title="Registrar dose dada agora"
              >
                {isJustGiven ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Dada!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Dar Dose</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
