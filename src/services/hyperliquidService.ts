import { privateKeyToAccount } from 'viem/accounts';
import { Hex } from 'viem';
import { signL1Action, orderToWire, orderWireToAction } from './hyperliquidUtils';

export type HLNetwork = 'mainnet' | 'testnet';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HLMarket {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  price: number;
  assetIndex: number;
  change24h: number;
  high24h: number;
  low24h: number;
}

export class HyperliquidService {
  private network: HLNetwork = 'testnet';
  private privateKey: string | undefined;
  private ws: WebSocket | null = null;
  private wsCallbacks: Map<string, Set<(data: any) => void>> = new Map();
  private assetCtxsCache: any = null;
  private metaCache: any = null;

  constructor(privateKey?: string) {
    console.log("HyperliquidService init:", { 
      hasPrivateKey: !!privateKey
    });
    this.privateKey = privateKey ? (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) : undefined;
    this.connectWs();
  }

  setNetwork(network: HLNetwork) {
    if (this.network !== network) {
      this.network = network;
      this.metaCache = null;
      this.assetCtxsCache = null;
      this.connectWs();
    }
  }

  private getApiUrl() {
    return this.network === 'mainnet' ? 'https://api.hyperliquid.xyz' : 'https://api.hyperliquid-testnet.xyz';
  }

  private getWsUrl() {
    return this.network === 'mainnet' ? 'wss://api.hyperliquid.xyz/ws' : 'wss://api.hyperliquid-testnet.xyz/ws';
  }

