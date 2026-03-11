export interface Position {
  id: string;
  user_id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  unrealizedPnl: number;
  margin: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  price: number;
  size: number;
  timestamp: number;
}

export interface Market {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export interface OrderBookLevel {
  px: string;
  sz: string;
  n: number;
}

export interface OrderBook {
  coin: string;
  levels: [OrderBookLevel[], OrderBookLevel[]]; // [bids, asks]
  time: number;
}

export interface UserProfile {
  id: string;
  username: string;
  balance: number;
  equity: number;
}

export interface TradeHistory {
  id: string;
  user_id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entry_price: number;
  exit_price: number;
  pnl: number;
  closed_at: string;
}
