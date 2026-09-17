import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDateTime, formatBatchIdentification } from '../utils/formatters';
import { FeedingRecord } from '../types';
import { Milk, Plus, Sparkles, Filter, CheckCircle2, Clock, Info, Edit2, ArrowLeft, Tag } from 'lucide-react';
import { EditFeedingModal } from './EditFeedingModal';

export const FeedingsSection: React.FC = () => {
  const { feedings, batches, openModal, isNightMode, setActiveTab } = useApp();
  const [filterType, setFilterType] = useState<string>('todos');
  const [selectedFeedingToEdit, setSelectedFeedingToEdit] = useState<FeedingRecord | null>(null);

  const filteredFeedings = feedings.filter((f) => {
    if (filterType === 'todos') return true;
    return f.type === filterType;
  });

  const totalMl = feedings.reduce((acc, f) => acc + (f.consumedMl || 0), 0);
  const directBreastCount = feedings.filter((f) => f.type === 'amamentacao_direta').length;
  const bottleCount = feedings.filter((f) => f.type !== 'amamentacao_direta').length;

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto px-4 pt-4 animate-in fade-in">
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
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Controle de Mamadas
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-0.5">Histórico & Volumes Efetivos</h2>
          <p className="text-xs text-slate-400 mt-1">
            Acompanhe o consumo em ml, duração no peito, edite ou exclua qualquer registro.
          </p>
        </div>

        <button
          onClick={() => openModal('feedingDetail')}
          className="py-3 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Registrar Nova Mamada
        </button>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`p-4 rounded-2xl border text-center ${isNightMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-400 block">Total Medido</span>
          <strong className="text-2xl font-black text-rose-600 dark:text-rose-400">{totalMl} ml</strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">Leite materno & fórmula</span>
        </div>

        <div className={`p-4 rounded-2xl border text-center ${isNightMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-400 block">🤱 No Peito</span>
          <strong className="text-2xl font-black text-purple-600 dark:text-purple-400">{directBreastCount}x</strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">Amamentação direta</span>
        </div>

        <div className={`p-4 rounded-2xl border text-center ${isNightMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-400 block">🍼 Na Mamadeira</span>
          <strong className="text-2xl font-black text-blue-600 dark:text-blue-400">{bottleCount}x</strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">Ordenhado / Fórmula</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'todos', label: 'Todas as Mamadas' },
          { id: 'leite_materno_ordenhado', label: '🍼 Leite Ordenhado' },
          { id: 'amamentacao_direta', label: '🤱 Direto no Peito' },
          { id: 'formula', label: '🥣 Fórmula' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id)}
            className={`py-2 px-3.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === f.id
                ? isNightMode
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-rose-600 text-white shadow-sm'
                : isNightMode
                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredFeedings.map((feeding) => (
          <div
            key={feeding.id}
            className={`p-4 rounded-3xl border transition-all flex items-center justify-between ${
              isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 ${
                  feeding.type === 'amamentacao_direta'
                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                }`}
              >
                {feeding.type === 'amamentacao_direta' ? '🤱' : '🍼'}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-base font-bold">
                    {feeding.type === 'amamentacao_direta'
                      ? `Amamentação Direta • ${feeding.durationMinutes || 18} min`
                      : `${feeding.consumedMl} ml consumidos`}
                  </strong>
                  {feeding.burped && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Arrotou
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span>{formatDateTime(feeding.timestamp)} • {feeding.caregiverName || 'Mãe'}</span>
                  {(() => {
                    if (feeding.type !== 'leite_materno_ordenhado') return null;
                    const primaryBatchId = feeding.batchIdsUsed?.[0];
                    const usedBatch = primaryBatchId ? batches.find((b) => b.id === primaryBatchId) : undefined;
                    
                    const ident = formatBatchIdentification(usedBatch || {
                      id: primaryBatchId || '',
                      containerNumber: feeding.containerNumber,
                      containerName: feeding.containerName,
                      containerColor: feeding.containerColor,
                      containerTag: feeding.containerTag,
                    } as any);

                    return (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border"
                        style={{
                          backgroundColor: `${ident.colorHex}15`,
                          borderColor: `${ident.colorHex}40`,
                          color: ident.colorHex,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ident.colorHex }} />
                        <span>{ident.summaryDescription}</span>
                      </span>
                    );
                  })()}
                  {feeding.notes && <span>• "{feeding.notes}"</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                {feeding.type === 'amamentacao_direta' ? (
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {feeding.directNursing?.leftMinutes || 0}m E / {feeding.directNursing?.rightMinutes || 0}m D
                  </span>
                ) : (
                  <div>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                      {feeding.consumedMl} ml
                    </span>
                    {feeding.remainingMl ? (
                      <div className="text-[10px] text-slate-400">Sobra: {feeding.remainingMl}ml</div>
                    ) : null}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedFeedingToEdit(feeding)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Editar ou Excluir Mamada"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Feeding Modal */}
      {selectedFeedingToEdit && (
        <EditFeedingModal
          feeding={selectedFeedingToEdit}
          onClose={() => setSelectedFeedingToEdit(null)}
        />
      )}
    </div>
  );
};