  private connectWs() {
    if (typeof window === 'undefined') return; // Don't connect WS on server
    if (this.ws) {
      this.ws.close();
    }
    this.ws = new WebSocket(this.getWsUrl());
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.channel) {
          const callbacks = this.wsCallbacks.get(data.channel);
          if (callbacks) {
            callbacks.forEach(cb => cb(data.data));
          }
        }
      } catch (e) {
        console.error('WS message parse error', e);
      }
    };
    this.ws.onopen = () => {
      // Resubscribe
      for (const channel of this.wsCallbacks.keys()) {
        if (channel === 'l2Book') {
          // We need to know which coins to resubscribe to, but for simplicity we'll just let the components handle it
        } else if (channel === 'allMids') {
          this.ws?.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'allMids' } }));
        }
      }
    };
  }

  async fetchApi(endpoint: string, payload: any) {
    const res = await fetch(`${this.getApiUrl()}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Hyperliquid API error: ${res.statusText}`);
    }
    return res.json();
  }

  async getInfo(type: string, payload: any = {}) {
    return this.fetchApi('/info', { type, ...payload });
  }

  async fetchMeta() {
    if (!this.metaCache) {
      this.metaCache = await this.getInfo('meta');
    }
    return this.metaCache;
  }

  async getUserFills(user: string) {
    return this.getInfo('userFills', { user });
  }

  async getInfoCompat(type: string, payload: any = {}) {
    return this.getInfo(type, payload);
  }

  async getInfoProxy(type: string, payload: any = {}) {
    return this.getInfo(type, payload);
  }

  async fetchCandles(coin: string, interval: string = '15m'): Promise<Candle[]> {
    const endTime = Date.now();
    let lookback = 24 * 60 * 60 * 1000;
    if (interval === '1m') lookback = 2 * 60 * 60 * 1000;
    if (interval === '5m') lookback = 8 * 60 * 60 * 1000;
    if (interval === '1h') lookback = 4 * 24 * 60 * 60 * 1000;
    if (interval === '4h') lookback = 14 * 24 * 60 * 60 * 1000;
    if (interval === '1d') lookback = 60 * 24 * 60 * 60 * 1000;

    const startTime = endTime - lookback;
    const data = await this.getInfo('candleSnapshot', {
      req: { coin, interval, startTime, endTime }
    });
    
    if (!Array.isArray(data)) return [];

    return data.map((c: any) => ({
      time: c.t / 1000,
      open: parseFloat(c.o),
      high: parseFloat(c.h),
      low: parseFloat(c.l),
      close: parseFloat(c.c),
      volume: parseFloat(c.v)
    }));
  }

  subscribeToL2Book(coin: string, callback: (data: any) => void) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // If not open, wait a bit and try again
      setTimeout(() => this.subscribeToL2Book(coin, callback), 1000);
      return () => {};
    }

    const channel = 'l2Book';
    if (!this.wsCallbacks.has(channel)) {
      this.wsCallbacks.set(channel, new Set());
    }
    
    const wrappedCallback = (data: any) => {
      if (data.coin === coin) {
        callback(data);
      }
    };
    
    this.wsCallbacks.get(channel)!.add(wrappedCallback);
    this.ws.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'l2Book', coin } }));

    return () => {
      const callbacks = this.wsCallbacks.get(channel);
      if (callbacks) {
        callbacks.delete(wrappedCallback);
        if (callbacks.size === 0) {
          this.ws?.send(JSON.stringify({ method: 'unsubscribe', subscription: { type: 'l2Book', coin } }));
        }
      }
    };
  }

  subscribeToAllMids(callback: (mids: Record<string, string>) => void) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      setTimeout(() => this.subscribeToAllMids(callback), 1000);
      return () => {};
    }

    const channel = 'allMids';
    if (!this.wsCallbacks.has(channel)) {
      this.wsCallbacks.set(channel, new Set());
      this.ws.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'allMids' } }));
    }
    
    const wrappedCallback = (data: any) => {
      if (data && data.mids) {
        callback(data.mids);
      }
    };
    
    this.wsCallbacks.get(channel)!.add(wrappedCallback);

    return () => {
      const callbacks = this.wsCallbacks.get(channel);
      if (callbacks) {
        callbacks.delete(wrappedCallback);
        if (callbacks.size === 0) {
          this.ws?.send(JSON.stringify({ method: 'unsubscribe', subscription: { type: 'allMids' } }));
        }
      }
    };
  }

  async getMarkets(): Promise<HLMarket[]> {
    const [metaAndAssetCtxs, midPrices] = await Promise.all([
      this.getInfo('metaAndAssetCtxs'),
      this.getInfo('allMids')
    ]);
    
    const meta = metaAndAssetCtxs[0];
    const assetCtxs = metaAndAssetCtxs[1];
    
    this.metaCache = meta;
    this.assetCtxsCache = assetCtxs;
    
    return meta.universe.map((asset: any, index: number) => {
      const ctx = assetCtxs[index];
      const midPrice = parseFloat(midPrices[asset.name] || '0');
      const prevDayPx = parseFloat(ctx?.prevDayPx || midPrice.toString());
      const change24h = prevDayPx !== 0 ? ((midPrice - prevDayPx) / prevDayPx) * 100 : 0;

      return {
        name: asset.name,
        szDecimals: asset.szDecimals,
        maxLeverage: asset.maxLeverage,
        price: midPrice,
        assetIndex: index,
        change24h,
        high24h: parseFloat(ctx?.dayNtlVlm || '0') > 0 ? midPrice * 1.05 : midPrice,
        low24h: parseFloat(ctx?.dayNtlVlm || '0') > 0 ? midPrice * 0.95 : midPrice,
      };
    });
  }

  async getMarketState(coin: string) {
    if (!this.metaCache || !this.assetCtxsCache) {
      await this.getMarkets();
    }
    const assetIndex = this.metaCache.universe.findIndex((u: any) => u.name === coin);
    if (assetIndex === -1) return null;
    
    const ctx = this.assetCtxsCache[assetIndex];
    const midPrice = parseFloat(ctx.midPx || '0');
    const prevDayPx = parseFloat(ctx.prevDayPx || '0');
    
    return {
      price: midPrice,
      change24h: prevDayPx !== 0 ? ((midPrice - prevDayPx) / prevDayPx) * 100 : 0,
      high24h: midPrice * 1.02,
      low24h: midPrice * 0.98,
    };
  }

  async getAccountState(user: string) {
    return this.getInfo('clearinghouseState', { user });
  }

  async getSpotState(user: string) {
    return this.getInfo('spotClearinghouseState', { user });
  }

  async getAssetIndex(coin: string): Promise<number> {
    const meta = await this.fetchMeta();
    const index = meta.universe.findIndex((u: any) => u.name === coin);
    if (index === -1) throw new Error(`Unknown asset: ${coin}`);
    return index;
  }

  async placeOrder(order: any) {
    if (!this.privateKey) throw new Error('Private key not configured');
    
    const isMainnet = this.network === 'mainnet';
    const nonce = Date.now();
    const vaultAddress = null; // Assuming no vault for now

    // Support single order or array of orders
    const orders = Array.isArray(order.orders) ? order.orders : [order];
    const grouping = order.grouping || 'na';
    const builder = order.builder;

    const wireOrders = await Promise.all(orders.map(async (o: any) => {
      const assetIndex = await this.getAssetIndex(o.coin);
      return orderToWire(o, assetIndex);
    }));

    const action = orderWireToAction(wireOrders, grouping, builder);
    
    const signature = await signL1Action(this.privateKey, action, vaultAddress, nonce, isMainnet);

    const payload = {
      action,
      nonce,
      signature,
      ...(vaultAddress ? { vaultAddress } : {})
    };

    return this.fetchApi('/exchange', payload);
  }

  public getAddress() {
    if (this.privateKey) {
      try {
        const account = privateKeyToAccount(this.privateKey as Hex);
        return account.address;
      } catch (e) {
        console.error("Error deriving address from private key:", e);
        return null;
      }
    }
    return null;
  }

  async getInfoProxy2(type: string, payload: any = {}) {
    return this.getInfo(type, payload);
  }
}

export const hyperliquidService = new HyperliquidService(
  process.env.NEXT_PUBLIC_HYPERLIQUID_PRIVATE_KEY
);
