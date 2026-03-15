import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TradePanelProps {
  symbol: string;
  price: number;
  onTrade: (side: 'long' | 'short', sizeUsd: number, leverage: number) => void;
}

export const TradePanel: React.FC<TradePanelProps> = ({ symbol, price, onTrade }) => {
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [sizeUsd, setSizeUsd] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(10);

  const handleTrade = () => {
    const numSizeUsd = parseFloat(sizeUsd);
    console.log('TradePanel handleTrade click:', { sizeUsd, numSizeUsd, side, leverage });
    if (isNaN(numSizeUsd) || numSizeUsd <= 0) {
      console.log('Invalid size, returning');
      alert('Please enter a valid size in USDC');
      return;
    }
    onTrade(side, numSizeUsd, leverage);
    setSizeUsd('');
  };

  const coinSize = sizeUsd && price > 0 ? (parseFloat(sizeUsd) / price) : 0;

  return (
    <div className="bg-hl-surface p-4 rounded-lg border border-hl-border flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          onClick={() => setSide('long')}
          className={cn(
            "flex-1 py-2 rounded font-bold transition-colors",
            side === 'long' ? "bg-hl-green text-black" : "bg-hl-border text-hl-text-muted"
          )}
        >
          Long
        </button>
        <button
          onClick={() => setSide('short')}
          className={cn(
            "flex-1 py-2 rounded font-bold transition-colors",
            side === 'short' ? "bg-hl-red text-white" : "bg-hl-border text-hl-text-muted"
          )}
        >
          Short
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-hl-text-muted uppercase">Position Size (USDC)</label>
        <div className="relative">
          <input
            type="number"
            value={sizeUsd}
            onChange={(e) => setSizeUsd(e.target.value)}
            placeholder="0.00"
            className="w-full bg-hl-bg border border-hl-border rounded px-3 py-2 text-hl-text focus:outline-none focus:border-hl-green"
          />
          <span className="absolute right-3 top-2 text-hl-text-muted text-sm">USDC</span>
        </div>
        {coinSize > 0 && (
          <div className="text-right text-[10px] text-hl-text-muted mt-1">
            ≈ {coinSize.toFixed(4)} {symbol}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <label className="text-xs text-hl-text-muted uppercase">Leverage</label>
          <span className="text-xs font-mono text-hl-green">{leverage}x</span>
        </div>
        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={leverage}
          onChange={(e) => setLeverage(parseInt(e.target.value))}
          className="w-full accent-hl-green h-1.5 bg-hl-border rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-hl-text-muted">
          <span>1x</span>
          <span>10x</span>
          <span>25x</span>
          <span>50x</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <div className="flex justify-between text-xs">
          <span className="text-hl-text-muted">Margin Required</span>
          <span className="text-hl-text font-mono">
            {sizeUsd ? (parseFloat(sizeUsd) / leverage).toFixed(2) : '0.00'} USDC
          </span>
        </div>
        <button
          id="main-trade-button"
          onClick={() => {
            console.log('Buy/Sell button clicked');
            handleTrade();
          }}
          className={cn(
            "w-full py-3 rounded-lg font-bold text-lg transition-transform active:scale-95",
            side === 'long' ? "bg-hl-green text-black" : "bg-hl-red text-white"
          )}
        >
          {side === 'long' ? 'Buy / Long' : 'Sell / Short'}
        </button>
      </div>
    </div>
  );
};
