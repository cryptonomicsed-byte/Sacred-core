
import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { DNAHelix } from '../components/DNAHelix';
import { TrendPulse } from '../components/TrendPulse';
import { BrandDNA, ProcessingState } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { enhanceBrandExtraction } from '@infra/extraction/enhancedExtractionService';
import { checkApiKey } from '@infra/ai/geminiCampaignService';

// Sub-components/pages for tabs
import BrandSimulatorPage from './BrandSimulatorPage';
import BattleModePage from './BattleModePage';

import { 
  ArrowRight, 
  Activity, 
  Globe, 
  TrendingUp, 
  LayoutDashboard, 
  FlaskConical, 
  Swords,
  ChevronLeft,
  ChevronRight,
  Target,
  Sparkles,
  Layers,
  ArrowUpRight,
  Eye,
  CheckCircle2,
  Zap,
  ZapOff,
  BrainCircuit,
  Search,
  AlertCircle,
  Plus,
  X,
  RefreshCw
} from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-dark-surface border border-dark-border p-5 rounded-xl transition-all hover:border-brand-500/30">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
      </div>
      <span className="text-xs text-zinc-500 font-mono tracking-tighter">Real-time Pulse</span>
    </div>
    <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
    <p className="text-sm text-zinc-500">{label}</p>
  </div>
);

