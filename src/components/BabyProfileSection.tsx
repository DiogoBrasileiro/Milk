import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateBabyAge, formatDateTime, parseWeightToGrams, parseLengthToCm } from '../utils/formatters';
import { CONSERVATION_PROTOCOLS } from '../constants/medicalProtocols';
import {
  ArrowLeft,
  Baby,
  Scale,
  Clock,
  ShieldCheck,
  Users,
  Plus,
  Trash2,
  Download,
  Upload,
  Sparkles,
  CheckCircle2,
  Calendar,
  Heart,
  Save,
  Moon,
  Ruler,
} from 'lucide-react';
import { ConservationProtocolId } from '../types';

export const BabyProfileSection: React.FC = () => {
  const {
    baby,
    updateBaby,
    weights,
    addWeight,
    protocolId,
    setProtocolId,
    caregivers,
    addCaregiver,
    customReminderIntervalMinutes,
    setCustomReminderIntervalMinutes,
    isNightMode,
    toggleNightMode,
    exportDataJson,
    importDataJson,
    triggerUndoToast,
    setActiveTab,
  } = useApp();

  const age = calculateBabyAge(baby.birthDate);

  // Form states for baby profile
  const [name, setName] = useState(baby.name);
  const [birthDate, setBirthDate] = useState(baby.birthDate);
  const [currentWeight, setCurrentWeight] = useState(String((baby.currentWeight / 1000).toFixed(3).replace('.', ',')));
  const [currentLength, setCurrentLength] = useState(String(baby.currentLength || 50).replace('.', ','));
  const [birthWeight, setBirthWeight] = useState(String((baby.birthWeight / 1000).toFixed(3).replace('.', ',')));
  const [birthLength, setBirthLength] = useState(String(baby.birthLength || 49).replace('.', ','));
  const [pediatricianName, setPediatricianName] = useState(baby.pediatricianName || '');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // Form state for adding new weight & measurement entry
  const [newWeightInput, setNewWeightInput] = useState<string>(
    String((baby.currentWeight / 1000).toFixed(3).replace('.', ','))
  );
  const [newLengthInput, setNewLengthInput] = useState<string>(
    String(baby.currentLength || 50).replace('.', ',')
  );
  const [newHeadInput, setNewHeadInput] = useState<string>('');
  const [newWeightDate, setNewWeightDate] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [showAddWeight, setShowAddWeight] = useState(false);

  // Caregiver state
  const [newCaregiverName, setNewCaregiverName] = useState('');
  const [newCaregiverRole, setNewCaregiverRole] = useState<'mae' | 'pai' | 'avo' | 'baba' | 'outro'>('outro');

  const handleSaveBabyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCurrentWeight = parseWeightToGrams(currentWeight);
    const parsedCurrentLength = parseLengthToCm(currentLength);
    const parsedBirthWeight = parseWeightToGrams(birthWeight);
    const parsedBirthLength = parseLengthToCm(birthLength) || 49;

    if (parsedCurrentWeight <= 500) {
      alert('Por favor, informe um peso atual válido.');
      return;
    }

    // Atualiza o perfil do bebê
    updateBaby({
      name: name.trim(),
      birthDate,
      currentWeight: parsedCurrentWeight,
      currentLength: parsedCurrentLength,
      birthWeight: parsedBirthWeight,
      birthLength: parsedBirthLength,
      pediatricianName: pediatricianName.trim() || undefined,
    });

    // Se o peso ou comprimento for diferente da última medição registrada, cria um novo registro de pesagem
    const latestLog = weights[0];
    if (
      !latestLog ||
      latestLog.weightGrams !== parsedCurrentWeight ||
      (parsedCurrentLength && latestLog.lengthCm !== parsedCurrentLength)
    ) {
      addWeight({
        timestamp: new Date().toISOString(),
        weightGrams: parsedCurrentWeight,
        lengthCm: parsedCurrentLength,
        notes: 'Atualizado no Perfil do Bebê',
      });
    }

    setIsSavedSuccess(true);
    triggerUndoToast(
      `Dados atualizados: ${(parsedCurrentWeight / 1000).toFixed(3).replace('.', ',')} kg e ${parsedCurrentLength || 50} cm registrados!`,
      () => {}
    );
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  const handleAddWeightRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedWeight = parseWeightToGrams(newWeightInput);
    const parsedLength = parseLengthToCm(newLengthInput);
    const parsedHead = parseLengthToCm(newHeadInput);

    if (parsedWeight <= 500) {
      alert('Por favor, informe um peso válido acima de 500g.');
      return;
    }

    const timestampIso = newWeightDate ? new Date(newWeightDate).toISOString() : new Date().toISOString();

    addWeight({
      timestamp: timestampIso,
      weightGrams: parsedWeight,
      lengthCm: parsedLength,
      headCircumferenceCm: parsedHead,
      notes: 'Nova pesagem registrada no histórico',
    });

    updateBaby({
      currentWeight: parsedWeight,
      currentLength: parsedLength || baby.currentLength,
      headCircumference: parsedHead || baby.headCircumference,
    });

    setShowAddWeight(false);
    triggerUndoToast(
      `Nova pesagem registrada: ${(parsedWeight / 1000).toFixed(3).replace('.', ',')} kg${parsedLength ? ` e ${parsedLength} cm` : ''}!`,
      () => {}
    );
  };

  const handleAddCaregiver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaregiverName.trim()) return;

    addCaregiver({
      name: newCaregiverName.trim(),
      role: newCaregiverRole,
      avatarColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
    });

    setNewCaregiverName('');
    triggerUndoToast('Novo cuidador adicionado!', () => {});
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MilkFlow_Backup_${baby.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) {
          importDataJson(text);
          triggerUndoToast('Dados restaurados com sucesso!', () => {});
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto px-4 pt-4 animate-in fade-in">
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

      {/* Top Banner */}
      <div
        className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200/80 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-3xl shrink-0">
            👶
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
              Dados do Bebê & Configurações
            </span>
            <h2 className="text-2xl font-black tracking-tight mt-0.5">{baby.name || 'Bebê'}</h2>
            <p className="text-xs text-slate-400 mt-1">
              {age.displayString} • {(baby.currentWeight / 1000).toFixed(3).replace('.', ',')} kg
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleNightMode}
            className={`py-2.5 px-4 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all ${
              isNightMode ? 'bg-slate-800 border-slate-700 text-amber-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Moon className="w-4 h-4" />
            {isNightMode ? 'Modo Escuro Ativo' : 'Modo Claro'}
          </button>
        </div>
      </div>

      {/* Main Grid: Profile Form + Automated Routine Interval */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Baby Info Form (2 Cols) */}
        <div
          className={`md:col-span-2 p-6 rounded-3xl border shadow-sm space-y-4 ${
            isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Baby className="w-5 h-5 text-blue-500" />
              Identificação & Nascimento
            </h3>
            {isSavedSuccess && (
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Salvo!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveBabyProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Nome Completo do Bebê:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full p-3 rounded-2xl text-sm font-bold border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Data de Nascimento:</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={`w-full p-3 rounded-2xl text-sm font-bold border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mb-1">
                  <Scale className="w-3.5 h-3.5 text-emerald-500" />
                  Peso Atual (kg ou g):
                </label>
                <input
                  type="text"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(e.target.value)}
                  placeholder="Ex: 3,850 ou 3850"
                  className={`w-full p-3 rounded-2xl text-sm font-bold border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                  required
                />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  = {(parseWeightToGrams(currentWeight) / 1000).toFixed(3).replace('.', ',')} kg
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mb-1">
                  <Ruler className="w-3.5 h-3.5 text-blue-500" />
                  Comprimento Atual (cm):
                </label>
                <input
                  type="text"
                  value={currentLength}
                  onChange={(e) => setCurrentLength(e.target.value)}
                  placeholder="Ex: 51,5"
                  className={`w-full p-3 rounded-2xl text-sm font-bold border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                />
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1 block">
                  = {parseLengthToCm(currentLength) || 50} cm
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Peso ao Nascer (kg ou g):</label>
                <input
                  type="text"
                  value={birthWeight}
                  onChange={(e) => setBirthWeight(e.target.value)}
                  placeholder="Ex: 3,200 ou 3200"
                  className={`w-full p-3 rounded-2xl text-sm font-bold border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                  required
                />
                <span className="text-xs font-semibold text-slate-400 mt-1 block">
                  = {(parseWeightToGrams(birthWeight) / 1000).toFixed(3).replace('.', ',')} kg
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Comprimento ao Nascer (cm):</label>
                <input
                  type="text"
                  value={birthLength}
                  onChange={(e) => setBirthLength(e.target.value)}
                  placeholder="Ex: 49"
                  className={`w-full p-3 rounded-2xl text-sm font-bold border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                />
                <span className="text-xs font-semibold text-slate-400 mt-1 block">
                  = {parseLengthToCm(birthLength) || 49} cm
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Pediatra Responsável (Opcional):</label>
              <input
                type="text"
                value={pediatricianName}
                onChange={(e) => setPediatricianName(e.target.value)}
                placeholder="Ex: Dra. Mariana Costa • CRM 123456"
                className={`w-full p-3 rounded-2xl text-sm font-semibold border-2 outline-none ${
                  isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 placeholder:text-slate-400'
                }`}
              />
            </div>

            <button
              type="submit"
              className="py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações do Bebê
            </button>
          </form>
        </div>

        {/* Card 2: Intervalo de Mamada Automatizado */}
        <div
          className={`p-6 rounded-3xl border shadow-sm space-y-4 flex flex-col justify-between ${
            isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-base">Intervalo Automático</h3>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              O tempo da próxima mamada e os alarmes regressivos são geridos automaticamente com base no intervalo abaixo:
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { mins: 120, label: '2h00', desc: 'Recém-nascido' },
                { mins: 150, label: '2h30', desc: 'Livre demanda+' },
                { mins: 180, label: '3h00', desc: 'Padrão 1º mês' },
                { mins: 210, label: '3h30', desc: 'Transição' },
                { mins: 240, label: '4h00', desc: 'Noturno / 3m+' },
              ].map((opt) => (
                <button
                  key={opt.mins}
                  type="button"
                  onClick={() => setCustomReminderIntervalMinutes(opt.mins)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    customReminderIntervalMinutes === opt.mins
                      ? isNightMode
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-2 ring-amber-500/30'
                        : 'bg-amber-50 border-amber-600 text-amber-900 font-bold ring-2 ring-amber-500/20'
                      : isNightMode
                      ? 'bg-slate-900 border-slate-800 text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="text-sm font-black">{opt.label}</div>
                  <div className="text-[10px] opacity-75">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              Intervalo ativo: <strong>{customReminderIntervalMinutes / 60} horas</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Peso Histórico + Protocolo de Armazenamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Histórico de Pesagens */}
        <div
          className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
            isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-500" />
              Histórico de Peso (Evolução OMS)
            </h3>
            <button
              type="button"
              onClick={() => setShowAddWeight(!showAddWeight)}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddWeight ? 'Fechar' : 'Nova Pesagem'}
            </button>
          </div>

          {showAddWeight && (
            <form
              onSubmit={handleAddWeightRecord}
              className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3"
            >
              <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 block">
                Nova Medição do Bebê
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Peso (ex: 3,850 ou 3850):
                  </label>
                  <input
                    type="text"
                    value={newWeightInput}
                    onChange={(e) => setNewWeightInput(e.target.value)}
                    placeholder="Ex: 3,850"
                    className={`w-full p-2.5 rounded-xl text-sm font-bold border ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                    required
                  />
                  <span className="text-[10px] text-emerald-500 font-bold block mt-0.5">
                    = {(parseWeightToGrams(newWeightInput) / 1000).toFixed(3).replace('.', ',')} kg
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Comprimento (cm):
                  </label>
                  <input
                    type="text"
                    value={newLengthInput}
                    onChange={(e) => setNewLengthInput(e.target.value)}
                    placeholder="Ex: 51,5"
                    className={`w-full p-2.5 rounded-xl text-sm font-bold border ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Data e Hora:
                  </label>
                  <input
                    type="datetime-local"
                    value={newWeightDate}
                    onChange={(e) => setNewWeightDate(e.target.value)}
                    className={`w-full p-2 rounded-xl text-xs font-bold border ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shrink-0 shadow-sm"
                >
                  Salvar Pesagem & Medida
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {weights.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhuma pesagem gravada além do nascimento.</p>
            ) : (
              weights.map((w) => (
                <div
                  key={w.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isNightMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      {(w.weightGrams / 1000).toFixed(3).replace('.', ',')} kg
                    </span>
                    <span className="text-[11px] text-slate-400 block">{formatDateTime(w.timestamp)}</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {w.weightGrams}g
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Protocolo de Armazenamento de Leite */}
        <div
          className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
            isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <ShieldCheck className="w-5 h-5 text-purple-500" />
            <h3 className="font-extrabold text-base">Protocolo de Armazenamento de Leite</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            As validades do leite no Freezer e na Geladeira são calculadas com base no protocolo médico selecionado:
          </p>

          <div className="space-y-3">
            {Object.values(CONSERVATION_PROTOCOLS).map((proto) => (
              <button
                key={proto.id}
                type="button"
                onClick={() => setProtocolId(proto.id as ConservationProtocolId)}
                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                  protocolId === proto.id
                    ? isNightMode
                      ? 'bg-purple-500/20 border-purple-400 text-purple-200 ring-2 ring-purple-500/30'
                      : 'bg-purple-50 border-purple-600 text-purple-950 ring-2 ring-purple-500/20'
                    : isNightMode
                    ? 'bg-slate-900 border-slate-800 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{proto.name}</span>
                  {protocolId === proto.id && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                      ATIVO
                    </span>
                  )}
                </div>
                <div className="text-xs opacity-80 mt-1">{proto.description}</div>
                <div className="text-[11px] font-semibold mt-2 text-purple-600 dark:text-purple-300">
                  ❄️ Geladeira: {proto.fridgeHours}h • 🧊 Freezer: {proto.freezerDays} dias
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Cuidadores & Backup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Cuidadores da Família */}
        <div
          className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
            isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="font-extrabold text-base">Cuidadores da Família</h3>
          </div>

          <form onSubmit={handleAddCaregiver} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newCaregiverName}
                onChange={(e) => setNewCaregiverName(e.target.value)}
                placeholder="Nome do cuidador (ex: Papai, Vovó)"
                className={`w-full p-2.5 rounded-xl text-sm font-bold border-2 outline-none ${
                  isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 placeholder:text-slate-400'
                }`}
              />
              <select
                value={newCaregiverRole}
                onChange={(e) => setNewCaregiverRole(e.target.value as any)}
                className={`p-2.5 rounded-xl text-sm font-bold border-2 outline-none ${
                  isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                }`}
              >
                <option value="pai">Pai</option>
                <option value="mae">Mãe</option>
                <option value="avo">Avó/Avô</option>
                <option value="baba">Babá</option>
                <option value="outro">Outro</option>
              </select>
              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shrink-0 shadow-md shadow-blue-600/20"
              >
                Adicionar
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {caregivers.map((cg) => (
              <div
                key={cg.id}
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  isNightMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase"
                    style={{ backgroundColor: cg.avatarColor || '#3b82f6' }}
                  >
                    {cg.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{cg.name}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{cg.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Backup & Dados */}
        <div
          className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
            isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Download className="w-5 h-5 text-indigo-500" />
            <h3 className="font-extrabold text-base">Backup & Sincronização</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Exporte ou restaure todo o histórico de mamadas, ordenhas, fraldas e estoque em arquivo seguro JSON:
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95"
            >
              <Download className="w-4 h-4" />
              Exportar Backup
            </button>

            <label className="py-3 px-4 rounded-2xl border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              Restaurar Dados
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
