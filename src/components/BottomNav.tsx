import React from 'react';
import { TrendingUp, History, User, Activity } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BottomNavProps {
  activeTab: 'trade' | 'portfolio' | 'history' | 'profile';
  onTabChange: (tab: 'trade' | 'portfolio' | 'history' | 'profile') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-hl-surface border-t border-hl-border flex justify-around items-center py-1.5 px-4 z-50">
      <button
        onClick={() => onTabChange('trade')}
        className={cn(
          "flex flex-col items-center gap-0.5 transition-colors",
          activeTab === 'trade' ? "text-hl-green" : "text-hl-text-muted"
        )}
      >
        <TrendingUp size={18} />
        <span className="text-[9px] font-bold uppercase">Trade</span>
      </button>
      <button
        onClick={() => onTabChange('portfolio')}
        className={cn(
          "flex flex-col items-center gap-0.5 transition-colors",
          activeTab === 'portfolio' ? "text-hl-green" : "text-hl-text-muted"
        )}
      >
        <Activity size={18} />
        <span className="text-[9px] font-bold uppercase">Portfolio</span>
      </button>
      <button
        onClick={() => onTabChange('history')}
        className={cn(
          "flex flex-col items-center gap-0.5 transition-colors",
          activeTab === 'history' ? "text-hl-green" : "text-hl-text-muted"
        )}
      >
        <History size={18} />
        <span className="text-[9px] font-bold uppercase">History</span>
      </button>
      <button
        onClick={() => onTabChange('profile')}
        className={cn(
          "flex flex-col items-center gap-0.5 transition-colors",
          activeTab === 'profile' ? "text-hl-green" : "text-hl-text-muted"
        )}
      >
        <User size={18} />
        <span className="text-[9px] font-bold uppercase">Profile</span>
      </button>
    </nav>
  );
};
