
import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Pause, 
  Play,
  Trash2, 
  ExternalLink, 
  Share2, 
  Users, 
  BarChart, 
  Mail, 
  CheckCircle2,
  Workflow,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Clock,
  MoreHorizontal,
  FileText,
  Linkedin,
  Twitter,
  Instagram
} from 'lucide-react';
import { getWorkflowTemplates, getActiveWorkflows, createWorkflow, toggleWorkflowStatus, deleteWorkflow } from '@infra/automation/n8nService';
import { Workflow as WorkflowType, WorkflowTemplate, CampaignAsset } from '../types';
import { useStore } from '../store';
import { BrandSelector } from '../components/BrandSelector';

const IconMap: Record<string, any> = { Share2, Users, BarChart, Mail };

const PlatformIcon = ({ platform }: { platform: string }) => {
  const p = platform.toLowerCase();
  if (p.includes('linkedin')) return <Linkedin className="w-3 h-3 text-blue-400" />;
  if (p.includes('twitter') || p.includes('x')) return <Twitter className="w-3 h-3 text-sky-400" />;
  if (p.includes('instagram')) return <Instagram className="w-3 h-3 text-pink-400" />;
  if (p.includes('email')) return <Mail className="w-3 h-3 text-orange-400" />;
  return <FileText className="w-3 h-3 text-zinc-400" />;
};

