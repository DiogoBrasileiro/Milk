import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, Plus, Trash2, Check, X, Calendar } from 'lucide-react';

interface RetroItem {
  id: string;
  timeStr: string; // e.g. "03:15"
  type: 'feeding_bottle' | 'feeding_breast' | 'diaper' | 'pumping' | 'discomfort';
  volumeMl?: number;
  durationMinutes?: number;
  hasPee?: boolean;
  hasPoop?: boolean;
  symptom?: string;
}

export const RetroactiveLogModal: React.FC = () => {
  const { closeModal, addFeeding, addDiaper, addPumping, addDiscomfort, isNightMode, triggerUndoToast } = useApp();

  const [dateStr, setDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<RetroItem[]>([
    { id: '1', timeStr: '03:00', type: 'feeding_breast', durationMinutes: 20 },
    { id: '2', timeStr: '03:30', type: 'diaper', hasPee: true, hasPoop: false },
    { id: '3', timeStr: '06:00', type: 'feeding_bottle', volumeMl: 50 },
  ]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        timeStr: '07:00',
        type: 'feeding_bottle',
        volumeMl: 45,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const updateItem = (id: string, updates: Partial<RetroItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updates } : it)));
  };

  const handleSaveAll = () => {
    for (const it of items) {
      const [h, m] = it.timeStr.split(':');
      const eventDate = new Date(dateStr);
      eventDate.setHours(parseInt(h || '0'), parseInt(m || '0'), 0, 0);
      const iso = eventDate.toISOString();

      if (it.type === 'feeding_bottle') {
        addFeeding({
          timestamp: iso,
          type: 'leite_materno_ordenhado',
          consumedMl: it.volumeMl || 40,
          offeredMl: it.volumeMl || 40,
          remainingMl: 0,
          notes: 'Registro retroativo',
        });
      } else if (it.type === 'feeding_breast') {
        const mins = it.durationMinutes || 15;
        const half = Math.round(mins / 2);
        addFeeding({
          timestamp: iso,
          type: 'amamentacao_direta',
          durationMinutes: mins,
          directNursing: {
            leftMinutes: half,
            rightMinutes: mins - half,
            lastSide: 'ambos',
          },
          notes: 'Registro retroativo (peito)',
        });
      } else if (it.type === 'diaper') {
        addDiaper({
          timestamp: iso,
          hasPee: it.hasPee !== false,
          peeAmount: 'normal',
          hasPoop: Boolean(it.hasPoop),
          poopAmount: it.hasPoop ? 'normal' : undefined,
          poopConsistency: 'pastoso',
          poopColor: 'mostarda',
          notes: 'Registro retroativo',
        });
      } else if (it.type === 'pumping') {
        addPumping({
          timestamp: iso,
          endTime: iso,
          durationMinutes: 15,
          method: 'bomba_eletrica',
          leftVolumeMl: (it.volumeMl || 60) / 2,
          rightVolumeMl: (it.volumeMl || 60) / 2,
          totalVolumeMl: it.volumeMl || 60,
          targetStorage: 'geladeira',
        });
      } else if (it.type === 'discomfort') {
        addDiscomfort({
          timestamp: iso,
          symptoms: [it.symptom as any || 'gases'],
          intensity: 'leve',
          timing: 'logo_depois',
          reliefMeasures: ['colo'],
        });
      }
    }

    triggerUndoToast(`✓ ${items.length} eventos retroativos salvos com sucesso!`, () => {});
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border max-h-[90vh] flex flex-col ${
          isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Registrar em Lote (Madrugada / Passado)</h2>
              <p className="text-xs text-slate-400">Preencha vários eventos passados de uma só vez</p>
            </div>
          </div>
          <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Selector */}
        <div className="py-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-400">Data dos eventos:</span>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className={`px-3 py-1.5 rounded-xl text-xs border font-medium ${
              isNightMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-2 pr-1">
          {items.map((it) => (
            <div
              key={it.id}
              className={`p-3 rounded-2xl border flex items-center gap-2 justify-between ${
                isNightMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              {/* Time input */}
              <input
                type="time"
                value={it.timeStr}
                onChange={(e) => updateItem(it.id, { timeStr: e.target.value })}
                className={`px-2 py-1 rounded-xl text-xs font-bold border ${
                  isNightMode ? 'bg-slate-900 border-slate-700 text-amber-300' : 'bg-white border-slate-200 text-blue-600'
                }`}
              />

              {/* Type selector */}
              <select
                value={it.type}
                onChange={(e) => updateItem(it.id, { type: e.target.value as any })}
                className={`px-2 py-1 rounded-xl text-xs border font-medium ${
                  isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <option value="feeding_breast">🤱 Mamada (Peito)</option>
                <option value="feeding_bottle">🍼 Mamada (Mamadeira/Estoque)</option>
                <option value="diaper">💧 Fralda</option>
                <option value="pumping">🥛 Ordenha</option>
                <option value="discomfort">😣 Desconforto</option>
              </select>

              {/* Detail fields based on type */}
              {it.type === 'feeding_bottle' || it.type === 'pumping' ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={it.volumeMl || 40}
                    onChange={(e) => updateItem(it.id, { volumeMl: parseInt(e.target.value) || 0 })}
                    className={`w-16 px-2 py-1 rounded-xl text-xs border font-semibold text-center ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                  <span className="text-xs text-slate-400">ml</span>
                </div>
              ) : it.type === 'feeding_breast' ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={it.durationMinutes || 20}
                    onChange={(e) => updateItem(it.id, { durationMinutes: parseInt(e.target.value) || 0 })}
                    className={`w-16 px-2 py-1 rounded-xl text-xs border font-semibold text-center ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-purple-300' : 'bg-white border-slate-200 text-purple-600'
                    }`}
                  />
                  <span className="text-xs text-slate-400">min</span>
                </div>
              ) : it.type === 'diaper' ? (
                <div className="flex items-center gap-2">
                  <label className="text-xs flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={it.hasPee !== false}
                      onChange={(e) => updateItem(it.id, { hasPee: e.target.checked })}
                    />
                    💧
                  </label>
                  <label className="text-xs flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(it.hasPoop)}
                      onChange={(e) => updateItem(it.id, { hasPoop: e.target.checked })}
                    />
                    💩
                  </label>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Gases/Choro</span>
              )}

              <button
                onClick={() => removeItem(it.id)}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={addItem}
            className={`w-full py-2.5 rounded-2xl border border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              isNightMode
                ? 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            Adicionar Mais um Evento
          </button>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <button
            onClick={closeModal}
            className={`flex-1 py-3 rounded-2xl font-bold text-xs border ${
              isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveAll}
            className="flex-2 py-3 rounded-2xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-98"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Salvar {items.length} Eventos
          </button>
        </div>
      </div>
    </div>
  );
};
