import React from 'react';
import { UserProfile, Market } from '../types';
import { Wallet, ChevronDown, Bell, Menu } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HeaderProps {
  profile: UserProfile;
  market: Market;
  availableCoins: string[];
  onCoinChange: (coin: string) => void;
  network: 'mainnet' | 'testnet';
  onNetworkChange: (network: 'mainnet' | 'testnet') => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  profile, 
  market, 
  availableCoins, 
  onCoinChange,
  network,
  onNetworkChange
}) => {
  const [isSelectorOpen, setIsSelectorOpen] = React.useState(false);

  return (
    <header className="bg-hl-bg border-b border-hl-border px-4 py-3 flex flex-col gap-3 relative">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
            "bg-hl-green"
          )}>
            <span className="text-black font-bold text-xs">HL</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-hl-text-muted font-medium">Hyperliquid</span>
            <span className="text-sm font-bold text-hl-text">TMA Edition</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-hl-surface rounded p-0.5 border border-hl-border">
            <button 
              onClick={() => onNetworkChange('mainnet')}
              className={cn(
                "px-1.5 py-0.5 rounded-[2px] text-[8px] font-bold uppercase transition-all",
                network === 'mainnet' ? "bg-hl-green text-black" : "text-hl-text-muted"
              )}
            >
              Main
            </button>
            <button 
              onClick={() => onNetworkChange('testnet')}
              className={cn(
                "px-1.5 py-0.5 rounded-[2px] text-[8px] font-bold uppercase transition-all",
                network === 'testnet' ? "bg-hl-green text-black" : "text-hl-text-muted"
              )}
            >
              Test
            </button>
          </div>
          <button className="text-hl-text-muted hover:text-hl-text p-1">
            <Bell size={18} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
        <div 
          className="flex items-center gap-2 min-w-fit cursor-pointer hover:bg-hl-surface p-1 rounded transition-colors"
          onClick={() => setIsSelectorOpen(!isSelectorOpen)}
        >
          <span className="text-sm font-bold">{market.symbol}-PERP</span>
          <ChevronDown size={14} className={cn("text-hl-text-muted transition-transform", isSelectorOpen && "rotate-180")} />
        </div>

        {isSelectorOpen && (
          <div className="absolute top-full left-0 w-full bg-hl-bg border-b border-hl-border z-50 max-h-60 overflow-y-auto shadow-xl p-2 grid grid-cols-3 gap-2">
            {availableCoins.map(coin => (
              <button
                key={coin}
                onClick={() => {
                  onCoinChange(coin);
                  setIsSelectorOpen(false);
                }}
                className={cn(
                  "px-3 py-2 rounded text-xs font-bold transition-colors",
                  market.symbol === coin ? "bg-hl-green text-black" : "bg-hl-surface text-hl-text hover:bg-hl-border"
                )}
              >
                {coin}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col min-w-fit">
          <span className={market.change24h >= 0 ? "text-hl-green text-sm font-mono" : "text-hl-red text-sm font-mono"}>
            {market.price.toFixed(2)}
          </span>
          <span className={market.change24h >= 0 ? "text-hl-green text-[10px]" : "text-hl-red text-[10px]"}>
            {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
          </span>
        </div>
        <div className="flex flex-col min-w-fit">
          <span className="text-hl-text-muted text-[10px] uppercase">24h High</span>
          <span className="text-hl-text text-[10px] font-mono">{market.high24h.toFixed(2)}</span>
        </div>
        <div className="flex flex-col min-w-fit">
          <span className="text-hl-text-muted text-[10px] uppercase">24h Low</span>
          <span className="text-hl-text text-[10px] font-mono">{market.low24h.toFixed(2)}</span>
        </div>
      </div>
    </header>
  );
};
