import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { DataIntegrityReport } from '../services/dataIntegrityService';

interface DataIntegrityBannerProps {
  report: DataIntegrityReport;
  onOpenModal: () => void;
  onDismiss?: () => void;
}

export const DataIntegrityBanner: React.FC<DataIntegrityBannerProps> = ({
  report,
  onOpenModal,
  onDismiss,
}) => {
  // If 100% healthy, we only show subtle status or hide unless triggered
  if (report.healthStatus === 'healthy') {
    return null;
  }

  const isCritical = report.healthStatus === 'conflict_detected';

  return (
    <div
      className={`w-full rounded-2xl p-3.5 mb-4 border transition-all animate-fade-in flex items-center justify-between gap-3 ${
        isCritical
          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
          : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isCritical
              ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300'
              : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300'
          }`}
        >
          {isCritical ? (
            <ShieldAlert className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {isCritical ? 'Inconsistência de Dados Detectada' : 'Aviso de Integridade dos Registros'}
            </span>
            <span
              className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                isCritical
                  ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                  : 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
              }`}
            >
              {report.issues.length} {report.issues.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 truncate mt-0.5">
            {report.summaryMessage}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenModal}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm ${
            isCritical
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          <span>Examinar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
            title="Ocultar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
