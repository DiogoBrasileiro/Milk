import React, { useState } from 'react';
import { IS_STATIC_PAGES, IS_CLOUD_PAGES } from './lib/deployment';
import { CloudAuthProvider } from './context/CloudAuthProvider';
import { CloudAuthScreen } from './components/auth/CloudAuthScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { HomeDashboard } from './components/HomeDashboard';
import { FeedingsSection } from './components/FeedingsSection';
import { PumpingSection } from './components/PumpingSection';
import { DiapersSection } from './components/DiapersSection';
import { BabyProfileSection } from './components/BabyProfileSection';
import { PediatricReportSection } from './components/PediatricReportSection';
import { InventorySection } from './components/InventorySection';
import { DiaperInventorySection } from './components/DiaperInventorySection';
import { GrowthSection } from './components/GrowthSection';
import { SleepSection } from './components/SleepSection';
import { MoreSection } from './components/MoreSection';

// Modals & Authentication
import { AuthScreen } from './components/auth/AuthScreen';
import { OnboardingBabyModal } from './components/auth/OnboardingBabyModal';
import { ToastUndo } from './components/common/ToastUndo';
import { QuickActionModal } from './components/QuickActionModal';
import { RetroactiveLogModal } from './components/RetroactiveLogModal';
import { DirectFeedingModal } from './components/DirectFeedingModal';
import { PumpingSessionModal } from './components/PumpingSessionModal';
import { DiaperTrackerModal } from './components/DiaperTrackerModal';
import { DiscomfortModal } from './components/DiscomfortModal';
import { SleepLogModal } from './components/SleepLogModal';
import { MilkBottleLabelModal } from './components/MilkBottleLabelModal';
import { SettingsModal } from './components/SettingsModal';
import { EditMilkBatchModal } from './components/EditMilkBatchModal';
import { AddMilkBatchModal } from './components/AddMilkBatchModal';
import { EditFeedingModal } from './components/EditFeedingModal';
import { EditPumpingModal } from './components/EditPumpingModal';
import { MedicationTrackerModal } from './components/medications/MedicationTrackerModal';
import { ErrorBoundary } from './components/ErrorBoundary';


const LocalProfileStart: React.FC = () => {
  const { startLocalProfile } = useAuth();
  const [name, setName] = useState('');
  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100 flex items-center justify-center p-5">
      <form onSubmit={(event) => { event.preventDefault(); startLocalProfile(name); }}
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">MilkFlow Baby</h1>
          <p className="text-sm text-slate-300">Versão local do GitHub Pages</p>
        </div>
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
          Os registros ficam somente neste navegador. Não há conta online,
          sincronização entre aparelhos ou recuperação automática. Evite
          dispositivos compartilhados e exporte backups regularmente.
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Como deseja ser chamado(a)?</span>
          <input className="w-full rounded-xl bg-slate-800 border border-slate-600 p-3 outline-none focus:border-blue-400"
            value={name} onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Mãe, Pai ou Cuidador(a)" maxLength={60} />
        </label>
        <button type="submit" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-3 font-bold">
          Começar neste dispositivo
        </button>
        <p className="text-xs text-slate-400">
          Esta edição não importa automaticamente os dados da versão do Google AI Studio.
        </p>
      </form>
    </main>
  );
};

