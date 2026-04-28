
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { BrandDNA, TrendItem } from '../types';
import { getBrandTrends } from '@infra/insights/rocketNewService';
import { useStore } from '../store';
import { TrendingUp, RefreshCw, Flame, AlertCircle, Cpu, Activity, Zap, ZapOff, Power } from 'lucide-react';

interface TrendPulseProps {
  currentBrand: BrandDNA | null;
}

export const TrendPulse: React.FC<TrendPulseProps> = ({ currentBrand }) => {
  const { showTrendPulse, toggleTrendPulse } = useStore();
  const [trends, setTrends] = useState<(TrendItem & { isSimulated?: boolean })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{message: string, code?: string} | null>(null);
  const lastFetchedBrandId = useRef<string | undefined>(undefined);

  const fetchTrends = useCallback(async (force = false) => {
    // Prevent execution if feature is toggled OFF
    if (!showTrendPulse) return;
    
    // Prevent spam if already loading or if brand hasn't changed (unless forced)
    if (loading) return;
    if (!force && currentBrand?.id === lastFetchedBrandId.current && trends.length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getBrandTrends(currentBrand || undefined, force);
      setTrends(data);
      lastFetchedBrandId.current = currentBrand?.id;
    } catch (e: any) {
      console.error(e);
      setError({ message: e.message || "Failed to pulse trends", code: e.code });
    } finally {
      setLoading(false);
    }
  }, [currentBrand?.id, loading, trends.length, showTrendPulse]);

  useEffect(() => {
    if (showTrendPulse) {
      fetchTrends();
    }
  }, [fetchTrends, showTrendPulse]);

  const hasSimulatedData = trends.some(t => t.isSimulated);

  // Hibernation state UI - Shown when toggle is OFF
  if (!showTrendPulse) {
    return (
      <div className="w-full bg-dark-surface/30 border border-dark-border border-dashed rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 group hover:bg-dark-surface/40 transition-all">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-700 shadow-inner">
            <ZapOff className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-500 uppercase tracking-tighter">Global Signal Link Offline</h2>
            <p className="text-zinc-600 text-sm font-medium mt-1">Real-time macro intelligence and cultural trend monitoring are currently hibernating.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Neural Standby</p>
              <p className="text-[10px] font-bold text-zinc-600 uppercase">Tokens Conserved</p>
           </div>
           <button 
             onClick={toggleTrendPulse}
             className="px-8 py-4 bg-zinc-800 hover:bg-brand-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl flex items-center gap-3 group/btn active:scale-95"
           >
             <Zap className="w-4 h-4 fill-current group-hover/btn:scale-110 transition-transform" /> 
             Initialize Neural Feed
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-dark-surface/50 border border-dark-border rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
        <Activity className="w-40 h-40 text-brand-500" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 relative z-10">
        <div className="flex items-center gap-5">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
              <Flame className="w-6 h-6 text-orange-500" /> Real-time Trend Pulse
            </h2>
            <div className="flex items-center gap-5 mt-2">
               <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest">Macro Market Signals Integrated</p>
               <span className="flex items-center gap-2 px-3 py-1 bg-amber-900/20 text-amber-500 text-[9px] font-black rounded-lg border border-amber-500/20">
                 <Cpu className="w-3 h-3" /> {hasSimulatedData ? 'CACHED INTELLIGENCE' : 'LIVE NEURAL FEED'}
               </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
           {/* Prominent Master Toggle */}
           <div className="flex items-center gap-4 px-6 py-3 bg-black/40 border border-zinc-800 rounded-3xl shadow-inner">
              <div className="text-right">
                <span className="block text-[8px] font-black text-zinc-600 uppercase tracking-widest">Master Link</span>
                <span className="block text-[10px] font-black text-brand-500 uppercase tracking-widest">Active</span>
              </div>
              <button 
                onClick={toggleTrendPulse}
                className="relative w-12 h-6 rounded-full bg-brand-600 border border-brand-400 shadow-[0_0_15px_rgba(20,184,166,0.4)] transition-all active:scale-95"
              >
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Power className="w-2.5 h-2.5 text-brand-600" />
                </div>
              </button>
           </div>

          <button 
            onClick={() => fetchTrends(true)} 
            disabled={loading}
            className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-white hover:border-brand-500 transition-all shadow-xl group/btn"
            title="Force Neural Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover/btn:rotate-180 transition-transform duration-500'}`} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-red-950/5 rounded-3xl border border-red-900/20">
           <AlertCircle className="w-12 h-12 text-red-500/50 mb-6" />
           <p className="text-base font-black text-zinc-200 uppercase tracking-widest">Pulse Transmission Interrupted</p>
           <p className="text-sm text-zinc-500 mt-2">{error.message}</p>
           <button onClick={() => fetchTrends(true)} className="mt-8 px-8 py-3 border border-brand-500/30 text-[10px] font-black text-brand-500 uppercase tracking-widest hover:bg-brand-500 hover:text-white transition-all rounded-xl">Re-establish Link</button>
        </div>
      ) : loading && trends.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center gap-6">
           <div className="relative">
              <RefreshCw className="w-12 h-12 text-brand-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <Activity className="w-4 h-4 text-brand-400 animate-pulse" />
              </div>
           </div>
           <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em]">Scanning Global Neural Signals...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
          {trends.map((trend) => (
            <div key={trend.id} className="bg-black/40 border border-zinc-800 hover:border-brand-500/40 rounded-[2rem] p-8 transition-all group/card shadow-2xl flex flex-col hover:bg-black/60">
              <div className="flex justify-between items-start mb-6">
                <span className="px-3 py-1 bg-zinc-900 text-zinc-500 text-[9px] font-black uppercase rounded-lg border border-zinc-800 tracking-widest">{trend.category}</span>
                <span className="flex items-center gap-1.5 text-[10px] font-black text-brand-400 bg-brand-900/10 px-2 py-0.5 rounded-full border border-brand-500/10"><TrendingUp className="w-3.5 h-3.5" /> {trend.volume}</span>
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-3 group-hover/card:text-brand-400 transition-colors leading-tight">{trend.topic}</h3>
              <p className="text-xs text-zinc-500 leading-loose font-medium mb-8 flex-1 line-clamp-3 italic">"{trend.summary}"</p>
              
              <div className="mt-auto space-y-3">
                <div className="flex items-center justify-between text-[9px] font-black text-zinc-600 uppercase tracking-widest border-t border-zinc-900/50 pt-5">
                   <span>Neural Resonance</span>
                   <span className="text-brand-500">{trend.relevanceScore}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden shadow-inner">
                   <div className="h-full bg-brand-600 transition-all duration-1000 ease-out shadow-[0_0_10px_#14b8a6]" style={{ width: `${trend.relevanceScore}%` }} />
                </div>
              </div>
            </div>
          ))}
          {trends.length === 0 && !loading && (
             <div className="col-span-full py-20 text-center text-zinc-700 font-black uppercase tracking-[0.4em] text-sm">No Emerging Signals Detected in current sector</div>
          )}
        </div>
      )}
    </div>
  );
};
