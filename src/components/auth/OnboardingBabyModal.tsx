import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Baby, Calendar, Scale, Ruler, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Gender } from '../../types';

export const OnboardingBabyModal: React.FC = () => {
  const { createBaby, currentUser } = useAuth();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState(new Date().toISOString().split('T')[0]);
  const [gender, setGender] = useState<Gender>('feminino');
  const [birthWeight, setBirthWeight] = useState<number | ''>(3200);
  const [birthLength, setBirthLength] = useState<number | ''>(49);
  const [error, setError] = useState<string | null>(null);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do bebê.');
      return;
    }
    if (!birthDate) {
      setError('Por favor, informe a data de nascimento.');
      return;
    }
    const weightNum = Number(birthWeight) || 3000;
    const lengthNum = Number(birthLength) || 49;

    try {
      createBaby({
        name: name.trim(),
        birthDate: birthDate,
        gender: gender,
        birthWeight: weightNum,
        currentWeight: weightNum,
        birthLength: lengthNum,
        currentLength: lengthNum,
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar bebê.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#080b10] text-slate-100 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto pt-safe pb-safe">
      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center space-y-6">
        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10">
            <Baby className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-400">
              Passo 2 de 2 • Onboarding
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white mt-0.5">
              Vamos cadastrar seu bebê
            </h1>
            <p className="text-xs text-slate-400">
              Personalizaremos as curvas de crescimento da OMS e lembretes para sua rotina.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleStart} className="space-y-4">
          {/* Baby Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Nome do Bebê:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ana Clara"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-2xl text-xs text-white font-bold placeholder-slate-600 outline-none h-12"
            />
          </div>

          {/* Birth Date */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Data de Nascimento:</label>
            <div className="relative">
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-2xl text-xs text-white font-bold outline-none h-12"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">
              Sexo (para curvas OMS):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('feminino')}
                className={`py-3 rounded-2xl text-xs font-bold border transition-all h-12 flex items-center justify-center gap-2 ${
                  gender === 'feminino'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <span>👧 Menina</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('masculino')}
                className={`py-3 rounded-2xl text-xs font-bold border transition-all h-12 flex items-center justify-center gap-2 ${
                  gender === 'masculino'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <span>👦 Menino</span>
              </button>
            </div>
          </div>

          {/* Birth Weight & Length */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Peso ao Nascer (g):</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  value={birthWeight}
                  onChange={(e) => setBirthWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="3200"
                  className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-2xl text-xs text-white font-bold placeholder-slate-600 outline-none h-12"
                />
                <span className="text-[10px] text-slate-500 absolute right-3 top-4 font-bold">gramas</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Comprimento (cm):</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={birthLength}
                  onChange={(e) => setBirthLength(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="49"
                  className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-2xl text-xs text-white font-bold placeholder-slate-600 outline-none h-12"
                />
                <span className="text-[10px] text-slate-500 absolute right-3 top-4 font-bold">cm</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full h-13 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-4 transition-all"
          >
            <span>COMEÇAR NO MILKFLOW</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="text-center pt-4 text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Seus dados são 100% isolados e pertencem apenas à sua família</span>
      </div>
    </div>
  );
};
