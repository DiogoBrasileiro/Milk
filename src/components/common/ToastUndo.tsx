import React from 'react';
import { UndoToastState } from '../../types';
import { Check, RotateCcw, X } from 'lucide-react';

interface ToastUndoProps {
  toast: UndoToastState | null;
  onClose: () => void;
}

export const ToastUndo: React.FC<ToastUndoProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="w-full max-w-sm bg-slate-950/95 border border-slate-700/80 backdrop-blur-md shadow-2xl rounded-2xl p-3 text-white flex items-center justify-between pointer-events-auto gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="text-xs font-bold truncate text-slate-100">{toast.message}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              toast.onUndo();
              onClose();
            }}
            className="py-1.5 px-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 active:scale-95 shadow-sm hover:bg-amber-300"
          >
            <RotateCcw className="w-3 h-3 stroke-[2.5]" />
            <span>DESFAZER</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
