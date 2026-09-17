import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Milk, Droplet, Droplets, LayoutGrid, Plus } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, openModal, isNightMode } = useApp();

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 border-t transition-colors duration-200 pb-safe select-none ${
        isNightMode ? 'bg-[#080b10]/95 border-slate-800 backdrop-blur-lg' : 'bg-white/95 border-slate-200 backdrop-blur-lg'
      }`}
    >
      <div className="max-w-md mx-auto px-2 h-16 flex items-center justify-between">
        {/* Tab 1: Início / Dashboard Principal */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          id="nav-tab-home"
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-all ${
            activeTab === 'home'
              ? isNightMode
                ? 'text-blue-400 font-bold'
                : 'text-blue-600 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home
            className={`w-5 h-5 transition-transform ${
              activeTab === 'home' ? 'scale-110 stroke-[2.5]' : ''
            }`}
          />
          <span className="text-[10px] mt-1 font-semibold">Início</span>
        </button>

        {/* Tab 2: Amamentação / Mamadas */}
        <button
          type="button"
          onClick={() => setActiveTab('mamadas')}
          id="nav-tab-mamadas"
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-all ${
            activeTab === 'mamadas'
              ? isNightMode
                ? 'text-rose-400 font-bold'
                : 'text-rose-600 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Milk
            className={`w-5 h-5 transition-transform ${
              activeTab === 'mamadas' ? 'scale-110 stroke-[2.5]' : ''
            }`}
          />
          <span className="text-[10px] mt-1 font-semibold">Mamadas</span>
        </button>

        {/* Central FAB: + REGISTRAR */}
        <div className="relative -top-3.5 flex flex-col items-center justify-center px-1">
          <button
            type="button"
            onClick={() => openModal('quickAction')}
            id="main-quick-record-fab"
            className="w-13 h-13 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 transition-all border-2 border-[#080b10] dark:border-[#080b10]"
            aria-label="Registrar Agora"
          >
            <Plus className="w-7 h-7 stroke-[3]" />
          </button>
          <span className="text-[9px] font-black tracking-tight text-blue-400 mt-1 uppercase">
            + Registrar
          </span>
        </div>

        {/* Tab 3: Ordenha */}
        <button
          type="button"
          onClick={() => setActiveTab('ordenha')}
          id="nav-tab-ordenha"
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-all ${
            activeTab === 'ordenha'
              ? isNightMode
                ? 'text-sky-400 font-bold'
                : 'text-sky-600 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Droplet
            className={`w-5 h-5 transition-transform ${activeTab === 'ordenha' ? 'scale-110 stroke-[2.5]' : ''}`}
          />
          <span className="text-[10px] mt-1 font-semibold">Ordenha</span>
        </button>

        {/* Tab 4: Fraldas (Xixi & Cocô) */}
        <button
          type="button"
          onClick={() => setActiveTab('fraldas')}
          id="nav-tab-fraldas"
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-all ${
            activeTab === 'fraldas'
              ? isNightMode
                ? 'text-cyan-400 font-bold'
                : 'text-cyan-600 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Droplets
            className={`w-5 h-5 transition-transform ${activeTab === 'fraldas' ? 'scale-110 stroke-[2.5]' : ''}`}
          />
          <span className="text-[10px] mt-1 font-semibold">Fraldas</span>
        </button>

        {/* Tab 5: Mais / Menu de Recursos */}
        <button
          type="button"
          onClick={() => setActiveTab('mais')}
          id="nav-tab-mais"
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-all ${
            activeTab === 'mais' || activeTab === 'relatorios' || activeTab === 'bebe' || activeTab === 'sono' || activeTab === 'sleep' || activeTab === 'crescimento' || activeTab === 'estoque'
              ? isNightMode
                ? 'text-indigo-400 font-bold'
                : 'text-indigo-600 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutGrid
            className={`w-5 h-5 transition-transform ${
              activeTab === 'mais' || activeTab === 'relatorios' || activeTab === 'bebe' || activeTab === 'sono' || activeTab === 'sleep' || activeTab === 'crescimento' || activeTab === 'estoque'
                ? 'scale-110 stroke-[2.5]'
                : ''
            }`}
          />
          <span className="text-[10px] mt-1 font-semibold">Mais</span>
        </button>
      </div>
    </nav>
  );
};
