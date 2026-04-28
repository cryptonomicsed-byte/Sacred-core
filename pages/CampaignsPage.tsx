
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { ProcessingState, Campaign, CampaignAsset, CampaignPRD, CampaignOverview, UserStory } from '../types';
import { createCampaignPRD } from '@app/campaigns/createCampaignPrd';
import { AutonomousCampaignEngine } from '@app/campaigns/autonomousCampaignEngine';
import { generateVideo } from '@infra/video/videoService';
import { 
  Sparkles, Scroll, Play, ShieldCheck, 
  AlertTriangle, Calendar, CheckCircle2,
  Edit3, Plus, Clock, Target, Box,
  RefreshCw, X, MousePointer2, 
  Image as ImageIcon, Mail, Eye, Share2, ChevronRight, Sliders, Settings, Film, Zap, Loader2, Copy, ExternalLink, Linkedin, Twitter, Instagram,
  Workflow
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandSelector } from '../components/BrandSelector';

/**
 * Defensive rendering helper
 */
const safeRender = (val: any): React.ReactNode => {
  if (typeof val === 'string' || typeof val === 'number') return val;
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val.header || val.body || val.accent) {
      return [val.header, val.body, val.accent].filter(Boolean).join(' ');
    }
    return JSON.stringify(val);
  }
  return String(val);
};

