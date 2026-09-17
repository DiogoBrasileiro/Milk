import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  calculateBabyAge,
  formatDateTime,
  formatTimeRemaining,
  getTimeAgoString,
} from '../utils/formatters';
import {
  ArrowLeft,
  FileText,
  Share2,
  Printer,
  Copy,
  Check,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  Milk,
  Droplet,
  HeartCrack,
  ShieldCheck,
  Archive,
  ArrowDownCircle,
  Thermometer,
  Moon,
  Scale,
  Smile,
  Volume2,
  Bell,
  BarChart3,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Edit2,
  Layers,
  ChevronRight,
  Sun,
  Droplets,
  Award,
} from 'lucide-react';
import { CONTAINER_COLORS, PREDEFINED_CONTAINER_TAGS } from '../constants/containers';

export const PediatricReportSection: React.FC = () => {
  const {
    baby,
    feedings,
    pumpings,
    diapers,
    discomforts,
    weights,
    sleepLogs,
    inventorySummary,
    todayStats,
    openModal,
    isNightMode,
    triggerUndoToast,
    setActiveTab,
  } = useApp();

  // Period state
  const [periodType, setPeriodType] = useState<
    'hoje' | '24h' | '7d' | '15d' | '30d' | 'tudo' | 'personalizado'
  >('7d');

  // Custom date range state (defaults to last 7 days)
  const defaultEndDate = new Date().toISOString().slice(0, 10);
  const defaultStartDate = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [customStartDate, setCustomStartDate] = useState<string>(defaultStartDate);
  const [customEndDate, setCustomEndDate] = useState<string>(defaultEndDate);

  // Active section tab inside the report
  const [activeReportTab, setActiveReportTab] = useState<
    'resumo' | 'mamadas' | 'ordenhas' | 'fraldas' | 'sono' | 'timeline'
  >('resumo');

  // Table search & filters
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Real-time ticking for live timers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const age = calculateBabyAge(baby.birthDate);

  // Calculate start and end date boundaries
  const { startBoundary, endBoundary, totalDaysInPeriod, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date(now);
    let label = 'Últimos 7 Dias';

    if (periodType === 'hoje') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      label = 'Hoje';
    } else if (periodType === '24h') {
      start = new Date(now.getTime() - 24 * 3600 * 1000);
      label = 'Últimas 24 Horas';
    } else if (periodType === '7d') {
      start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      label = 'Últimos 7 Dias';
    } else if (periodType === '15d') {
      start = new Date(now.getTime() - 15 * 24 * 3600 * 1000);
      label = 'Últimos 15 Dias';
    } else if (periodType === '30d') {
      start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      label = 'Últimos 30 Dias';
    } else if (periodType === 'tudo') {
      start = new Date(0); // Epoch
      label = 'Todo o Histórico';
    } else if (periodType === 'personalizado') {
      const [sy, sm, sd] = (customStartDate || defaultStartDate).split('-').map(Number);
      const [ey, em, ed] = (customEndDate || defaultEndDate).split('-').map(Number);
      start = new Date(sy, (sm || 1) - 1, sd || 1, 0, 0, 0, 0);
      end = new Date(ey, (em || 1) - 1, ed || 1, 23, 59, 59, 999);
      label = `Personalizado (${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')})`;
    }

    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

    return {
      startBoundary: start,
      endBoundary: end,
      totalDaysInPeriod: diffDays,
      periodLabel: label,
    };
  }, [periodType, customStartDate, customEndDate, defaultStartDate, defaultEndDate]);

  // Filter all events within selected period
  const filteredFeedings = useMemo(() => {
    return feedings
      .filter((f) => {
        const t = new Date(f.timestamp);
        return t >= startBoundary && t <= endBoundary;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [feedings, startBoundary, endBoundary]);

  const filteredPumpings = useMemo(() => {
    return pumpings
      .filter((p) => {
        const t = new Date(p.timestamp);
        return t >= startBoundary && t <= endBoundary;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [pumpings, startBoundary, endBoundary]);

  const filteredDiapers = useMemo(() => {
    return diapers
      .filter((d) => {
        const t = new Date(d.timestamp);
        return t >= startBoundary && t <= endBoundary;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [diapers, startBoundary, endBoundary]);

  const filteredSleeps = useMemo(() => {
    return sleepLogs
      .filter((s) => {
        const t = new Date(s.startTime);
        return t >= startBoundary && t <= endBoundary;
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [sleepLogs, startBoundary, endBoundary]);

  const filteredDiscomforts = useMemo(() => {
    return discomforts
      .filter((dc) => {
        const t = new Date(dc.timestamp);
        return t >= startBoundary && t <= endBoundary;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [discomforts, startBoundary, endBoundary]);

  // Aggregate Metrics & Calculations
  const metrics = useMemo(() => {
    // Feedings
    const feedingCount = filteredFeedings.length;
    const avgFeedingsPerDay = (feedingCount / totalDaysInPeriod).toFixed(1);
    const totalVolumeConsumed = filteredFeedings.reduce((acc, f) => acc + (f.consumedMl || 0), 0);
    const avgVolumePerDay = Math.round(totalVolumeConsumed / totalDaysInPeriod);
    const directFeedingsCount = filteredFeedings.filter((f) => f.type === 'amamentacao_direta').length;
    const bottleFeedingsCount = filteredFeedings.filter((f) => f.type !== 'amamentacao_direta').length;
    const formulaFeedingsCount = filteredFeedings.filter((f) => f.type === 'formula').length;
    const directLeftCount = filteredFeedings.filter((f) => f.breast === 'esquerdo' || f.breast === 'ambos').length;
    const directRightCount = filteredFeedings.filter((f) => f.breast === 'direito' || f.breast === 'ambos').length;
    const totalDurationDirectMinutes = filteredFeedings.reduce(
      (acc, f) => acc + (f.leftDurationMinutes || 0) + (f.rightDurationMinutes || 0),
      0
    );
    const burpedCount = filteredFeedings.filter((f) => f.burped).length;

    // Pumpings
    const pumpingCount = filteredPumpings.length;
    const avgPumpingsPerDay = (pumpingCount / totalDaysInPeriod).toFixed(1);
    const totalPumpedVolume = filteredPumpings.reduce((acc, p) => acc + (p.totalVolumeMl || 0), 0);
    const totalPumpedLeft = filteredPumpings.reduce((acc, p) => acc + (p.leftVolumeMl || 0), 0);
    const totalPumpedRight = filteredPumpings.reduce((acc, p) => acc + (p.rightVolumeMl || 0), 0);
    const avgPumpedPerSession = pumpingCount > 0 ? Math.round(totalPumpedVolume / pumpingCount) : 0;
    const avgPumpedPerDay = Math.round(totalPumpedVolume / totalDaysInPeriod);
    const leftPercent = totalPumpedVolume > 0 ? Math.round((totalPumpedLeft / totalPumpedVolume) * 100) : 50;
    const rightPercent = totalPumpedVolume > 0 ? Math.round((totalPumpedRight / totalPumpedVolume) * 100) : 50;

    // Tag counts for pumped batches
    const tagDistribution: Record<string, number> = {};
    filteredPumpings.forEach((p) => {
      const tag = p.containerTag || 'Sem Tag';
      tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
    });

    // Diapers & Hydration
    const diaperCount = filteredDiapers.length;
    const avgDiapersPerDay = (diaperCount / totalDaysInPeriod).toFixed(1);
    const peeCount = filteredDiapers.filter((d) => d.hasPee).length;
    const avgPeePerDay = (peeCount / totalDaysInPeriod).toFixed(1);
    const poopCount = filteredDiapers.filter((d) => d.hasPoop).length;
    const avgPoopPerDay = (poopCount / totalDaysInPeriod).toFixed(1);
    const isDiuresisHealthy = parseFloat(avgPeePerDay) >= 5;

    // Sleep
    const totalSleepMinutes = filteredSleeps.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalSleepHours = (totalSleepMinutes / 60).toFixed(1);
    const avgSleepHoursPerDay = (totalSleepMinutes / 60 / totalDaysInPeriod).toFixed(1);
    const napsCount = filteredSleeps.filter((s) => s.type === 'soneca_dia').length;
    const nightSleepCount = filteredSleeps.filter((s) => s.type === 'sono_noturno').length;

    // Intervals between feedings
    let avgIntervalHours = '3.0';
    if (filteredFeedings.length >= 2) {
      const sorted = [...filteredFeedings].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const totalDiffHours =
        (new Date(sorted[sorted.length - 1].timestamp).getTime() - new Date(sorted[0].timestamp).getTime()) /
        (1000 * 3600);
      avgIntervalHours = (totalDiffHours / (sorted.length - 1)).toFixed(1);
    }

    return {
      feedingCount,
      avgFeedingsPerDay,
      totalVolumeConsumed,
      avgVolumePerDay,
      directFeedingsCount,
      bottleFeedingsCount,
      formulaFeedingsCount,
      directLeftCount,
      directRightCount,
      totalDurationDirectMinutes,
      burpedCount,
      pumpingCount,
      avgPumpingsPerDay,
      totalPumpedVolume,
      totalPumpedLeft,
      totalPumpedRight,
      avgPumpedPerSession,
      avgPumpedPerDay,
      leftPercent,
      rightPercent,
      tagDistribution,
      diaperCount,
      avgDiapersPerDay,
      peeCount,
      avgPeePerDay,
      poopCount,
      avgPoopPerDay,
      isDiuresisHealthy,
      totalSleepMinutes,
      totalSleepHours,
      avgSleepHoursPerDay,
      napsCount,
      nightSleepCount,
      avgIntervalHours,
      discomfortsCount: filteredDiscomforts.length,
    };
  }, [
    filteredFeedings,
    filteredPumpings,
    filteredDiapers,
    filteredSleeps,
    filteredDiscomforts,
    totalDaysInPeriod,
  ]);

  // Unified Chronological Timeline
  const unifiedTimelineEvents = useMemo(() => {
    const events: Array<{
      id: string;
      timestamp: string;
      category: 'mamada' | 'ordenha' | 'fralda' | 'sono' | 'desconforto';
      title: string;
      subtitle: string;
      badge: string;
      badgeColor: string;
      rawData: any;
    }> = [];

    filteredFeedings.forEach((f) => {
      const isDirect = f.type === 'amamentacao_direta';
      const containerInfo = f.type === 'leite_materno_ordenhado' && (f.containerNumber || f.containerName)
        ? ` • ${f.containerNumber ? `Frasco #${f.containerNumber}` : f.containerName}`
        : '';
      events.push({
        id: `feeding_${f.id}`,
        timestamp: f.timestamp,
        category: 'mamada',
        title: isDirect
          ? `Mamada no Peito (${f.breast === 'ambos' ? 'Ambos' : f.breast === 'esquerdo' ? 'Mama Esquerda' : 'Mama Direita'})`
          : `Mamada (${f.type === 'formula' ? 'Fórmula' : `Leite Materno${containerInfo}`})`,
        subtitle: isDirect
          ? `${(f.leftDurationMinutes || 0) + (f.rightDurationMinutes || 0)} min total${f.burped ? ' • Arrotou ✓' : ''}`
          : `${f.consumedMl || 0} ml consumidos${f.burped ? ' • Arrotou ✓' : ''}`,
        badge: isDirect ? `${(f.leftDurationMinutes || 0) + (f.rightDurationMinutes || 0)}m` : `${f.consumedMl || 0}ml`,
        badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
        rawData: f,
      });
    });

    filteredPumpings.forEach((p) => {
      events.push({
        id: `pumping_${p.id}`,
        timestamp: p.timestamp,
        category: 'ordenha',
        title: `Sessão de Ordenha (${p.containerTag || 'Fresco'})`,
        subtitle: `${p.totalVolumeMl} ml extraídos (E: ${p.leftVolumeMl || 0}ml | D: ${p.rightVolumeMl || 0}ml) • ${p.targetStorage}`,
        badge: `+${p.totalVolumeMl}ml`,
        badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30',
        rawData: p,
      });
    });

    filteredDiapers.forEach((d) => {
      const parts: string[] = [];
      if (d.hasPee) parts.push('Xixi');
      if (d.hasPoop) parts.push(`Cocô (${d.poopColor || 'Normal'})`);
      events.push({
        id: `diaper_${d.id}`,
        timestamp: d.timestamp,
        category: 'fralda',
        title: `Troca de Fralda`,
        subtitle: parts.join(' + ') || 'Troca preventiva',
        badge: d.hasPee && d.hasPoop ? 'Xixi + Cocô' : d.hasPoop ? 'Cocô' : 'Xixi',
        badgeColor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
        rawData: d,
      });
    });

    filteredSleeps.forEach((s) => {
      const hours = Math.floor(s.durationMinutes / 60);
      const mins = s.durationMinutes % 60;
      events.push({
        id: `sleep_${s.id}`,
        timestamp: s.startTime,
        category: 'sono',
        title: s.type === 'sono_noturno' ? 'Sono Noturno' : 'Soneca do Dia',
        subtitle: `Duração: ${hours > 0 ? `${hours}h ` : ''}${mins}m • Local: ${s.location || 'Berço'}`,
        badge: `${hours > 0 ? `${hours}h ` : ''}${mins}m`,
        badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
        rawData: s,
      });
    });

    filteredDiscomforts.forEach((dc) => {
      events.push({
        id: `discomfort_${dc.id}`,
        timestamp: dc.timestamp,
        category: 'desconforto',
        title: `Desconforto: ${dc.symptom || 'Cólica'}`,
        subtitle: `Intensidade: ${dc.intensity || 'Moderada'} • Alívio: ${dc.remedyApplied || 'Massagem'}`,
        badge: 'Cólica/Gases',
        badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30',
        rawData: dc,
      });
    });

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filteredFeedings, filteredPumpings, filteredDiapers, filteredSleeps, filteredDiscomforts]);

  // Formatted WhatsApp Export Text
  const generateWhatsAppReport = () => {
    return `📋 *RELATÓRIO GERAL MILKFLOW - ACOMPANHAMENTO PEDIÁTRICO*
👶 *Bebê:* ${baby.name} (${age.displayString})
⚖️ *Peso Atual:* ${(baby.currentWeight / 1000).toFixed(3).replace('.', ',')} kg
📅 *Período:* ${periodLabel} (${totalDaysInPeriod} ${totalDaysInPeriod === 1 ? 'dia' : 'dias'})

🍼 *1. MAMADAS & ALIMENTAÇÃO:*
• Total de mamadas: ${metrics.feedingCount} registros (média de ${metrics.avgFeedingsPerDay}/dia)
• Volume medido em mamadeira: ${metrics.totalVolumeConsumed} ml (média de ${metrics.avgVolumePerDay} ml/dia)
• Mamadas no peito direto: ${metrics.directFeedingsCount} vezes (${metrics.totalDurationDirectMinutes} min total de sucção)
  - Mama Esquerda: ${metrics.directLeftCount}x | Mama Direita: ${metrics.directRightCount}x
• Intervalo médio entre mamadas: ${metrics.avgIntervalHours} horas
• Bebê arrotou após mamar: ${metrics.burpedCount} vezes

🥛 *2. ORDENHAS & ESTOQUE DE LEITE:*
• Total de ordenhas: ${metrics.pumpingCount} sessões (${metrics.avgPumpingsPerDay}/dia)
• Volume total extraído: ${metrics.totalPumpedVolume} ml (média de ${metrics.avgPumpedPerSession} ml/sessão | ${metrics.avgPumpedPerDay} ml/dia)
• Produtividade Mama Esquerda: ${metrics.totalPumpedLeft} ml (${metrics.leftPercent}%)
• Produtividade Mama Direita: ${metrics.totalPumpedRight} ml (${metrics.rightPercent}%)
• Estoque ativo atual: ${inventorySummary.totalMl} ml (${inventorySummary.fridgeMl}ml geladeira | ${inventorySummary.freezerMl}ml freezer)

💧 *3. FRALDAS & HIDRATAÇÃO:*
• Total de trocas: ${metrics.diaperCount} fraldas (${metrics.avgDiapersPerDay}/dia)
• Fraldas com Xixi (Diurese): ${metrics.peeCount} (${metrics.avgPeePerDay}/dia) -> ${metrics.isDiuresisHealthy ? '✓ Hidratação adequada (Meta OMS atingida)' : '⚠️ Atenção: Menos de 5 xixis/dia'}
• Fraldas com Cocô: ${metrics.poopCount} (${metrics.avgPoopPerDay}/dia)

🌙 *4. SONO & SONEÇAS:*
• Total dormido no período: ${metrics.totalSleepHours} horas (média de ${metrics.avgSleepHoursPerDay} h/dia)
• Sonecas diurnas: ${metrics.napsCount} | Sono noturno: ${metrics.nightSleepCount}

🩺 *5. DESCONFORTOS & CÓLICAS:*
• Registros de cólica / gases: ${metrics.discomfortsCount} episódios

Gerado automaticamente via aplicativo MilkFlow.`;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppReport();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSuccess(true);
      triggerUndoToast('✓ Relatório formatado copiado para a área de transferência!', () => {});
      setTimeout(() => setCopiedSuccess(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Categoria', 'Data/Hora', 'Título', 'Detalhes', 'Métrica', 'Cuidador'];
    const rows = unifiedTimelineEvents.map((ev) => [
      ev.category,
      formatDateTime(ev.timestamp),
      `"${ev.title.replace(/"/g, '""')}"`,
      `"${ev.subtitle.replace(/"/g, '""')}"`,
      `"${ev.badge.replace(/"/g, '""')}"`,
      ev.rawData?.caregiver || 'Mãe',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${baby.name.toLowerCase().replace(/\s+/g, '_')}_${periodType}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerUndoToast('✓ Arquivo CSV exportado com sucesso!', () => {});
  };

  // Quick custom preset buttons
  const handleApplyPreset = (preset: 'hoje' | 'ontem' | 'esta_semana' | 'semana_passada' | 'este_mes') => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'hoje') {
      setCustomStartDate(toYmd(now));
      setCustomEndDate(toYmd(now));
    } else if (preset === 'ontem') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setCustomStartDate(toYmd(y));
      setCustomEndDate(toYmd(y));
    } else if (preset === 'esta_semana') {
      const first = new Date(now);
      first.setDate(first.getDate() - first.getDay());
      setCustomStartDate(toYmd(first));
      setCustomEndDate(toYmd(now));
    } else if (preset === 'semana_passada') {
      const end = new Date(now);
      end.setDate(end.getDate() - end.getDay() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      setCustomStartDate(toYmd(start));
      setCustomEndDate(toYmd(end));
    } else if (preset === 'este_mes') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setCustomStartDate(toYmd(first));
      setCustomEndDate(toYmd(now));
    }
    setPeriodType('personalizado');
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto px-4 pt-4 animate-in fade-in">
      {/* Top Header & Export Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => setActiveTab('home')}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Início</span>
          </button>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-500" />
            <span>Painel de Relatório Geral</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhamento consolidado de mamadas, ordenhas, fraldas e sono para {baby.name} ({age.displayString})
          </p>
        </div>

        {/* Action buttons (WhatsApp, PDF, CSV) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyWhatsApp}
            className="py-2.5 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all shrink-0"
          >
            {copiedSuccess ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedSuccess ? 'Copiado!' : 'Copiar WhatsApp'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="py-2.5 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 transition-all shrink-0"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimir / PDF</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="py-2.5 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 transition-all shrink-0"
          >
            <Download className="w-4 h-4 text-blue-500" />
            <span>Planilha CSV</span>
          </button>
        </div>
      </div>

      {/* SECTION: FILTRO POR PERÍODO (INCLUINDO PERSONALIZADO) */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border shadow-sm transition-colors ${
          isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Período de Análise do Relatório:
            </span>
          </div>
          <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-xl border border-blue-500/20">
            {periodLabel} • {totalDaysInPeriod} {totalDaysInPeriod === 1 ? 'dia' : 'dias calculados'}
          </span>
        </div>

        {/* Quick Period Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'hoje', label: 'Hoje' },
            { id: '24h', label: 'Últimas 24h' },
            { id: '7d', label: 'Últimos 7 Dias' },
            { id: '15d', label: 'Últimos 15 Dias' },
            { id: '30d', label: 'Últimos 30 Dias' },
            { id: 'tudo', label: 'Todo o Histórico' },
            { id: 'personalizado', label: '📅 Personalizado' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodType(p.id as any)}
              className={`py-2 px-3.5 rounded-2xl text-xs font-bold transition-all ${
                periodType === p.id
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/40'
                  : isNightMode
                  ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Period Input Controls */}
        {periodType === 'personalizado' && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Selecione o intervalo de datas:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] font-bold text-slate-400">Atalhos:</span>
                {[
                  { id: 'hoje', label: 'Hoje' },
                  { id: 'ontem', label: 'Ontem' },
                  { id: 'esta_semana', label: 'Esta Semana' },
                  { id: 'semana_passada', label: 'Semana Passada' },
                  { id: 'este_mes', label: 'Este Mês' },
                ].map((pre) => (
                  <button
                    key={pre.id}
                    type="button"
                    onClick={() => handleApplyPreset(pre.id as any)}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-blue-500 hover:text-white transition-colors"
                  >
                    {pre.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Data Inicial (De):
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                    isNightMode
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Data Final (Até):
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                    isNightMode
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION TABS: RESUMO | MAMADAS | ORDENHAS | FRALDAS | SONO | TIMELINE */}
      <div className="flex gap-1.5 overflow-x-auto py-1 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: 'resumo', label: '📊 Resumo Geral', badge: `${metrics.feedingCount + metrics.pumpingCount + metrics.diaperCount + filteredSleeps.length}` },
          { id: 'mamadas', label: '🍼 Mamadas', badge: `${metrics.feedingCount}` },
          { id: 'ordenhas', label: '🥛 Ordenhas', badge: `${metrics.pumpingCount}` },
          { id: 'fraldas', label: '💧 Fraldas', badge: `${metrics.diaperCount}` },
          { id: 'sono', label: '🌙 Sono & Sonecas', badge: `${filteredSleeps.length}` },
          { id: 'timeline', label: '📋 Linha do Tempo Unificada', badge: `${unifiedTimelineEvents.length}` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id as any)}
            className={`py-2 px-3.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
              activeReportTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                : isNightMode
                ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeReportTab === tab.id
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* TAB 1: RESUMO GERAL EXECUTIVO */}
      {activeReportTab === 'resumo' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Executive Key Stat Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Card 1: Mamadas */}
            <div
              onClick={() => setActiveReportTab('mamadas')}
              className={`p-4 rounded-3xl border cursor-pointer hover:scale-[1.02] transition-all ${
                isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Mamadas</span>
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/20 text-rose-500">
                  <Milk className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black mt-2">{metrics.feedingCount} <span className="text-xs font-semibold text-slate-400">registros</span></div>
              <div className="text-[11px] text-slate-400 mt-1">
                Média: <strong className="text-rose-500">{metrics.avgFeedingsPerDay}/dia</strong> • {metrics.totalVolumeConsumed}ml total
              </div>
            </div>

            {/* Card 2: Ordenhas */}
            <div
              onClick={() => setActiveReportTab('ordenhas')}
              className={`p-4 rounded-3xl border cursor-pointer hover:scale-[1.02] transition-all ${
                isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Ordenhas</span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-500">
                  <Droplet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black mt-2">{metrics.totalPumpedVolume} <span className="text-xs font-semibold text-slate-400">ml</span></div>
              <div className="text-[11px] text-slate-400 mt-1">
                {metrics.pumpingCount} sessões • Média: <strong className="text-blue-500">{metrics.avgPumpedPerSession}ml/sessão</strong>
              </div>
            </div>

            {/* Card 3: Fraldas */}
            <div
              onClick={() => setActiveReportTab('fraldas')}
              className={`p-4 rounded-3xl border cursor-pointer hover:scale-[1.02] transition-all ${
                isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Fraldas</span>
                <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/20 text-cyan-500">
                  <Droplets className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black mt-2">{metrics.diaperCount} <span className="text-xs font-semibold text-slate-400">trocas</span></div>
              <div className="text-[11px] text-slate-400 mt-1">
                {metrics.peeCount} xixis • {metrics.poopCount} cocôs • <strong className="text-cyan-500">{metrics.avgDiapersPerDay}/dia</strong>
              </div>
            </div>

            {/* Card 4: Sono */}
            <div
              onClick={() => setActiveReportTab('sono')}
              className={`p-4 rounded-3xl border cursor-pointer hover:scale-[1.02] transition-all ${
                isNightMode ? 'bg-[#0f141c] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Sono Total</span>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-500">
                  <Moon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black mt-2">{metrics.totalSleepHours} <span className="text-xs font-semibold text-slate-400">horas</span></div>
              <div className="text-[11px] text-slate-400 mt-1">
                Média: <strong className="text-indigo-500">{metrics.avgSleepHoursPerDay} h/dia</strong> • {filteredSleeps.length} registros
              </div>
            </div>
          </div>

          {/* Clinical Insights Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Diuresis & Hydration Assessment */}
            <div
              className={`p-5 rounded-3xl border ${
                metrics.isDiuresisHealthy
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 font-black text-sm mb-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Avaliação de Diurese & Hidratação</span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {metrics.isDiuresisHealthy
                  ? `Média de ${metrics.avgPeePerDay} fraldas de xixi/dia atingindo a meta padrão da OMS (mínimo de 5 a 6 fraldas molhadas diariamente). Indica boa transferência e volume adequado de leite.`
                  : `Média de ${metrics.avgPeePerDay} fraldas de xixi/dia. Recomenda-se monitorar a ingestão de leite e consultar o pediatra caso o bebê apresente boca seca ou urina escura concentrada.`}
              </p>
            </div>

            {/* Pumping Balance Assessment */}
            <div
              className={`p-5 rounded-3xl border ${
                isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white mb-1.5">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span>Equilíbrio de Produção (Esquerda vs Direita)</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>🤱 Mama Esquerda ({metrics.leftPercent}%)</span>
                  <span>🤱 Mama Direita ({metrics.rightPercent}%)</span>
                </div>
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div style={{ width: `${metrics.leftPercent}%` }} className="bg-indigo-500 h-full" />
                  <div style={{ width: `${metrics.rightPercent}%` }} className="bg-cyan-500 h-full" />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{metrics.totalPumpedLeft} ml extraídos</span>
                  <span>{metrics.totalPumpedRight} ml extraídos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Summary Highlights of the 4 Pillars */}
          <div
            className={`p-6 rounded-3xl border shadow-sm ${
              isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
              Síntese Executiva do Período ({periodLabel})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Box 1: Mamadas */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-black uppercase text-rose-500 flex items-center gap-1.5">
                  <Milk className="w-3.5 h-3.5" />
                  Alimentação
                </span>
                <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <li>• Total: <strong>{metrics.feedingCount} mamadas</strong></li>
                  <li>• No peito direto: <strong>{metrics.directFeedingsCount}x</strong></li>
                  <li>• Mamadeira / Fórmula: <strong>{metrics.bottleFeedingsCount}x</strong></li>
                  <li>• Intervalo médio: <strong>{metrics.avgIntervalHours}h</strong></li>
                </ul>
              </div>

              {/* Box 2: Ordenhas */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-black uppercase text-blue-500 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5" />
                  Ordenhas
                </span>
                <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <li>• Volume total: <strong>{metrics.totalPumpedVolume} ml</strong></li>
                  <li>• Sessões: <strong>{metrics.pumpingCount} ordenhas</strong></li>
                  <li>• Média/sessão: <strong>{metrics.avgPumpedPerSession} ml</strong></li>
                  <li>• Estoque atual: <strong>{inventorySummary.totalMl} ml</strong></li>
                </ul>
              </div>

              {/* Box 3: Fraldas */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-black uppercase text-cyan-500 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" />
                  Diurese & Fraldas
                </span>
                <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <li>• Total de trocas: <strong>{metrics.diaperCount}</strong></li>
                  <li>• Xixi: <strong>{metrics.peeCount} ({metrics.avgPeePerDay}/dia)</strong></li>
                  <li>• Cocô: <strong>{metrics.poopCount} ({metrics.avgPoopPerDay}/dia)</strong></li>
                  <li>• Hidratação: <strong className="text-emerald-500">{metrics.isDiuresisHealthy ? 'Normal' : 'Atenção'}</strong></li>
                </ul>
              </div>

              {/* Box 4: Sono */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-black uppercase text-indigo-500 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  Descanso & Sono
                </span>
                <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <li>• Total dormido: <strong>{metrics.totalSleepHours} horas</strong></li>
                  <li>• Média diária: <strong>{metrics.avgSleepHoursPerDay} h/dia</strong></li>
                  <li>• Sonecas diurnas: <strong>{metrics.napsCount}</strong></li>
                  <li>• Sono noturno: <strong>{metrics.nightSleepCount} noites</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETALHAMENTO DE MAMADAS */}
      {activeReportTab === 'mamadas' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Total de Mamadas</span>
              <div className="text-2xl font-black text-rose-500 mt-1">{metrics.feedingCount}</div>
              <div className="text-[11px] text-slate-400">Média de {metrics.avgFeedingsPerDay} por dia</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Volume Medido</span>
              <div className="text-2xl font-black text-rose-500 mt-1">{metrics.totalVolumeConsumed} ml</div>
              <div className="text-[11px] text-slate-400">Consumo em mamadeiras/copo</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Tempo de Peito</span>
              <div className="text-2xl font-black text-rose-500 mt-1">{metrics.totalDurationDirectMinutes} min</div>
              <div className="text-[11px] text-slate-400">E: {metrics.directLeftCount}x | D: {metrics.directRightCount}x</div>
            </div>
          </div>

          {/* Feedings Table */}
          <div className={`p-5 rounded-3xl border shadow-sm ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Registros de Mamadas do Período</h3>
              <button
                onClick={() => openModal('quickAction')}
                className="py-1.5 px-3 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                + Nova Mamada
              </button>
            </div>

            {filteredFeedings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Nenhuma mamada registrada neste período.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                      <th className="pb-2 font-bold">Data/Hora</th>
                      <th className="pb-2 font-bold">Tipo</th>
                      <th className="pb-2 font-bold">Lado / Duração / Volume</th>
                      <th className="pb-2 font-bold">Arrotou?</th>
                      <th className="pb-2 font-bold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredFeedings.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {formatDateTime(f.timestamp)}
                        </td>
                        <td className="py-2.5">
                          <span className="font-semibold text-slate-900 dark:text-white capitalize">
                            {f.type === 'amamentacao_direta' ? '🤱 Peito Direto' : f.type === 'formula' ? '🍼 Fórmula' : '🥛 Leite Materno'}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {f.type === 'amamentacao_direta'
                            ? `${(f.leftDurationMinutes || 0) + (f.rightDurationMinutes || 0)} min (${f.breast || 'ambos'})`
                            : `${f.consumedMl || 0} ml`}
                        </td>
                        <td className="py-2.5 font-bold">
                          {f.burped ? (
                            <span className="text-emerald-500">✓ Sim</span>
                          ) : (
                            <span className="text-slate-400">Não</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <button
                            onClick={() => openModal('editFeeding', { feeding: f })}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            title="Editar registro de mamada"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DETALHAMENTO DE ORDENHAS & TAGS */}
      {activeReportTab === 'ordenhas' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Total Extraído</span>
              <div className="text-2xl font-black text-blue-500 mt-1">{metrics.totalPumpedVolume} ml</div>
              <div className="text-[11px] text-slate-400">Média: {metrics.avgPumpedPerDay} ml/dia</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Média / Sessão</span>
              <div className="text-2xl font-black text-blue-500 mt-1">{metrics.avgPumpedPerSession} ml</div>
              <div className="text-[11px] text-slate-400">{metrics.pumpingCount} sessões totais</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Mama Esquerda</span>
              <div className="text-2xl font-black text-indigo-500 mt-1">{metrics.totalPumpedLeft} ml</div>
              <div className="text-[11px] text-slate-400">{metrics.leftPercent}% do volume total</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Mama Direita</span>
              <div className="text-2xl font-black text-cyan-500 mt-1">{metrics.totalPumpedRight} ml</div>
              <div className="text-[11px] text-slate-400">{metrics.rightPercent}% do volume total</div>
            </div>
          </div>

          {/* Tags Classification Breakdown */}
          <div className={`p-5 rounded-3xl border shadow-sm ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              Classificação & Tags dos Frascos de Ordenha
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(metrics.tagDistribution).map(([tag, count]) => (
                <div
                  key={tag}
                  className="py-1.5 px-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5"
                >
                  <span>🏷️ {tag}:</span>
                  <span className="font-black">{count} frascos</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pumpings Table */}
          <div className={`p-5 rounded-3xl border shadow-sm ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Histórico de Ordenhas do Período</h3>
              <button
                onClick={() => openModal('pumpingSession')}
                className="py-1.5 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                + Nova Ordenha
              </button>
            </div>

            {filteredPumpings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Nenhuma ordenha registrada neste período.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                      <th className="pb-2 font-bold">Data/Hora</th>
                      <th className="pb-2 font-bold">Volume Total</th>
                      <th className="pb-2 font-bold">E / D</th>
                      <th className="pb-2 font-bold">Frasco / Tag</th>
                      <th className="pb-2 font-bold">Destino</th>
                      <th className="pb-2 font-bold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredPumpings.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {formatDateTime(p.timestamp)}
                        </td>
                        <td className="py-2.5 font-black text-blue-600 dark:text-blue-400">
                          {p.totalVolumeMl} ml
                        </td>
                        <td className="py-2.5 text-slate-500">
                          E: {p.leftVolumeMl || 0}ml | D: {p.rightVolumeMl || 0}ml
                        </td>
                        <td className="py-2.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {p.containerName || `Pote #${p.containerNumber || '1'}`}
                          </span>
                          {p.containerTag && (
                            <span className="ml-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
                              {p.containerTag}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 capitalize">{p.targetStorage}</td>
                        <td className="py-2.5">
                          <button
                            onClick={() => openModal('editPumping', { pumping: p })}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            title="Editar ordenha"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DETALHAMENTO DE FRALDAS */}
      {activeReportTab === 'fraldas' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Total de Fraldas</span>
              <div className="text-2xl font-black text-cyan-500 mt-1">{metrics.diaperCount}</div>
              <div className="text-[11px] text-slate-400">Média: {metrics.avgDiapersPerDay} trocas/dia</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Xixi (Diurese)</span>
              <div className="text-2xl font-black text-cyan-500 mt-1">{metrics.peeCount}</div>
              <div className="text-[11px] text-slate-400">Média: {metrics.avgPeePerDay} xixis/dia</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Cocô (Evacuações)</span>
              <div className="text-2xl font-black text-amber-500 mt-1">{metrics.poopCount}</div>
              <div className="text-[11px] text-slate-400">Média: {metrics.avgPoopPerDay} evacuações/dia</div>
            </div>
          </div>

          {/* Diapers Table */}
          <div className={`p-5 rounded-3xl border shadow-sm ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Trocas de Fralda no Período</h3>
              <button
                onClick={() => openModal('diaperDetail')}
                className="py-1.5 px-3 rounded-xl bg-cyan-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                + Registrar Fralda
              </button>
            </div>

            {filteredDiapers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Nenhuma troca de fralda neste período.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                      <th className="pb-2 font-bold">Data/Hora</th>
                      <th className="pb-2 font-bold">Conteúdo</th>
                      <th className="pb-2 font-bold">Cor / Aspecto</th>
                      <th className="pb-2 font-bold">Notas</th>
                      <th className="pb-2 font-bold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredDiapers.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {formatDateTime(d.timestamp)}
                        </td>
                        <td className="py-2.5 font-bold">
                          {d.hasPee && d.hasPoop
                            ? '💧 Xixi + 💩 Cocô'
                            : d.hasPoop
                            ? '💩 Cocô'
                            : '💧 Xixi'}
                        </td>
                        <td className="py-2.5 text-slate-500">
                          {d.poopColor || d.poopConsistency ? `${d.poopColor || ''} (${d.poopConsistency || ''})` : '-'}
                        </td>
                        <td className="py-2.5 text-slate-400">{d.notes || '-'}</td>
                        <td className="py-2.5">
                          <button
                            onClick={() => openModal('diaperDetail', { diaper: d })}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            title="Editar fralda"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DETALHAMENTO DE SONO */}
      {activeReportTab === 'sono' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Total Dormido</span>
              <div className="text-2xl font-black text-indigo-500 mt-1">{metrics.totalSleepHours} h</div>
              <div className="text-[11px] text-slate-400">{metrics.totalSleepMinutes} minutos totais</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Média Diária</span>
              <div className="text-2xl font-black text-indigo-500 mt-1">{metrics.avgSleepHoursPerDay} h/dia</div>
              <div className="text-[11px] text-slate-400">Calculado sobre {totalDaysInPeriod} dias</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-bold text-slate-400">Sonecas vs Noite</span>
              <div className="text-2xl font-black text-indigo-500 mt-1">{metrics.napsCount} / {metrics.nightSleepCount}</div>
              <div className="text-[11px] text-slate-400">{metrics.napsCount} sonecas diurnas</div>
            </div>
          </div>

          {/* Sleep Table */}
          <div className={`p-5 rounded-3xl border shadow-sm ${isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Registros de Sono do Período</h3>
              <button
                onClick={() => openModal('sleepLog')}
                className="py-1.5 px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                + Registrar Sono
              </button>
            </div>

            {filteredSleeps.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Nenhum registro de sono neste período.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                      <th className="pb-2 font-bold">Início</th>
                      <th className="pb-2 font-bold">Fim</th>
                      <th className="pb-2 font-bold">Tipo</th>
                      <th className="pb-2 font-bold">Duração</th>
                      <th className="pb-2 font-bold">Local</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredSleeps.map((s) => {
                      const h = Math.floor(s.durationMinutes / 60);
                      const m = s.durationMinutes % 60;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {formatDateTime(s.startTime)}
                          </td>
                          <td className="py-2.5 font-mono text-slate-500">
                            {s.endTime ? formatDateTime(s.endTime) : 'Em andamento'}
                          </td>
                          <td className="py-2.5 font-bold">
                            {s.type === 'sono_noturno' ? '🌙 Noturno' : '☀️ Soneca'}
                          </td>
                          <td className="py-2.5 font-black text-indigo-500">
                            {h > 0 ? `${h}h ` : ''}{m}m
                          </td>
                          <td className="py-2.5 capitalize">{s.location || 'Berço'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: LINHA DO TEMPO UNIFICADA */}
      {activeReportTab === 'timeline' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Search filter input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar evento por texto (ex: peito, cólica, frasco, cocô...)"
              className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-bold border ${
                isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div
            className={`p-5 rounded-3xl border shadow-sm ${
              isNightMode ? 'bg-[#0f141c] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              Todos os Eventos do Período ({unifiedTimelineEvents.length} registros)
            </h3>

            {unifiedTimelineEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Nenhum evento registrado no período.</div>
            ) : (
              <div className="space-y-2.5">
                {unifiedTimelineEvents
                  .filter((ev) => {
                    if (!searchFilter.trim()) return true;
                    const q = searchFilter.toLowerCase();
                    return (
                      ev.title.toLowerCase().includes(q) ||
                      ev.subtitle.toLowerCase().includes(q) ||
                      ev.category.toLowerCase().includes(q)
                    );
                  })
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
                        isNightMode
                          ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
                          : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-mono font-bold text-slate-400 w-16 text-right shrink-0">
                          {formatDateTime(ev.timestamp).split(',')[1] || formatDateTime(ev.timestamp)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">{ev.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{ev.subtitle}</div>
                        </div>
                      </div>

                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl shrink-0 ${ev.badgeColor}`}>
                        {ev.badge}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
