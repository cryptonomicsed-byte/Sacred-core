
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Agent, AgentType, AgentMessage, BrandDNA } from '../types';
import { chatWithAgent } from '@infra/agents/agentService';
import { universalAiService } from '@infra/ai/universalAiService';
import { Link } from 'react-router-dom';
import { 
  Bot, 
  Plus, 
  Settings, 
  BookOpen, 
  Shield, 
  MessageSquare, 
  Rocket, 
  Trash2, 
  Save, 
  Terminal,
  User,
  Send,
  RefreshCw,
  Dna,
  ChevronDown,
  Layers,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Mic,
  Database,
  ShieldCheck,
  Brain,
  Zap,
  Activity,
  UserCheck,
  Globe,
  Info,
  History,
  Lock,
  Search,
  Sparkles,
  Wand2
} from 'lucide-react';
import { BrandSelector } from '../components/BrandSelector';

const AgentForgePage = () => {
  const { agents, addAgent, updateAgent, deleteAgent, brands, currentBrand, setBrand } = useStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'config' | 'knowledge' | 'guardrails' | 'tuning' | 'test'>('config');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Form State
  const [formData, setFormData] = useState<Partial<Agent>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isGeneratingInstruction, setIsGeneratingInstruction] = useState(false);
  
  // Test Chat State
  const [chatHistory, setChatHistory] = useState<AgentMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [simulationMetrics, setSimulationMetrics] = useState({ latency: 0, tokens: 0, fromCache: false });
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateField = (field: keyof Agent, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  useEffect(() => {
    const agent = agents.find(a => a.id === selectedAgentId);
    if (agent) {
      setFormData(agent);
      setIsDirty(false);
      if (chatHistory.length === 0) {
        setChatHistory([{
          id: 'init',
          role: 'model',
          text: `Neural link established. Callsign: ${agent.name}. Sync status: ${currentBrand?.name || 'Global'}. Ready for simulation.`,
          timestamp: new Date().toISOString()
        }]);
      }
    } else {
      setFormData({});
    }
  }, [selectedAgentId, agents, currentBrand?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, activeTab, isTyping]);

  const handleCreateNew = () => {
    const baseName = currentBrand ? `${currentBrand.name} Rep` : 'New Agent';
    const baseRole = currentBrand ? 'Brand Representative' : 'Assistant';
    const basePersonality = currentBrand ? currentBrand.tone.personality : 'Helpful';
    const baseInstruction = currentBrand ? `You are an official AI representative for "${currentBrand.name}". Adhere to our mission: ${currentBrand.mission}` : 'You are a helpful assistant.';

    const newAgent: Agent = {
      id: crypto.randomUUID(),
      name: baseName,
      type: 'custom',
      role: baseRole,
      personality: basePersonality,
      systemInstruction: baseInstruction,
      guardrails: currentBrand ? [`Always maintain ${currentBrand.name} brand safety standards.`] : [],
      knowledgeBase: currentBrand ? [`Primary Objective: ${currentBrand.mission}`] : [],
      status: 'draft',
      avatar: '🤖',
      brandId: currentBrand?.id
    };
    addAgent(newAgent);
    setSelectedAgentId(newAgent.id);
  };

  const handleAutoAlign = () => {
    if (!currentBrand) return;
    const alignedInstruction = `IDENTITY: ${formData.name || 'Operative'}\nROLE: ${formData.role || 'Brand Envoy'}\nBRAND CONTEXT: ${currentBrand.name}\nMISSION: ${currentBrand.mission}\nTONE: ${currentBrand.tone.personality} (${currentBrand.tone.adjectives.join(', ')})\nCORE VALUES: ${currentBrand.coreValues.join(', ')}\nKEY MESSAGING: ${currentBrand.keyMessaging.join(' | ')}\n\nDIRECTIVES:\n1. Always maintain the brand persona.\n2. Prioritize user problems related to our target segments: ${currentBrand.targetAudience.join(', ')}.\n3. Use language consistent with our design system aesthetic: ${currentBrand.visualIdentity.styleKeywords.join(', ')}.`;
    updateField('systemInstruction', alignedInstruction);
  };

  const handleAiGenInstruction = async () => {
    if (isGeneratingInstruction) return;
    setIsGeneratingInstruction(true);
    const brandCtx = currentBrand ? `BRAND: ${currentBrand.name}\nMISSION: ${currentBrand.mission}\nTONE: ${currentBrand.tone.personality}\nCORE VALUES: ${currentBrand.coreValues.join(', ')}\nTARGET AUDIENCE: ${currentBrand.targetAudience.join(', ')}` : 'General Context (No specific brand linked).';
    const prompt = `Act as a Prompt Engineering Expert. Generate a sophisticated and comprehensive "System Instruction" for an AI agent.\n\nAGENT NAME: ${formData.name || 'Operative'}\nAGENT ROLE: ${formData.role || 'Representative'}\n${brandCtx}\n\nREQUIREMENTS:\n1. Define a strong persona and identity.\n2. Establish clear operational constraints and behavioral guidelines.\n3. Use a structured, modular format (Identity, Directives, Tone, Response Patterns).\n4. Ensure it perfectly aligns with the mission and target audience provided.\n5. Output ONLY the instruction text, no conversational filler.`;
    try {
      const result = await universalAiService.generateText({ prompt, featureId: 'agent-prompt-gen', bypassCache: true });
      if (result && result !== "FALLBACK_TRIGGERED") updateField('systemInstruction', result);
    } catch (e) { console.error(e); } finally { setIsGeneratingInstruction(false); }
  };

  const handleSave = () => { if (selectedAgentId && formData) { updateAgent(selectedAgentId, { ...formData, brandId: currentBrand?.id }); setIsDirty(false); } };
  const handleDelete = () => { if (confirm("Decommission this operative?")) { deleteAgent(selectedAgentId); setSelectedAgentId(agents[0]?.id || ''); } };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;
    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent) return;
    const userMsg: AgentMessage = { id: crypto.randomUUID(), role: 'user', text: chatInput, timestamp: new Date().toISOString() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);
    const startTime = Date.now();
    try {
      const response = await chatWithAgent({ ...agent, ...formData } as Agent, chatHistory, userMsg.text);
      const latency = Date.now() - startTime;
      setSimulationMetrics({ latency, tokens: Math.round(response.length / 4), fromCache: latency < 100 });
      setChatHistory(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: response, timestamp: new Date().toISOString() }]);
    } finally { setIsTyping(false); }
  };

  if (agents.length === 0 && !selectedAgentId) {
     return (
       <div className="h-full flex items-center justify-center bg-dark-bg p-8 text-center">
          <div className="max-w-md bg-dark-surface p-16 rounded-[4rem] border border-dark-border shadow-2xl animate-in zoom-in-95">
             <Bot className="w-20 h-20 mx-auto mb-10 text-brand-500 opacity-20" />
             <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Neural Barracks Empty</h2>
             <p className="text-zinc-500 font-medium mb-12 leading-relaxed text-sm">Select a project context to initialize automated agent recruitment.</p>
             <div className="flex flex-col gap-4">
               {brands.length > 0 && <button onClick={handleCreateNew} className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs">RECRUIT MANUAL OPERATIVE</button>}
               <Link to="/" className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs">SEQUENCE NEW BRAND DNA</Link>
             </div>
          </div>
       </div>
     );
  }

  return (
    <div className="flex h-full bg-dark-bg overflow-hidden relative">
      <div className={`bg-dark-surface border-r border-dark-border flex flex-col shrink-0 transition-all duration-300 relative z-20 ${isSidebarOpen ? 'w-80' : 'w-0 opacity-0 invisible overflow-hidden'}`}>
         <div className="p-6 border-b border-dark-border bg-black/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                <Bot className="w-5 h-5 text-brand-500" /> OPERATIVES
              </h2>
              <button onClick={handleCreateNew} className="p-2 bg-brand-900/20 text-brand-400 hover:bg-brand-600 hover:text-white rounded-xl transition-all shadow-lg"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="relative">
               <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2.5 block px-1">DNA CONTEXT</label>
               <BrandSelector />
            </div>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {agents.map(agent => (
               <div key={agent.id} onClick={() => setSelectedAgentId(agent.id)} className={`p-5 rounded-[1.5rem] cursor-pointer border transition-all flex items-center gap-4 ${selectedAgentId === agent.id ? 'bg-brand-900/10 border-brand-500 shadow-2xl shadow-brand-500/10 scale-[1.02]' : 'bg-black/20 border-zinc-800/50 text-zinc-400 hover:border-zinc-700'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${selectedAgentId === agent.id ? 'bg-brand-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}>{agent.avatar}</div>
                  <div className="flex-1 min-w-0">
                     <div className="font-black text-sm truncate text-white uppercase tracking-tight">{agent.name}</div>
                     <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{agent.type} • {agent.status}</div>
                  </div>
               </div>
            ))}
         </div>
      </div>
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`absolute z-50 top-1/2 -translate-y-1/2 p-1.5 bg-dark-surface border border-dark-border text-zinc-500 hover:text-brand-500 rounded-full shadow-2xl transition-all ${isSidebarOpen ? 'left-[304px]' : 'left-4'}`}>{isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
      {selectedAgentId && (
        <div className="flex-1 flex flex-col min-w-0 bg-dark-bg/20">
           <div className={`h-24 border-b border-dark-border bg-dark-surface/50 backdrop-blur-2xl px-10 flex justify-between items-center shrink-0 transition-all ${!isSidebarOpen ? 'pl-16' : ''}`}>
              <div className="flex items-center gap-8">
                 <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-3xl shadow-2xl shadow-brand-600/30">{formData.avatar}</div>
                 <div>
                    <div className="flex items-center gap-4">
                       <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{formData.name}</h1>
                       {isDirty && <span className="text-[8px] bg-amber-500 text-black px-2 py-0.5 rounded-sm font-black uppercase tracking-[0.2em]">MODIFIED</span>}
                    </div>
                    <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2">
                       <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-brand-500" /> {formData.type} Segment</span>
                       {formData.status === 'deployed' && <span className="text-green-500 flex items-center gap-2"><Rocket className="w-3.5 h-3.5" /> Mission Live</span>}
                       <span className="text-zinc-700">|</span>
                       <span className="flex items-center gap-2 text-zinc-400"><Activity className="w-3.5 h-3.5" /> Health: Optimal</span>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <button onClick={handleDelete} className="p-4 text-zinc-700 hover:text-red-500 transition-colors" title="Decommission Operative"><Trash2 className="w-5.5 h-5.5" /></button>
                 <div className="h-10 w-px bg-zinc-800 mx-2" />
                 <button onClick={handleSave} disabled={!isDirty} className="px-8 py-3.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-zinc-800 shadow-lg">SAVE CONFIG</button>
                 <button className="px-10 py-3.5 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-2xl shadow-brand-500/20 transition-all active:scale-95">IGNITE DEPLOYMENT</button>
              </div>
           </div>
           <div className={`flex border-b border-dark-border bg-black/40 px-10 shrink-0 transition-all ${!isSidebarOpen ? 'pl-16' : ''}`}>
              {[ { id: 'config', label: 'Instruction Matrix', icon: Settings }, { id: 'knowledge', label: 'Neural Base', icon: BookOpen }, { id: 'guardrails', label: 'Safety Protocols', icon: ShieldCheck }, { id: 'tuning', label: 'Inference Tuning', icon: Sliders }, { id: 'test', label: 'Simulation Grid', icon: Terminal } ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 border-b-2 transition-all ${activeTab === tab.id ? 'border-brand-500 text-brand-500 bg-brand-500/5' : 'border-transparent text-zinc-600 hover:text-zinc-300'}`}><tab.icon className="w-4 h-4" /> {tab.label}</button>
              ))}
           </div>
           <div className="flex-1 overflow-y-auto p-12 bg-dark-bg/30 custom-scrollbar">
              {activeTab === 'config' && (
                 <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-8">
                          <div><label className="block text-[10px] font-black text-zinc-600 uppercase mb-3 tracking-[0.2em] pl-1">Operational ID</label><input type="text" value={formData.name || ''} onChange={(e) => updateField('name', e.target.value)} className="w-full bg-black/60 border border-zinc-800 rounded-2xl py-4.5 px-6 text-white font-bold focus:ring-1 focus:ring-brand-500 outline-none transition-all shadow-inner" /></div>
                          <div><label className="block text-[10px] font-black text-zinc-600 uppercase mb-3 tracking-[0.2em] pl-1">Mission Mandate</label><input type="text" value={formData.role || ''} onChange={(e) => updateField('role', e.target.value)} className="w-full bg-black/60 border border-zinc-800 rounded-2xl py-4.5 px-6 text-white font-bold focus:ring-1 focus:ring-brand-500 outline-none transition-all shadow-inner" /></div>
                       </div>
                       <div className="bg-brand-900/10 border border-brand-500/20 p-10 rounded-[2.5rem] flex flex-col justify-center relative overflow-hidden group shadow-2xl">
                          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Dna className="w-32 h-32 text-brand-500" /></div>
                          <h3 className="text-xs font-black text-brand-400 uppercase tracking-[0.3em] mb-3">Neural Alignment</h3>
                          <p className="text-sm text-zinc-400 leading-relaxed font-medium">Auto-align logic with <span className="text-white font-black">{currentBrand?.name || 'Unlinked Core'}</span> DNA.</p>
                          <button onClick={handleAutoAlign} className="mt-6 w-fit px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-2"><Zap className="w-3 h-3 fill-current" /> Sync Brand Directive</button>
                       </div>
                    </div>
                    <div>
                       <div className="flex justify-between items-center mb-4 px-1">
                          <div className="flex items-center gap-4">
                             <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">System Instruction (Core Matrix)</label>
                             <button onClick={handleAiGenInstruction} disabled={isGeneratingInstruction} className="flex items-center gap-2 px-3 py-1 bg-brand-900/20 border border-brand-500/30 rounded-full text-brand-400 text-[9px] font-black uppercase tracking-widest hover:bg-brand-500 hover:text-white transition-all shadow-lg active:scale-95 disabled:opacity-50">{isGeneratingInstruction ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} {isGeneratingInstruction ? 'SEQUENCING...' : 'AI GENERATE'}</button>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-black flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full"><Brain className="w-3 h-3 text-brand-500" /> Priority Level: Critical</span>
                       </div>
                       <textarea value={formData.systemInstruction || ''} onChange={(e) => updateField('systemInstruction', e.target.value)} className="w-full h-96 bg-black/40 border border-zinc-800 rounded-[2.5rem] p-10 text-zinc-300 font-mono text-sm focus:ring-1 focus:ring-brand-500 outline-none resize-none leading-loose shadow-inner custom-scrollbar" placeholder="Synthesizing directive logic..." />
                    </div>
                 </div>
              )}
              {activeTab === 'knowledge' && (
                <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                   <div className="flex justify-between items-end mb-8"><div><h2 className="text-3xl font-black text-white uppercase tracking-tighter">Neural Knowledge Base</h2><p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Inject proprietary data sequences into agent memory</p></div><button onClick={() => updateField('knowledgeBase', [...(formData.knowledgeBase || []), ''])} className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg"><Plus className="w-4 h-4" /> ADD SYNAPSE</button></div>
                   <div className="grid grid-cols-1 gap-6">
                      {(!formData.knowledgeBase || formData.knowledgeBase.length === 0) && <div className="py-24 text-center border-2 border-dashed border-zinc-900 rounded-[3rem] opacity-30"><Database className="w-16 h-16 mx-auto mb-4" /><p className="text-sm font-black uppercase tracking-widest">Zero Knowledge Sequences Injected</p></div>}
                      {formData.knowledgeBase?.map((kb, idx) => (
                        <div key={idx} className="bg-black/40 border border-zinc-800 rounded-[2rem] p-8 flex gap-6 items-start group hover:border-brand-500/30 transition-all shadow-xl"><div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-brand-500 shrink-0 shadow-inner border border-zinc-800"><History className="w-6 h-6" /></div><div className="flex-1"><label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2 block">Context Packet {idx + 1}</label><textarea value={kb} onChange={(e) => { const next = [...(formData.knowledgeBase || [])]; next[idx] = e.target.value; updateField('knowledgeBase', next); }} className="w-full bg-transparent text-sm text-zinc-300 outline-none resize-none h-32 custom-scrollbar leading-relaxed font-medium" placeholder="Enter technical docs, product features, or case studies..." /></div><button onClick={() => updateField('knowledgeBase', formData.knowledgeBase?.filter((_, i) => i !== idx))} className="p-3 text-zinc-800 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button></div>
                      ))}
                   </div>
                </div>
              )}
              {activeTab === 'guardrails' && (
                <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                   <div className="flex justify-between items-end mb-8"><div><h2 className="text-3xl font-black text-white uppercase tracking-tighter">Safety Protocols</h2><p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Behavioral constraint matrices</p></div><button onClick={() => updateField('guardrails', [...(formData.guardrails || []), ''])} className="px-8 py-3 bg-red-900/10 hover:bg-red-900/20 text-red-500 border border-red-900/30 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg"><Shield className="w-4 h-4" /> ADD RESTRICTION</button></div>
                   <div className="grid grid-cols-1 gap-4">
                      {formData.guardrails?.map((gr, idx) => (
                        <div key={idx} className="bg-dark-surface border border-red-900/20 rounded-2xl p-6 flex gap-6 items-center hover:border-red-500/30 transition-all shadow-lg"><div className="w-10 h-10 bg-red-900/10 rounded-xl flex items-center justify-center text-red-500 shrink-0"><Lock className="w-5 h-5" /></div><input value={gr} onChange={(e) => { const next = [...(formData.guardrails || [])]; next[idx] = e.target.value; updateField('guardrails', next); }} className="flex-1 bg-transparent text-sm text-zinc-300 outline-none font-bold placeholder-zinc-800" placeholder="e.g. Do not engage in political discussion..." /><button onClick={() => updateField('guardrails', formData.guardrails?.filter((_, i) => i !== idx))} className="p-3 text-zinc-800 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button></div>
                      ))}
                   </div>
                </div>
              )}
              {activeTab === 'tuning' && (
                <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                      <div className="space-y-10">
                         <div><h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Neural Core</h2><p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-6">Select the underlying inference engine</p><div className="space-y-3">{['Gemini 3 Flash (Latest)', 'OpenAI GPT-4o', 'Claude 3.5 Sonnet'].map(m => (<button key={m} className={`w-full p-5 rounded-2xl border text-left flex items-center justify-between group transition-all ${m.includes('Gemini') ? 'bg-brand-900/10 border-brand-500 shadow-2xl' : 'bg-black/20 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}><div className="flex items-center gap-4"><Brain className={`w-6 h-6 ${m.includes('Gemini') ? 'text-brand-500' : 'text-zinc-800'}`} /><span className={`text-sm font-black uppercase tracking-tight ${m.includes('Gemini') ? 'text-white' : ''}`}>{m}</span></div>{m.includes('Gemini') && <CheckCircle2 className="w-5 h-5 text-brand-500" />}</button>))}</div></div>
                         <div><h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Voice Profile</h2><div className="bg-black/40 border border-zinc-800 rounded-[2.5rem] p-10 flex items-center justify-between shadow-2xl relative overflow-hidden group"><div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-transparent pointer-events-none" /><div className="flex items-center gap-6 relative z-10"><div className="w-14 h-14 bg-brand-600 rounded-full flex items-center justify-center text-white animate-pulse shadow-2xl shadow-brand-500/40"><Mic className="w-7 h-7" /></div><div><div className="text-lg font-black text-white uppercase tracking-widest leading-none mb-1">Zephyr (Neutral)</div><div className="text-[10px] text-brand-500 font-black uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-500" /> High-Fidelity Synthesized</div></div></div><button className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">CHANGE</button></div></div>
                      </div>
                      <div className="space-y-10">
                         <div><h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">Model Calibration</h2><div className="bg-black/40 border border-zinc-800 rounded-[3rem] p-12 space-y-10 shadow-2xl"><div className="space-y-4"><div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span className="text-zinc-500">Temperature (Creativity)</span><span className="text-brand-500 font-mono">0.75</span></div><input type="range" min="0" max="2" step="0.05" defaultValue="0.75" className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500" /></div><div className="space-y-4"><div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span className="text-zinc-500">Top P (Coherence)</span><span className="text-brand-500 font-mono">0.92</span></div><input type="range" min="0" max="1" step="0.01" defaultValue="0.92" className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500" /></div><div className="space-y-4"><div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span className="text-zinc-500">Inference Frequency</span></div><div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-zinc-800">{['LOW', 'STD', 'MAX'].map(f => (<button key={f} className={`flex-1 py-3 rounded-lg text-[9px] font-black tracking-[0.2em] transition-all ${f === 'STD' ? 'bg-brand-500 text-black shadow-lg shadow-brand-500/20' : 'text-zinc-700 hover:text-zinc-400'}`}>{f}</button>))}</div></div></div></div>
                      </div>
                   </div>
                </div>
              )}
              {activeTab === 'test' && (
                 <div className="h-full max-w-5xl mx-auto flex flex-col bg-black/40 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                    <div className="p-8 border-b border-zinc-800 bg-dark-surface/50 flex justify-between items-center relative z-10 shadow-xl"><div className="flex items-center gap-5"><div className="w-4 h-4 rounded-full bg-green-500 animate-pulse shadow-[0_0_15px_#22c55e]"></div><div><span className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Live Simulation Grid</span><div className="flex items-center gap-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1"><span>Operative: {formData.name}</span><span>•</span><span>Context: {currentBrand?.name || 'Global'}</span></div></div></div><div className="flex items-center gap-4">{simulationMetrics.latency > 0 && (<div className="flex items-center gap-6 px-5 py-2 bg-black/40 border border-zinc-800 rounded-full animate-in fade-in"><div className="text-[9px] font-black"><span className="text-zinc-600 uppercase mr-1">Latency:</span> <span className="text-brand-400 font-mono">{simulationMetrics.latency}ms</span></div><div className="text-[9px] font-black"><span className="text-zinc-600 uppercase mr-1">Context:</span> <span className="text-brand-400 font-mono">{simulationMetrics.tokens} tkns</span></div>{simulationMetrics.fromCache && <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5"><Zap className="w-2.5 h-2.5 fill-current" /> Cache Hit</div>}</div>)}<button onClick={() => { setChatHistory([]); setSimulationMetrics({latency:0, tokens:0, fromCache:false}); }} className="p-3 hover:bg-white/5 rounded-xl text-zinc-700 hover:text-white transition-all" title="Reset Grid"><RefreshCw className="w-5 h-5" /></button></div></div>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar min-h-[500px]">
                       {chatHistory.map((msg) => (
                          <div key={msg.id} className={`flex gap-8 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-4 duration-500`}><div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl transition-all ${msg.role === 'user' ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-white hover:border-zinc-700' : 'bg-brand-600 text-white shadow-brand-500/20'}`}>{msg.role === 'user' ? <User className="w-7 h-7" /> : <Bot className="w-7 h-7" />}</div><div className={`max-w-[80%] rounded-[2.5rem] p-8 text-[15px] leading-relaxed shadow-2xl relative ${msg.role === 'user' ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tr-none' : 'bg-dark-surface border border-brand-500/20 text-zinc-200 rounded-tl-none'}`}>{msg.role === 'model' && <div className="absolute -top-2 -left-2 w-4 h-4 bg-brand-500 rounded-full border-4 border-dark-bg animate-pulse" />}{msg.text}<div className={`mt-4 text-[9px] font-black uppercase tracking-widest opacity-30 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Verified Source</div></div></div>
                       ))}
                       {isTyping && (<div className="flex gap-8 animate-in fade-in"><div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center shrink-0 animate-pulse shadow-2xl shadow-brand-500/40"><Bot className="w-7 h-7 text-white" /></div><div className="bg-dark-surface border border-brand-500/20 rounded-[2.5rem] rounded-tl-none p-8 flex items-center gap-4 shadow-xl"><span className="w-3 h-3 bg-brand-500 rounded-full animate-bounce shadow-[0_0_8px_#14b8a6]" style={{ animationDelay: '0ms' }}></span><span className="w-3 h-3 bg-brand-500 rounded-full animate-bounce shadow-[0_0_8px_#14b8a6]" style={{ animationDelay: '200ms' }}></span><span className="w-3 h-3 bg-brand-500 rounded-full animate-bounce shadow-[0_0_8px_#14b8a6]" style={{ animationDelay: '400ms' }}></span></div></div>)}
                    </div>
                    <form onSubmit={handleSendMessage} className="p-10 border-t border-zinc-800 bg-dark-surface/50 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]"><div className="relative max-w-4xl mx-auto group"><div className="absolute inset-0 bg-brand-500/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" /><input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={`Synthesize query for ${formData.name || 'Operative'}...`} className="w-full bg-black/60 border border-zinc-800 rounded-3xl py-6 pl-10 pr-24 text-white font-bold text-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-inner placeholder-zinc-800 relative z-10" /><button type="submit" disabled={!chatInput.trim() || isTyping} className="absolute right-3 top-3 bottom-3 px-8 bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white rounded-2xl shadow-2xl transition-all active:scale-90 flex items-center justify-center z-20 group/btn"><Send className="w-6 h-6 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" /></button></div><p className="text-center text-[10px] text-zinc-700 font-black uppercase tracking-widest mt-6">Anti-Spam Filter Active • Serving from Neural Cache where possible</p></form>
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default AgentForgePage;
