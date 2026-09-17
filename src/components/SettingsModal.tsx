import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CONSERVATION_PROTOCOLS } from '../constants/medicalProtocols';
import { Settings, ShieldCheck, Moon, Users, Download, Upload, X, Check, Baby, Sparkles, Cloud } from 'lucide-react';
import { ConservationProtocolId } from '../types';
import { SUPABASE_URL } from '../lib/supabaseClient';

export const SettingsModal: React.FC = () => {
  const {
    closeModal,
    protocolId,
    setProtocolId,
    isNightMode,
    toggleNightMode,
    caregivers,
    addCaregiver,
    baby,
    updateBaby,
    exportDataJson,
    importDataJson,
  } = useApp();

  const [newCaregiverName, setNewCaregiverName] = useState('');
  const [newCaregiverRole, setNewCaregiverRole] = useState<'mae' | 'pai' | 'avo' | 'baba' | 'outro'>('outro');
  const [babyName, setBabyName] = useState(baby.name);
  const [babyWeight, setBabyWeight] = useState(baby.currentWeight);
  const [babyBirthDate, setBabyBirthDate] = useState(baby.birthDate);

  const handleAddCaregiver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaregiverName.trim()) return;
    addCaregiver({
      name: newCaregiverName.trim(),
      role: newCaregiverRole,
      avatarColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
    });
    setNewCaregiverName('');
  };

  const handleSaveBaby = () => {
    updateBaby({
      name: babyName,
      currentWeight: babyWeight,
      birthDate: babyBirthDate,
    });
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MilkFlowBaby_Backup_${baby.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
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
          closeModal();
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-xl rounded-3xl p-6 shadow-2xl border max-h-[92vh] overflow-y-auto ${
          isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Configurações & Protocolos</h2>
              <p className="text-xs text-slate-400">Regras de conservação, perfil e cuidadores</p>
            </div>
          </div>
          <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-6">
          {/* Baby profile update */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Perfil do Bebê
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Nome:</label>
                <input
                  type="text"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-sm font-bold border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Peso Atual (g):</label>
                <input
                  type="number"
                  value={babyWeight}
                  onChange={(e) => setBabyWeight(parseInt(e.target.value) || 0)}
                  className={`w-full p-2.5 rounded-xl text-sm font-bold border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Nascimento:</label>
                <input
                  type="date"
                  value={babyBirthDate}
                  onChange={(e) => setBabyBirthDate(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-sm font-bold border-2 outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>
            <button
              onClick={handleSaveBaby}
              className="py-2 px-4 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
            >
              Salvar Dados do Bebê
            </button>
          </div>

          {/* Conservation Protocol Selector */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Protocolo de Validade & Conservação
              </span>
            </div>

            <div className="space-y-2">
              {Object.values(CONSERVATION_PROTOCOLS).map((proto) => {
                const isSelected = protocolId === proto.id;
                return (
                  <div
                    key={proto.id}
                    onClick={() => setProtocolId(proto.id)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? isNightMode
                          ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30'
                          : 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/30'
                        : isNightMode
                        ? 'bg-slate-900 border-slate-700 hover:bg-slate-800/70'
                        : 'bg-white border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-black text-sm">{proto.name}</div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-amber-400 font-bold" />}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {proto.description}
                    </div>
                    <div className="flex gap-3 text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">
                      <span>❄️ Geladeira: {proto.fridgeHours}h</span>
                      <span>•</span>
                      <span>🧊 Freezer: {proto.freezerDays} dias</span>
                      <span>•</span>
                      <span>💧 Descongelado: {proto.thawedFridgeHours}h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Caregivers Management */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Cuidadores & Família
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {caregivers.map((cg) => (
                <div
                  key={cg.id}
                  className={`p-2.5 rounded-xl border-2 flex items-center gap-2 ${
                    isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cg.avatarColor || '#3b82f6' }}
                  />
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold truncate">{cg.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{cg.role}</div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCaregiver} className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                value={newCaregiverName}
                onChange={(e) => setNewCaregiverName(e.target.value)}
                placeholder="Nome do cuidador"
                className={`flex-1 p-2.5 rounded-xl text-sm font-bold border-2 outline-none ${
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
                <option value="mae">Mãe</option>
                <option value="pai">Pai</option>
                <option value="avo">Avó / Avô</option>
                <option value="baba">Babá</option>
                <option value="outro">Outro</option>
              </select>
              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-blue-600 text-white font-black text-xs hover:bg-blue-700 shadow-md shadow-blue-600/20"
              >
                + Adicionar
              </button>
            </form>
          </div>

          {/* Supabase Cloud Connection */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Banco de Dados em Nuvem (Supabase)
            </span>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Supabase Conectado
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[220px] sm:max-w-xs">
                    poagmqrrbscemlqqccfe.supabase.co
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-1 rounded-lg">
                Ativo
              </span>
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Backup & Dados
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadBackup}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Download className="w-4 h-4" />
                Baixar Backup (JSON)
              </button>
              <label className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <Upload className="w-4 h-4" />
                Restaurar Backup
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={closeModal}
            className="w-full py-3 rounded-2xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
