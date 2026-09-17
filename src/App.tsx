import React from 'react';
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
    return <AuthScreen />;
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
      <Header />

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
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
