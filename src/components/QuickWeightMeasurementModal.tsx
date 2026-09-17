import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { parseWeightToGrams, parseLengthToCm, calculateBabyAge } from '../utils/formatters';
import { Scale, Ruler, Calendar, Sparkles, X, Check, TrendingUp } from 'lucide-react';

interface QuickWeightMeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickWeightMeasurementModal: React.FC<QuickWeightMeasurementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { baby, weights, addWeight, updateBaby, isNightMode, triggerUndoToast } = useApp();

  const getLocalDateTimeString = (d: Date = new Date()) => {
    const copy = new Date(d);
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().slice(0, 16);
  };

  const [weightInput, setWeightInput] = useState<string>('');
  const [lengthInput, setLengthInput] = useState<string>('');
  const [headInput, setHeadInput] = useState<string>('');
  const [dateTime, setDateTime] = useState<string>(getLocalDateTimeString());
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inicializar com os valores atuais do bebê quando abrir
  useEffect(() => {
    if (isOpen) {
      const initialWeightStr = baby.currentWeight
        ? (baby.currentWeight / 1000).toFixed(3).replace('.', ',')
        : '3,500';
      setWeightInput(initialWeightStr);
      setLengthInput(baby.currentLength ? String(baby.currentLength).replace('.', ',') : '50');
      setHeadInput(baby.headCircumference ? String(baby.headCircumference).replace('.', ',') : '');
      setDateTime(getLocalDateTimeString());
      setNotes('');
    }
  }, [isOpen, baby]);

  if (!isOpen) return null;

  const parsedGrams = parseWeightToGrams(weightInput);
  const parsedLengthCm = parseLengthToCm(lengthInput);
  const parsedHeadCm = parseLengthToCm(headInput);

  // Comparação com última pesagem
  const latestWeight = weights[0]?.weightGrams || baby.birthWeight;
  const weightDiffGrams = parsedGrams > 0 && latestWeight > 0 ? parsedGrams - latestWeight : 0;

  const handlePresetDate = (type: 'now' | 'today_morning' | 'yesterday_morning') => {
    const d = new Date();
    if (type === 'today_morning') {
      d.setHours(8, 0, 0, 0);
    } else if (type === 'yesterday_morning') {
      d.setDate(d.getDate() - 1);
      d.setHours(8, 0, 0, 0);
    }
    setDateTime(getLocalDateTimeString(d));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedGrams <= 500) {
      alert('Por favor, informe um peso válido (acima de 500g).');
      return;
    }

    setIsSubmitting(true);
    const timestampIso = dateTime ? new Date(dateTime).toISOString() : new Date().toISOString();

    // 1. Registra no histórico de pesagens
    addWeight({
      timestamp: timestampIso,
      weightGrams: parsedGrams,
      lengthCm: parsedLengthCm || undefined,
      headCircumferenceCm: parsedHeadCm || undefined,
      notes: notes.trim() || 'Pesagem registrada no dashboard',
    });

    // 2. Atualiza imediatamente o perfil do bebê com o novo peso e medida
    updateBaby({
      currentWeight: parsedGrams,
      currentLength: parsedLengthCm || baby.currentLength,
      headCircumference: parsedHeadCm || baby.headCircumference,
    });

    const weightKgStr = (parsedGrams / 1000).toFixed(3).replace('.', ',');
    const lengthStr = parsedLengthCm ? ` e ${parsedLengthCm} cm` : '';
    triggerUndoToast(`Novo peso de ${weightKgStr} kg${lengthStr} salvo com sucesso!`, () => {});

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-500">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Registrar Novo Peso & Medida</h2>
              <p className="text-xs text-slate-400">
                Atualiza o perfil do bebê e adiciona ao histórico da OMS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Atalhos de data/hora */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Data e Hora da Pesagem:
              </label>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => handlePresetDate('now')}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white font-semibold transition-colors"
                >
                  Agora
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDate('today_morning')}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white font-semibold transition-colors"
                >
                  Hoje 08:00
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDate('yesterday_morning')}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white font-semibold transition-colors"
                >
                  Ontem 08:00
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className={`w-full p-3 rounded-2xl text-xs font-bold border-2 outline-none ${
                isNightMode
                  ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
              }`}
              required
            />
          </div>

          {/* Peso (kg ou g) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-emerald-500" />
                Novo Peso (em Kg ou Gramas):
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                Aceita: 3,850 ou 3850
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="Ex: 3,850 ou 3850"
                className={`w-full p-3.5 pr-14 rounded-2xl text-lg font-black border-2 outline-none ${
                  isNightMode
                    ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                }`}
                required
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                {parsedGrams <= 30 ? 'kg' : 'g / kg'}
              </span>
            </div>

            {/* Helper de Conversão e Diferença */}
            <div className="flex items-center justify-between flex-wrap gap-1 px-1 text-xs">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {parsedGrams > 0 ? (
                  <>
                    = <strong>{(parsedGrams / 1000).toFixed(3).replace('.', ',')} kg</strong> ({parsedGrams} g)
                  </>
                ) : (
                  'Digite o peso'
                )}
              </span>

              {weightDiffGrams !== 0 && (
                <span
                  className={`text-[11px] font-extrabold flex items-center gap-0.5 ${
                    weightDiffGrams > 0
                      ? 'text-emerald-500'
                      : 'text-amber-500'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  {weightDiffGrams > 0 ? `+${weightDiffGrams}g` : `${weightDiffGrams}g`} em relação à anterior
                </span>
              )}
            </div>
          </div>

          {/* Medidas: Comprimento e Perímetro Cefálico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-blue-500" />
                Nova Medida / Estatura (cm):
              </label>
              <input
                type="text"
                value={lengthInput}
                onChange={(e) => setLengthInput(e.target.value)}
                placeholder="Ex: 51,5"
                className={`w-full p-3 rounded-2xl text-base font-black border-2 outline-none ${
                  isNightMode
                    ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                }`}
              />
              <span className="text-[10px] text-slate-400 px-1 block">
                {parsedLengthCm ? `${parsedLengthCm} cm de comprimento` : 'Opcional'}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Perímetro Cefálico (cm):
              </label>
              <input
                type="text"
                value={headInput}
                onChange={(e) => setHeadInput(e.target.value)}
                placeholder="Ex: 35,5"
                className={`w-full p-3 rounded-2xl text-base font-black border-2 outline-none ${
                  isNightMode
                    ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                }`}
              />
              <span className="text-[10px] text-slate-400 px-1 block">
                {parsedHeadCm ? `${parsedHeadCm} cm de crânio` : 'Opcional (Pediatra)'}
              </span>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Observações / Local da Pesagem:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Consulta 1 mês no pediatra, balança digital de casa..."
              className={`w-full p-3 rounded-2xl text-xs font-medium border-2 outline-none ${
                isNightMode
                  ? 'bg-slate-900 border-slate-700 text-white focus:border-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-slate-400'
              }`}
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-2xl border text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Novo Peso & Medida</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
