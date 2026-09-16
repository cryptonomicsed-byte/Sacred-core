
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { 
  Grid, 
  Sparkles, 
  Send, 
  Globe, 
  UserPlus, 
  Video, 
  Cpu, 
  Swords, 
  Activity, 
  Bot, 
  Settings, 
  LogOut,
  X,
  ChevronRight
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  const { isNavOpen, toggleNav, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'dash', label: 'Dashboard', icon: Grid, path: '/' },
    { id: 'extract', label: 'DNA Extraction', icon: Sparkles, path: '/extract' },
    { id: 'campaigns', label: 'Campaigns', icon: Send, path: '/campaigns' },
    { id: 'builder', label: 'Site Builder', icon: Globe, path: '/builder' },
    { id: 'leads', label: 'Lead Hunter', icon: UserPlus, path: '/leads' },
    { id: 'live', label: 'Live Session', icon: Video, path: '/live' },
    { id: 'automations', label: 'Automations', icon: Cpu, path: '/automations' },
    { id: 'battle', label: 'Battle Mode', icon: Swords, path: '/battle' },
    { id: 'simulator', label: 'Simulator', icon: Activity, path: '/simulator' },
    { id: 'agents', label: 'Agent Forge', icon: Bot, path: '/agents' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleNav = (path: string) => {
    navigate(path);
    toggleNav();
  };

  return (
    <AnimatePresence>
      {isNavOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleNav}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="fixed top-0 left-0 h-full w-[280px] bg-[#050505] border-r border-white/10 z-[101] flex flex-col p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-black font-black text-xl italic">S</div>
                <span className="text-lg font-display uppercase tracking-tighter">Sacred Core</span>
              </div>
              <button 
                onClick={toggleNav}
                className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Items */}
            <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
                      isActive 
                        ? 'bg-brand-primary text-black font-bold' 
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-black' : 'group-hover:text-brand-primary transition-colors'}`} />
                      <span className="text-[11px] uppercase tracking-[0.2em]">{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-white/10 mt-6">
              <button
                onClick={logout}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all group"
              >
                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] uppercase tracking-[0.2em]">Terminate Session</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