const AppContent: React.FC = () => {
  const { currentUser, isOnboarding, isLoading } = useAuth();
  const { activeTab, activeModal, modalData, closeModal, isNightMode, undoToast, clearUndoToast } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080b10] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400">Carregando MilkFlow...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Mobile-First Auth Screen
  if (!currentUser) {
    return IS_CLOUD_PAGES ? <CloudAuthScreen /> : IS_STATIC_PAGES ? <LocalProfileStart /> : <AuthScreen />;
  }

  // Logged in but no baby registered yet -> Fast Onboarding Step
  if (isOnboarding) {
    return <OnboardingBabyModal />;
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isNightMode ? 'bg-[#080b10] text-slate-100 dark' : 'bg-slate-50/70 text-slate-900'
      }`}
    >
      {IS_STATIC_PAGES && (
        <div role="status" className="w-full bg-amber-100 text-amber-950 px-3 py-2 text-xs text-center">
          <strong>Modo local:</strong> os registros ficam apenas neste navegador, sem sincronização entre dispositivos.
          Exporte backups periodicamente.
        </div>
      )}
      <Header />
      {IS_CLOUD_PAGES && (
        <div role="status" className="sticky top-0 z-40 bg-amber-100 text-amber-950 px-4 py-3 text-center text-sm font-semibold">
          Histórico em modo consulta: seus dados são carregados do Supabase.
          Novos registros e alterações estão temporariamente desativados até validarmos a sincronização.
        </div>
      )}

      <div style={IS_CLOUD_PAGES ? { pointerEvents: 'none', opacity: 0.92 } : undefined}>
      <main className="w-full">
        <ErrorBoundary fallbackTitle="Erro ao carregar o painel principal">
          {activeTab === 'home' && <HomeDashboard />}
          {activeTab === 'mamadas' && <FeedingsSection />}
          {activeTab === 'ordenha' && <PumpingSection />}
          {activeTab === 'fraldas' && <DiapersSection />}
          {activeTab === 'relatorios' && <PediatricReportSection />}
          {activeTab === 'bebe' && <BabyProfileSection />}
          {(activeTab === 'estoque' || activeTab === 'inventory') && <InventorySection />}
          {(activeTab === 'estoque_fraldas' || activeTab === 'diaper_inventory') && <DiaperInventorySection />}
          {(activeTab === 'sono' || activeTab === 'sleep') && <SleepSection />}
          {activeTab === 'crescimento' && <GrowthSection />}
          {activeTab === 'mais' && <MoreSection />}
        </ErrorBoundary>
      </main>

      <Navigation />

      {/* Floating Undo Feedback Toast */}
      <ToastUndo toast={undoToast} onClose={clearUndoToast} />

      {/* Dynamic Modals based on context state */}
      {activeModal === 'quickAction' && <QuickActionModal />}
      {activeModal === 'retroactiveLog' && <RetroactiveLogModal />}
      {activeModal === 'feedingDetail' && <DirectFeedingModal />}
      {activeModal === 'pumpingSession' && <PumpingSessionModal />}
      {activeModal === 'sleepLog' && <SleepLogModal onClose={() => {}} />}
      {activeModal === 'diaperDetail' && <DiaperTrackerModal />}
      {activeModal === 'discomfort' && <DiscomfortModal />}
      {activeModal === 'medications' && <MedicationTrackerModal isOpen={true} onClose={closeModal} />}
      {activeModal === 'bottleLabel' && <MilkBottleLabelModal />}
      {activeModal === 'addBaby' && <OnboardingBabyModal />}
      {activeModal === 'weightDetail' && <GrowthSection />}
      {activeModal === 'editMilkBatch' && modalData?.batch && (
        <EditMilkBatchModal batch={modalData.batch} onClose={closeModal} />
      )}
      {activeModal === 'addMilkBatch' && <AddMilkBatchModal onClose={closeModal} />}
      {activeModal === 'editFeeding' && modalData?.feeding && (
        <EditFeedingModal feeding={modalData.feeding} onClose={closeModal} />
      )}
      {activeModal === 'editPumping' && modalData?.pumping && (
        <EditPumpingModal pumping={modalData.pumping} onClose={closeModal} />
      )}
      {(activeModal === 'settings' || activeModal === 'babyProfile' || activeModal === 'caregivers') && (
        <SettingsModal />
      )}
      </div>
    </div>
  );
};

export default function App() {
  const FamilyAuth = IS_CLOUD_PAGES ? CloudAuthProvider : AuthProvider;
  return (
    <FamilyAuth>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </FamilyAuth>
  );
}