const ExtractionOverlay = ({ onComplete, onCancel }: { onComplete: (brand: BrandDNA) => void, onCancel: () => void }) => {
  const [url, setUrl] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState<ProcessingState>(ProcessingState.IDLE);
  const [progressMsg, setProgressMsg] = useState('Initializing...');
  const [error, setError] = useState<{message: string, code?: string}>({ message: '' });
  const { addBrand } = useStore();

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    setError({ message: '' });

    if (!checkApiKey()) {
      setError({ message: "Neural Core Disconnected (Missing API Key). Check Settings." });
      return;
    }

    setStatus(ProcessingState.ANALYZING);
    try {
      const brand = await enhanceBrandExtraction(url, desc, (msg) => setProgressMsg(msg));
      addBrand(brand);
      setStatus(ProcessingState.COMPLETE);
      setTimeout(() => onComplete(brand), 1000);
    } catch (err: any) {
      setError({ message: err.message || "Extraction Failed", code: err.code });
      setStatus(ProcessingState.ERROR);
    }
  };

  return (
    <div className="bg-dark-surface border border-brand-500/30 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
       <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900">
          {status === ProcessingState.ANALYZING && <div className="h-full bg-brand-500 w-1/3 animate-[progress_2s_ease-in-out_infinite]"></div>}
       </div>
       <button onClick={onCancel} className="absolute top-6 right-6 p-2 text-zinc-600 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
       
       <div className="flex flex-col md:flex-row gap-10 items-start">
          <div className="flex-1 space-y-6">
             <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                   <BrainCircuit className="w-8 h-8 text-brand-500" /> Sequence New Brand DNA
                </h2>
                <p className="text-zinc-500 text-sm font-medium mt-2">Inject a target URL to initiate recursive neural mapping.</p>
             </div>

             <form onSubmit={handleExtract} className="space-y-4">
                <div className="relative group">
                   <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-brand-500 transition-colors" />
                   <input 
                     type="text" 
                     value={url} 
                     onChange={(e) => setUrl(e.target.value)} 
                     placeholder="https://brand-target.com" 
                     className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-white font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                     required
                   />
                </div>
                <textarea 
                  value={desc} 
                  onChange={(e) => setDesc(e.target.value)} 
                  placeholder="Additional context (Mission, key products...)" 
                  className="w-full h-24 bg-black/40 border border-zinc-800 rounded-2xl p-6 text-white font-medium focus:ring-2 focus:ring-brand-500 outline-none resize-none transition-all"
                />
                
                {error.message && (
                  <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error.message}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={status === ProcessingState.ANALYZING}
                  className="w-full py-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-brand-900/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                >
                  {status === ProcessingState.ANALYZING ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {status === ProcessingState.ANALYZING ? 'SYNTHESIZING...' : 'START EXTRACTION'}
                </button>
             </form>
          </div>

          <div className="w-full md:w-80 bg-black/20 rounded-3xl p-6 border border-zinc-800 border-dashed flex flex-col items-center justify-center text-center">
             {status === ProcessingState.ANALYZING ? (
               <div className="space-y-4 animate-in fade-in">
                  <div className="w-16 h-16 border-4 border-t-brand-500 border-zinc-800 rounded-full animate-spin mx-auto" />
                  <p className="text-brand-500 font-mono text-[10px] tracking-[0.2em] uppercase animate-pulse">{progressMsg}</p>
               </div>
             ) : status === ProcessingState.COMPLETE ? (
               <div className="space-y-4 animate-in zoom-in-90">
                  <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
                  <p className="text-white font-black text-xs uppercase tracking-widest">Neural Link Success</p>
               </div>
             ) : (
               <div className="space-y-4 opacity-30">
                  <Sparkles className="w-12 h-12 mx-auto text-zinc-700" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Extraction Log Offline</p>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};

interface PortfolioCardProps {
  brand: BrandDNA;
  isActive: boolean;
  onSelect: () => void;
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ brand, isActive, onSelect }) => {
  return (
    <div 
      className={`group relative min-w-[280px] md:min-w-[320px] aspect-[4/5] rounded-[2.5rem] overflow-hidden border-2 transition-all duration-500 cursor-pointer shadow-2xl shrink-0 snap-center ${
        isActive 
          ? 'border-brand-500 ring-8 ring-brand-500/10 scale-100 z-10' 
          : 'border-white/5 opacity-50 scale-90 hover:opacity-100 hover:scale-95'
      }`}
      onClick={onSelect}
    >
      <div className="absolute inset-0 z-0 bg-zinc-900">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[3s] group-hover:scale-110" 
          style={{ 
            backgroundImage: brand.coverImage ? `url(${brand.coverImage})` : 'none',
            backgroundColor: brand.visualIdentity?.primaryColor || '#14b8a6'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <div className="absolute inset-0 z-10 p-8 flex flex-col justify-end">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 bg-brand-500 text-black text-[8px] font-black uppercase tracking-[0.2em] rounded">
              DNA SEQUENCE
            </span>
            <span className="text-[10px] text-white font-bold uppercase tracking-widest opacity-60">
              {brand.visualIdentity.styleKeywords[0] || 'Modern'}
            </span>
          </div>
          <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-3 break-words">{brand.name}</h3>
          <p className="text-white/70 text-sm font-medium line-clamp-2 italic border-l border-brand-500 pl-3">"{brand.tagline}"</p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-2">
          <div>
             <p className="text-[8px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">Target</p>
             <p className="text-xs text-white font-bold truncate max-w-[120px]">{brand.targetAudience[0] || 'Global'}</p>
          </div>
          <div className="text-right">
             <p className="text-[8px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">Score</p>
             <p className="text-xs text-brand-400 font-bold">{brand.confidenceScore}%</p>
          </div>
        </div>

        {isActive ? (
          <div className="mt-6 flex gap-2 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex-1 py-3 bg-white text-black font-black rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl">
               <Activity className="w-3.5 h-3.5" /> Working...
            </div>
            <div className="w-12 h-12 bg-brand-500 text-black flex items-center justify-center rounded-xl font-black shadow-lg shadow-brand-500/20">
               <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        ) : (
          <button className="mt-6 w-full py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all border border-white/10">
             Load Core DNA
          </button>
        )}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { currentBrand, brands, campaigns, setBrand } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'simulator' | 'battle'>('overview');
  const [isExtracting, setIsExtracting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: 'overview', label: 'Intelligence Hub', icon: LayoutDashboard },
    { id: 'simulator', label: 'Visual Lab', icon: FlaskConical },
    { id: 'battle', label: 'Arena Mode', icon: Swords },
  ];

  const scrollDeck = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-dark-bg/80 backdrop-blur-xl border-b border-dark-border px-8 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 pb-4 text-xs font-black uppercase tracking-[0.2em] border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="pb-4">
             <button 
               onClick={() => setIsExtracting(true)}
               className="flex items-center gap-2 px-4 py-2 bg-brand-900/20 border border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-500 hover:text-black transition-all shadow-lg active:scale-95"
             >
                <Plus className="w-3.5 h-3.5" /> Sequence New DNA
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1">
        {activeTab === 'overview' && (
          <div className="p-8 max-w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Conditional Extraction UI */}
            {isExtracting && (
              <div className="max-w-7xl mx-auto">
                 <ExtractionOverlay 
                   onCancel={() => setIsExtracting(false)} 
                   onComplete={() => setIsExtracting(false)} 
                 />
              </div>
            )}

            {/* 1. Swiper Portfolio Section */}
            {!isExtracting && (
              <section className="relative -mx-8 overflow-hidden">
                <div className="max-w-7xl mx-auto px-8 mb-8 flex justify-between items-end">
                    <div>
                      <h2 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.5em] mb-3">Neural Matrix</h2>
                      <h1 className="text-5xl font-black text-white uppercase tracking-tighter">Portfolio Deck</h1>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => scrollDeck('left')} className="p-4 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-white hover:border-brand-500 hover:bg-brand-900/10 transition-all shadow-xl group">
                        <ChevronLeft className="w-6 h-6 group-active:scale-75 transition-transform" />
                      </button>
                      <button onClick={() => scrollDeck('right')} className="p-4 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-white hover:border-brand-500 hover:bg-brand-900/10 transition-all shadow-xl group">
                        <ChevronRight className="w-6 h-6 group-active:scale-75 transition-transform" />
                      </button>
                    </div>
                </div>

                <div 
                  ref={scrollRef}
                  className="flex gap-8 overflow-x-auto px-8 pb-12 no-scrollbar scroll-smooth snap-x"
                >
                    {brands.length > 0 ? brands.map(brand => (
                      <PortfolioCard 
                        key={brand.id} 
                        brand={brand} 
                        isActive={currentBrand?.id === brand.id} 
                        onSelect={() => setBrand(brand)}
                      />
                    )) : (
                      <div className="w-full flex justify-center py-10 px-8">
                         <div onClick={() => setIsExtracting(true)} className="w-full max-w-4xl text-center bg-zinc-900/30 p-20 rounded-[4rem] border-2 border-dashed border-zinc-800 group hover:border-brand-500/20 transition-all cursor-pointer">
                            <Target className="w-20 h-20 text-zinc-800 mx-auto mb-8 group-hover:scale-110 group-hover:text-brand-500 transition-all duration-700" />
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Neural Vault Empty</h2>
                            <p className="text-zinc-500 font-black uppercase tracking-widest text-sm mb-12">No Brand DNA detected. Tap to initialize sequence extraction.</p>
                            <div className="inline-block px-12 py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-brand-900/20 transition-all hover:scale-105 active:scale-95">
                               PROBE NEW IDENTITY
                            </div>
                         </div>
                      </div>
                    )}
                    {brands.length > 0 && (
                      <button 
                        onClick={() => setIsExtracting(true)}
                        className="min-w-[280px] md:min-w-[320px] aspect-[4/5] rounded-[2.5rem] border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-800 hover:text-brand-500 hover:border-brand-500 hover:bg-brand-950/10 transition-all shrink-0 snap-center group"
                      >
                        <Sparkles className="w-12 h-12 mb-6 opacity-40 group-hover:animate-spin-slow" />
                        <span className="font-black uppercase tracking-[0.3em] text-[10px]">Sequence New Asset</span>
                      </button>
                    )}
                </div>
              </section>
            )}

            <div className="max-w-7xl mx-auto space-y-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatCard label="Live Ecosystems" value={campaigns.length} icon={Layers} color="bg-purple-500" />
                <StatCard label="Neural Assets" value={campaigns.reduce((acc, c) => acc + c.assets.length, 0)} icon={Globe} color="bg-blue-500" />
                <StatCard label="Alpha Resonance" value="98.1%" icon={TrendingUp} color="bg-brand-500" />
              </div>

              <div className="grid grid-cols-1 gap-12">
                <section className="space-y-6">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                       <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Deep Intelligence Scan</h2>
                       <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Real-time identity verification</p>
                    </div>
                    {currentBrand && <span className="text-[9px] text-brand-400 font-black tracking-widest animate-pulse uppercase bg-brand-950/40 px-4 py-1.5 rounded-full border border-brand-500/20">Link Active</span>}
                  </div>
                  {currentBrand ? (
                    <DNAHelix dna={currentBrand} />
                  ) : (
                    <div className="border-2 border-dashed border-zinc-900 rounded-[3rem] p-32 text-center bg-black/20 group">
                      <Layers className="w-12 h-12 text-zinc-800 mx-auto mb-6 opacity-20" />
                      <p className="text-zinc-700 font-black uppercase tracking-[0.3em] text-xs">Swipe & Select a Portfolio to initiate scan</p>
                    </div>
                  )}
                </section>
              </div>

              <section className="bg-dark-surface border border-dark-border rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Layers className="w-40 h-40" /></div>
                <div className="flex items-end justify-between mb-10 relative z-10">
                  <div>
                     <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Mission Log: {currentBrand?.name || 'Global'}</h2>
                     <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Autonomous operation history</p>
                  </div>
                  <Link to="/automations" className="text-[10px] font-black text-brand-500 hover:text-white uppercase tracking-[0.3em] flex items-center gap-3 transition-colors">
                     Open Command Center <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                  {campaigns.length > 0 ? (
                    campaigns.slice(0, 4).map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-8 bg-black/40 rounded-[2rem] border border-zinc-800/50 hover:border-brand-500/40 transition-all group hover:bg-black/60 shadow-xl">
                        <div className="flex items-center gap-6">
                          <div className="w-4 h-4 rounded-full bg-brand-500 shadow-[0_0_12px_#14b8a6]"></div>
                          <div>
                            <p className="text-lg font-black text-white uppercase tracking-tight group-hover:text-brand-400 transition-colors leading-none mb-2">{campaign.name}</p>
                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{campaign.goal}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">{new Date(campaign.createdAt).toLocaleDateString()}</p>
                          <div className="flex items-center gap-3 justify-end">
                            <span className="text-[10px] text-brand-500 font-black uppercase tracking-widest">{campaign.assets.length} Units</span>
                            <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-brand-500 transition-colors" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 py-20 flex flex-col items-center justify-center opacity-20">
                       <Activity className="w-12 h-12 mb-4" />
                       <p className="text-xs font-black uppercase tracking-[0.4em]">Zero Active Ops</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="max-w-7xl mx-auto pt-8">
                 <TrendPulse currentBrand={currentBrand} />
              </section>
            </div>
          </div>
        )}

        <div className="h-full">
           {activeTab === 'simulator' && <BrandSimulatorPage />}
           {activeTab === 'battle' && <BattleModePage />}
        </div>
      </div>
      
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); width: 50%; }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
