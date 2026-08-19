import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { hybridStorage } from './services/hybridStorageService';
import { initSupabase, checkConnection } from './services/supabaseClient';
import { sentryService, SentryErrorBoundary } from './services/sentryService';
import { useStore } from './store';

// Pages — lazy-loaded so each route ships its own chunk instead of one 1MB bundle.
// LoginPage stays eager: it's the first thing an unauthenticated visitor needs.
import LoginPage from './pages/LoginPage';
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExtractPage = lazy(() => import('./pages/ExtractPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const SonicLabPage = lazy(() => import('./pages/SonicLabPage'));
const AutomationsPage = lazy(() => import('./pages/AutomationsPage'));
const BattleModePage = lazy(() => import('./pages/BattleModePage'));
const LeadHunterPage = lazy(() => import('./pages/LeadHunterPage'));
const SchedulerPage = lazy(() => import('./pages/SchedulerPage'));
const LiveSessionPage = lazy(() => import('./pages/LiveSessionPage'));
const AffiliateHubPage = lazy(() => import('./pages/AffiliateHubPage'));
const BrandSimulatorPage = lazy(() => import('./pages/BrandSimulatorPage'));
const AgentForgePage = lazy(() => import('./pages/AgentForgePage'));
const SiteBuilderPage = lazy(() => import('./pages/SiteBuilderPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const SharedProfilePage = lazy(() => import('./pages/SharedProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-dark-bg">
    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { isAuthenticated } = useStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const LoginPageRoute = () => {
  const { isAuthenticated } = useStore();
  return isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />;
};

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
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPageRoute />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/share/:id" element={<SharedProfilePage />} />

              {/* Protected App Routes */}
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/extract" element={<ProtectedRoute><ExtractPage /></ProtectedRoute>} />
              <Route path="/simulator" element={<ProtectedRoute><BrandSimulatorPage /></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
              <Route path="/agents" element={<ProtectedRoute><AgentForgePage /></ProtectedRoute>} />
              <Route path="/builder" element={<ProtectedRoute><SiteBuilderPage /></ProtectedRoute>} />
              <Route path="/scheduler" element={<ProtectedRoute><SchedulerPage /></ProtectedRoute>} />
              <Route path="/leads" element={<ProtectedRoute><LeadHunterPage /></ProtectedRoute>} />
              <Route path="/sonic" element={<ProtectedRoute><SonicLabPage /></ProtectedRoute>} />
              <Route path="/live" element={<ProtectedRoute><LiveSessionPage /></ProtectedRoute>} />
              <Route path="/affiliate" element={<ProtectedRoute><AffiliateHubPage /></ProtectedRoute>} />
              <Route path="/automations" element={<ProtectedRoute><AutomationsPage /></ProtectedRoute>} />
              <Route path="/battle" element={<ProtectedRoute><BattleModePage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </HashRouter>
    </SentryErrorBoundary>
  );
}
