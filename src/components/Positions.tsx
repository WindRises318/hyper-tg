import React from 'react';
import { Position } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PositionsProps {
  positions: Position[];
  onClose: (id: string) => void;
  closingIds?: Set<string>;
}

export const Positions: React.FC<PositionsProps> = ({ positions, onClose, closingIds = new Set() }) => {
  return (
    <div className="flex flex-col gap-2">
      {positions.length === 0 ? (
        <div className="bg-hl-bg/30 border border-hl-border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-1">
          <p className="text-[10px] text-hl-text-muted">No open positions</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {positions.map((pos) => (
            <div key={pos.id} className="bg-hl-bg/50 border border-hl-border rounded-lg p-2 flex flex-col gap-2 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-1.5 h-5 rounded-full",
                    pos.side === 'long' ? "bg-hl-green" : "bg-hl-red"
                  )} />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs">{pos.symbol}-PERP</span>
                      <span className="text-[9px] bg-hl-border px-1 rounded text-hl-text-muted">{pos.leverage}x</span>
                    </div>
                    <p className={cn(
                      "text-[9px] font-bold uppercase",
                      pos.side === 'long' ? "text-hl-green" : "text-hl-red"
                    )}>
                      {pos.side} {pos.size}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-xs font-mono font-bold",
                    pos.unrealizedPnl >= 0 ? "text-hl-green" : "text-hl-red"
                  )}>
                    {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnl.toFixed(2)}
                  </p>
                  <p className="text-[9px] text-hl-text-muted">USDC PnL</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 py-1.5 border-y border-hl-border/30">
                <div className="flex justify-between">
                  <span className="text-[9px] text-hl-text-muted uppercase">Entry</span>
                  <span className="text-[9px] text-hl-text font-mono">{pos.entryPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] text-hl-text-muted uppercase">Mark</span>
                  <span className="text-[9px] text-hl-text font-mono">{pos.markPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] text-hl-text-muted uppercase">Liq. Price</span>
                  <span className="text-[9px] text-hl-red font-mono">--</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] text-hl-text-muted uppercase">Margin</span>
                  <span className="text-[9px] text-hl-text font-mono">{(pos.size * pos.entryPrice / pos.leverage).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => onClose(pos.id)}
                  disabled={closingIds.has(pos.id)}
                  className={cn(
                    "flex-1 text-[9px] py-1 rounded-md font-bold transition-all active:scale-95",
                    closingIds.has(pos.id) 
                      ? "bg-hl-border/50 text-hl-text-muted cursor-not-allowed" 
                      : "bg-hl-red/10 text-hl-red hover:bg-hl-red/20 border border-hl-red/20"
                  )}
                >
                  {closingIds.has(pos.id) ? 'Closing...' : 'Close Position'}
                </button>
                <button className="flex-1 bg-hl-bg border border-hl-border hover:border-hl-text-muted text-hl-text-muted hover:text-hl-text text-[9px] py-1 rounded-md font-bold transition-all active:scale-95">
                  TP/SL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
