"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Chart } from './components/Chart';
import { TradePanel } from './components/TradePanel';
import { Positions } from './components/Positions';
import { BottomNav } from './components/BottomNav';
import { Market, Position, UserProfile, OrderBook, TradeHistory } from './types';
import { INITIAL_MARKET, INITIAL_PROFILE } from './lib/mockData';
import { hyperliquidService, Candle } from './services/hyperliquidService';
import { dbService } from './services/dbService';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, History, User, Activity, Loader2, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// App component
export default function App() {
  const [activeTab, setActiveTab] = useState<'trade' | 'portfolio' | 'history' | 'profile'>('trade');
  const [market, setMarket] = useState<Market>(INITIAL_MARKET);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<TradeHistory[]>([]);
  const [chartData, setChartData] = useState<Candle[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableCoins, setAvailableCoins] = useState<string[]>([]);
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [selectedInterval, setSelectedInterval] = useState('15m');
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('testnet');
  const [hlAccount, setHlAccount] = useState<string | null>(null);
  const [closingPositionIds, setClosingPositionIds] = useState<Set<string>>(new Set());
  const [allPrices, setAllPrices] = useState<Record<string, number>>({});

  const userId = '00000000-0000-0000-0000-000000000000';

  const [refreshKey, setRefreshKey] = useState(0);

  // Initial data fetch
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setIsLoading(true);
      setError(null);
      setOrderBook(null);
      setChartData([]);
      
      try {
        hyperliquidService.setNetwork(network);
        const [meta, assetCtxs] = await hyperliquidService.getInfo('metaAndAssetCtxs');
        if (!isMounted) return;

        const coins = meta.universe.map((u: any) => u.name);
        setAvailableCoins(coins);

        const initialPrices: Record<string, number> = {};
        assetCtxs.forEach((ctx: any, index: number) => {
          const coinName = meta.universe[index].name;
          initialPrices[coinName] = parseFloat(ctx.midPx);
        });
        setAllPrices(initialPrices);
        
        const candles = await hyperliquidService.fetchCandles(selectedCoin, selectedInterval);
        if (!isMounted) return;
        setChartData(candles);
        
        const marketState = await hyperliquidService.getMarketState(selectedCoin);
        if (!isMounted) return;
        
        if (marketState) {
          setMarket(prev => ({ 
            ...prev, 
            symbol: selectedCoin, 
            price: marketState.price,
            change24h: marketState.change24h,
            high24h: marketState.high24h,
            low24h: marketState.low24h
          }));
        } else if (candles.length > 0) {
          const lastPrice = candles[candles.length - 1].close;
          setMarket(prev => ({ ...prev, symbol: selectedCoin, price: lastPrice }));
        }

        // Check HL Account
        const address = hyperliquidService.getAddress();
        console.log("Hyperliquid Address used for balance:", address);
        if (address) {
          setHlAccount(address);
          // Fetch both perps and spot state
          const [hlState, spotState, fills] = await Promise.all([
            hyperliquidService.getAccountState(address),
            hyperliquidService.getSpotState(address),
            hyperliquidService.getUserFills(address)
          ]);
          
          console.log("Hyperliquid Account State:", hlState);
          console.log("Hyperliquid Spot State:", spotState);
          console.log("Hyperliquid Fills:", fills);
          
          if (!isMounted) return;
          
          let hlBalance = 0;
          
          if (hlState) {
            hlBalance = parseFloat(
              hlState.crossMarginSummary?.accountValue || 
              hlState.marginSummary?.accountValue || 
              hlState.withdrawable || 
              '0'
            );
          }
          
          // If perps balance is 0, check spot balance for USDC
          if (hlBalance === 0 && spotState && spotState.balances) {
            const usdcBalance = spotState.balances.find((b: any) => b.coin === 'USDC');
            if (usdcBalance) {
              hlBalance = parseFloat(usdcBalance.total || '0');
            }
          }
          
          setProfile({
            id: address,
            username: `HL-${address.slice(0, 6)}`,
            balance: hlBalance,
            equity: hlBalance // Simplified
          });

          if (hlState && hlState.assetPositions) {
            const hlPositions: Position[] = hlState.assetPositions.map((p: any) => {
              const pos = p.position;
              return {
                id: `hl-${pos.coin}-${Date.now()}`,
                user_id: address,
                symbol: pos.coin,
                side: parseFloat(pos.szi) > 0 ? 'long' : 'short',
                size: Math.abs(parseFloat(pos.szi)),
                entryPrice: parseFloat(pos.entryPx),
                markPrice: market.price,
                leverage: parseInt(pos.leverage.value),
                unrealizedPnl: parseFloat(pos.unrealizedPnl),
                margin: parseFloat(pos.marginUsed)
              } as Position;
            });
            setPositions(hlPositions);
          }

          if (Array.isArray(fills)) {
            const historyData: TradeHistory[] = fills.map((fill: any) => ({
              id: fill.tid?.toString() || fill.hash || Math.random().toString(),
              user_id: address,
              symbol: fill.coin,
              side: fill.side === 'B' ? 'long' : 'short',
              dir: fill.dir || (fill.side === 'B' ? 'Buy' : 'Sell'),
              size: parseFloat(fill.sz),
              price: parseFloat(fill.px),
              fee: parseFloat(fill.fee),
              pnl: parseFloat(fill.closedPnl),
              timestamp: fill.time
            }));
            // Sort by time descending
            historyData.sort((a, b) => b.timestamp - a.timestamp);
            setHistory(historyData);
          }
        } else {
          setProfile({
            id: '0x0000000000000000000000000000000000000000',
            username: 'No Account',
            balance: 0,
            equity: 0
          });
          setPositions([]);
          setHistory([]);
        }

        setIsLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to fetch initial data:', err);
        setError(err.message || 'Failed to connect to Hyperliquid. Please check your network.');
        setIsLoading(false);
      }
    };
    init();
    
    return () => {
      isMounted = false;
    };
  }, [selectedCoin, selectedInterval, network, refreshKey]);

  // WebSocket subscriptions
  useEffect(() => {
    const cleanupL2 = hyperliquidService.subscribeToL2Book(selectedCoin, (data) => {
      setOrderBook(data);
      if (data.levels && data.levels[0].length > 0 && data.levels[1].length > 0) {
        const bid = parseFloat(data.levels[0][0].px);
        const ask = parseFloat(data.levels[1][0].px);
        const midPrice = (bid + ask) / 2;
        
        setMarket(prev => ({ ...prev, price: midPrice }));

        // Update chart data with real-time price
        setChartData(prevData => {
          if (prevData.length === 0) return prevData;
          const last = prevData[prevData.length - 1];
          const now = Math.floor(Date.now() / 1000);
          
          if (now - last.time < 60) {
            const newData = [...prevData];
            const current = { ...last };
            current.close = midPrice;
            current.high = Math.max(current.high, midPrice);
            current.low = Math.min(current.low, midPrice);
            newData[newData.length - 1] = current;
            return newData;
          } else {
            return [...prevData.slice(1), {
              time: now,
              open: last.close,
              high: Math.max(last.close, midPrice),
              low: Math.min(last.close, midPrice),
              close: midPrice,
              volume: 0
            }];
          }
        });
      }
    });

    const cleanupMids = hyperliquidService.subscribeToAllMids((mids) => {
      const newPrices: Record<string, number> = {};
      Object.entries(mids).forEach(([coin, px]) => {
        newPrices[coin] = parseFloat(px);
      });
      setAllPrices(prev => ({ ...prev, ...newPrices }));
    });

    return () => {
      cleanupL2();
      cleanupMids();
    };
  }, [selectedCoin, network]);

  // Update positions PnL when prices change
  useEffect(() => {
    setPositions(prev => prev.map(pos => {
      const currentPrice = allPrices[pos.symbol] || (pos.symbol === market.symbol ? market.price : pos.markPrice);
      const pnl = pos.side === 'long' 
        ? (currentPrice - pos.entryPrice) * pos.size 
        : (pos.entryPrice - currentPrice) * pos.size;
      return { ...pos, markPrice: currentPrice, unrealizedPnl: pnl };
    }));
  }, [allPrices, market.price, market.symbol]);

  // Calculate dynamic equity
  const totalUnrealizedPnl = positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);
  const currentEquity = profile.balance; // Hyperliquid accountValue already includes PnL

  const handleTrade = async (side: 'long' | 'short', sizeUsd: number, leverage: number) => {
    console.log('handleTrade called:', { side, sizeUsd, leverage, marketPrice: market.price, balance: profile.balance });
    
    if (!hlAccount) {
      alert('Please configure your Hyperliquid private key in .env.local to trade.');
      return;
    }

    try {
      const meta = await hyperliquidService.fetchMeta();
      const assetIndex = meta.universe.findIndex((u: any) => u.name === selectedCoin);
      
      if (assetIndex === -1) throw new Error('Asset not found on Hyperliquid');

      const assetMeta = meta.universe[assetIndex];
      const szDecimals = assetMeta.szDecimals;

      // Calculate coin size based on USDC size and current price
      const rawCoinSize = sizeUsd / market.price;
      // Round to the correct number of decimals
      const coinSize = parseFloat(rawCoinSize.toFixed(szDecimals));

      if (coinSize <= 0) {
        alert(`Size too small. Minimum size is ${Math.pow(10, -szDecimals)} ${selectedCoin}`);
        return;
      }

      const order = {
        coin: selectedCoin,
        is_buy: side === 'long',
        limit_px: Number(market.price.toPrecision(5)).toString(), // Market order via limit price for simplicity or use market order type
        sz: coinSize,
        reduce_only: false,
        order_type: { limit: { tif: 'Gtc' as const } }
      };

      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order, userId: profile.id }),
      });

      const data = await response.json();
      console.log('API Trade Result:', data);
      
      if (data.success) {
        alert(`Order placed successfully! Trade ID: ${data.tradeId}`);
        setRefreshKey(prev => prev + 1);
      } else {
        throw new Error(data.error || 'Trade failed');
      }
    } catch (err: any) {
      console.error('HL Trade failed:', err);
      alert(`Trade failed: ${err.message}`);
    }
  };

  const handleClosePosition = async (id: string) => {
    if (closingPositionIds.has(id)) return;
    
    const pos = positions.find(p => p.id === id);
    if (!pos) return;

    if (!hlAccount) {
      alert('Please configure your Hyperliquid private key in .env.local to close positions.');
      return;
    }

    try {
      setClosingPositionIds(prev => new Set(prev).add(id));
      const meta = await hyperliquidService.fetchMeta();
      const assetIndex = meta.universe.findIndex((u: any) => u.name === pos.symbol);
      
      const order = {
        coin: pos.symbol,
        is_buy: pos.side === 'short', // Close short by buying
        limit_px: Number(market.price.toPrecision(5)).toString(),
        sz: pos.size,
        reduce_only: true,
        order_type: { limit: { tif: 'Gtc' as const } }
      };

      const result = await hyperliquidService.placeOrder(order);
      if (result.status === 'ok') {
        alert('Position closed on Hyperliquid!');
        setRefreshKey(prev => prev + 1);
      } else {
        throw new Error(JSON.stringify(result));
      }
    } catch (err: any) {
      console.error('HL Close failed:', err);
      alert(`Failed to close HL position: ${err.message}`);
    } finally {
      setClosingPositionIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-hl-bg text-hl-text max-w-md mx-auto shadow-2xl">
      <Header 
        profile={{ ...profile, equity: currentEquity }} 
        market={market} 
        availableCoins={availableCoins} 
        onCoinChange={(coin) => {
          setIsLoading(true);
          setSelectedCoin(coin);
        }}
        hasHlAccount={!!hlAccount}
        network={network}
        onNetworkChange={(newNetwork) => {
          setNetwork(newNetwork);
          hyperliquidService.setNetwork(newNetwork);
        }}
      />

      <main className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <Loader2 className="animate-spin text-hl-green" size={48} />
              <p className="text-hl-text-muted">Connecting to Hyperliquid...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20 px-6 text-center">
              <div className="w-16 h-16 bg-hl-red/10 rounded-full flex items-center justify-center text-hl-red">
                <Activity size={32} />
              </div>
              <h3 className="text-lg font-bold">Connection Failed</h3>
              <div className="bg-hl-surface p-3 rounded border border-hl-border max-w-xs w-full overflow-hidden">
                <p className="text-xs font-mono text-hl-red break-words">{error}</p>
              </div>
              <p className="text-sm text-hl-text-muted">Please check your internet connection or Supabase configuration.</p>
              <button 
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="bg-hl-green text-black px-6 py-2 rounded-full font-bold text-sm mt-2"
              >
                Retry Connection
              </button>
            </div>
          ) : activeTab === 'trade' && (
            <motion.div
              key="trade"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-4 p-4"
            >
              <div className="bg-hl-surface rounded-lg border border-hl-border overflow-hidden">
                <div className="flex gap-2 p-2 border-b border-hl-border overflow-x-auto no-scrollbar">
                  {['1m', '5m', '15m', '1h', '4h', '1d'].map(interval => (
                    <button
                      key={interval}
                      onClick={() => setSelectedInterval(interval)}
                      className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold transition-colors",
                        selectedInterval === interval ? "bg-hl-green text-black" : "text-hl-text-muted hover:text-hl-text"
                      )}
                    >
                      {interval}
                    </button>
                  ))}
                </div>
                <Chart data={chartData} symbol={market.symbol} />
              </div>
              <TradePanel 
                symbol={market.symbol} 
                price={market.price} 
                onTrade={(side, size, leverage) => {
                  console.log('App onTrade prop called with:', { side, size, leverage });
                  handleTrade(side, size, leverage);
                }} 
              />
              <div className="bg-hl-surface p-4 rounded-lg border border-hl-border">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-hl-text-muted uppercase tracking-wider">Order Book</h3>
                  <div className="flex gap-2">
                    <span className="text-[10px] text-hl-green bg-hl-green/10 px-1 rounded">0.01</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 font-mono text-xs">
                  {orderBook?.levels?.[1]?.slice(0, 5).reverse().map((level, i) => (
                    <div key={`ask-${i}`} className="flex justify-between relative">
                      <div 
                        className="absolute inset-0 bg-hl-red/5" 
                        style={{ 
                          width: `${Math.min(100, (parseFloat(level.sz) / 10) * 100)}%`, 
                          right: 0, 
                          left: 'auto' 
                        }} 
                      />
                      <span className="text-hl-red z-10">{parseFloat(level.px).toFixed(2)}</span>
                      <span className="text-hl-text z-10">{parseFloat(level.sz).toFixed(3)}</span>
                    </div>
                  ))}
                  <div className="py-2 text-center font-bold text-sm border-y border-hl-border my-1">
                    {market.price.toFixed(2)}
                  </div>
                  {orderBook?.levels?.[0]?.slice(0, 5).map((level, i) => (
                    <div key={`bid-${i}`} className="flex justify-between relative">
                      <div 
                        className="absolute inset-0 bg-hl-green/5" 
                        style={{ 
                          width: `${Math.min(100, (parseFloat(level.sz) / 10) * 100)}%` 
                        }} 
                      />
                      <span className="text-hl-green z-10">{parseFloat(level.px).toFixed(2)}</span>
                      <span className="text-hl-text z-10">{parseFloat(level.sz).toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'portfolio' && (
            <motion.div
              key="portfolio"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="p-4 flex flex-col gap-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-hl-surface p-4 rounded-xl border border-hl-border">
                  <p className="text-[10px] text-hl-text-muted uppercase mb-1">Total Equity</p>
                  <p className="text-xl font-bold font-mono">{profile.balance.toFixed(2)}</p>
                </div>
                <div className="bg-hl-surface p-4 rounded-xl border border-hl-border">
                  <p className="text-[10px] text-hl-text-muted uppercase mb-1">Unrealized PnL</p>
                  <p className={cn(
                    "text-xl font-bold font-mono",
                    positions.reduce((acc, p) => acc + p.unrealizedPnl, 0) >= 0 ? "text-hl-green" : "text-hl-red"
                  )}>
                    {positions.reduce((acc, p) => acc + p.unrealizedPnl, 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <Positions 
                positions={positions} 
                onClose={handleClosePosition}
                closingIds={closingPositionIds}
              />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 flex flex-col gap-4"
            >
              {history.length === 0 ? (
                <div className="bg-hl-surface rounded-xl border border-hl-border p-8 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-16 h-16 bg-hl-border rounded-full flex items-center justify-center">
                    <History size={32} className="text-hl-text-muted" />
                  </div>
                  <div>
                    <h3 className="font-bold text-hl-text">No Trade History</h3>
                    <p className="text-sm text-hl-text-muted">Your past trades will appear here.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('trade')}
                    className="bg-hl-green text-black px-6 py-2 rounded-full font-bold text-sm"
                  >
                    Start Trading
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-hl-text-muted uppercase tracking-wider px-1">Recent Trades</h3>
                  {history.map((item) => (
                    <div key={item.id} className="bg-hl-surface p-4 rounded-xl border border-hl-border flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            item.side === 'long' ? "bg-hl-green/10 text-hl-green" : "bg-hl-red/10 text-hl-red"
                          )}>
                            {item.side === 'long' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{item.symbol}-PERP</p>
                            <p className="text-[10px] text-hl-text-muted uppercase">{item.dir} {item.size} {item.symbol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-sm font-bold font-mono",
                            item.pnl > 0 ? "text-hl-green" : item.pnl < 0 ? "text-hl-red" : "text-hl-text"
                          )}>
                            {item.pnl > 0 ? '+' : ''}{item.pnl.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-hl-text-muted">{new Date(item.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-hl-border/50">
                        <div>
                          <p className="text-[10px] text-hl-text-muted uppercase">Price</p>
                          <p className="text-xs font-mono">{item.price.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-hl-text-muted uppercase">Fee</p>
                          <p className="text-xs font-mono">{item.fee.toFixed(4)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 flex flex-col gap-6"
            >
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-24 h-24 bg-hl-green rounded-full flex items-center justify-center border-4 border-hl-surface shadow-xl">
                  <User size={48} className="text-black" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold">{profile.username}</h2>
                  <p className="text-sm text-hl-text-muted">Verified Trader</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="bg-hl-surface p-4 rounded-xl border border-hl-border flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-hl-green/10 rounded-lg flex items-center justify-center text-hl-green">
                      <Wallet size={20} />
                    </div>
                    <span className="font-bold">Total Balance</span>
                  </div>
                  <span className="font-mono font-bold text-hl-text">{profile.balance.toFixed(2)} USDC</span>
                </div>
                
                <div className="bg-hl-surface p-4 rounded-xl border border-hl-border flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-hl-green/10 rounded-lg flex items-center justify-center text-hl-green">
                      <Activity size={20} />
                    </div>
                    <span className="font-bold">Total Equity</span>
                  </div>
                  <span className="font-mono font-bold text-hl-text">{currentEquity.toFixed(2)} USDC</span>
                </div>

                <div className="bg-hl-surface p-4 rounded-xl border border-hl-border flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-hl-green/10 rounded-lg flex items-center justify-center text-hl-green">
                      <TrendingUp size={20} />
                    </div>
                    <span className="font-bold">Account Status</span>
                  </div>
                  <span className="text-hl-green font-bold">Active</span>
                </div>
              </div>

              <div className="mt-4">
                <button className="w-full bg-hl-surface border border-hl-border text-hl-red font-bold py-3 rounded-xl hover:bg-hl-red/10 transition-colors">
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
