import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Package,
  Plus,
  ShoppingCart,
  TrendingDown,
  AlertTriangle,
  Scale,
  CheckCircle2,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  Star,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Check,
  X,
  Sliders,
  DollarSign,
  Tag,
  Info,
} from 'lucide-react';
import {
  DiaperStockItem,
  DiaperStockTransaction,
  DiaperShoppingItem,
  DiaperStockStatus,
  DiaperTransactionType,
} from '../types';
import { formatDateTime } from '../utils/formatters';

export const DiaperInventorySection: React.FC = () => {
  const {
    diaperStockItems,
    diaperStockTransactions,
    diaperShoppingItems,
    addDiaperStockItem,
    updateDiaperStockItem,
    deleteDiaperStockItem,
    setDefaultDiaperStockItem,
    adjustDiaperStockItemQuantity,
    addDiaperShoppingItem,
    updateDiaperShoppingItem,
    deleteDiaperShoppingItem,
    diaperStockSummary,
    baby,
    isNightMode,
    triggerUndoToast,
    setActiveTab,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'lotes' | 'historico' | 'compras'>('lotes');

  // Modal States
  const [showItemModal, setShowItemModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<DiaperStockItem | null>(null);

  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [adjustTargetItem, setAdjustTargetItem] = useState<DiaperStockItem | null>(null);
  const [adjustQuantityValue, setAdjustQuantityValue] = useState<number>(0);
  const [adjustNotesValue, setAdjustNotesValue] = useState<string>('');

  const [showShoppingModal, setShowShoppingModal] = useState<boolean>(false);

  // Filters
  const [sizeFilter, setSizeFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('ativos');

  // Form State for Diaper Stock Item Modal
  const [brand, setBrand] = useState<string>('Pampers');
  const [productLine, setProductLine] = useState<string>('Supersec');
  const [size, setSize] = useState<string>('M');
  const [weightMinKg, setWeightMinKg] = useState<string>('6');
  const [weightMaxKg, setWeightMaxKg] = useState<string>('10');
  const [quantityPurchased, setQuantityPurchased] = useState<number>(80);
  const [quantityCurrent, setQuantityCurrent] = useState<number>(80);
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [unitCost, setUnitCost] = useState<string>('1.20');
  const [totalCost, setTotalCost] = useState<string>('96.00');
  const [storeName, setStoreName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isDefaultInUse, setIsDefaultInUse] = useState<boolean>(false);

  // Form State for Shopping Item Modal
  const [shopBrand, setShopBrand] = useState<string>('Pampers');
  const [shopSize, setShopSize] = useState<string>('M');
  const [shopQuantityNeeded, setShopQuantityNeeded] = useState<number>(100);
  const [shopPriority, setShopPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [shopNotes, setShopNotes] = useState<string>('');

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setBrand('Pampers');
    setProductLine('Supersec');
    setSize('M');
    setWeightMinKg('6');
    setWeightMaxKg('10');
    setQuantityPurchased(80);
    setQuantityCurrent(80);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setUnitCost('');
    setTotalCost('');
    setStoreName('');
    setNotes('');
    setIsDefaultInUse(diaperStockItems.filter((i) => i.status !== 'ARCHIVED').length === 0);
    setShowItemModal(true);
  };

  const handleOpenEditModal = (item: DiaperStockItem) => {
    setEditingItem(item);
    setBrand(item.brand);
    setProductLine(item.productLine || '');
    setSize(item.size);
    setWeightMinKg(item.weightMinKg !== undefined ? String(item.weightMinKg) : '');
    setWeightMaxKg(item.weightMaxKg !== undefined ? String(item.weightMaxKg) : '');
    setQuantityPurchased(item.quantityPurchased);
    setQuantityCurrent(item.quantityCurrent);
    setPurchaseDate(item.purchaseDate || new Date().toISOString().split('T')[0]);
    setUnitCost(item.unitCost !== undefined ? String(item.unitCost) : '');
    setTotalCost(item.totalCost !== undefined ? String(item.totalCost) : '');
    setStoreName(item.storeName || '');
    setNotes(item.notes || '');
    setIsDefaultInUse(Boolean(item.isDefaultInUse));
    setShowItemModal(true);
  };

  const handleSaveItemForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !size.trim() || quantityPurchased <= 0) return;

    const uCostNum = unitCost ? parseFloat(unitCost) : undefined;
    const tCostNum = totalCost ? parseFloat(totalCost) : undefined;
    const wMinNum = weightMinKg ? parseFloat(weightMinKg) : undefined;
    const wMaxNum = weightMaxKg ? parseFloat(weightMaxKg) : undefined;

    if (editingItem) {
      updateDiaperStockItem(editingItem.id, {
        brand: brand.trim(),
        productLine: productLine.trim() || undefined,
        size: size.trim(),
        weightMinKg: wMinNum,
        weightMaxKg: wMaxNum,
        quantityPurchased,
        quantityCurrent,
        purchaseDate,
        unitCost: uCostNum,
        totalCost: tCostNum,
        storeName: storeName.trim() || undefined,
        notes: notes.trim() || undefined,
        isDefaultInUse,
      });
      if (isDefaultInUse) {
        setDefaultDiaperStockItem(editingItem.id);
      }
      triggerUndoToast('Lote de fraldas atualizado!', () => {});
    } else {
      addDiaperStockItem({
        brand: brand.trim(),
        productLine: productLine.trim() || undefined,
        size: size.trim(),
        weightMinKg: wMinNum,
        weightMaxKg: wMaxNum,
        quantityPurchased,
        quantityCurrent,
        purchaseDate,
        unitCost: uCostNum,
        totalCost: tCostNum,
        storeName: storeName.trim() || undefined,
        notes: notes.trim() || undefined,
        isDefaultInUse,
      });
      triggerUndoToast('Novo lote de fraldas adicionado ao estoque!', () => {});
    }

    setShowItemModal(false);
  };

  const handleOpenAdjustModal = (item: DiaperStockItem) => {
    setAdjustTargetItem(item);
    setAdjustQuantityValue(item.quantityCurrent);
    setAdjustNotesValue('');
    setShowAdjustModal(true);
  };

  const handleConfirmAdjust = () => {
    if (!adjustTargetItem) return;
    adjustDiaperStockItemQuantity(adjustTargetItem.id, adjustQuantityValue, adjustNotesValue);
    triggerUndoToast('Saldo do lote ajustado com sucesso!', () => {});
    setShowAdjustModal(false);
  };

  const handleSaveShoppingForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopBrand.trim() || !shopSize.trim()) return;

    addDiaperShoppingItem({
      brand: shopBrand.trim(),
      size: shopSize.trim(),
      quantityNeeded: shopQuantityNeeded,
      priority: shopPriority,
      notes: shopNotes.trim() || undefined,
    });
    triggerUndoToast('Item adicionado à lista de compras!', () => {});
    setShowShoppingModal(false);
  };

  const handleConvertShoppingToStock = (shoppingItem: DiaperShoppingItem) => {
    addDiaperStockItem({
      brand: shoppingItem.brand,
      size: shoppingItem.size,
      quantityPurchased: shoppingItem.quantityNeeded || 80,
      quantityCurrent: shoppingItem.quantityNeeded || 80,
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: `Convertido de item da lista de compras. ${shoppingItem.notes || ''}`.trim(),
    });
    updateDiaperShoppingItem(shoppingItem.id, { status: 'PURCHASED' });
    triggerUndoToast('Compra confirmada e lote criado no estoque!', () => {});
  };

  // Filtered Items safely guarding arrays
  const safeStockItems = Array.isArray(diaperStockItems) ? diaperStockItems : [];
  const safeTransactions = Array.isArray(diaperStockTransactions) ? diaperStockTransactions : [];
  const safeShoppingItems = Array.isArray(diaperShoppingItems) ? diaperShoppingItems : [];

  const activeStockItems = safeStockItems.filter((i) => i && i.status !== 'ARCHIVED');

  const filteredStockItems = activeStockItems.filter((item) => {
    if (!item) return false;
    if (sizeFilter !== 'todos' && item.size !== sizeFilter) return false;
    if (statusFilter === 'com_saldo' && item.quantityCurrent <= 0) return false;
    if (statusFilter === 'sem_saldo' && item.quantityCurrent > 0) return false;
    if (statusFilter === 'padrao' && !item.isDefaultInUse) return false;
    return true;
  });

  const availableSizes = Array.from(new Set(activeStockItems.map((i) => i?.size).filter(Boolean))) as string[];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Package className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Estoque de Fraldas
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gestão completa de lotes, previsão de consumo, alertas de tamanho e reposição.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowShoppingModal(true)}
            className={`py-2.5 px-3.5 rounded-2xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
              isNightMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-emerald-500" />
            <span>Lista de Compras ({diaperShoppingItems.filter((s) => s.status === 'PENDING').length})</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="py-2.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-600/20 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Lote de Fraldas</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD METRICS summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Total Fraldas */}
        <div
          className={`p-4 rounded-3xl border ${
            isNightMode ? 'bg-[#0e131d] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">Total Disponível</span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {diaperStockSummary.totalAvailable} <span className="text-xs font-normal text-slate-400">un</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1">
            {activeStockItems.length} {activeStockItems.length === 1 ? 'lote cadastrado' : 'lotes cadastrados'}
          </div>
        </div>

        {/* Metric 2: Lote Padrão */}
        <div
          className={`p-4 rounded-3xl border ${
            isNightMode ? 'bg-[#0e131d] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">Lote em Uso (Padrão)</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          {diaperStockSummary.defaultItem ? (
            <div>
              <div className="text-base font-black text-slate-900 dark:text-white truncate">
                {diaperStockSummary.defaultItem.brand} ({diaperStockSummary.defaultItem.size})
              </div>
              <div className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                {diaperStockSummary.defaultItem.quantityCurrent} un restantes
              </div>
            </div>
          ) : (
            <div className="text-xs font-bold text-slate-400 italic">Nenhum definido</div>
          )}
        </div>

        {/* Metric 3: Média Diária */}
        <div
          className={`p-4 rounded-3xl border ${
            isNightMode ? 'bg-[#0e131d] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">Média Diária (7 dias)</span>
            <TrendingDown className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {diaperStockSummary.avg7Days} <span className="text-xs font-normal text-slate-400">fraldas/dia</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1">
            Hoje: {diaperStockSummary.consumptionToday} trocas
          </div>
        </div>

        {/* Metric 4: Previsão de Duração */}
        <div
          className={`p-4 rounded-3xl border ${
            isNightMode ? 'bg-[#0e131d] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">Previsão de Duração</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ~{diaperStockSummary.daysRemainingTotal} <span className="text-xs font-normal text-slate-400">dias</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1">
            Com base na média diária
          </div>
        </div>
      </div>

      {/* WEIGHT ALERTS BANNER */}
      {diaperStockSummary.weightAlert && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Alerta de Tamanho e Peso do Bebê
              </div>
              <p className="text-xs font-bold mt-0.5 leading-relaxed">
                {diaperStockSummary.weightAlert.message}
              </p>
              {diaperStockSummary.nextSizeSuggestion && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 font-semibold">
                  💡 Sugestão: Você já possui o próximo tamanho no estoque:{' '}
                  <span className="font-bold underline">
                    {diaperStockSummary.nextSizeSuggestion.brand} ({diaperStockSummary.nextSizeSuggestion.size}) - {diaperStockSummary.nextSizeSuggestion.availableCount} un
                  </span>.
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 self-end sm:self-auto shadow-xs"
          >
            Cadastrar Novo Tamanho
          </button>
        </div>
      )}

      {/* LOW STOCK BANNER */}
      {diaperStockSummary.isLowStock && (
        <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-rose-500/20 text-rose-500 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-600 dark:text-rose-400">Atenção ao Estoque Baixo</div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                O saldo atual de fraldas está abaixo do limite recomendado. Considere adicionar fraldas à lista de compras.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowShoppingModal(true)}
            className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 shadow-xs"
          >
            Comprar Mais
          </button>
        </div>
      )}

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('lotes')}
          className={`py-2 px-4 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'lotes'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : isNightMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Lotes em Estoque ({activeStockItems.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('historico')}
          className={`py-2 px-4 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'historico'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : isNightMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Movimentações ({diaperStockTransactions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('compras')}
          className={`py-2 px-4 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'compras'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : isNightMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Lista de Compras ({diaperShoppingItems.filter((s) => s.status === 'PENDING').length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: LOTES EM ESTOQUE */}
      {activeSubTab === 'lotes' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Sliders className="w-3.5 h-3.5" />
                <span>Filtrar:</span>
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold border outline-none ${
                  isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="todos">Todos os Lotes</option>
                <option value="com_saldo">Com Saldo &gt; 0</option>
                <option value="sem_saldo">Esgotados (= 0)</option>
                <option value="padrao">Somente Padrão (Em Uso)</option>
              </select>

              {/* Size filter */}
              {availableSizes.length > 0 && (
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold border outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="todos">Todos os Tamanhos</option>
                  {availableSizes.map((sz) => (
                    <option key={sz} value={sz}>
                      Tamanho {sz}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="text-xs text-slate-400 font-semibold">
              Exibindo {filteredStockItems.length} de {activeStockItems.length} lotes
            </div>
          </div>

          {/* List of Stock Items */}
          {filteredStockItems.length === 0 ? (
            <div
              className={`p-12 text-center rounded-3xl border ${
                isNightMode ? 'bg-[#0e131d] border-slate-800 text-slate-400' : 'bg-white border-slate-100 text-slate-500'
              }`}
            >
              <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="font-bold text-base text-slate-800 dark:text-slate-200">
                Nenhum lote de fralda encontrado
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Cadastre as pacotes/lotes de fraldas comprados para iniciar o controle automático de saldo a cada troca.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="mt-4 py-2.5 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-sky-600/20"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Cadastrar Primeiro Lote
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStockItems.map((item) => {
                const percentLeft = Math.min(100, Math.max(0, Math.round((item.quantityCurrent / (item.quantityPurchased || 1)) * 100)));
                const isOut = item.quantityCurrent <= 0;
                const isLow = item.quantityCurrent > 0 && item.quantityCurrent <= (baby.lowStockThreshold || 20);

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-3xl border relative transition-all ${
                      item.isDefaultInUse
                        ? isNightMode
                          ? 'bg-[#111827] border-sky-500/50 ring-1 ring-sky-500/30'
                          : 'bg-white border-sky-500 shadow-md ring-1 ring-sky-500/20'
                        : isNightMode
                        ? 'bg-[#0e131d] border-slate-800'
                        : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 font-black text-xs">
                            Tam {item.size}
                          </span>
                          <h3 className="font-black text-base text-slate-900 dark:text-white truncate">
                            {item.brand} {item.productLine && <span className="font-semibold text-slate-500">({item.productLine})</span>}
                          </h3>
                        </div>

                        {(item.weightMinKg || item.weightMaxKg) && (
                          <div className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Indicação de peso:{' '}
                              {item.weightMinKg && item.weightMaxKg
                                ? `${item.weightMinKg} a ${item.weightMaxKg} kg`
                                : item.weightMaxKg
                                ? `Até ${item.weightMaxKg} kg`
                                : `A partir de ${item.weightMinKg} kg`}
                            </span>
                          </div>
                        )}
                      </div>

                      {item.isDefaultInUse ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[11px] flex items-center gap-1 shrink-0">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>Padrão em uso</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDefaultDiaperStockItem(item.id)}
                          className="text-[11px] font-bold text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:underline shrink-0"
                          title="Definir como lote padrão para baixar nas trocas"
                        >
                          Usar como Padrão
                        </button>
                      )}
                    </div>

                    {/* Quantity & Progress */}
                    <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500">Saldo Atual:</span>
                        <span className={`text-sm font-black ${isOut ? 'text-rose-600 dark:text-rose-400' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                          {item.quantityCurrent} <span className="text-xs font-normal text-slate-400">/ {item.quantityPurchased} un</span>
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${percentLeft}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                        <span>Restante: {percentLeft}%</span>
                        {item.unitCost && <span>Custo/un: R$ {item.unitCost.toFixed(2)}</span>}
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="text-[11px] font-semibold text-slate-400 truncate">
                        {item.purchaseDate && <span>Comprado em: {item.purchaseDate}</span>}
                        {item.storeName && <span> • {item.storeName}</span>}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenAdjustModal(item)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg font-bold text-[11px] flex items-center gap-1"
                          title="Ajustar saldo manualmente"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Ajustar</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                          title="Editar lote"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Arquivar lote ${item.brand} ${item.size}?`)) {
                              deleteDiaperStockItem(item.id);
                              triggerUndoToast('Lote arquivado', () => {});
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                          title="Arquivar lote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: HISTÓRICO DE MOVIMENTAÇÕES */}
      {activeSubTab === 'historico' && (
        <div className="space-y-4">
          <div
            className={`p-5 rounded-3xl border ${
              isNightMode ? 'bg-[#0e131d] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
            }`}
          >
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-sky-500" />
              <span>Extrato de Entradas, Baixas e Ajustes</span>
            </h3>

            {safeTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Nenhuma movimentação registrada no histórico.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {safeTransactions.map((tx) => {
                  const item = safeStockItems.find((i) => i && i.id === tx.diaperStockItemId);
                  const isPositive = tx.quantity > 0;

                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                            tx.type === 'USE'
                              ? 'bg-rose-500/10 text-rose-500'
                              : tx.type === 'PURCHASE' || tx.type === 'RESTORE'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-sky-500/10 text-sky-500'
                          }`}
                        >
                          {tx.type === 'USE' ? '-' : '+'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {tx.type === 'USE' && 'Baixa por Troca de Fralda'}
                            {tx.type === 'PURCHASE' && 'Entrada por Compra de Lote'}
                            {tx.type === 'ADJUST' && 'Ajuste Manual de Saldo'}
                            {tx.type === 'RESTORE' && 'Restauração por Exclusão/Alteração'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {item ? `${item.brand} (${item.size})` : 'Lote de fraldas'} • {formatDateTime(tx.dateTime || tx.createdAt)}
                          </div>
                          {tx.notes && <div className="text-[11px] text-slate-500 italic mt-0.5">{tx.notes}</div>}
                        </div>
                      </div>

                      <div
                        className={`font-black text-sm ${
                          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? `+${tx.quantity}` : tx.quantity} un
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LISTA DE COMPRAS */}
      {activeSubTab === 'compras' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Itens para Reposição</h3>
              <p className="text-xs text-slate-400">Adicione modelos e marcas para comprar no mercado ou farmácia.</p>
            </div>

            <button
              onClick={() => setShowShoppingModal(true)}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Adicionar à Lista</span>
            </button>
          </div>

          {safeShoppingItems.length === 0 ? (
            <div
              className={`p-10 text-center rounded-3xl border ${
                isNightMode ? 'bg-[#0e131d] border-slate-800 text-slate-400' : 'bg-white border-slate-100 text-slate-500'
              }`}
            >
              <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Sua lista de compras está vazia</p>
              <p className="text-xs text-slate-400 mt-1">Nenhum pacote de fraldas pendente para compra.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {safeShoppingItems.map((s) => {
                const isPurchased = s.status === 'PURCHASED';

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                      isPurchased
                        ? 'opacity-60 bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800'
                        : isNightMode
                        ? 'bg-[#0e131d] border-slate-800'
                        : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                          isPurchased
                            ? 'bg-slate-200 text-slate-500'
                            : s.priority === 'URGENT' || s.priority === 'URGENTE'
                            ? 'bg-rose-500/20 text-rose-500'
                            : s.priority === 'HIGH' || s.priority === 'ALTA'
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-sky-500/20 text-sky-500'
                        }`}
                      >
                        <Tag className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900 dark:text-white">
                            Fralda {s.brand} - Tam {s.size}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                            ~{s.quantityNeeded || 80} un
                          </span>
                          {(s.priority === 'URGENT' || s.priority === 'URGENTE') && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-600 font-bold text-[10px]">
                              URGENTE
                            </span>
                          )}
                        </div>
                        {s.notes && <div className="text-xs text-slate-400 mt-0.5">{s.notes}</div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isPurchased && (
                        <button
                          onClick={() => handleConvertShoppingToStock(s)}
                          className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Comprado! (+Estoque)</span>
                        </button>
                      )}

                      <button
                        onClick={() => deleteDiaperShoppingItem(s.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT DIAPER STOCK ITEM */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border max-h-[90vh] overflow-y-auto ${
              isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-lg">
                  {editingItem ? 'Editar Lote de Fraldas' : 'Novo Lote de Fraldas'}
                </h3>
                <p className="text-xs text-slate-400">Cadastre a marca, tamanho, quantidade e indicativo de peso.</p>
              </div>
              <button onClick={() => setShowItemModal(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemForm} className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Marca *</label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ex: Pampers, Huggies, MamyPoko"
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Linha / Modelo</label>
                  <input
                    type="text"
                    value={productLine}
                    onChange={(e) => setProductLine(e.target.value)}
                    placeholder="Ex: Supersec, Confort Sec, Pants"
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Tamanho *</label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="RN">RN (Recém-Nascido)</option>
                    <option value="RN+">RN+</option>
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="XG">XG / EG</option>
                    <option value="XXG">XXG / EEG</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Peso Mín (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={weightMinKg}
                    onChange={(e) => setWeightMinKg(e.target.value)}
                    placeholder="Ex: 6"
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Peso Máx (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={weightMaxKg}
                    onChange={(e) => setWeightMaxKg(e.target.value)}
                    placeholder="Ex: 10"
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Qtd Comprada (un) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantityPurchased}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setQuantityPurchased(val);
                      if (!editingItem) setQuantityCurrent(val);
                    }}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Saldo Atual (un) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quantityCurrent}
                    onChange={(e) => setQuantityCurrent(parseInt(e.target.value) || 0)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Data da Compra</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Custo Total (R$ opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    placeholder="Ex: 96.00"
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Checkbox Default */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkDefault"
                  checked={isDefaultInUse}
                  onChange={(e) => setIsDefaultInUse(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 accent-sky-600"
                />
                <label htmlFor="chkDefault" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Definir como lote padrão para baixar automaticamente nas trocas de fraldas
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-200 text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20"
                >
                  Salvar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST QUANTITY */}
      {showAdjustModal && adjustTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border ${
              isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
            }`}
          >
            <h3 className="font-black text-base">Ajustar Saldo de Fraldas</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {adjustTargetItem.brand} (Tam {adjustTargetItem.size})
            </p>

            <div className="py-4 space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Novo Saldo (unidades restantes):</label>
                <input
                  type="number"
                  min="0"
                  value={adjustQuantityValue}
                  onChange={(e) => setAdjustQuantityValue(parseInt(e.target.value) || 0)}
                  className={`w-full p-3 rounded-xl text-lg font-black border outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Motivo / Observação:</label>
                <input
                  type="text"
                  value={adjustNotesValue}
                  onChange={(e) => setAdjustNotesValue(e.target.value)}
                  placeholder="Ex: Contagem física, doação, perda"
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold border outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="py-2 px-3 rounded-xl text-xs font-bold border border-slate-200 text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjust}
                className="py-2 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20"
              >
                Confirmar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD SHOPPING ITEM */}
      {showShoppingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border ${
              isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base">Adicionar à Lista de Compras</h3>
              <button onClick={() => setShowShoppingModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShoppingForm} className="py-4 space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Marca Desejada *</label>
                <input
                  type="text"
                  required
                  value={shopBrand}
                  onChange={(e) => setShopBrand(e.target.value)}
                  placeholder="Ex: Pampers, Huggies"
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold block mb-1">Tamanho *</label>
                  <select
                    value={shopSize}
                    onChange={(e) => setShopSize(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="RN">RN</option>
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="XG">XG</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Qtd Pretendida</label>
                  <input
                    type="number"
                    min="1"
                    value={shopQuantityNeeded}
                    onChange={(e) => setShopQuantityNeeded(parseInt(e.target.value) || 80)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                      isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Prioridade</label>
                <select
                  value={shopPriority}
                  onChange={(e) => setShopPriority(e.target.value as any)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente (Sem Fraldas)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Observação</label>
                <input
                  type="text"
                  value={shopNotes}
                  onChange={(e) => setShopNotes(e.target.value)}
                  placeholder="Ex: Aproveitar promoção de hipermercado"
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold border outline-none ${
                    isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowShoppingModal(false)}
                  className="py-2 px-3 rounded-xl text-xs font-bold border border-slate-200 text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  Adicionar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