const AutomationsPage = () => {
  const { campaigns, scheduleAsset } = useStore();
  const [activeTab, setActiveTab] = useState<'workflows' | 'calendar'>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Workflow Form State
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setTemplates(getWorkflowTemplates());
    setWorkflows(getActiveWorkflows());
  }, []);

  // --- Calendar Logic ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const handlePrevMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() - 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() + 1));

  const allAssets = React.useMemo(() => campaigns.flatMap(c => c.assets), [campaigns]);
  const scheduledAssets = React.useMemo(() => allAssets.filter(a => a.metadata.status === 'approved' && a.metadata.scheduledAt), [allAssets]);
  const unscheduledAssets = React.useMemo(() => allAssets.filter(a => a.metadata.status === 'draft' || (a.metadata.status === 'approved' && !a.metadata.scheduledAt)), [allAssets]);

  const handleDragStart = (e: React.DragEvent, asset: CampaignAsset) => {
    e.dataTransfer.setData('assetId', asset.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('assetId');
    if (assetId) {
      const scheduledDate = new Date(year, currentDate.getMonth(), day, 9, 0, 0);
      scheduleAsset(assetId, scheduledDate.toISOString());
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} className="bg-dark-surface/30 border border-dark-border/50 min-h-[120px]"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = new Date(year, currentDate.getMonth(), day).toDateString();
      const assetsForDay = scheduledAssets.filter(a => a.metadata.scheduledAt && new Date(a.metadata.scheduledAt).toDateString() === dateKey);
      const isToday = new Date().toDateString() === dateKey;
      days.push(
        <div key={day} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, day)}
          className={`bg-dark-surface border border-dark-border min-h-[120px] p-2 flex flex-col gap-2 transition-colors ${isToday ? 'bg-brand-900/10 border-brand-500/30' : 'hover:bg-white/5'}`}>
          <div className="flex justify-between items-start">
             <span className={`text-sm font-bold ${isToday ? 'text-brand-500' : 'text-zinc-500'}`}>{day}</span>
             {assetsForDay.length > 0 && <span className="text-[10px] text-zinc-600">{assetsForDay.length} posts</span>}
          </div>
          <div className="space-y-1">
             {assetsForDay.map(asset => (
               <div key={asset.id} className="text-[10px] bg-black/40 border border-zinc-700 rounded p-1.5 cursor-grab active:cursor-grabbing hover:border-brand-500/50 group truncate flex items-center gap-1.5" draggable onDragStart={e => handleDragStart(e, asset)}>
                 <PlatformIcon platform={asset.metadata.channel} />
                 <span className="truncate text-zinc-300 group-hover:text-white">{asset.title}</span>
               </div>
             ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen flex flex-col">
      <div className="flex justify-between items-end mb-8 gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3 uppercase tracking-tighter">
            <Zap className="w-8 h-8 text-brand-500" /> Automations & Ops
          </h1>
          <p className="text-zinc-500 text-sm font-medium">Orchestrate workflows and distribution schedules for your brand assets.</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="bg-black/40 border border-zinc-800 rounded-xl p-1.5 flex shadow-xl">
             <button onClick={() => setActiveTab('workflows')} className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'workflows' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-300'}`}>Workflows</button>
             <button onClick={() => setActiveTab('calendar')} className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'calendar' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-300'}`}>Calendar</button>
          </div>
          <BrandSelector />
        </div>
      </div>

      {activeTab === 'workflows' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-dark-surface border border-dark-border p-4 rounded-xl shadow-xl">
              <p className="text-zinc-500 text-[10px] uppercase font-black mb-1 tracking-widest">Active Flows</p>
              <p className="text-2xl font-bold text-white">{workflows.filter(w => w.status === 'active').length}</p>
            </div>
            <div className="bg-dark-surface border border-dark-border p-4 rounded-xl shadow-xl">
              <p className="text-zinc-500 text-[10px] uppercase font-black mb-1 tracking-widest">Efficiency</p>
              <p className="text-2xl font-bold text-brand-400">99.8%</p>
            </div>
            <div className="bg-dark-surface border border-dark-border p-4 rounded-xl shadow-xl flex items-center justify-between">
               <div>
                  <p className="text-zinc-500 text-[10px] uppercase font-black mb-1 tracking-widest">Platform</p>
                  <p className="text-sm font-bold text-zinc-300">n8n Cloud</p>
               </div>
               <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-2xl transition-all hover:scale-[1.02] active:scale-95 text-xs uppercase tracking-widest">
              <Plus className="w-4 h-4" /> New Flow
            </button>
          </div>

          <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-dark-border bg-black/20 flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Deployment Matrix</h3>
              <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{workflows.length} Defined</span>
            </div>
            {workflows.length === 0 ? (
               <div className="p-20 text-center text-zinc-700 font-black uppercase tracking-widest text-xs">No active workflows deployed.</div>
            ) : (
              <div className="divide-y divide-dark-border">
                {workflows.map(wf => {
                  const template = templates.find(t => t.id === wf.templateId);
                  const Icon = template ? IconMap[template.icon] : Workflow;
                  return (
                    <div key={wf.id} className="p-6 flex items-center gap-6 hover:bg-white/5 transition-colors group">
                      <div className={`p-4 rounded-2xl transition-all ${wf.status === 'active' ? 'bg-brand-900/20 text-brand-500 shadow-inner' : 'bg-zinc-900 text-zinc-700'}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                           <h4 className="font-black text-white text-lg tracking-tight truncate uppercase">{wf.name}</h4>
                           {wf.status === 'error' && <span className="text-[9px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full border border-red-900/50 font-black uppercase tracking-widest">ERROR</span>}
                        </div>
                        <div className="flex items-center gap-6 text-[10px] text-zinc-500 mt-2 font-black uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" /> Runs: {wf.runCount}</span>
                          <span>Last: {wf.lastRun ? new Date(wf.lastRun).toLocaleString() : 'Offline'}</span>
                          <span className="bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-zinc-800">{template?.provider}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleWorkflowStatus(wf.id).then(() => setWorkflows([...getActiveWorkflows()]))} className={`p-3 rounded-xl transition-all ${wf.status === 'active' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20 shadow-inner' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>{wf.status === 'active' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</button>
                        <button onClick={() => { if(confirm('Purge workflow?')) { deleteWorkflow(wf.id); setWorkflows([...getActiveWorkflows()]); } }} className="p-3 rounded-xl text-zinc-800 hover:text-red-500 hover:bg-red-500/5 transition-all"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col gap-8 flex-1 min-h-0">
           <div className="flex justify-between items-center px-2">
              <div className="flex bg-dark-surface border border-dark-border rounded-xl p-1 shadow-xl">
                 <button onClick={handlePrevMonth} className="p-3 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-all"><ChevronLeft className="w-5 h-5" /></button>
                 <div className="px-10 py-3 font-black text-white min-w-[200px] text-center select-none uppercase tracking-widest text-sm">{monthName} {year}</div>
                 <button onClick={handleNextMonth} className="p-3 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-all"><ChevronRight className="w-5 h-5" /></button>
              </div>
              <div className="bg-black/40 px-6 py-3 rounded-xl border border-zinc-800 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-3 shadow-inner">
                <Clock className="w-4 h-4 text-brand-500" /> <span className="text-white">UTC-5 (EST)</span> • Operations Active
              </div>
           </div>

           <div className="flex-1 flex gap-8 min-h-0">
              <div className="flex-1 flex flex-col h-full bg-dark-surface border border-dark-border rounded-[2.5rem] overflow-hidden shadow-2xl">
                 <div className="grid grid-cols-7 bg-black/40 border-b border-dark-border">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (<div key={d} className="p-4 text-center text-[10px] font-black text-zinc-600 uppercase tracking-widest">{d}</div>))}
                 </div>
                 <div className="flex-1 grid grid-cols-7 overflow-y-auto custom-scrollbar">{renderCalendarDays()}</div>
              </div>

              <div className="w-80 bg-dark-surface border border-dark-border rounded-[2.5rem] flex flex-col shadow-2xl relative overflow-hidden">
                 <div className="p-6 border-b border-dark-border bg-black/20">
                    <h3 className="text-sm font-black text-white flex items-center gap-3 uppercase tracking-widest">
                      <GripVertical className="w-4 h-4 text-brand-500" /> Distribution Queue
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{unscheduledAssets.length} Units Awaiting Sync</p>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {unscheduledAssets.length === 0 ? (
                       <div className="py-20 text-center opacity-20"><CheckCircle2 className="w-12 h-12 mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Queue Clear</p></div>
                    ) : (
                       unscheduledAssets.map(asset => (
                         <div key={asset.id} draggable onDragStart={e => handleDragStart(e, asset)} className="bg-black/40 border border-zinc-800 rounded-2xl p-4 cursor-grab hover:border-brand-500/50 transition-all group active:cursor-grabbing shadow-lg">
                           <div className="flex justify-between items-start mb-3">
                             <span className="text-[9px] font-black text-zinc-500 uppercase flex items-center gap-2 tracking-widest border border-zinc-800 px-2 py-0.5 rounded-lg"><PlatformIcon platform={asset.metadata.channel} /> {asset.metadata.channel}</span>
                             <button className="text-zinc-700 hover:text-white"><MoreHorizontal className="w-4 h-4" /></button>
                           </div>
                           <p className="text-xs text-zinc-300 font-black uppercase tracking-tight line-clamp-2 mb-4 group-hover:text-white leading-tight">{asset.title}</p>
                           <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest border-t border-zinc-800/50 pt-3">
                              <span className="text-brand-500/60">Quality: {asset.metadata.qualityScore}%</span>
                              <span className="text-zinc-700">Ready</span>
                           </div>
                         </div>
                       ))
                    )}
                 </div>
                 <div className="p-4 border-t border-dark-border bg-black/20 text-[9px] font-black text-zinc-600 text-center uppercase tracking-widest">Drag to grid for scheduled injection</div>
              </div>
           </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-dark-surface border border-brand-500/20 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-dark-border flex justify-between items-center bg-black/20">
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Forge Workflow Link</h2>
               <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {!selectedTemplate ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                  {templates.map(t => {
                     const Icon = IconMap[t.icon] || Workflow;
                     return (
                       <button key={t.id} onClick={() => { setSelectedTemplate(t); setNewWorkflowName(t.name); }} className="p-6 rounded-2xl border border-zinc-800 bg-black/20 hover:border-brand-500/40 hover:bg-brand-900/5 text-left transition-all group shadow-inner">
                          <div className="flex items-center gap-4 mb-4">
                             <div className="p-3 rounded-xl bg-zinc-900 text-zinc-500 group-hover:text-brand-500 transition-colors"><Icon className="w-5 h-5" /></div>
                             <span className="font-black text-white uppercase tracking-widest text-xs">{t.name}</span>
                          </div>
                          <p className="text-xs text-zinc-500 font-medium leading-relaxed">{t.description}</p>
                       </button>
                     );
                  })}
                </div>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-right-4">
                  <div className="p-6 bg-brand-900/10 border border-brand-500/20 rounded-2xl flex items-center gap-4">
                     <CheckCircle2 className="w-6 h-6 text-brand-500" />
                     <div className="flex-1">
                        <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Active Template</span>
                        <p className="text-sm font-black text-white uppercase tracking-tighter">{selectedTemplate.name}</p>
                     </div>
                     <button onClick={() => setSelectedTemplate(null)} className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest underline">Reset</button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-600 uppercase mb-3 tracking-[0.2em] px-1">Flow Identity</label>
                    <input type="text" value={newWorkflowName} onChange={(e) => setNewWorkflowName(e.target.value)} className="w-full bg-black/60 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:ring-1 focus:ring-brand-500 outline-none transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-600 uppercase mb-3 tracking-[0.2em] px-1">Webhook Protocol (Production)</label>
                    <input type="url" value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)} placeholder="https://n8n.instance/webhook/..." className="w-full bg-black/60 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-mono text-xs focus:ring-1 focus:ring-brand-500 outline-none transition-all shadow-inner" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-8 border-t border-dark-border bg-black/20 flex justify-end gap-4">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-zinc-500 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors">Abort</button>
              {selectedTemplate && (
                <button onClick={async () => { setIsCreating(true); await createWorkflow(selectedTemplate.id, newWorkflowName, newWebhookUrl); setWorkflows([...getActiveWorkflows()]); setIsCreating(false); setIsModalOpen(false); setSelectedTemplate(null); }} disabled={!newWorkflowName || isCreating} className="px-10 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-2xl transition-all active:scale-95">
                  {isCreating ? 'Deploying Link...' : 'Establish Connection'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationsPage;
