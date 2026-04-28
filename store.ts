
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { BrandDNA, Campaign, UserTier, VideoJob, Agent, LeadProfile, ProviderConfig } from './types';
import { featureFlagService } from '@infra/state/featureFlagService';

/**
 * Custom IndexedDB Storage for Zustand
 * Fixes "Quota Exceeded" errors by using IndexedDB (GBs of space) 
 * instead of LocalStorage (5MB limit).
 */
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const request = indexedDB.open('coredna_db', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('store');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('store', 'readonly');
        const store = tx.objectStore('store');
        const getRequest = store.get(name);
        getRequest.onsuccess = () => resolve(getRequest.result || null);
      };
      request.onerror = () => resolve(null);
    });
  },
  setItem: async (name: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      const request = indexedDB.open('coredna_db', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('store');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('store', 'readwrite');
        const store = tx.objectStore('store');
        store.put(value, name);
        tx.oncomplete = () => resolve();
      };
    });
  },
  removeItem: async (name: string): Promise<void> => {
    return new Promise((resolve) => {
      const request = indexedDB.open('coredna_db', 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('store', 'readwrite');
        const store = tx.objectStore('store');
        store.delete(name);
        tx.oncomplete = () => resolve();
      };
    });
  },
};

interface AppState {
  isAuthenticated: boolean;
  currentBrand: BrandDNA | null;
  brands: BrandDNA[];
  campaigns: Campaign[];
  leads: LeadProfile[];
  userTier: UserTier;
  credits: number;
  videoJobs: VideoJob[];
  agents: Agent[];
  providers: ProviderConfig;
  showTrendPulse: boolean;
  
  login: () => void;
  logout: () => void;
  setBrand: (brand: BrandDNA) => void;
  addBrand: (brand: BrandDNA) => void;
  updateBrand: (id: string, updates: Partial<BrandDNA>) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (campaignId: string, updates: Partial<Campaign>) => void;
  addLeads: (newLeads: LeadProfile[]) => void;
  updateLead: (id: string, updates: Partial<LeadProfile>) => void;
  deleteLead: (id: string) => void;
  scheduleAsset: (assetId: string, scheduledAt: string) => void;
  setTier: (tier: UserTier) => void;
  deductCredits: (amount: number) => void;
  addVideoJob: (job: VideoJob) => void;
  updateVideoJob: (id: string, updates: Partial<VideoJob>) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  updateProviders: (updates: Partial<ProviderConfig>) => void;
  setApiKey: (provider: keyof ProviderConfig['keys'], key: string) => void;
  setActiveLLM: (provider: string) => void;
  setActiveImage: (provider: string) => void;
  setActiveVideo: (provider: string) => void;
  toggleTrendPulse: () => void;
  reset: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      currentBrand: null,
      brands: [],
      campaigns: [],
      leads: [],
      userTier: 'pro',
      credits: 500,
      videoJobs: [],
      agents: [],
      showTrendPulse: false, 
      providers: {
        activeLLM: 'gemini',
        activeImage: 'gemini',
        activeVideo: 'veo',
        activeWorkflow: 'n8n',
        keys: {
          gemini: process.env.API_KEY || ''
        }
      },
      
