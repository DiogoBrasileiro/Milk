import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Caregiver, CaregiverRole } from '../types';
import {
  Users,
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  Smartphone,
  Copy,
  UserCheck,
  Heart,
  Shield,
  Baby,
} from 'lucide-react';

interface FamilyGroupModalProps {
  onClose: () => void;
}

const CAREGIVER_ROLES: { id: CaregiverRole; label: string; icon: string }[] = [
  { id: 'mae', label: 'Mãe', icon: '👩' },
  { id: 'pai', label: 'Pai', icon: '👨' },
  { id: 'cuidador', label: 'Cuidador(a) / Babá / Avós', icon: '🧑' },
  { id: 'admin', label: 'Pediatra / Especialista', icon: '🩺' },
];

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#6366f1', // Indigo
];

export const FamilyGroupModal: React.FC<FamilyGroupModalProps> = ({ onClose }) => {
  const {
    caregivers,
    activeCaregiver,
    setActiveCaregiver,
    addCaregiver,
    updateCaregiver,
    deleteCaregiver,
    baby,
    isNightMode,
  } = useApp();

  const { currentFamily, updateFamilyName } = useAuth();

  const [copiedCode, setCopiedCode] = useState(false);
  const [isEditingFamilyName, setIsEditingFamilyName] = useState(false);
  const [familyNameInput, setFamilyNameInput] = useState(currentFamily?.name || `Família ${baby.name}`);

  // Form State for Add / Edit Caregiver
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCaregiverId, setEditingCaregiverId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<CaregiverRole>('cuidador');
  const [avatarColor, setAvatarColor] = useState(PRESET_COLORS[0]);

  const pairingCode = currentFamily?.pairingCode || '641306';

  const handleCopyCode = () => {
    if (navigator.clipboard && pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSaveFamilyName = () => {
    if (familyNameInput.trim()) {
      updateFamilyName(familyNameInput.trim());
      setIsEditingFamilyName(false);
    }
  };

  const openAddForm = () => {
    setEditingCaregiverId(null);
    setName('');
    setRole('cuidador');
    setAvatarColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIsFormOpen(true);
  };

  const openEditForm = (cg: Caregiver) => {
    setEditingCaregiverId(cg.id);
    setName(cg.name);
    setRole(cg.role);
    setAvatarColor(cg.avatarColor || PRESET_COLORS[0]);
    setIsFormOpen(true);
  };

  const handleSaveCaregiver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCaregiverId) {
      updateCaregiver(editingCaregiverId, {
        name: name.trim(),
        role,
        avatarColor,
      });
    } else {
      const newCg = addCaregiver({
        name: name.trim(),
        role,
        avatarColor,
      });
      if (newCg) {
        setActiveCaregiver(newCg);
      }
    }

    setIsFormOpen(false);
    setEditingCaregiverId(null);
  };

  const handleDeleteCaregiver = (id: string, cgName: string) => {
    if (confirm(`Deseja remover "${cgName}" do grupo familiar? Os históricos já registrados continuarão salvos.`)) {
      deleteCaregiver(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isNightMode ? 'bg-[#121722] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Grupo Familiar & Cuidadores</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie quem cuida e registra a rotina de {baby.name}
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* 1. FAMILY NAME & PAIRING CODE CARD */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white space-y-3 shadow-md">
            <div className="flex items-center justify-between gap-2">
              {isEditingFamilyName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={familyNameInput}
                    onChange={(e) => setFamilyNameInput(e.target.value)}
                    className="py-1 px-2 rounded-lg bg-white text-slate-900 text-sm font-bold w-full outline-none"
                    placeholder="Nome do grupo familiar"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveFamilyName}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-black text-base">{currentFamily?.name || `Família de ${baby.name}`}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingFamilyName(true)}
                    className="p-1 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Editar nome da família"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider">
                Multi-Aparelho
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/20 backdrop-blur-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-200 shrink-0" />
                <div>
                  <span className="text-[10px] text-white/70 block uppercase font-bold">Código de Conexão</span>
                  <span className="text-lg font-mono font-black tracking-wider text-amber-300">
                    {pairingCode}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="py-1.5 px-3 rounded-xl bg-white text-slate-950 text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>
            <p className="text-[11px] text-white/80">
              Digite este código em outros celulares ou tablets para que pai, mãe e babá acessem tudo em tempo real.
            </p>
          </div>

          {/* 2. FORM TO ADD / EDIT CAREGIVER */}
          {isFormOpen && (
            <form
              onSubmit={handleSaveCaregiver}
              className={`p-4 rounded-2xl border space-y-3 animate-in fade-in ${
                isNightMode ? 'bg-slate-900 border-blue-500/40' : 'bg-blue-50/50 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {editingCaregiverId ? 'Editar Cuidador' : 'Incluir Novo Cuidador'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancelar
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Nome do Cuidador *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Maria (Mãe), Diogo (Pai), Vovó Ana..."
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none ${
                    isNightMode
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                  required
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Papel / Parentesco
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CAREGIVER_ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                        role === r.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : isNightMode
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{r.icon}</span>
                      <span className="truncate">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Color */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Cor de Identificação
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        avatarColor === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all"
                >
                  {editingCaregiverId ? 'Salvar Alterações' : 'Salvar e Incluir'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* 3. LIST OF CAREGIVERS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Membros do Grupo Familiar ({caregivers.length})
              </h3>

              {!isFormOpen && (
                <button
                  type="button"
                  onClick={openAddForm}
                  className="py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 text-xs font-black flex items-center gap-1.5 transition-all border border-blue-200 dark:border-blue-800"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Incluir Membro</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {caregivers.map((cg) => {
                const isActive = activeCaregiver.id === cg.id;
                const roleConfig = CAREGIVER_ROLES.find((r) => r.id === cg.role) || CAREGIVER_ROLES[2];

                return (
                  <div
                    key={cg.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isActive
                        ? isNightMode
                          ? 'bg-blue-950/30 border-blue-500/60 shadow-sm'
                          : 'bg-blue-50/70 border-blue-300 shadow-sm'
                        : isNightMode
                        ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Left: Avatar + Name + Role */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs"
                        style={{ backgroundColor: cg.avatarColor || '#3b82f6' }}
                      >
                        {cg.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm truncate text-slate-900 dark:text-white">
                            {cg.name}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              Ativo no App
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span>{roleConfig.icon}</span>
                          <span>{roleConfig.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => setActiveCaregiver(cg)}
                          className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                          title="Alternar para este cuidador"
                        >
                          Usar Agora
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditForm(cg)}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                        title="Editar dados"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {caregivers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCaregiver(cg.id, cg.name)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title="Excluir cuidador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Cuidador ativo: <strong className="text-slate-800 dark:text-slate-200">{activeCaregiver.name}</strong>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-xs transition-all"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
