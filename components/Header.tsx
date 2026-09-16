
import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { Menu, ChevronLeft, CreditCard, User, Bell } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const { toggleNav, credits, isAuthenticated } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === '/';
  const isPublic = location.pathname === '/landing' || location.pathname === '/login' || location.pathname.startsWith('/share');

  if (isPublic || !isAuthenticated) return null;

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 z-[90] px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleNav}
          className="p-3 rounded-xl bg-white/5 border border-white/10 text-white hover:border-brand-primary transition-all group"
        >
          <Menu className="w-5 h-5 group-hover:text-brand-primary transition-colors" />
        </button>

        {!isDashboard && (
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Back</span>
          </button>
        )}

        <div className="hidden md:flex flex-col ml-4">
          <h2 className="text-xs font-display uppercase tracking-tighter text-white/40">Sacred Core <span className="text-white/10">/</span></h2>
          <h1 className="text-sm font-display uppercase tracking-widest text-white">
            {location.pathname === '/' ? 'Neural Dashboard' : location.pathname.substring(1).replace('/', ' / ')}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20">
          <CreditCard className="w-3.5 h-3.5 text-brand-primary" />
          <span className="text-[10px] font-mono font-bold text-brand-primary uppercase tracking-widest">
            {credits} Credits
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2.5 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-primary rounded-full" />
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent p-[1px]"
          >
            <div className="w-full h-full rounded-full bg-[#050505] flex items-center justify-center overflow-hidden">
              <User className="w-5 h-5 text-white/60" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
