
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { WebsiteData, SiteSection } from '../types';
import { generateWebsiteStructure } from '@app/sites/generateWebsite';
import { deployWebsite } from '@infra/sites/deployWebsite';
import { 
  Layout, 
  Smartphone, 
  Monitor, 
  Rocket, 
  RefreshCw, 
  Eye, 
  ChevronRight, 
  Edit3,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandSelector } from '../components/BrandSelector';

const PreviewFrame: React.FC<{ site: WebsiteData, brand: any }> = ({ site, brand }) => {
  const styles = {
    primary: brand.visualIdentity.primaryColor,
    secondary: brand.visualIdentity.secondaryColor,
    font: 'font-sans' // Simplified
  };

  return (
    <div className="bg-white text-zinc-900 w-full h-full overflow-y-auto rounded-lg shadow-2xl">
      {/* Navbar (Static) */}
      <div className="px-6 py-4 flex justify-between items-center border-b">
         <span className="font-bold text-lg" style={{ color: styles.primary }}>{brand.name}</span>
         <div className="flex gap-4 text-sm font-medium text-zinc-600">
            <span>Features</span>
            <span>About</span>
            <span>Contact</span>
         </div>
      </div>

      {site.sections.sort((a,b) => a.order - b.order).map(section => {
        if (!section.isVisible) return null;
        
        switch(section.type) {
          case 'hero':
            return (
              <div key={section.id} className="py-20 px-6 text-center" style={{ backgroundColor: '#f9fafb' }}>
                <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight text-zinc-900">{section.content?.headline || ''}</h1>
                <p className="text-xl text-zinc-600 max-w-2xl mx-auto mb-8">{section.content?.subheadline || ''}</p>
                <button className="px-8 py-3 rounded-full text-white font-bold transition-transform hover:scale-105" style={{ backgroundColor: styles.primary }}>
                   {section.content?.cta || 'Get Started'}
                </button>
              </div>
            );
          case 'features':
            return (
              <div key={section.id} className="py-20 px-6 bg-white">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                   {section.content?.items?.map((item: any, i: number) => (
                     <div key={i} className="p-6 rounded-xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: `${styles.primary}20`, color: styles.primary }}>
                           <Layers className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                        <p className="text-zinc-500 leading-relaxed">{item.desc}</p>
                     </div>
                   ))}
                </div>
              </div>
            );
          case 'about':
             return (
               <div key={section.id} className="py-20 px-6" style={{ backgroundColor: styles.secondary }}>
                  <div className="max-w-3xl mx-auto text-center">
                     <h2 className="text-3xl font-bold mb-6" style={{ color: styles.primary }}>{section.content?.title || ''}</h2>
                     <p className="text-lg leading-relaxed opacity-80">{section.content?.text || ''}</p>
                  </div>
               </div>
             );
          case 'cta':
             return (
               <div key={section.id} className="py-20 px-6 text-center bg-zinc-900 text-white">
                  <h2 className="text-3xl font-bold mb-6">{section.content?.headline || ''}</h2>
                  <button className="px-8 py-3 rounded-full bg-white text-black font-bold transition-transform hover:scale-105">
                     {section.content?.button || 'Join'}
                  </button>
               </div>
             );
          case 'footer':
             return (
               <div key={section.id} className="py-8 px-6 text-center border-t text-sm text-zinc-500 bg-white">
                  {section.content?.copyright || ''}
               </div>
             );
          default:
            return null;
        }
      })}
    </div>
  );
};

