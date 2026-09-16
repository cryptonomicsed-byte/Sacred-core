import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { 
  ChevronLeft, 
  Dna, 
  FileText, 
  Zap, 
  Cpu, 
  Music, 
  Globe, 
  Sparkles, 
  RefreshCw, 
  ChevronRight,
  Play,
  Pause,
  Volume2,
  Layers,
  Terminal,
  MessageSquare,
  Send,
  Plus
} from 'lucide-react';
import { SonicWaveform } from '../components/SonicWaveform';

const PortfolioWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { brands, currentBrand, setBrand } = useStore();
  const [activeTab, setActiveTab] = useState('dna');
  const [isRefining, setIsRefining] = useState(false);

  const brand = brands.find(b => b.id === id);

  useEffect(() => {
    if (brand) setBrand(brand);
  }, [brand, setBrand]);

  if (!brand) return <div className="h-screen flex items-center justify-center text-white">DNA Sequence Not Found</div>;

  const tabs = [
    { id: 'dna', label: 'DNA Profile', icon: Dna },
    { id: 'builder', label: 'Asset Builder', icon: FileText },
    { id: 'campaigns', label: 'Campaigns', icon: Zap },
    { id: 'forge', label: 'Agent Forge', icon: Cpu },
    { id: 'sonic', label: 'Sonic Lab', icon: Music },
    { id: 'site', label: 'Site Builder', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Workspace Header */}
      <div className="relative z-10 px-8 mb-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-display uppercase tracking-tighter holographic-text">
                {brand.name}
              </h1>
              <div className="px-2 py-0.5 rounded bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-[8px] font-bold uppercase tracking-widest">
                Active Sequence
              </div>
            </div>
            <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
              {brand.industry} <span className="mx-2">/</span> {brand.tone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
          <div className="flex bg-white/5 border border-white/10 rounded-full p-1 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 px-8 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-[60vh]"
          >
            {activeTab === 'dna' && <DNAProfileSection brand={brand} />}
            {activeTab === 'builder' && <AssetBuilderSection brand={brand} />}
            {activeTab === 'campaigns' && <CampaignsSection brand={brand} />}
            {activeTab === 'forge' && <AgentForgeSection brand={brand} />}
            {activeTab === 'sonic' && <SonicLabSection brand={brand} />}
            {activeTab === 'site' && <SiteBuilderSection brand={brand} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- SUB-SECTIONS ---

const DNAProfileSection = ({ brand }: any) => {
  const [isRefining, setIsRefining] = useState(false);

  return (
    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-12 lg:col-span-5 space-y-8">
        <div className="glass-card rounded-[2.5rem] p-10 relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display uppercase tracking-tight text-brand-primary">Core Essence</h3>
              <button 
                onClick={() => setIsRefining(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isRefining ? 'animate-spin' : ''}`} />
                Refine DNA
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Mission Statement</p>
                <p className="text-lg leading-relaxed italic">"{brand.mission}"</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Target Audience</p>
                  <p className="text-sm font-bold">{brand.targetAudience}</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Confidence Score</p>
                  <p className="text-2xl font-display text-brand-primary">{brand.confidenceScore}%</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Brand Values</p>
              <div className="flex flex-wrap gap-2">
                {brand.values.map((v: string, i: number) => (
                  <span key={i} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-7 h-[600px] glass-card rounded-[2.5rem] relative overflow-hidden flex items-center justify-center">
        {/* DNA Particle Vortex Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[400px] h-[400px] rounded-full border border-brand-primary/20 animate-spin-slow flex items-center justify-center">
            <div className="w-[300px] h-[300px] rounded-full border border-brand-accent/20 animate-reverse-spin flex items-center justify-center">
              <Dna className="w-24 h-24 text-brand-primary animate-pulse" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center">
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.5em] animate-pulse">
            Neural Mapping in Progress...
          </p>
        </div>
      </div>
    </div>
  );
};

const AssetBuilderSection = ({ brand }: any) => {
  return (
    <div className="h-[70vh] glass-card rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center space-y-8">
      <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
        <FileText className="w-12 h-12 text-white/20" />
      </div>
      <div className="space-y-4 max-w-2xl">
        <h2 className="text-4xl font-display uppercase tracking-tight holographic-text">Portfolio Builder</h2>
        <p className="text-white/60 leading-relaxed">
          Unfold your brand DNA into a cinematic PDF experience. Gemini is ready to synthesize your pitch deck, brand guidelines, and executive summaries.
        </p>
      </div>
      <button className="px-12 py-5 bg-white text-black rounded-full font-bold uppercase text-xs tracking-[0.2em] hover:bg-brand-primary transition-all flex items-center gap-3">
        <Sparkles className="w-4 h-4" />
        Synthesize Assets
      </button>
    </div>
  );
};

const CampaignsSection = ({ brand }: any) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-display uppercase tracking-tight">Active Ecosystems</h2>
        <button className="px-6 py-3 bg-brand-primary text-black rounded-full font-bold uppercase text-[10px] tracking-widest hover:shadow-[0_0_20px_rgba(242,125,38,0.4)] transition-all">
          New Campaign
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-3xl p-8 border border-white/10 hover:border-brand-primary/50 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-brand-primary" />
              </div>
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                Phase 0{i}
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-brand-primary transition-colors">Neural Launch Sequence</h3>
            <p className="text-sm text-white/60 mb-6">Multi-channel autonomous campaign targeting high-intent tech leaders.</p>
            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((u) => (
                  <div key={u} className="w-6 h-6 rounded-full border border-black bg-white/10" />
                ))}
              </div>
              <button className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AgentForgeSection = ({ brand }: any) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [command, setCommand] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/openclaw`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      addLog('SYSTEM', 'OpenClaw Neural Link Established.', 'brand-primary');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        addLog(data.source, data.content, 'white/60');
      }
    };

    ws.current.onclose = () => setIsConnected(false);

    return () => ws.current?.close();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (source: string, content: string, color: string) => {
    setLogs(prev => [...prev, { source, content, color, id: uuid() }]);
  };

  const sendCommand = () => {
    if (!command.trim() || !ws.current) return;
    ws.current.send(JSON.stringify({ command }));
    addLog('USER', command, 'brand-accent');
    setCommand('');
  };

  return (
    <div className="grid grid-cols-12 gap-8 h-[70vh]">
      <div className="col-span-12 lg:col-span-4 glass-card rounded-[2.5rem] p-8 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-display uppercase tracking-tight text-brand-primary">Active Agents</h3>
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto pr-2 no-scrollbar">
          {[
            { name: 'Aether', role: 'Strategic Analysis', status: 'Active' },
            { name: 'Nyx', role: 'Creative Synthesis', status: 'Idle' },
            { name: 'Helios', role: 'Outreach Optimization', status: 'Processing' }
          ].map((agent, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-primary/30 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border border-brand-primary/20 flex items-center justify-center relative">
                  <Cpu className="w-5 h-5 text-brand-primary" />
                  {agent.status === 'Active' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm group-hover:text-brand-primary transition-colors">{agent.name}</h4>
                  <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">{agent.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-8 glass-card rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--brand-primary)_0%,_transparent_70%)]" />
        </div>

        <div className="relative z-10 flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-brand-primary" />
            <h3 className="text-xl font-display uppercase tracking-tight">Neural Console</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border ${isConnected ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
              {isConnected ? 'OpenClaw Connected' : 'Link Offline'}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-black/40 rounded-2xl p-6 font-mono text-[11px] space-y-2 overflow-y-auto no-scrollbar border border-white/5">
          {logs.map((log) => (
            <p key={log.id} className={`text-${log.color}`}>
              [{log.source}] {log.content}
            </p>
          ))}
          <div ref={logEndRef} />
        </div>

        <div className="mt-6 relative">
          <input 
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
            placeholder="COMMAND AGENTS..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-6 pr-16 text-xs font-mono focus:border-brand-primary outline-none transition-all"
          />
          <button 
            onClick={sendCommand}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-brand-primary text-black rounded-lg hover:bg-white transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const SonicLabSection = ({ brand }: any) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [prompt, setPrompt] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const synthesizeAudio = async () => {
    if (!prompt.trim()) return;
    setIsSynthesizing(true);
    try {
      // In a real app, we'd call the Gemini API here.
      // For this demo, we'll simulate the synthesis.
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert("Audio synthesized successfully. (Simulation)");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="h-[70vh] glass-card rounded-[2.5rem] relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 z-0">
        <SonicWaveform />
      </div>

      <div className="relative z-10 p-12 flex flex-col h-full">
        <div className="flex items-center justify-between mb-auto">
          <div>
            <h2 className="text-4xl font-display uppercase tracking-tight holographic-text mb-2">Sonic Lab</h2>
            <p className="text-xs font-mono text-white/40 uppercase tracking-[0.3em]">Powered by Gemini Lyria 3</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <Volume2 className="w-6 h-6 text-white/60" />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-12">
          <div className="relative group cursor-pointer" onClick={() => setIsPlaying(!isPlaying)}>
            <div className={`absolute inset-0 bg-brand-primary/20 blur-3xl rounded-full animate-pulse group-hover:bg-brand-primary/40 transition-all ${isPlaying ? 'scale-150 opacity-50' : ''}`} />
            <div className="relative w-40 h-40 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">
              {isPlaying ? <Pause className="w-16 h-16" /> : <Play className="w-16 h-16 ml-2" />}
            </div>
          </div>

          <div className="space-y-6 w-full max-w-xl text-center">
            <h3 className="text-xl font-bold uppercase tracking-widest">Generate Brand Soundscape</h3>
            <div className="flex gap-4">
              <input 
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.G. 'WARM AMBIENT JINGLE FROM LOGO COLORS'"
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-mono focus:border-brand-primary outline-none"
              />
              <button 
                onClick={synthesizeAudio}
                disabled={isSynthesizing}
                className="px-8 py-4 bg-brand-primary text-black rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-white transition-all disabled:opacity-50"
              >
                {isSynthesizing ? 'Synthesizing...' : 'Synthesize'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-12">
          <div className="flex items-center gap-8">
            <div className="space-y-1">
              <p className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Frequency</p>
              <p className="text-sm font-bold">432 Hz</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Resonance</p>
              <p className="text-sm font-bold">Harmonic</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-primary animate-ping" />
            <p className="text-[10px] font-mono text-brand-primary uppercase tracking-widest">Lyria Engine Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SiteBuilderSection = ({ brand }: any) => {
  return (
    <div className="h-[70vh] grid grid-cols-12 gap-8">
      <div className="col-span-12 lg:col-span-8 glass-card rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
          <div className="w-[80%] h-[80%] bg-[#0A0A0A] rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative transform group-hover:scale-[1.02] transition-all duration-700">
            {/* Mock Site Content */}
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="w-24 h-4 bg-white/10 rounded" />
                <div className="flex gap-4">
                  <div className="w-12 h-2 bg-white/5 rounded" />
                  <div className="w-12 h-2 bg-white/5 rounded" />
                </div>
              </div>
              <div className="space-y-4 pt-12 max-w-md">
                <div className="w-full h-12 bg-white/10 rounded-lg" />
                <div className="w-2/3 h-12 bg-white/10 rounded-lg" />
                <div className="w-full h-4 bg-white/5 rounded" />
                <div className="w-full h-4 bg-white/5 rounded" />
              </div>
              <div className="pt-12 grid grid-cols-3 gap-4">
                <div className="aspect-square bg-white/5 rounded-2xl" />
                <div className="aspect-square bg-white/5 rounded-2xl" />
                <div className="aspect-square bg-white/5 rounded-2xl" />
              </div>
            </div>
            {/* Holographic Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/80 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest">
          3D Isometric Preview
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-8">
        <div className="glass-card rounded-[2.5rem] p-8 space-y-6">
          <h3 className="text-xl font-display uppercase tracking-tight text-brand-primary">Site Synthesis</h3>
          <p className="text-sm text-white/60 leading-relaxed">
            Generate a brand-DNA-reactive website in seconds. Gemini will architect the layout, copy, and visual style based on your core essence.
          </p>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest">Responsive Design</span>
              <div className="w-8 h-4 bg-brand-primary rounded-full relative">
                <div className="absolute right-1 top-1 w-2 h-2 bg-black rounded-full" />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest">SEO Optimization</span>
              <div className="w-8 h-4 bg-brand-primary rounded-full relative">
                <div className="absolute right-1 top-1 w-2 h-2 bg-black rounded-full" />
              </div>
            </div>
          </div>
          <button className="w-full py-5 bg-white text-black rounded-2xl font-bold uppercase text-xs tracking-[0.2em] hover:bg-brand-primary transition-all flex items-center justify-center gap-3 shadow-xl">
            <Globe className="w-4 h-4" />
            Launch Site
          </button>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8">
          <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-4">Synthesis Logs</h4>
          <div className="space-y-2 font-mono text-[9px]">
            <p className="text-brand-primary">Architecting DOM structure...</p>
            <p className="text-white/40">Injecting brand-reactive CSS variables...</p>
            <p className="text-white/40">Synthesizing copy with Gemini 2.0...</p>
            <p className="text-white/20">Ready for deployment.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioWorkspace;
