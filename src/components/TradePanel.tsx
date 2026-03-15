import React, { useState } from 'react';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface TradePanelProps {
  symbol: string;
  price: number;
  balance: number;
  onTrade: (side: 'long' | 'short', sizeUsd: number, leverage: number) => void;
  isTrading?: boolean;
}

export const TradePanel: React.FC<TradePanelProps> = ({ symbol, price, balance, onTrade, isTrading = false }) => {
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [sizeUsd, setSizeUsd] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(10);
  const [percentage, setPercentage] = useState<number>(0);

  const handleTrade = () => {
    if (isTrading) return;
    const numSizeUsd = parseFloat(sizeUsd);
    if (isNaN(numSizeUsd) || numSizeUsd <= 0) {
      toast.error('Please enter a valid size in USDC');
      return;
    }
    onTrade(side, numSizeUsd, leverage);
    setSizeUsd('');
    setPercentage(0);
  };

  const handleSizeChange = (val: string) => {
    setSizeUsd(val);
    const numVal = parseFloat(val);
    if (!isNaN(numVal) && balance > 0) {
      const margin = numVal / leverage;
      const pct = Math.min(100, (margin / balance) * 100);
      setPercentage(pct);
    } else {
      setPercentage(0);
    }
  };

  const handlePercentageChange = (pct: number) => {
    setPercentage(pct);
    const amount = (balance * (pct / 100) * leverage).toFixed(2);
    setSizeUsd(amount);
  };

  const handleLeverageChange = (newLev: number) => {
    const oldLev = leverage;
    setLeverage(newLev);
    
    // If there's an input value, scale it by the leverage change
    if (sizeUsd && !isNaN(parseFloat(sizeUsd))) {
      const currentSize = parseFloat(sizeUsd);
      const margin = currentSize / oldLev;
      const newSize = (margin * newLev).toFixed(2);
      setSizeUsd(newSize);
    }
  };

  const coinSize = sizeUsd && price > 0 ? (parseFloat(sizeUsd) / price) : 0;

  return (
    <div className="p-4 flex flex-col gap-5">
      {/* Side Selector */}
      <div className="flex p-1 bg-hl-bg rounded-xl border border-hl-border">
        <button
          onClick={() => setSide('long')}
          disabled={isTrading}
          className={cn(
            "flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-xs",
            side === 'long' 
              ? "bg-hl-green text-black shadow-lg shadow-hl-green/20" 
              : "text-hl-text-muted hover:text-hl-text"
          )}
        >
          <TrendingUp size={14} />
          Long
        </button>
        <button
          onClick={() => setSide('short')}
          disabled={isTrading}
          className={cn(
            "flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-xs",
            side === 'short' 
              ? "bg-hl-red text-white shadow-lg shadow-hl-red/20" 
              : "text-hl-text-muted hover:text-hl-text"
          )}
        >
          <TrendingDown size={14} />
          Short
        </button>
      </div>

      {/* Size Input */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-end">
          <label className="text-[10px] text-hl-text-muted uppercase font-bold tracking-wider">Order Size</label>
          <span className="text-[10px] text-hl-text-muted">Available: <span className="text-hl-text">{balance.toFixed(2)} USDC</span></span>
        </div>
        <div className="relative group">
          <input
            type="number"
            value={sizeUsd}
            onChange={(e) => handleSizeChange(e.target.value)}
            disabled={isTrading}
            placeholder="0.00"
            className="w-full bg-hl-bg border border-hl-border rounded-xl px-3 py-2 text-hl-text font-mono text-base focus:outline-none focus:border-hl-green focus:ring-1 focus:ring-hl-green/30 transition-all disabled:opacity-50"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-hl-text-muted font-bold text-xs">USDC</span>
          </div>
        </div>
        
        {/* Percentage Slider */}
        <div className="flex flex-col gap-1.5 px-1">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-hl-text-muted font-bold uppercase">Size %</span>
            <span className="text-[10px] font-mono text-hl-green font-bold">{percentage.toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={percentage}
            onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
            disabled={isTrading || balance <= 0}
            className="w-full accent-hl-green h-1 bg-hl-border rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-[8px] text-hl-text-muted font-mono">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {coinSize > 0 && (
          <div className="flex justify-between items-center px-1 mt-1">
            <span className="text-[10px] text-hl-text-muted uppercase">Estimated Size</span>
            <span className="text-[10px] font-mono text-hl-text">
              ≈ {coinSize.toFixed(4)} {symbol}
            </span>
          </div>
        )}
      </div>

      {/* Leverage Selector */}
      <div className="flex flex-col gap-2 p-2 bg-hl-bg/50 rounded-xl border border-hl-border/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-hl-text-muted uppercase font-bold tracking-wider">Leverage</label>
            <span className="px-1 py-0.5 rounded bg-hl-green/10 text-hl-green text-[9px] font-bold border border-hl-green/20">Cross</span>
          </div>
          <span className="text-xs font-mono font-bold text-hl-green">{leverage}x</span>
        </div>
        <div className="px-1">
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={leverage}
            onChange={(e) => handleLeverageChange(parseInt(e.target.value))}
            disabled={isTrading}
            className="w-full accent-hl-green h-1 bg-hl-border rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-[8px] text-hl-text-muted mt-1 font-mono">
            <span>1x</span>
            <span>10x</span>
            <span>25x</span>
            <span>50x</span>
          </div>
        </div>
      </div>

      {/* Trade Summary */}
      <div className="flex flex-col gap-1.5 px-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-hl-text-muted">Margin Required</span>
          <span className="text-hl-text font-mono font-bold">
            {sizeUsd ? (parseFloat(sizeUsd) / leverage).toFixed(2) : '0.00'} USDC
          </span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleTrade}
        disabled={isTrading || !sizeUsd}
        className={cn(
          "w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg",
          side === 'long' 
            ? "bg-hl-green text-black hover:bg-hl-green/90 shadow-hl-green/10" 
            : "bg-hl-red text-white hover:bg-hl-red/90 shadow-hl-red/10",
          (isTrading || !sizeUsd) && "opacity-50 cursor-not-allowed grayscale-[0.5] scale-100"
        )}
      >
        {isTrading ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            <span className="animate-pulse text-xs">Executing...</span>
          </>
        ) : (
          <>
            {side === 'long' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {side === 'long' ? `Long ${symbol}` : `Short ${symbol}`}
          </>
        )}
      </button>
    </div>
  );
};
