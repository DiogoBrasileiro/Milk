import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Medication, MedicationDosageUnit, MedicationPurpose, MedicationScheduleType } from '../../types';
import { Pill, Clock, Calendar, AlertCircle, Sparkles, Check, X, ShieldAlert, Heart } from 'lucide-react';

interface AddEditMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicationToEdit?: Medication | null;
}

const COMMON_MEDICATIONS = [
  { name: 'Simeticona (Luftal)', dosage: '5', unit: 'gotas', purpose: 'colica_gases' as MedicationPurpose, color: '#06b6d4' },
  { name: 'Paracetamol Bebê', dosage: '0.5', unit: 'ml', purpose: 'febre' as MedicationPurpose, color: '#f43f5e' },
  { name: 'Dipirona Gotas', dosage: '4', unit: 'gotas', purpose: 'febre' as MedicationPurpose, color: '#e11d48' },
  { name: 'Vitamina D (Ad-Til)', dosage: '2', unit: 'gotas', purpose: 'vitaminas' as MedicationPurpose, color: '#f59e0b' },
  { name: 'Probiótico (Colikids)', dosage: '5', unit: 'gotas', purpose: 'colica_gases' as MedicationPurpose, color: '#10b981' },
  { name: 'Soro Fisiológico 0.9%', dosage: '1', unit: 'spray', purpose: 'outro' as MedicationPurpose, color: '#3b82f6' },
  { name: 'Amoxicilina (Antibiótico)', dosage: '2.5', unit: 'ml', purpose: 'antibiotico' as MedicationPurpose, color: '#8b5cf6' },
];

const COLOR_OPTIONS = [
  '#3b82f6', // blue
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f43f5e', // rose
];