const StepIndicator = ({ current, steps }: { current: number, steps: string[] }) => (
  <div className="flex items-center gap-2 mb-8 bg-black/40 px-6 py-3 rounded-full border border-zinc-800 w-fit mx-auto">
    {steps.map((label, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
          i + 1 === current ? 'bg-brand-500 text-black' : 
          i + 1 < current ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-500'
        }`}>
          {i + 1 < current ? '✓' : i + 1}
        </div>
        <span className={`text-xs ${i + 1 === current ? 'text-white font-bold' : 'text-zinc-500'}`}>
          {label}
        </span>
        {i < steps.length - 1 && <div className="w-4 h-px bg-zinc-800 mx-2" />}
      </div>
    ))}
  </div>
);

const PlatformIcon = ({ channel, className = "w-5 h-5" }: { channel: string, className?: string }) => {
  const c = channel.toLowerCase();
  if (c.includes('linkedin')) return <Linkedin className={className} />;
  if (c.includes('twitter') || c.includes('x')) return <Twitter className={className} />;
  if (c.includes('instagram')) return <Instagram className={className} />;
  if (c.includes('email')) return <Mail className={className} />;
  return <Share2 className={className} />;
};

const AssetDetailsModal: React.FC<{ 
  asset: CampaignAsset; 
  onClose: () => void;
  onAnimate: (assetId: string) => Promise<void>;
  isAnimating: boolean;
}> = ({ asset, onClose, onAnimate, isAnimating }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(asset.platformPost || asset.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (!asset.videoUrl && asset.imageUrl && !isAnimating) {
      onAnimate(asset.id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8">
      <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-dark-border flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-900/20 text-brand-500 rounded-xl">
              <PlatformIcon channel={asset.metadata?.channel || ''} className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">{safeRender(asset.title)}</h2>
              <div className="flex items-center gap-3 text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                <span>{asset.metadata?.channel}</span>
                <span>•</span>
                <span>{asset.metadata?.type}</span>
                <span>•</span>
                <span className="text-green-500">Quality: {asset.metadata?.qualityScore}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={handleCopy}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-green-600 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white'}`}
             >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'COPIED TO WORKFLOW' : 'COPY POST CONTENT'}
             </button>
             <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
               <X className="w-6 h-6" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-12 custom-scrollbar">
          {/* Left: Platform Ready Content */}
          <div className="space-y-8">
            <section>
              <div className="flex justify-between items-end mb-4">
                 <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em]">Final Post Synthesis</h3>
                 <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest bg-black/40 px-2 py-1 rounded">Channel: {asset.metadata?.channel}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-inner font-sans text-base leading-relaxed text-zinc-200 whitespace-pre-wrap relative group/preview">
                 <div className="absolute top-4 right-4 opacity-0 group-hover/preview:opacity-100 transition-opacity">
                    <PlatformIcon channel={asset.metadata?.channel || ''} className="w-4 h-4 text-zinc-700" />
                 </div>
                 {asset.platformPost || asset.content}
                 <div className="mt-8 flex flex-wrap gap-2">
                    {asset.hashtags?.map(h => (
                      <span key={h} className="text-brand-500 font-bold hover:underline cursor-pointer">#{h}</span>
                    ))}
                 </div>
              </div>

              {/* Status Indicator */}
              <div className="mt-6 p-4 bg-brand-900/10 border border-brand-500/10 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Workflow className="w-4 h-4 text-brand-400" />
                   <span className="text-xs font-bold text-zinc-300">Automation Ready</span>
                </div>
                <div className="text-[10px] font-black text-brand-500 uppercase tracking-widest bg-brand-950/40 px-3 py-1 rounded-full border border-brand-500/20">
                  Validated
                </div>
              </div>
            </section>
          </div>

          {/* Right: Neural Media Canvas */}
          <div className="space-y-8">
            <section>
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em]">Visual Architecture</h3>
                {!asset.videoUrl && (
                  <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest animate-pulse">Static Image - Animation Available</span>
                )}
              </div>
              <div 
                onClick={handleImageClick}
                className={`w-full bg-black border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative group/media ${!asset.videoUrl && asset.imageUrl ? 'cursor-pointer hover:border-brand-500/50 transition-all' : ''}`}
                style={{ aspectRatio: asset.videoUrl ? '16/9' : '16/9' }}
              >
                {asset.videoUrl ? (
                  <video src={asset.videoUrl} controls autoPlay loop className="w-full h-full object-contain bg-black" />
                ) : asset.imageUrl ? (
                  <div className="relative w-full h-full">
                    <img src={asset.imageUrl} alt="Asset" className="w-full h-full object-contain transition-transform duration-700 group-hover/media:scale-105" />
                    
                    {/* Interaction Overlays */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity">
                      {isAnimating ? (
                        <div className="flex flex-col items-center gap-4">
                           <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
                           <span className="text-xs font-black text-brand-500 uppercase tracking-[0.2em]">Rendering Motion...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 scale-95 group-hover/media:scale-100 transition-transform">
                           <div className="w-16 h-16 rounded-full bg-brand-600/90 text-white flex items-center justify-center shadow-2xl">
                              <Film className="w-7 h-7" />
                           </div>
                           <span className="text-xs font-black text-white uppercase tracking-widest bg-black/60 px-4 py-2 rounded-full border border-white/20">Click to Animate Image</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                    <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-20">Rendering Visual DNA...</p>
                  </div>
                )}
              </div>

              {!asset.videoUrl && asset.imageUrl && !isAnimating && (
                <button 
                  onClick={() => onAnimate(asset.id)}
                  className="w-full mt-6 py-4 bg-brand-900/20 hover:bg-brand-900/40 border border-brand-500/20 hover:border-brand-500/50 text-brand-400 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
                >
                  <Sparkles className="w-4 h-4" /> IGNITE MOTION SYNTHESIS
                </button>
              )}

              <div className="mt-6">
                 <label className="text-[10px] text-zinc-600 font-black uppercase mb-2 block tracking-widest">Visual Prompt Blueprint</label>
                 <div className="bg-black/20 border border-zinc-800 p-4 rounded-xl text-xs text-zinc-500 italic leading-relaxed">
                   {asset.imagePrompt}
                 </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

const AssetCard: React.FC<{ 
  asset: CampaignAsset; 
  onAnimate: (assetId: string) => Promise<void>;
  animatingAssets: Set<string>;
}> = ({ asset, onAnimate, animatingAssets }) => {
  const [showDetails, setShowDetails] = useState(false);
  const isAnimating = animatingAssets.has(asset.id);

  const handleAnimateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!asset.videoUrl && asset.imageUrl && !isAnimating) {
      onAnimate(asset.id);
    }
  };

  return (
    <>
      <div onClick={() => setShowDetails(true)} className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden group hover:border-brand-500/50 transition-all cursor-pointer shadow-lg flex flex-col h-full animate-in zoom-in-95 duration-300">
        <div className="relative h-64 bg-black/50 overflow-hidden shrink-0">
          {asset.videoUrl ? (
            <video src={asset.videoUrl} muted autoPlay loop className="w-full h-full object-contain" />
          ) : asset.imageUrl ? (
            <div 
              onClick={handleAnimateClick}
              className="relative w-full h-full cursor-pointer overflow-hidden flex items-center justify-center"
            >
              <img src={asset.imageUrl} alt="Asset" className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110 duration-700" />
              
              {/* Card Hover Action */}
              {!isAnimating && (
                <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-900/20 transition-all flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                   <div className="p-3 bg-brand-600 text-white rounded-full shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                      <Film className="w-6 h-6" />
                   </div>
                   <span className="mt-2 text-[8px] font-black text-white uppercase tracking-[0.2em]">TAP TO ANIMATE</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-700">
              <Sparkles className="w-10 h-10 opacity-10 animate-pulse" />
            </div>
          )}

          {isAnimating && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-2" />
              <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Generating Motion...</span>
            </div>
          )}

          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg text-[10px] uppercase font-black text-white border border-white/10 flex items-center gap-1.5">
            <PlatformIcon channel={asset.metadata?.channel || ''} className="w-3.5 h-3.5 text-brand-400" />
            {asset.metadata?.channel}
          </div>
          <div className={`absolute top-3 right-3 px-2 py-1 rounded-md text-[9px] font-black uppercase ${asset.metadata?.qualityScore >= 85 ? 'bg-green-500 text-black' : 'bg-amber-500 text-black'}`}>
            {asset.metadata?.qualityScore}%
          </div>
          
          {/* Explicit Turn to Video Button */}
          {!asset.videoUrl && asset.imageUrl && !isAnimating && (
             <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                <button 
                  onClick={handleAnimateClick}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-xl flex items-center gap-2"
                  title="Animate this asset"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Turn into Video</span>
                </button>
             </div>
          )}
        </div>
        
        <div className="p-6 flex flex-col flex-1">
          <h3 className="text-sm font-black text-white line-clamp-1 mb-3 uppercase tracking-tighter group-hover:text-brand-400 transition-colors">{safeRender(asset.title)}</h3>
          <p className="text-xs text-zinc-400 line-clamp-3 mb-6 leading-relaxed font-medium">
             {safeRender(asset.platformPost || asset.content)}
          </p>
          <div className="mt-auto pt-5 border-t border-zinc-800 flex justify-between items-center">
             <span className="text-[10px] text-zinc-500 font-black uppercase flex items-center gap-2 tracking-widest">
                <Workflow className="w-3.5 h-3.5 text-brand-500" /> Workflow Sync
             </span>
             <div className="flex items-center gap-1.5 text-[10px] text-brand-500 font-black uppercase tracking-widest hover:text-white transition-colors">
               Preview Post <ChevronRight className="w-3 h-3" />
             </div>
          </div>
        </div>
      </div>
      {showDetails && (
        <AssetDetailsModal 
          asset={asset} 
          onClose={() => setShowDetails(false)} 
          onAnimate={onAnimate}
          isAnimating={isAnimating}
        />
      )}
    </>
  );
};

export default function CampaignsPage() {
  const { currentBrand, campaigns, addCampaign, providers, updateCampaign } = useStore();
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<ProcessingState>(ProcessingState.IDLE);
  const [view, setView] = useState<'forge' | 'archive'>('forge');
  const [error, setError] = useState<{message: string, code?: string}>({ message: '' });
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{msg: string, type: string}[]>([]);
  const [generatedAssets, setGeneratedAssets] = useState<CampaignAsset[]>([]);
  const [animatingAssets, setAnimatingAssets] = useState<Set<string>>(new Set());
  const [prd, setPrd] = useState<CampaignPRD | null>(null);
  
  // Forge Params
  const [autoAnimate, setAutoAnimate] = useState(false);

  const [overview, setOverview] = useState<CampaignOverview>({
    name: '',
    goal: 'Brand Awareness',
    audienceSegment: currentBrand?.targetAudience[0] || 'General',
    timeline: '7 Days',
    constraints: []
  });
  const [channels, setChannels] = useState<string[]>(['instagram', 'linkedin']);

  const handleGeneratePRD = async () => {
    if (!currentBrand) return;
    setStatus(ProcessingState.PLANNING);
    setError({ message: '' });
    try {
      const generatedPrd = await createCampaignPRD(currentBrand, overview, channels);
      setPrd(generatedPrd);
      setStep(2);
      setStatus(ProcessingState.IDLE);
    } catch (e: any) {
      console.error(e);
      setError({ message: e.message || "Blueprint Generation Failed", code: e.code });
      setStatus(ProcessingState.ERROR);
    }
  };

  const handleStartEngine = async () => {
    if (!currentBrand || !prd) return;
    setStep(3);
    setStatus(ProcessingState.GENERATING);
    setGeneratedAssets([]);
    setError({ message: '' });
    
    const localAssets: CampaignAsset[] = [];
    
    const engine = new AutonomousCampaignEngine(
      currentBrand,
      prd,
      (msg, type) => setLogs(prev => [...prev, { msg, type: type || 'info' }]),
      (completed, total) => setProgress((completed / total) * 100),
      async (asset) => {
        if (autoAnimate && asset.imageUrl && !asset.videoUrl) {
          setLogs(prev => [...prev, { msg: `[MOTION] Initializing animation for ${asset.title}...`, type: 'info' }]);
          try {
             await generateVideo(asset.imagePrompt || asset.content, providers.activeVideo as any, (url) => {
                asset.videoUrl = url;
                setLogs(prev => [...prev, { msg: `[MOTION] Synthesis complete for ${asset.title}`, type: 'success' }]);
             });
          } catch (e) {
             setLogs(prev => [...prev, { msg: `[MOTION] Failed to animate ${asset.title}`, type: 'warning' }]);
          }
        }
        localAssets.push(asset);
        setGeneratedAssets([...localAssets]);
      },
      () => {}
    );

    try {
      await engine.start();
      const newCampaign: Campaign = {
        id: crypto.randomUUID(),
        name: overview.name || 'Untitled Campaign',
        goal: overview.goal,
        status: 'completed',
        prd: prd,
        assets: localAssets,
        createdAt: new Date().toISOString()
      };
      addCampaign(newCampaign);
      setStatus(ProcessingState.COMPLETE);
      setTimeout(() => setStep(4), 1000);
    } catch (e: any) {
      console.error(e);
      setError({ message: e.message || "Forge disruption occurred" });
      setStatus(ProcessingState.ERROR);
    }
  };

  const handleAnimateAsset = async (assetId: string) => {
    if (animatingAssets.has(assetId)) return;
    
    const asset = generatedAssets.find(a => a.id === assetId);
    if (!asset || !asset.imageUrl) return;

    setAnimatingAssets(prev => new Set(prev).add(assetId));
    
    try {
      await generateVideo(asset.imagePrompt || asset.content, providers.activeVideo as any, (url) => {
        const updated = generatedAssets.map(a => a.id === assetId ? { ...a, videoUrl: url } : a);
        setGeneratedAssets(updated);
        
        const campaign = campaigns.find(c => c.assets.some(a => a.id === assetId));
        if (campaign) {
           const updatedAssets = campaign.assets.map(a => a.id === assetId ? { ...a, videoUrl: url } : a);
           updateCampaign(campaign.id, { assets: updatedAssets });
        }
      });
    } catch (e) {
      console.error("Asset animation failed", e);
      alert("Motion Synthesis Engine failure. Check provider balance.");
    } finally {
      setAnimatingAssets(prev => {
        const next = new Set(prev);
        next.delete(assetId);
        return next;
      });
    }
  };

  if (!currentBrand) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="max-w-md bg-dark-surface p-12 rounded-[3rem] border border-dark-border shadow-2xl animate-in zoom-in-95">
          <Sparkles className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">No Brand DNA Detected</h2>
          <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-8">The forge requires a strategic brand blueprint to generate campaign narratives. Please extract a brand essence first.</p>
          <Link to="/" className="inline-block px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-brand-900/20">Go to Extraction</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-full flex flex-col">
      <div className="mb-10 flex justify-between items-end gap-6">
        <div className="flex-1">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter uppercase">CAMPAIGN FORGE</h1>
          <p className="text-zinc-500 font-bold tracking-widest uppercase text-[10px]">Autonomous Narrative Orchestration</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex bg-black/40 border border-zinc-800 rounded-xl p-1.5 shadow-xl">
             <button onClick={() => setView('forge')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === 'forge' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-300'}`}>Forge New</button>
             <button onClick={() => setView('archive')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === 'archive' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}>Vault ({campaigns.length})</button>
          </div>
          <BrandSelector />
        </div>
      </div>

      {view === 'forge' ? (
        <>
          <StepIndicator current={step} steps={['Brief', 'Blueprint', 'Forge', 'Deploy']} />
          <div className="flex-1">
            {step === 1 && (
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4">
                <div className="md:col-span-8 bg-dark-surface border border-dark-border rounded-3xl p-10 shadow-2xl">
                  <h2 className="text-xl font-black text-white mb-8 uppercase tracking-tighter flex items-center gap-3 border-b border-zinc-800 pb-4">
                    <Target className="w-6 h-6 text-brand-500" /> Strategic Campaign Brief
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-600 uppercase mb-2 tracking-widest pl-1">Campaign Operational ID</label>
                      <input type="text" value={overview.name} onChange={(e) => setOverview({...overview, name: e.target.value})} placeholder="e.g. OPERATION_NEON_FALL" className="w-full bg-black/40 border border-zinc-800 rounded-xl py-4 px-6 text-white font-bold focus:ring-1 focus:ring-brand-500 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-600 uppercase mb-2 tracking-widest pl-1">Target Goal</label>
                        <select value={overview.goal} onChange={(e) => setOverview({...overview, goal: e.target.value})} className="w-full bg-black/40 border border-zinc-700 rounded-xl py-4 px-5 text-white font-bold focus:ring-1 focus:ring-brand-500 outline-none appearance-none"><option>Brand Awareness</option><option>Lead Generation</option><option>Product Launch</option><option>Viral Engagement</option></select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-600 uppercase mb-2 tracking-widest pl-1">Timeline</label>
                        <select value={overview.timeline} onChange={(e) => setOverview({...overview, timeline: e.target.value})} className="w-full bg-black/40 border border-zinc-700 rounded-xl py-4 px-5 text-white font-bold focus:ring-1 focus:ring-brand-500 outline-none appearance-none"><option>3 Days</option><option>7 Days</option><option>14 Days</option><option>30 Days</option></select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-600 uppercase mb-3 tracking-widest pl-1">Channels</label>
                      <div className="flex flex-wrap gap-2">{['instagram', 'linkedin', 'twitter', 'email', 'tiktok', 'blog'].map(c => (<button key={c} onClick={() => setChannels(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${channels.includes(c) ? 'bg-brand-600 border-brand-500 text-white shadow-lg' : 'bg-black/40 border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}>{c}</button>))}</div>
                    </div>

                    {error.message && (
                      <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-xl flex items-start gap-3 text-red-400 animate-in shake">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-black uppercase tracking-widest mb-1">Initialization Error</p>
                          <p className="text-[11px] opacity-80">{error.message}</p>
                        </div>
                        {error.code === 'QUOTA_EXCEEDED' && (
                          <Link to="/settings" className="text-[9px] font-black underline uppercase tracking-widest hover:text-white transition-colors">Settings</Link>
                        )}
                      </div>
                    )}

                    <button onClick={handleGeneratePRD} disabled={status === ProcessingState.PLANNING} className="w-full py-5 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-4 transition-all uppercase tracking-widest text-xs">
                      {status === ProcessingState.PLANNING ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Scroll className="w-5 h-5" />}
                      {status === ProcessingState.PLANNING ? 'Mapping Matrix...' : 'GENERATE CAMPAIGN BLUEPRINT'}
                    </button>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <div className="bg-dark-surface border border-dark-border rounded-3xl p-8 shadow-xl h-full space-y-8">
                     <div>
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Sliders className="w-4 h-4 text-brand-500" /> ENGINE PARAMS</h3>
                        <div className="space-y-6">
                           <div className="p-4 bg-black/20 rounded-xl border border-zinc-800">
                              <div className="text-[9px] font-black text-zinc-600 uppercase mb-2 tracking-widest">Active Neural Core</div>
                              <div className="text-xs font-bold text-brand-400">Gemini 3 Flash (Latest)</div>
                           </div>
                           <div className="p-4 bg-brand-900/10 border border-brand-500/20 rounded-xl">
                              <div className="text-[9px] font-black text-brand-500 uppercase mb-1 tracking-widest">Synthesis Mode</div>
                              <div className="text-xs font-bold text-white">Direct Precision Single-Shot</div>
                           </div>
                           <div 
                             onClick={() => setAutoAnimate(!autoAnimate)}
                             className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${autoAnimate ? 'bg-brand-900/10 border-brand-500/50' : 'bg-black/20 border-zinc-800'}`}
                           >
                              <div>
                                 <div className="text-[9px] font-black text-zinc-600 uppercase mb-1 tracking-widest">Motion Synthesis</div>
                                 <div className={`text-xs font-bold ${autoAnimate ? 'text-brand-400' : 'text-zinc-500'}`}>Auto-Animate Assets</div>
                              </div>
                              <div className={`w-10 h-5 rounded-full relative transition-colors ${autoAnimate ? 'bg-brand-600' : 'bg-zinc-800'}`}>
                                 <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoAnimate ? 'right-1' : 'left-1'}`} />
                              </div>
                           </div>
                        </div>
                     </div>
                     
                     <div className="p-6 bg-brand-950/20 border border-brand-900/30 rounded-2xl">
                        <div className="flex items-center gap-2 text-brand-500 mb-2">
                           <Film className="w-4 h-4" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Motion Engine Active</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">Currently routing motion synthesis through <span className="text-zinc-300">{providers.activeVideo}</span> logic. Optimized for single-pass high-fidelity generation.</p>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && prd && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-8">
                 <div className="lg:col-span-4 bg-dark-surface border border-dark-border rounded-[2rem] p-10 flex flex-col shadow-2xl relative overflow-hidden">
                    <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">PLAN SUMMARY</h3>
                    <p className="text-sm text-zinc-400 mb-10 leading-relaxed font-medium italic">"{prd.sequencingPlan}"</p>
                    <div className="space-y-4 mb-10">
                       <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
                          <span className="text-zinc-500 font-bold uppercase tracking-widest">Strategy</span>
                          <span className="text-brand-400 font-black">Direct Synthesis</span>
                       </div>
                       <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
                          <span className="text-zinc-500 font-bold uppercase tracking-widest">Animation</span>
                          <span className={autoAnimate ? 'text-brand-400 font-black' : 'text-zinc-600 font-bold uppercase'}>{autoAnimate ? 'ENABLED' : 'MANUAL'}</span>
                       </div>
                    </div>
                    <button onClick={handleStartEngine} className="w-full mt-auto py-5 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-95 group">
                      <Play className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                      <span className="tracking-[0.2em] uppercase text-xs">IGNITE FORGE ENGINE</span>
                    </button>
                 </div>
                 <div className="lg:col-span-8 bg-black/20 border border-zinc-800 rounded-[2rem] p-10 overflow-y-auto max-h-[600px] shadow-inner">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8">{prd.userStories.length} Operation Segments Locked</h3>
                    <div className="space-y-4">
                       {prd.userStories.map((story, i) => (
                         <div key={i} className="bg-dark-surface p-6 rounded-2xl border border-zinc-800/50 flex gap-6 items-center group hover:border-brand-500/40 transition-all">
                            <div className="flex flex-col items-center justify-center min-w-[3.5rem] h-14 bg-zinc-900 rounded-xl border border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-tighter">
                               <span>PHASE</span>
                               <span className="text-xl text-white">{story.dayOffset}</span>
                            </div>
                            <div className="flex-1">
                               <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-sm font-black text-zinc-200 uppercase tracking-tight truncate max-w-md">{safeRender(story.description)}</h4>
                                  <span className="text-[9px] uppercase font-black bg-brand-950/40 text-brand-400 px-3 py-1 rounded-md border border-brand-500/20">{story.channel}</span>
                               </div>
                               <div className="flex gap-2">
                                  {story.assetTypes.map(t => (
                                    <span key={t} className="text-[8px] text-zinc-600 bg-black/40 px-2 py-0.5 rounded border border-zinc-800 font-black uppercase tracking-widest">{t}</span>
                                  ))}
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            )}

            {step === 3 && (
              <div className="max-w-4xl mx-auto pt-10 animate-in fade-in">
                <div className="bg-dark-surface border border-dark-border rounded-[2.5rem] p-12 relative overflow-hidden shadow-2xl">
                   <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-900">
                      <div className="h-full bg-brand-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                   </div>
                   <div className="flex justify-between items-end mb-10">
                      <div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">FORGING...</h2>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
                           <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Autonomous Synthesis in Progress</span>
                        </div>
                      </div>
                      <span className="text-6xl font-black text-white tabular-nums tracking-tighter">{Math.round(progress)}%</span>
                   </div>
                   
                   {error.message && (
                    <div className="mb-6 p-4 bg-red-950/20 border border-red-500/30 rounded-2xl flex flex-col gap-3">
                       <p className="text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Forge Disruption: {error.message}</p>
                       <Link to="/settings" className="text-[10px] text-red-500 underline uppercase font-black tracking-widest hover:text-white transition-colors">Switch Provider to Resume Forge</Link>
                    </div>
                  )}

                   <div className="bg-black/60 p-8 rounded-3xl font-mono text-[11px] text-zinc-500 h-72 overflow-y-auto custom-scrollbar border border-zinc-800 shadow-inner">
                      {logs.map((log, i) => (
                        <div key={i} className={`mb-2 animate-in fade-in slide-in-from-left-2 ${log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-500' : 'text-brand-500/70'}`}>
                           [{new Date().toLocaleTimeString([], { hour12: false })}] {">"} {safeRender(log.msg)}
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-12 animate-in slide-in-from-bottom-8">
                 <div className="bg-brand-900/10 border border-brand-500/20 p-10 rounded-[3rem] flex justify-between items-center shadow-xl">
                    <div>
                      <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">{safeRender(overview.name)}</h2>
                      <div className="flex items-center gap-6">
                        <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-green-500" /> Synthesis Finalized • {generatedAssets.length} Precision Assets</p>
                        {autoAnimate && <span className="px-3 py-1 bg-brand-500 text-black text-[9px] font-black uppercase rounded-full shadow-lg flex items-center gap-1.5"><Film className="w-3 h-3" /> Motion Applied</span>}
                      </div>
                    </div>
                    <button onClick={() => setStep(1)} className="px-10 py-4 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">INITIATE NEW FORGE</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {generatedAssets.map(asset => (
                      <AssetCard 
                        key={asset.id} 
                        asset={asset} 
                        onAnimate={handleAnimateAsset}
                        animatingAssets={animatingAssets}
                      />
                    ))}
                 </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in">
           {campaigns.length > 0 ? campaigns.map(c => (
             <div key={c.id} className="bg-dark-surface border border-dark-border rounded-3xl p-8 hover:border-brand-500/30 transition-all flex flex-col shadow-xl">
                <div className="mb-6">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 truncate">{safeRender(c.name)}</h3>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                    <span>{c.assets.length} Assets</span>
                    <span>•</span>
                    <span className="text-brand-500">{c.goal}</span>
                    {c.assets.some(a => a.videoUrl) && <span className="flex items-center gap-1 text-purple-400 font-black tracking-[0.2em]"><Film className="w-3 h-3" /> MOTION</span>}
                  </div>
                </div>
                <div className="mt-auto flex justify-between items-center">
                   <span className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">{new Date(c.createdAt).toLocaleDateString()}</span>
                   <button onClick={() => { setGeneratedAssets(c.assets); setOverview({ name: c.name, goal: c.goal, audienceSegment: '', timeline: '', constraints: [] }); setStep(4); setView('forge'); }} className="text-brand-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:text-white transition-colors">Inspect <Eye className="w-4 h-4" /></button>
                </div>
             </div>
           )) : (
             <div className="col-span-full py-32 flex flex-col items-center justify-center text-zinc-800 bg-black/10 rounded-[4rem] border border-dashed border-zinc-900 group">
                <Box className="w-20 h-20 mb-6 opacity-20 group-hover:scale-110 transition-transform duration-700" />
                <p className="text-xl font-black opacity-30 uppercase tracking-[0.2em]">The Vault is Empty</p>
                <button onClick={() => setView('forge')} className="text-xs text-brand-500 underline font-black uppercase tracking-widest mt-4 hover:text-white transition-colors">Start your first Forge</button>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
