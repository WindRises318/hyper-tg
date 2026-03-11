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
      <div className="flex justify-between items-center px-1">
        <h3 className="text-sm font-bold text-hl-text uppercase tracking-wider">Open Positions</h3>
        <span className="text-[10px] text-hl-text-muted">{positions.length} active</span>
      </div>
      
      {positions.length === 0 ? (
        <div className="bg-hl-surface border border-hl-border border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2">
          <p className="text-sm text-hl-text-muted">No open positions</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {positions.map((pos) => (
            <div key={pos.id} className="bg-hl-surface border border-hl-border rounded-lg p-3 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-bold px-1.5 py-0.5 rounded",
                    pos.side === 'long' ? "bg-hl-green/20 text-hl-green" : "bg-hl-red/20 text-hl-red"
                  )}>
                    {pos.side.toUpperCase()}
                  </span>
                  <span className="font-bold text-sm">{pos.symbol}</span>
                  <span className="text-xs text-hl-text-muted">{pos.leverage}x</span>
                </div>
                <div className={cn(
                  "text-sm font-mono font-bold",
                  pos.unrealizedPnl >= 0 ? "text-hl-green" : "text-hl-red"
                )}>
                  {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnl.toFixed(2)} USDC
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] uppercase text-hl-text-muted">
                <div>
                  <p>Size</p>
                  <p className="text-hl-text font-mono">{pos.size} {pos.symbol}</p>
                </div>
                <div>
                  <p>Entry Price</p>
                  <p className="text-hl-text font-mono">{pos.entryPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p>Mark Price</p>
                  <p className="text-hl-text font-mono">{pos.markPrice.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onClose(pos.id)}
                  disabled={closingIds.has(pos.id)}
                  className={cn(
                    "flex-1 text-hl-text text-xs py-1.5 rounded transition-colors",
                    closingIds.has(pos.id) 
                      ? "bg-hl-border/50 cursor-not-allowed" 
                      : "bg-hl-border hover:bg-hl-border/80"
                  )}
                >
                  {closingIds.has(pos.id) ? 'Closing...' : 'Close Position'}
                </button>
                <button className="flex-1 bg-hl-border hover:bg-hl-border/80 text-hl-text text-xs py-1.5 rounded transition-colors">
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