      login: () => set({ isAuthenticated: true }),
      logout: () => set({ isAuthenticated: false }),
      setBrand: (brand) => set({ currentBrand: brand }),
      addBrand: (brand) => set((state) => ({ 
        brands: [brand, ...state.brands.filter(b => b.id !== brand.id)],
        currentBrand: brand
      })),
      updateBrand: (id, updates) => set((state) => {
        const updatedBrands = state.brands.map(b => b.id === id ? { ...b, ...updates } : b);
        const updatedCurrent = state.currentBrand?.id === id ? { ...state.currentBrand, ...updates } : state.currentBrand;
        return { brands: updatedBrands, currentBrand: updatedCurrent as BrandDNA | null };
      }),
      addCampaign: (campaign) => set((state) => ({
        campaigns: [campaign, ...state.campaigns]
      })),
      updateCampaign: (id, updates) => set((state) => ({
        campaigns: state.campaigns.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      
      addLeads: (newLeads) => set((state) => ({ leads: [...newLeads, ...state.leads] })),
      updateLead: (id, updates) => set((state) => ({
        leads: state.leads.map(l => l.id === id ? { ...l, ...updates } : l)
      })),
      deleteLead: (id) => set((state) => ({
        leads: state.leads.filter(l => l.id !== id)
      })),
      
      scheduleAsset: (assetId, scheduledAt) => set((state) => {
        const newCampaigns = state.campaigns.map(c => {
          const assetIndex = c.assets.findIndex(a => a.id === assetId);
          if (assetIndex > -1) {
            const updatedAssets = [...c.assets];
            updatedAssets[assetIndex] = {
              ...updatedAssets[assetIndex],
              metadata: { ...updatedAssets[assetIndex].metadata, status: 'approved', scheduledAt }
            };
            return { ...c, assets: updatedAssets };
          }
          return c;
        });
        return { campaigns: newCampaigns };
      }),
      
      setTier: (tier) => set({ userTier: tier }),
      deductCredits: (amount) => set((state) => ({ credits: Math.max(0, state.credits - amount) })),
      addVideoJob: (job) => set((state) => ({ videoJobs: [job, ...state.videoJobs] })),
      updateVideoJob: (id, updates) => set((state) => ({
        videoJobs: state.videoJobs.map(j => j.id === id ? { ...j, ...updates } : j)
      })),

      addAgent: (agent) => set((state) => ({ agents: [agent, ...state.agents] })),
      updateAgent: (id, updates) => set((state) => ({
        agents: state.agents.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      deleteAgent: (id) => set((state) => ({
        agents: state.agents.filter(a => a.id !== id)
      })),

      updateProviders: (updates) => set((state) => ({
        providers: { ...state.providers, ...updates }
      })),
      setApiKey: (provider, key) => set((state) => ({
        providers: {
          ...state.providers,
          keys: { ...state.providers.keys, [provider]: key }
        }
      })),
      
      setActiveLLM: (provider) => set((state) => ({
        providers: { ...state.providers, activeLLM: provider }
      })),
      
      setActiveImage: (provider) => set((state) => ({
        providers: { ...state.providers, activeImage: provider }
      })),
      
      setActiveVideo: (provider) => set((state) => ({
        providers: { ...state.providers, activeVideo: provider }
      })),
      
      toggleTrendPulse: () => set((state) => ({ showTrendPulse: !state.showTrendPulse })),
      reset: () => set({ isAuthenticated: false, currentBrand: null, brands: [], campaigns: [], videoJobs: [], agents: [], leads: [] })
    }),
    {
      name: 'coredna2-persistent-vault',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        brands: state.brands,
        currentBrand: state.currentBrand,
        campaigns: state.campaigns,
        leads: state.leads,
        userTier: state.userTier,
        credits: state.credits,
        videoJobs: state.videoJobs,
        agents: state.agents,
        providers: state.providers,
        showTrendPulse: state.showTrendPulse,
      }),
    }
  )
);

/**
 * Feature Flags Store (Zustand)
 * 
 * Usage:
 *   const { videoGeneration, refresh } = useFeatureFlags();
 *   if (videoGeneration) { <VideoComponent /> }
 *   
 *   // Refresh flags on demand
 *   await refresh();
 */
interface FeatureFlagsState {
  videoGeneration: boolean;
  imageGeneration: boolean;
  competitorAnalysis: boolean;
  aiOptimization: boolean;
  advancedAnalytics: boolean;
  affiliateProgram: boolean;
  webhookIntegrations: boolean;
  multiRegionSync: boolean;
  betaAiFeatures: boolean;
  performanceMode: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useFeatureFlags = create<FeatureFlagsState>((set) => {
  // Load flags on store creation
  featureFlagService.getAllFlags().then((flags) => {
    set({
      videoGeneration: flags.video_generation ?? true,
      imageGeneration: flags.image_generation ?? true,
      competitorAnalysis: flags.competitor_analysis ?? true,
      aiOptimization: flags.ai_optimization ?? true,
      advancedAnalytics: flags.advanced_analytics ?? true,
      affiliateProgram: flags.affiliate_program ?? true,
      webhookIntegrations: flags.webhook_integrations ?? true,
      multiRegionSync: flags.multi_region_sync ?? false,
      betaAiFeatures: flags.beta_ai_features ?? false,
      performanceMode: flags.performance_mode ?? false,
      loading: false,
      error: null,
    });
  }).catch((error) => {
    set({
      loading: false,
      error: error instanceof Error ? error.message : 'Failed to load flags',
    });
  });

  return {
    videoGeneration: true,
    imageGeneration: true,
    competitorAnalysis: true,
    aiOptimization: true,
    advancedAnalytics: true,
    affiliateProgram: true,
    webhookIntegrations: true,
    multiRegionSync: false,
    betaAiFeatures: false,
    performanceMode: false,
    loading: true,
    error: null,
    refresh: async () => {
      set({ loading: true });
      try {
        await featureFlagService.refresh();
        const flags = await featureFlagService.getAllFlags();
        set({
          videoGeneration: flags.video_generation ?? true,
          imageGeneration: flags.image_generation ?? true,
          competitorAnalysis: flags.competitor_analysis ?? true,
          aiOptimization: flags.ai_optimization ?? true,
          advancedAnalytics: flags.advanced_analytics ?? true,
          affiliateProgram: flags.affiliate_program ?? true,
          webhookIntegrations: flags.webhook_integrations ?? true,
          multiRegionSync: flags.multi_region_sync ?? false,
          betaAiFeatures: flags.beta_ai_features ?? false,
          performanceMode: flags.performance_mode ?? false,
          loading: false,
          error: null,
        });
      } catch (error) {
        set({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to refresh flags',
        });
      }
    },
  };
});
