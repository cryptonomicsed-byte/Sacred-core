import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { hybridStorage } from '@infra/storage/hybridStorage';
import { initSupabase, checkConnection } from '@infra/platform/supabaseClient';
import { sentryService, SentryErrorBoundary } from '@infra/observability/sentryService';

// Pages
import DashboardPage from './pages/DashboardPage';
import ExtractPage from './pages/ExtractPage';
import CampaignsPage from './pages/CampaignsPage';
import SonicLabPage from './pages/SonicLabPage';
import AutomationsPage from './pages/AutomationsPage';
import BattleModePage from './pages/BattleModePage';
import LeadHunterPage from './pages/LeadHunterPage';
import SchedulerPage from './pages/SchedulerPage';
import LiveSessionPage from './pages/LiveSessionPage';
import AffiliateHubPage from './pages/AffiliateHubPage';
import BrandSimulatorPage from './pages/BrandSimulatorPage';
import AgentForgePage from './pages/AgentForgePage';
import SiteBuilderPage from './pages/SiteBuilderPage';
import LandingPage from './pages/LandingPage';
import SharedProfilePage from './pages/SharedProfilePage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing Sacred Core...');
      
      try {
        // Initialize Sentry for error tracking (first, before other services)
        sentryService.initialize();
        
        // Initialize Supabase (graceful fail if not configured)
        initSupabase();
        
        // Initialize hybrid storage
        await hybridStorage.initialize();
        
        // Check Supabase connection
        const isConnected = await checkConnection();
        if (isConnected) {
          console.log('✅ App initialized with cloud sync');
        } else {
          console.log('⚠️ App initialized in offline mode');
        }
      } catch (error) {
        console.warn('⚠️ Initialization error (running in fallback mode):', error);
        sentryService.captureException(error, { context: 'app_initialization' });
      }
    };

    initializeApp();
  }, []);

  return (
    <SentryErrorBoundary fallback={
      <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
        <h2>Application Error</h2>
        <p>Something went wrong. Please refresh the page.</p>
      </div>
    } showDialog>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/extract" element={<ExtractPage />} />
            <Route path="/simulator" element={<BrandSimulatorPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/agents" element={<AgentForgePage />} />
            <Route path="/builder" element={<SiteBuilderPage />} />
            <Route path="/scheduler" element={<SchedulerPage />} />
            <Route path="/leads" element={<LeadHunterPage />} />
            <Route path="/sonic" element={<SonicLabPage />} />
            <Route path="/live" element={<LiveSessionPage />} />
            <Route path="/affiliate" element={<AffiliateHubPage />} />
            <Route path="/automations" element={<AutomationsPage />} />
            <Route path="/battle" element={<BattleModePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/share/:id" element={<SharedProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </SentryErrorBoundary>
  );
}