const SiteBuilderPage = () => {
  const { currentBrand } = useStore();
  const [site, setSite] = useState<WebsiteData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const handleGenerate = async () => {
    if (!currentBrand) return;
    setIsGenerating(true);
    try {
      const data = await generateWebsiteStructure(currentBrand);
      setSite(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeploy = async () => {
    if (!site) return;
    setIsDeploying(true);
    try {
      const url = await deployWebsite(site);
      setLiveUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeploying(false);
    }
  };

  if (!currentBrand) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-zinc-500 bg-dark-surface p-8 rounded-xl border border-dark-border shadow-2xl animate-in zoom-in-95">
           <Layout className="w-12 h-12 mx-auto mb-4 opacity-20" />
           <p className="mb-6 font-medium">Neural Context Required. Please select or extract a brand to initialize the builder grid.</p>
           <Link to="/" className="inline-block px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-brand-900/20">Return to Hub</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="h-16 border-b border-dark-border bg-dark-surface px-6 flex justify-between items-center shrink-0">
         <div className="flex items-center gap-6 overflow-hidden">
            <div className="flex items-center gap-3">
               <Layout className="w-6 h-6 text-brand-500" />
               <h1 className="text-lg font-black text-white uppercase tracking-tighter hidden sm:block">Website Builder</h1>
            </div>
            <div className="h-8 w-px bg-zinc-800 mx-2 hidden sm:block"></div>
            <BrandSelector />
         </div>

         <div className="flex items-center gap-4">
            <div className="bg-black/40 border border-zinc-700 rounded-lg p-1 flex gap-1 shadow-inner">
               <button 
                 onClick={() => setViewMode('desktop')}
                 className={`p-2 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
               >
                 <Monitor className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setViewMode('mobile')}
                 className={`p-2 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
               >
                 <Smartphone className="w-4 h-4" />
               </button>
            </div>

            <div className="h-6 w-px bg-zinc-800 hidden sm:block"></div>

            {!site ? (
              <button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-brand-900/20 transition-all active:scale-95"
              >
                {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Generate Site
              </button>
            ) : (
              <button 
                onClick={handleDeploy}
                disabled={isDeploying || !!liveUrl}
                className={`px-6 py-2 text-white font-black rounded-xl text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl transition-all active:scale-95 ${
                  liveUrl ? 'bg-green-600' : 'bg-brand-600 hover:bg-brand-500 shadow-brand-900/20'
                }`}
              >
                {isDeploying ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deploying...</>
                ) : liveUrl ? (
                  <><Eye className="w-3.5 h-3.5" /> Site Active</>
                ) : (
                  <><Rocket className="w-3.5 h-3.5" /> Deploy to Cloud</>
                )}
              </button>
            )}
         </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
         {/* Left Sidebar: Sections */}
         <div className="w-72 bg-dark-surface border-r border-dark-border flex flex-col overflow-y-auto custom-scrollbar">
            <div className="p-5 border-b border-dark-border font-black text-zinc-500 text-[10px] uppercase tracking-[0.2em] bg-black/20">
               Component Strata
            </div>
            
            {site ? (
              <div className="p-3 space-y-2">
                 {site.sections.map((section) => (
                    <div key={section.id} className="p-4 bg-black/20 border border-zinc-800 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-brand-500/30 transition-all shadow-inner">
                       <span className="text-xs text-zinc-300 capitalize font-black uppercase tracking-widest">{section.type}</span>
                       <button className="text-zinc-700 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                         <Edit3 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                 ))}
                 <button className="w-full py-4 border border-dashed border-zinc-800 text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl mt-4 hover:border-brand-500/30 hover:text-brand-500 transition-all">
                    + Add Segment
                 </button>
              </div>
            ) : (
              <div className="p-10 text-center text-zinc-700 text-xs font-black uppercase tracking-widest leading-loose">
                 Initialize generation to reveal site architecture.
              </div>
            )}
         </div>

         {/* Preview Area */}
         <div className="flex-1 bg-black/50 p-10 flex items-center justify-center relative overflow-hidden">
            {site ? (
               <div 
                 className={`transition-all duration-700 shadow-[0_40px_100px_rgba(0,0,0,0.8)] ${
                   viewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full max-w-6xl'
                 }`}
               >
                 <PreviewFrame site={site} brand={currentBrand} />
               </div>
            ) : (
               <div className="text-center group">
                  <div className="w-32 h-32 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border-2 border-dashed border-zinc-800 group-hover:border-brand-500/20 transition-all duration-700">
                     <Layout className="w-12 h-12 text-zinc-800 group-hover:text-brand-500/40 transition-colors" />
                  </div>
                  <p className="text-zinc-700 font-black uppercase tracking-[0.4em] text-xs">Awaiting Build Protocol</p>
               </div>
            )}
            
            {/* Deployment Overlay */}
            {liveUrl && (
               <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500 z-50">
                  <div className="bg-dark-surface border border-brand-500/30 p-12 rounded-[3rem] text-center shadow-[0_0_80px_rgba(20,184,166,0.15)] max-w-lg">
                     <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl border border-green-500/30">
                        <Rocket className="w-10 h-10" />
                     </div>
                     <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-3">Live Transmission Active</h2>
                     <p className="text-zinc-500 text-sm font-medium mb-10 leading-relaxed">Your brand's neural presence has been synchronized across the global edge network.</p>
                     
                     <div className="bg-black/60 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4 mb-10 text-left shadow-inner">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-mono text-brand-400 truncate flex-1 uppercase tracking-tight">{liveUrl}</span>
                        <a href={liveUrl} target="_blank" rel="noreferrer" className="p-2 text-zinc-500 hover:text-white transition-colors">
                           <Eye className="w-5 h-5" />
                        </a>
                     </div>

                     <button onClick={() => setLiveUrl('')} className="text-[10px] font-black text-zinc-600 hover:text-brand-500 uppercase tracking-[0.3em] transition-colors">
                        Return to Control Plane
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default SiteBuilderPage;
