
import React, { useState } from 'react';
import { useStore } from '../store';
import { generateBattleReport } from '@infra/analysis/competitorAnalysisService';
import { BattleReport, ProcessingState, BrandDNA } from '../types';
import { Swords, Trophy, AlertTriangle, ArrowRight, Activity, TrendingUp, ShieldAlert, Target, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const BattleModePage = () => {
  const { brands } = useStore();
  const [selectedA, setSelectedA] = useState<string>('');
  const [selectedB, setSelectedB] = useState<string>('');
  const [status, setStatus] = useState<ProcessingState>(ProcessingState.IDLE);
  const [report, setReport] = useState<BattleReport | null>(null);

  const brandA = brands.find(b => b.id === selectedA);
  const brandB = brands.find(b => b.id === selectedB);

  const handleBattle = async () => {
    if (!brandA || !brandB) return;
    
    setStatus(ProcessingState.ANALYZING);
    try {
      const result = await generateBattleReport(brandA, brandB);
      setReport(result);
      setStatus(ProcessingState.COMPLETE);
    } catch (e) {
      console.error(e);
      setStatus(ProcessingState.ERROR);
    }
  };

  const reset = () => {
    setReport(null);
    setStatus(ProcessingState.IDLE);
  };

  // --- RENDERING ---

  if (brands.length < 2) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md bg-dark-surface p-8 rounded-xl border border-dark-border shadow-2xl">
          <Swords className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Arena Empty</h2>
          <p className="text-zinc-500 mb-6">Battle Mode requires at least two extracted Brand DNAs to perform a comparative analysis.</p>
          <Link to="/extract" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-bold transition-all">
            Extract More Brands <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // BATTLE REPORT VIEW
  if (report && brandA && brandB) {
    const scoreA = report.scores?.brandA ?? 0;
    const scoreB = report.scores?.brandB ?? 0;
    const winnerId = scoreA > scoreB ? brandA.id : 
                     scoreB > scoreA ? brandB.id : null;

    return (
      <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-8">
           <h1 className="text-3xl font-bold text-white flex items-center gap-3">
             <Swords className="w-8 h-8 text-brand-500" /> Battle Report
           </h1>
           <button onClick={reset} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition-colors">
             New Battle
           </button>
        </div>

        {/* Header Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           {/* Brand A */}
           <div className={`p-6 rounded-xl border relative overflow-hidden transition-all duration-500 ${winnerId === brandA.id ? 'bg-brand-900/10 border-brand-500/50 shadow-[0_0_30px_rgba(20,184,166,0.1)]' : 'bg-dark-surface border-dark-border opacity-80'}`}>
              <h2 className="text-xl font-bold text-white mb-1 uppercase tracking-tight">{brandA.name}</h2>
              <div className="text-4xl font-black text-brand-400 mb-2">{scoreA}</div>
              <p className="text-xs text-zinc-500 italic">"{brandA.tagline}"</p>
              {winnerId === brandA.id && <Trophy className="absolute top-4 right-4 w-6 h-6 text-yellow-500 animate-bounce" />}
           </div>

           {/* VS / Outcome */}
           <div className="flex flex-col items-center justify-center text-center">
              <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-2">Simulation Outcome</div>
              <div className="text-2xl font-black text-white mb-1 uppercase tracking-tighter">
                {winnerId === brandA.id ? `${brandA.name} Dominates` : 
                 winnerId === brandB.id ? `${brandB.name} Dominates` : "Strategic Equilibrium"}
              </div>
              <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                Market Overlap: <span className="text-brand-400">{report.marketPositioning?.overlap || 'Medium'}</span>
              </div>
           </div>

           {/* Brand B */}
           <div className={`p-6 rounded-xl border relative overflow-hidden transition-all duration-500 ${winnerId === brandB.id ? 'bg-brand-900/10 border-brand-500/50 shadow-[0_0_30px_rgba(20,184,166,0.1)]' : 'bg-dark-surface border-dark-border opacity-80'}`}>
              <h2 className="text-xl font-bold text-white mb-1 uppercase tracking-tight">{brandB.name}</h2>
              <div className="text-4xl font-black text-brand-400 mb-2">{scoreB}</div>
              <p className="text-xs text-zinc-500 italic">"{brandB.tagline}"</p>
              {winnerId === brandB.id && <Trophy className="absolute top-4 right-4 w-6 h-6 text-yellow-500 animate-bounce" />}
           </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
           {/* Scores Chart */}
           <div className="bg-dark-surface border border-dark-border p-6 rounded-xl shadow-xl">
              <h3 className="text-[10px] font-black text-brand-500 uppercase mb-6 flex items-center gap-2 tracking-[0.2em]">
                <Activity className="w-4 h-4" /> Performance Vector Breakdown
              </h3>
              <div className="space-y-6">
                {(report.scores?.breakdown || []).map((item, i) => (
                  <div key={i} className="animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                      <span className={item.scoreA > item.scoreB ? 'text-brand-400' : ''}>{brandA.name} ({item.scoreA})</span>
                      <span className="text-white bg-zinc-800 px-2 py-0.5 rounded">{item.category}</span>
                      <span className={item.scoreB > item.scoreA ? 'text-brand-400' : ''}>{brandB.name} ({item.scoreB})</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-900 shadow-inner">
                      <div className="bg-brand-500 transition-all duration-1000" style={{ width: `${item.scoreA}%` }} />
                      <div className="bg-zinc-800 flex-1" />
                      <div className="bg-purple-500 transition-all duration-1000" style={{ width: `${item.scoreB}%` }} />
                    </div>
                  </div>
                ))}
              </div>
           </div>

           {/* Gaps */}
           <div className="bg-dark-surface border border-dark-border p-6 rounded-xl shadow-xl">
              <h3 className="text-[10px] font-black text-red-500 uppercase mb-6 flex items-center gap-2 tracking-[0.2em]">
                <ShieldAlert className="w-4 h-4" /> Vulnerability & Strategic Gaps
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="p-4 bg-black/20 rounded-xl border border-zinc-800/50">
                   <div className="text-[9px] text-zinc-500 font-black uppercase mb-3 tracking-widest border-b border-zinc-800 pb-2">{brandA.name} Missing</div>
                   <ul className="space-y-2">
                     {(report.gapAnalysis?.brandAMissing || []).map((g, i) => (
                       <li key={i} className="text-xs text-red-400/80 flex items-start gap-2 font-medium">
                         <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-red-600"/> {g}
                       </li>
                     ))}
                   </ul>
                 </div>
                 <div className="p-4 bg-black/20 rounded-xl border border-zinc-800/50">
                   <div className="text-[9px] text-zinc-500 font-black uppercase mb-3 tracking-widest border-b border-zinc-800 pb-2">{brandB.name} Missing</div>
                   <ul className="space-y-2">
                     {(report.gapAnalysis?.brandBMissing || []).map((g, i) => (
                       <li key={i} className="text-xs text-red-400/80 flex items-start gap-2 font-medium">
                         <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-red-600"/> {g}
                       </li>
                     ))}
                   </ul>
                 </div>
              </div>
           </div>
        </div>

        {/* Text Analysis */}
        <div className="space-y-6 mb-12">
           <div className="bg-dark-surface border border-dark-border p-8 rounded-[2rem] shadow-xl">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-xs font-black text-white uppercase tracking-widest">Visual DNA Analysis</h3>
               <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest bg-brand-900/20 px-3 py-1 rounded-full border border-brand-500/20">Edge: {report.visualAnalysis?.winner === 'A' ? brandA.name : report.visualAnalysis?.winner === 'B' ? brandB.name : 'Neutral'}</span>
             </div>
             <p className="text-zinc-400 text-sm leading-relaxed font-medium">{report.visualAnalysis?.summary}</p>
           </div>
           
           <div className="bg-dark-surface border border-dark-border p-8 rounded-[2rem] shadow-xl">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-xs font-black text-white uppercase tracking-widest">Messaging Resonance</h3>
               <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest bg-brand-900/20 px-3 py-1 rounded-full border border-brand-500/20">Edge: {report.messagingAnalysis?.winner === 'A' ? brandA.name : report.messagingAnalysis?.winner === 'B' ? brandB.name : 'Neutral'}</span>
             </div>
             <p className="text-zinc-400 text-sm leading-relaxed font-medium">{report.messagingAnalysis?.summary}</p>
           </div>

           <div className="bg-brand-950/20 border border-brand-500/20 p-10 rounded-[3rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Target className="w-32 h-32 text-brand-500" /></div>
              <h3 className="text-xs font-black text-brand-400 mb-4 flex items-center gap-2 tracking-[0.4em] uppercase">
                <TrendingUp className="w-4 h-4" /> Market Strategist Critique
              </h3>
              <p className="text-brand-100/90 text-base leading-loose font-medium italic relative z-10">"{report.critique}"</p>
           </div>
        </div>

      </div>
    );
  }

  // CONFIG VIEW
  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col items-center justify-center animate-in fade-in duration-700">
       <div className="mb-12 text-center">
         <div className="w-20 h-20 bg-brand-900/20 rounded-3xl flex items-center justify-center text-brand-500 mx-auto mb-6 border border-brand-500/20 shadow-[0_0_50px_rgba(20,184,166,0.1)]">
           <Swords className="w-10 h-10" />
         </div>
         <h1 className="text-5xl font-black text-white mb-2 tracking-tighter uppercase">Arena Mode</h1>
         <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Head-to-head competitive resonance simulation</p>
       </div>

       <div className="flex flex-col md:flex-row items-center gap-12 w-full max-w-5xl relative">
          {/* Left Corner */}
          <div className={`flex-1 w-full bg-dark-surface p-10 rounded-[2.5rem] border transition-all duration-300 shadow-2xl ${selectedA ? 'border-brand-500/50' : 'border-dark-border'}`}>
             <label className="block text-[10px] font-black text-brand-500 uppercase mb-4 tracking-[0.2em] px-1">Primary Subject</label>
             <select 
               value={selectedA}
               onChange={(e) => setSelectedA(e.target.value)}
               className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-4 px-5 text-white font-black uppercase tracking-tight focus:ring-2 focus:ring-brand-500 outline-none transition-all appearance-none cursor-pointer"
             >
               <option value="">Select Core...</option>
               {brands.map(b => <option key={b.id} value={b.id} disabled={b.id === selectedB}>{b.name}</option>)}
             </select>
             {brandA && (
               <div className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                 <div className="font-black text-zinc-300 mb-1 uppercase tracking-tight">{brandA.name}</div>
                 <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Extracted: {new Date(brandA.extractedAt).toLocaleDateString()}</div>
               </div>
             )}
          </div>

          {/* VS Divider */}
          <div className="shrink-0 flex items-center justify-center w-20 h-20 rounded-[2rem] bg-brand-600 text-black font-black text-2xl shadow-[0_0_40px_rgba(20,184,166,0.4)] z-10 border-4 border-dark-bg rotate-45">
            <span className="-rotate-45">VS</span>
          </div>

          {/* Right Corner */}
          <div className={`flex-1 w-full bg-dark-surface p-10 rounded-[2.5rem] border transition-all duration-300 shadow-2xl ${selectedB ? 'border-purple-500/50' : 'border-dark-border'}`}>
             <label className="block text-[10px] font-black text-purple-500 uppercase mb-4 tracking-[0.2em] px-1">Challenger Target</label>
             <select 
               value={selectedB}
               onChange={(e) => setSelectedB(e.target.value)}
               className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-4 px-5 text-white font-black uppercase tracking-tight focus:ring-2 focus:ring-purple-500 outline-none transition-all appearance-none cursor-pointer"
             >
               <option value="">Select Core...</option>
               {brands.map(b => <option key={b.id} value={b.id} disabled={b.id === selectedA}>{b.name}</option>)}
             </select>
             {brandB && (
               <div className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                 <div className="font-black text-zinc-300 mb-1 uppercase tracking-tight">{brandB.name}</div>
                 <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Extracted: {new Date(brandB.extractedAt).toLocaleDateString()}</div>
               </div>
             )}
          </div>
       </div>

       <div className="mt-16">
         <button
           onClick={handleBattle}
           disabled={!selectedA || !selectedB || status === ProcessingState.ANALYZING}
           className="group px-16 py-5 bg-white hover:bg-zinc-200 text-black font-black text-xs tracking-[0.3em] rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-4 active:scale-95"
         >
           {status === ProcessingState.ANALYZING ? (
             <>
               <RefreshCw className="w-5 h-5 animate-spin" />
               INITIATING SIMULATION...
             </>
           ) : (
             <>
               <Swords className="w-5 h-5 group-hover:rotate-12 transition-transform" />
               START BATTLE SIMULATION
             </>
           )}
         </button>
       </div>
    </div>
  );
};

export default BattleModePage;
