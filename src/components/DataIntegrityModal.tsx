import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Download,
  Wrench,
  X,
  RefreshCw,
  Database,
  Lock,
  ArrowRight,
  Cloud,
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  DataIntegrityReport,
  autoRepairDataIntegrity,
  DataIntegrityIssue,
} from '../services/dataIntegrityService';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { checkSupabaseStatus, SupabaseStatus, SUPABASE_URL } from '../lib/supabaseClient';

interface DataIntegrityModalProps {
  report: DataIntegrityReport;
  isOpen: boolean;
  onClose: () => void;
  onRefreshCheck: () => void;
}

export const DataIntegrityModal: React.FC<DataIntegrityModalProps> = ({
  report,
  isOpen,
  onClose,
  onRefreshCheck,
}) => {
  const {
    batches,
    feedings,
    pumpings,
    diapers,
    discomforts,
    weights,
    sleepLogs,
    caregivers,
    persistFamilyData,
    exportDataJson,
    triggerUndoToast,
  } = useApp();

  const { currentFamily } = useAuth();

  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>(() =>
    report.issues.filter((i) => i.autoFixAvailable).map((i) => i.id)
  );
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairSuccessMessage, setRepairSuccessMessage] = useState<string | null>(null);

  // Supabase live monitoring state
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus | null>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlSchema, setShowSqlSchema] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleCheckSupabase();
    }
  }, [isOpen]);

  const handleCheckSupabase = async () => {
    setIsCheckingSupabase(true);
    try {
      const status = await checkSupabaseStatus();
      setSupabaseStatus(status);
    } catch (e) {
      console.warn('Erro ao consultar Supabase', e);
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  const handleSyncToSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const famId = currentFamily?.id || 'fam_641306';
      const res = await fetch(`/api/supabase/sync/${famId}`, {
        method: 'POST',
      });
      if (res.ok) {
        triggerUndoToast('✓ Dados sincronizados com o Supabase com sucesso!', () => {});
        await handleCheckSupabase();
      } else {
        triggerUndoToast('Aviso ao sincronizar com Supabase', () => {});
      }
    } catch (err) {
      console.warn('Falha no sync Supabase', err);
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleCopySql = async () => {
    try {
      const res = await fetch('/api/supabase/schema');
      const data = await res.json();
      if (data.sql) {
        await navigator.clipboard.writeText(data.sql);
        setCopiedSql(true);
        triggerUndoToast('✓ Script SQL do Supabase copiado!', () => {});
        setTimeout(() => setCopiedSql(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const toggleSelectIssue = (id: string) => {
    setSelectedIssueIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const fixable = report.issues.filter((i) => i.autoFixAvailable).map((i) => i.id);
    if (selectedIssueIds.length === fixable.length) {
      setSelectedIssueIds([]);
    } else {
      setSelectedIssueIds(fixable);
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_integridade_milkflow_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerUndoToast('✓ Backup preventivo baixado com sucesso!', () => {});
  };

  const handleRunRepair = () => {
    if (selectedIssueIds.length === 0) return;

    setIsRepairing(true);
    try {
      const currentPayload = {
        batches,
        feedings,
        pumpings,
        diapers,
        discomforts,
        weights,
        sleepLogs,
        caregivers,
      };

      const result = autoRepairDataIntegrity(currentPayload, selectedIssueIds);

      // Persistir dados reparados
      persistFamilyData(result.repairedData);

      setRepairSuccessMessage(
        `✓ ${result.repairedCount} inconsistência(s) corrigida(s) com sucesso. Um ponto de restauração seguro foi salvo.`
      );
      triggerUndoToast(`✓ ${result.repairedCount} itens corrigidos`, () => {});

      setTimeout(() => {
        onRefreshCheck();
        setIsRepairing(false);
      }, 500);
    } catch (e) {
      console.error('Erro ao reparar integridade', e);
      setIsRepairing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner ${
                report.healthStatus === 'healthy'
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : report.healthStatus === 'warning'
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                  : 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
              }`}
            >
              {report.healthStatus === 'healthy' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : report.healthStatus === 'warning' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Auditoria e Integridade de Dados
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    report.healthStatus === 'healthy'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : report.healthStatus === 'warning'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                  }`}
                >
                  {report.healthScore}% Íntegro
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Verificação ativa de consistência, conflitos e proteção contra perdas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Status Message Card */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
              report.healthStatus === 'healthy'
                ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                : report.healthStatus === 'warning'
                ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
            }`}
          >
            <Lock className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">{report.summaryMessage}</p>
              <p className="text-xs opacity-90 mt-1">
                O MilkFlow nunca descarta ou substitui seus lançamentos manuais automaticamente. Todas as verificações garantem que nenhuma informação seja corrompida.
              </p>
            </div>
          </div>

          {repairSuccessMessage && (
            <div className="p-3.5 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{repairSuccessMessage}</span>
            </div>
          )}

          {/* Metrics scanned */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Registros Auditados ({report.totalEntitiesScanned} no total)
              </h3>
              <button
                onClick={onRefreshCheck}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
              >
                <RefreshCw className="w-3 h-3" />
                Reanalisar Agora
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                <span className="text-gray-400 block text-[11px]">Estoque / Lotes</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                  {report.counts.batches}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                <span className="text-gray-400 block text-[11px]">Mamadas</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                  {report.counts.feedings}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                <span className="text-gray-400 block text-[11px]">Ordenhas</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                  {report.counts.pumpings}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                <span className="text-gray-400 block text-[11px]">Fraldas</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                  {report.counts.diapers}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                <span className="text-gray-400 block text-[11px]">Pesagens</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                  {report.counts.weights}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                <span className="text-gray-400 block text-[11px]">Sono</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                  {report.counts.sleep}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                <span className="text-gray-400 block text-[11px]">Desconfortos</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                  {report.counts.discomforts}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                <span className="text-gray-400 block text-[11px]">Cuidadores</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                  {report.counts.caregivers}
                </span>
              </div>
            </div>
          </div>

          {/* SUPABASE CLOUD DATABASE CONNECTION CARD */}
          <div className="p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 dark:from-emerald-950/20 dark:to-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                      Banco de Dados Supabase
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        supabaseStatus?.connected
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : isCheckingSupabase
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          supabaseStatus?.connected
                            ? 'bg-emerald-500 animate-pulse'
                            : isCheckingSupabase
                            ? 'bg-amber-500 animate-spin'
                            : 'bg-rose-500'
                        }`}
                      />
                      {supabaseStatus?.connected
                        ? 'Conectado e Ativo'
                        : isCheckingSupabase
                        ? 'Verificando...'
                        : 'Chave Inválida / Desconectado'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate max-w-xs sm:max-w-sm">
                    {SUPABASE_URL}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSyncToSupabase}
                  disabled={isSyncingSupabase}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                  title="Sincronizar dados com o Supabase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                  {isSyncingSupabase ? 'Sincronizando...' : 'Sincronizar Supabase'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSqlSchema(!showSqlSchema)}
                  className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300 text-xs font-medium transition"
                  title="Ver script SQL de tabelas"
                >
                  SQL
                </button>
              </div>
            </div>

            {supabaseStatus && (
              <div className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1.5 pt-2 border-t border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center gap-3">
                  <span>Latência: <strong>{supabaseStatus.latencyMs}ms</strong></span>
                  <span>•</span>
                  <span className={supabaseStatus.connected ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400 font-medium'}>
                    {supabaseStatus.message}
                  </span>
                </div>
                {!supabaseStatus.connected && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                    <strong>Motivo identificado:</strong> O Supabase para REST API precisa da chave <strong>`anon` / `public` (formato JWT que começa com <code>eyJhbGciOi...</code>)</strong>. No painel do Supabase, acesse: <em>Project Settings ➔ API ➔ Project API Keys ➔ <strong>anon public</strong></em>.
                  </div>
                )}
              </div>
            )}

            {showSqlSchema && (
              <div className="mt-3 p-3 bg-gray-900 text-emerald-400 font-mono text-[11px] rounded-xl border border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-[10px]">
                  <span>Script SQL para o Editor do Supabase (Opcional)</span>
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSql ? 'Copiado!' : 'Copiar SQL'}
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap select-all text-[10px] text-gray-300">
{`CREATE TABLE IF NOT EXISTS public.milkflow_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.milkflow_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público MilkFlow" ON public.milkflow_store
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`}
                </pre>
              </div>
            )}
          </div>

          {/* List of Detected Issues */}
          {report.issues.length === 0 ? (
            <div className="text-center py-6 px-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                100% de Integridade Confirmada
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 max-w-md mx-auto">
                Nenhuma inconsistência, valor negativo ou duplicidade detectada. Seus registros manuais estão armazenados e sincronizados com segurança.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Inconsistências Identificadas ({report.issues.length})
                </h4>
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  {selectedIssueIds.length === report.issues.filter((i) => i.autoFixAvailable).length
                    ? 'Desmarcar Todos'
                    : 'Selecionar Corrigíveis'}
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {report.issues.map((issue) => {
                  const isSelected = selectedIssueIds.includes(issue.id);
                  return (
                    <div
                      key={issue.id}
                      onClick={() => issue.autoFixAvailable && toggleSelectIssue(issue.id)}
                      className={`p-3.5 rounded-2xl border transition-all text-xs flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50/40 dark:border-blue-700 dark:bg-blue-950/20'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300'
                      }`}
                    >
                      {issue.autoFixAvailable ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectIssue(issue.id)}
                          className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="mt-0.5">
                          <Info className="w-4 h-4 text-gray-400" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              issue.severity === 'critical'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : issue.severity === 'warning'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {issue.severity === 'critical'
                              ? 'Crítico'
                              : issue.severity === 'warning'
                              ? 'Atenção'
                              : 'Informativo'}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {issue.title}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">{issue.description}</p>
                        <p className="text-blue-600 dark:text-blue-400 font-medium mt-1 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> Sugestão: {issue.suggestedAction}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleDownloadBackup}
            className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            Baixar Backup de Segurança (JSON)
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {report.issues.length > 0 && selectedIssueIds.length > 0 && (
              <button
                onClick={handleRunRepair}
                disabled={isRepairing}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
              >
                <Wrench className="w-4 h-4" />
                {isRepairing
                  ? 'Reparando...'
                  : `Reparar Selecionados (${selectedIssueIds.length})`}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
