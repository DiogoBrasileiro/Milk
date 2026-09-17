import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  BookOpen,
  ShieldCheck,
  Snowflake,
  Flame,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { CONSERVATION_PROTOCOLS } from '../constants/medicalProtocols';
import { ConservationProtocolId } from '../types';

interface MilkShelfLifeReferenceModalProps {
  onClose: () => void;
}

export const MilkShelfLifeReferenceModal: React.FC<MilkShelfLifeReferenceModalProps> = ({ onClose }) => {
  const { protocolId, setProtocolId, isNightMode } = useApp();
  const [activeTab, setActiveTab] = useState<'comparativo' | 'brasil' | 'cdc' | 'boas_praticas'>('comparativo');

  const handleSelectProtocol = (id: ConservationProtocolId) => {
    setProtocolId(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-3xl p-6 shadow-2xl border my-8 transition-colors max-h-[90vh] flex flex-col ${
          isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">Guia Médico de Validade do Leite Materno</h2>
              <p className="text-xs text-slate-400">Normas científicas de conservação em geladeira, freezer e ambiente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Protocol Selector Quick Badge */}
        <div className="py-3 shrink-0">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Protocolo Ativo no App: <strong>{CONSERVATION_PROTOCOLS[protocolId]?.name || 'Brasil (MS/rBLH)'}</strong>
              </span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              Regras em vigor
            </span>
          </div>
        </div>

        {/* Navigation Subtabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 shrink-0">
          {[
            { id: 'comparativo', label: '📊 Tabela Comparativa' },
            { id: 'brasil', label: '🇧🇷 Brasil (MS / Fiocruz)' },
            { id: 'cdc', label: '🇺🇸 CDC / AAP (EUA)' },
            { id: 'boas_praticas', label: '✨ Boas Práticas & Higiene' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isNightMode
                  ? 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto pr-1 space-y-4 py-2 flex-1">
          {/* TAB 1: COMPARATIVO */}
          {activeTab === 'comparativo' && (
            <div className="space-y-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-3">Condição de Guarda</th>
                      <th className="p-3 text-blue-600 dark:text-blue-400">🇧🇷 Brasil (MS/Fiocruz)</th>
                      <th className="p-3 text-purple-600 dark:text-purple-400">🇺🇸 CDC / AAP (EUA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-semibold flex items-center gap-1.5">
                        <Snowflake className="w-3.5 h-3.5 text-blue-500" />
                        <span>Geladeira (≤ 4°C)</span>
                      </td>
                      <td className="p-3 font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                        12 horas
                      </td>
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                        Até 4 dias (96h)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-semibold flex items-center gap-1.5">
                        <Snowflake className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Freezer / Congelador (≤ -18°C)</span>
                      </td>
                      <td className="p-3 font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                        15 dias
                      </td>
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                        6 meses (ideal) / até 12m
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-semibold">🌡️ Temperatura Ambiente (≤ 25°C)</td>
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300">2 horas</td>
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Até 4 horas</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-semibold">💧 Descongelado (na geladeira)</td>
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300">12 horas</td>
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Até 24 horas</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-semibold">🍼 Aquecido / Sobra de Mamadeira</td>
                      <td className="p-3 font-bold text-rose-600 dark:text-rose-400">1 hora (descartar sobra)</td>
                      <td className="p-3 font-bold text-rose-600 dark:text-rose-400">Até 2 horas</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-semibold">❌ Recongelar Leite Descongelado</td>
                      <td className="p-3 font-bold text-rose-600 dark:text-rose-400" colSpan={2}>
                        NUNCA recongelar
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5 text-amber-800 dark:text-amber-300">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>Por que a norma brasileira do Ministério da Saúde é mais conservadora?</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Devido ao clima predominantemente tropical do Brasil e à variação de abertura de refrigeradores domésticos, a Fiocruz e a Rede Brasileira de Bancos de Leite Humano (rBLH) estipularam uma margem rigorosa de <strong>12h em geladeira e 15 dias no freezer</strong> para garantir 100% de segurança microbiológica e máxima preservação das imunoglobulinas e fatores bioativos.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Escolha o protocolo de cálculo de validade para o seu App:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleSelectProtocol('brasil_ms')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      protocolId === 'brasil_ms'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs text-blue-600 dark:text-blue-400">🇧🇷 Brasil (MS / rBLH)</strong>
                      {protocolId === 'brasil_ms' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">12h geladeira • 15 dias freezer (Padrão ouro de segurança)</p>
                  </button>

                  <button
                    onClick={() => handleSelectProtocol('cdc_aap')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      protocolId === 'cdc_aap'
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs text-purple-600 dark:text-purple-400">🇺🇸 CDC / AAP (EUA)</strong>
                      {protocolId === 'cdc_aap' && <CheckCircle2 className="w-4 h-4 text-purple-500" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">4 dias geladeira • 6 meses freezer (Diretriz internacional)</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRASIL */}
          {activeTab === 'brasil' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-blue-700 dark:text-blue-300">Norma Técnica MS / Fiocruz rBLH-BR</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white">Oficial Brasil</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                  A Rede Brasileira de Bancos de Leite Humano é referência mundial chancelada pela Organização Mundial da Saúde (OMS). No ambiente domiciliar, para leite ordenhado cru:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">❄️ Geladeira Doméstica</span>
                    <strong className="text-sm font-black text-blue-600 dark:text-blue-400">12 Horas</strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Temperatura máxima de 4°C no fundo</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">🧊 Freezer / Congelador</span>
                    <strong className="text-sm font-black text-cyan-600 dark:text-cyan-400">15 Dias</strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Congelamento contínuo a ≤ -10°C</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">Regras de Ouro da Rede BLH:</h4>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  <li><strong>Frascos aceitos:</strong> Frascos de vidro temperado (tipo café solúvel ou maionese) com tampa plástica de rosca, fervidos por 15 minutos.</li>
                  <li><strong>Posição no congelador:</strong> Sempre no fundo do congelador, longe de carnes cruas e peixes.</li>
                  <li><strong>Descongelamento:</strong> Em banho-maria com água morna e fogo apagado.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: CDC / AAP */}
          {activeTab === 'cdc' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-purple-700 dark:text-purple-300">CDC & American Academy of Pediatrics</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600 text-white">EUA / Internacional</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                  Diretrizes norte-americanas para coleta higiênica e conservação de leite materno para bebês saudáveis nascidos a termo:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">❄️ Geladeira (Refrigeração)</span>
                    <strong className="text-sm font-black text-purple-600 dark:text-purple-400">Até 4 Dias (96h)</strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Condição ideal a 4°C ou menos</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">🧊 Freezer Deep Freeze</span>
                    <strong className="text-sm font-black text-indigo-600 dark:text-indigo-400">6 a 12 Meses</strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Ideal até 6m / aceitável até 12m (-18°C)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BOAS PRÁTICAS */}
          {activeTab === 'boas_praticas' && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                  <div className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>O que FAZER:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <li>Lavar mãos com água e sabão antes da ordenha.</li>
                    <li>Guardar sempre na prateleira central ou fundo da geladeira (nunca na porta).</li>
                    <li>Identificar o frasco com data, hora e volume.</li>
                    <li>Descongelar lentamente sob refrigeração ou água morna com fogo apagado.</li>
                    <li>Homogeneizar suavemente em círculos (não agitar bruscamente).</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                  <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>O que NUNCA fazer:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <li>NUNCA ferver o leite nem aquecer direto no fogo.</li>
                    <li>NUNCA usar micro-ondas (destrói anticorpos e gera pontos quentes).</li>
                    <li>NUNCA recongelar leite que já foi descongelado.</li>
                    <li>NUNCA guardar leite na porta da geladeira.</li>
                    <li>NUNCA reaproveitar sobras de leite que o bebê já começou a mamar após 1 hora.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Fontes: MS/Fiocruz rBLH 2024 • CDC/AAP Clinical Policy
          </span>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