export const AddEditMedicationModal: React.FC<AddEditMedicationModalProps> = ({
  isOpen,
  onClose,
  medicationToEdit,
}) => {
  const { addMedication, updateMedication, isNightMode } = useApp();

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [dosageUnit, setDosageUnit] = useState<MedicationDosageUnit>('gotas');
  const [purpose, setPurpose] = useState<MedicationPurpose>('colica_gases');
  const [scheduleType, setScheduleType] = useState<MedicationScheduleType>('interval');
  const [intervalHours, setIntervalHours] = useState<number>(8);
  const [specificTimes, setSpecificTimes] = useState<string[]>(['08:00', '16:00', '00:00']);
  const [firstDoseTime, setFirstDoseTime] = useState<string>(() => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  });
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [treatmentDurationDays, setTreatmentDurationDays] = useState<string>('continuous');
  const [endDate, setEndDate] = useState<string>('');
  const [instructions, setInstructions] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (medicationToEdit) {
      setName(medicationToEdit.name);
      setDosage(medicationToEdit.dosage);
      setDosageUnit(medicationToEdit.dosageUnit);
      setPurpose(medicationToEdit.purpose || 'outro');
      setScheduleType(medicationToEdit.scheduleType);
      setIntervalHours(medicationToEdit.intervalHours || 8);
      setSpecificTimes(medicationToEdit.specificTimes || ['08:00', '16:00', '00:00']);
      setStartDate(medicationToEdit.startDate);
      setEndDate(medicationToEdit.endDate || '');
      setTreatmentDurationDays(medicationToEdit.endDate ? 'fixed' : 'continuous');
      setInstructions(medicationToEdit.instructions || '');
      setPrescribedBy(medicationToEdit.prescribedBy || '');
      setColor(medicationToEdit.color || '#3b82f6');
      setActive(medicationToEdit.active !== false);
    } else {
      setName('');
      setDosage('');
      setDosageUnit('gotas');
      setPurpose('colica_gases');
      setScheduleType('interval');
      setIntervalHours(8);
      setSpecificTimes(['08:00', '16:00', '00:00']);
      setStartDate(new Date().toISOString().split('T')[0]);
      setTreatmentDurationDays('continuous');
      setEndDate('');
      setInstructions('');
      setPrescribedBy('');
      setColor('#3b82f6');
      setActive(true);
    }
    setError(null);
  }, [medicationToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSelectQuickMed = (med: typeof COMMON_MEDICATIONS[0]) => {
    setName(med.name);
    setDosage(med.dosage);
    setDosageUnit(med.unit as MedicationDosageUnit);
    setPurpose(med.purpose);
    setColor(med.color);
  };

  const handleCalculateEndDate = (days: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + days);
    setEndDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Informe o nome do medicamento.');
      return;
    }
    if (!dosage.trim()) {
      setError('Informe a dosagem do medicamento.');
      return;
    }

    let calculatedEndDate = undefined;
    if (treatmentDurationDays === 'fixed' && endDate) {
      calculatedEndDate = endDate;
    }

    const payload = {
      name: name.trim(),
      dosage: dosage.trim(),
      dosageUnit,
      purpose,
      scheduleType,
      intervalHours: scheduleType === 'interval' ? Number(intervalHours) : undefined,
      specificTimes: scheduleType === 'specific_times' ? specificTimes.filter(Boolean) : undefined,
      firstDoseTime: scheduleType === 'interval' ? `${startDate}T${firstDoseTime}:00` : undefined,
      startDate,
      endDate: calculatedEndDate,
      instructions: instructions.trim() || undefined,
      prescribedBy: prescribedBy.trim() || undefined,
      color,
      active,
    };

    if (medicationToEdit) {
      updateMedication(medicationToEdit.id, payload);
    } else {
      addMedication(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border ${
          isNightMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">
                {medicationToEdit ? 'Editar Medicamento' : 'Cadastrar Medicamento'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Horários, dosagens e lembretes compartilhados
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick suggestions pills (only for new) */}
          {!medicationToEdit && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                💡 Sugestões Rápidas:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_MEDICATIONS.map((med, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectQuickMed(med)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 dark:hover:bg-rose-500/20 transition-all border border-slate-200 dark:border-slate-700/60"
                  >
                    {med.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Medication Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Nome do Medicamento / Remédio *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Paracetamol Infantil, Luftal, Vitamina D..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          {/* Dosage and Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Quantidade / Dose *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 5, 0.5, 1"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Unidade de Medida
              </label>
              <select
                value={dosageUnit}
                onChange={(e) => setDosageUnit(e.target.value as MedicationDosageUnit)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
              >
                <option value="gotas">gotas</option>
                <option value="ml">ml (mililitros)</option>
                <option value="mg">mg (miligramas)</option>
                <option value="spray">spray / borrifada</option>
                <option value="flaconete">flaconete</option>
                <option value="comprimido">comprimido</option>
                <option value="colher">colher medidora</option>
                <option value="outro">outro</option>
              </select>
            </div>
          </div>

          {/* Purpose / Category */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Finalidade / Categoria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'colica_gases', label: '💨 Cólica / Gases' },
                { id: 'febre', label: '🌡️ Febre' },
                { id: 'dor', label: '🩹 Dor' },
                { id: 'vitaminas', label: '☀️ Vitaminas' },
                { id: 'antibiotico', label: '💊 Antibiótico' },
                { id: 'antialergico', label: '🛡️ Antialérgico' },
                { id: 'refluxo', label: '🥛 Refluxo' },
                { id: 'outro', label: '🩺 Outro' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setPurpose(cat.id as MedicationPurpose)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                    purpose === cat.id
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Configuration */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              ⏰ Como administrar os horários?
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setScheduleType('interval')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border ${
                  scheduleType === 'interval'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                A cada X horas
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('specific_times')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border ${
                  scheduleType === 'specific_times'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Horários Fixos
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('as_needed')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border ${
                  scheduleType === 'as_needed'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Se Necessário (SOS)
              </button>
            </div>

            {/* Interval Options */}
            {scheduleType === 'interval' && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                      Intervalo de tempo:
                    </label>
                    <select
                      value={intervalHours}
                      onChange={(e) => setIntervalHours(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold outline-none"
                    >
                      <option value={4}>A cada 4 horas (6x ao dia)</option>
                      <option value={6}>A cada 6 horas (4x ao dia)</option>
                      <option value={8}>A cada 8 horas (3x ao dia)</option>
                      <option value={12}>A cada 12 horas (2x ao dia)</option>
                      <option value={24}>A cada 24 horas (1x ao dia)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                      Horário da 1ª Dose:
                    </label>
                    <input
                      type="time"
                      value={firstDoseTime}
                      onChange={(e) => setFirstDoseTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Fixed Times */}
            {scheduleType === 'specific_times' && (
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">
                  Defina os horários programados do dia:
                </label>
                <div className="flex flex-wrap gap-2">
                  {specificTimes.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
                      <input
                        type="time"
                        value={t}
                        onChange={(e) => {
                          const updated = [...specificTimes];
                          updated[idx] = e.target.value;
                          setSpecificTimes(updated);
                        }}
                        className="bg-transparent text-xs font-bold outline-none px-1"
                      />
                      {specificTimes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSpecificTimes(specificTimes.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-600 px-1 font-bold text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSpecificTimes([...specificTimes, '12:00'])}
                    className="px-2.5 py-1.5 rounded-xl border border-dashed border-indigo-400 text-indigo-500 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                  >
                    + Horário
                  </button>
                </div>
              </div>
            )}

            {scheduleType === 'as_needed' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                O remédio ficará disponível no painel para registrar a qualquer momento quando for administrado.
              </p>
            )}
          </div>

          {/* Treatment Duration & Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Início do Tratamento
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Duração do Tratamento
              </label>
              <select
                value={treatmentDurationDays}
                onChange={(e) => {
                  setTreatmentDurationDays(e.target.value);
                  if (e.target.value === '5') handleCalculateEndDate(5);
                  if (e.target.value === '7') handleCalculateEndDate(7);
                  if (e.target.value === '10') handleCalculateEndDate(10);
                  if (e.target.value === '14') handleCalculateEndDate(14);
                  if (e.target.value === 'continuous') setEndDate('');
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
              >
                <option value="continuous">Uso Contínuo / Sem data fim</option>
                <option value="5">5 dias</option>
                <option value="7">7 dias (1 semana)</option>
                <option value="10">10 dias</option>
                <option value="14">14 dias (2 semanas)</option>
                <option value="fixed">Data específica...</option>
              </select>
            </div>
          </div>

          {treatmentDurationDays === 'fixed' && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Data Final do Tratamento
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
              />
            </div>
          )}

          {/* Instructions & Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Instruções de Uso / Observações
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Dar 10 minutos antes da mamada. Não misturar na mamadeira."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none resize-none"
            />
          </div>

          {/* Prescribed By & Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Prescrito por (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Dr. Roberto (Pediatra)"
                value={prescribedBy}
                onChange={(e) => setPrescribedBy(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Cor de Destaque
              </label>
              <div className="flex items-center gap-1.5 py-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Active status toggle (for edit) */}
          {medicationToEdit && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs font-bold">Status do Tratamento</div>
                <div className="text-[11px] text-slate-400">
                  {active ? 'Tratamento em andamento' : 'Tratamento finalizado / arquivado'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  active ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {active ? 'Ativo' : 'Finalizado'}
              </button>
            </div>
          )}

          {/* Submit buttons */}
          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-500/20"
            >
              {medicationToEdit ? 'Salvar Alterações' : 'Salvar Medicamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
