import { Market, UserProfile } from '../types';

export const INITIAL_MARKET: Market = {
  symbol: 'BTC',
  price: 65000,
  change24h: 2.45,
  high24h: 66200,
  low24h: 64100,
  volume24h: 1250000000,
};

export const INITIAL_PROFILE: UserProfile = {
  id: '1',
  username: 'TraderX',
  balance: 10000,
  equity: 10000,
};

export const generateInitialChartData = () => {
  const data = [];
  let currentPrice = 65000;
  const now = Math.floor(Date.now() / 1000);
  for (let i = 100; i >= 0; i--) {
    const time = now - i * 60;
    const open = currentPrice;
    const close = currentPrice + (Math.random() - 0.5) * 100;
    const high = Math.max(open, close) + Math.random() * 50;
    const low = Math.min(open, close) - Math.random() * 50;
    data.push({ time, open, high, low, close });
    currentPrice = close;
  }
  return data;
};
