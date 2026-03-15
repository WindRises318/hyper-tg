import { Hyperliquid } from 'hyperliquid';

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
  private sdk: Hyperliquid | null = null;
  private network: HLNetwork = 'testnet';
  private privateKey: string | undefined;
  private walletAddress: string | undefined;

  constructor(privateKey?: string, walletAddress?: string) {
    this.privateKey = privateKey;
    this.walletAddress = walletAddress;
    const config = {
      privateKey: privateKey && privateKey.startsWith('0x') ? privateKey : undefined,
      walletAddress: walletAddress && walletAddress.startsWith('0x') ? walletAddress : undefined,
      testnet: this.network === 'testnet',
      enableWs: true
    };
    this.sdk = new Hyperliquid(config);
  }

  setNetwork(network: HLNetwork) {
    if (this.network !== network) {
      this.network = network;
      
      // Disconnect old SDK to prevent memory leaks and zombie WebSockets
      if (this.sdk) {
        try {
          this.sdk.disconnect();
        } catch (e) {
          console.error('Error disconnecting old SDK:', e);
        }
      }

      // Re-initialize SDK for the new network
      const config = {
        privateKey: this.privateKey && this.privateKey.startsWith('0x') ? this.privateKey : undefined,
        walletAddress: this.walletAddress && this.walletAddress.startsWith('0x') ? this.walletAddress : undefined,
        testnet: network === 'testnet',
        enableWs: true
      };
      this.sdk = new Hyperliquid(config);
    }
  }

  async getInfo(type: string, payload: any = {}) {
    if (!this.sdk) throw new Error('SDK not initialized');
    // The SDK provides a generic way to call info if needed, 
    // but it's better to use the specific methods.
    // However, for compatibility with existing code:
    return (this.sdk.info as any).custom({ type, ...payload });
  }

  async fetchMeta() {
    if (!this.sdk) throw new Error('SDK not initialized');
    return this.sdk.info.perpetuals.getMeta();
  }

  async getInfoCompat(type: string, payload: any = {}) {
    if (!this.sdk) throw new Error('SDK not initialized');
    // Map existing getInfo calls to SDK methods where possible
    if (type === 'metaAndAssetCtxs') return this.sdk.info.perpetuals.getMetaAndAssetCtxs();
    if (type === 'allMids') return this.sdk.info.getAllMids();
    if (type === 'clearinghouseState') return this.sdk.info.perpetuals.getClearinghouseState(payload.user);
    
    // Fallback for others
    return (this.sdk.info as any).custom({ type, ...payload });
  }

  // Override getInfo to use the compat version for existing calls
  async getInfoProxy(type: string, payload: any = {}) {
    return this.getInfoCompat(type, payload);
  }

  async fetchCandles(coin: string, interval: string = '15m'): Promise<Candle[]> {
    if (!this.sdk) return [];
    const endTime = Date.now();
    let lookback = 24 * 60 * 60 * 1000;
    if (interval === '1m') lookback = 2 * 60 * 60 * 1000;
    if (interval === '5m') lookback = 8 * 60 * 60 * 1000;
    if (interval === '1h') lookback = 4 * 24 * 60 * 60 * 1000;
    if (interval === '4h') lookback = 14 * 24 * 60 * 60 * 1000;
    if (interval === '1d') lookback = 60 * 24 * 60 * 60 * 1000;

    const startTime = endTime - lookback;
    const data = await this.sdk.info.getCandleSnapshot(coin, interval, startTime, endTime);
    
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
    if (!this.sdk) return () => {};
    const currentSdk = this.sdk;
    let isSubscribed = true;

    currentSdk.connect().then(() => {
      if (!isSubscribed) return;
      if (!currentSdk.ws || !currentSdk.ws.isConnected()) {
        console.warn("WebSocket is not connected, skipping L2Book subscription");
        return;
      }
      currentSdk.subscriptions.subscribeToL2Book(coin, (data) => {
        callback(data);
      }).catch(e => console.error("Failed to subscribe to L2Book", e));
    }).catch(e => console.error("Failed to connect SDK", e));

    return () => {
      isSubscribed = false;
      try {
        if (currentSdk.ws && currentSdk.ws.isConnected()) {
          currentSdk.subscriptions.unsubscribeFromL2Book(coin).catch(() => {});
        }
      } catch (e) {
        // Ignore errors if already disconnected
      }
    };
  }

  subscribeToAllMids(callback: (mids: Record<string, string>) => void) {
    if (!this.sdk) return () => {};
    const currentSdk = this.sdk;
    let isSubscribed = true;

    currentSdk.connect().then(() => {
      if (!isSubscribed) return;
      if (!currentSdk.ws || !currentSdk.ws.isConnected()) {
        console.warn("WebSocket is not connected, skipping AllMids subscription");
        return;
      }
      currentSdk.subscriptions.subscribeToAllMids((data) => {
        if (data && data.mids) {
          // The SDK might return mids as an array or object depending on version
          // Based on previous logs, it's an object { mids: { ... } }
          callback(data.mids as any);
        }
      }).catch(e => console.error("Failed to subscribe to AllMids", e));
    }).catch(e => console.error("Failed to connect SDK", e));

    return () => {
      isSubscribed = false;
      try {
        if (currentSdk.ws && currentSdk.ws.isConnected()) {
          currentSdk.subscriptions.unsubscribeFromAllMids().catch(() => {});
        }
      } catch (e) {
        // Ignore errors if already disconnected
      }
    };
  }

  async getMarkets(): Promise<HLMarket[]> {
    if (!this.sdk) return [];
    const [meta, assetCtxs] = await this.sdk.info.perpetuals.getMetaAndAssetCtxs();
    const midPrices = await this.sdk.info.getAllMids();
    
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
    if (!this.sdk) return null;
    const [meta, assetCtxs] = await this.sdk.info.perpetuals.getMetaAndAssetCtxs();
    const assetIndex = meta.universe.findIndex((u: any) => u.name === coin);
    if (assetIndex === -1) return null;
    
    const ctx = assetCtxs[assetIndex];
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
    if (!this.sdk) return null;
    return this.sdk.info.perpetuals.getClearinghouseState(user);
  }

  async placeOrder(order: any) {
    if (!this.sdk) throw new Error('SDK not initialized');
    // The SDK handles signing and everything
    return this.sdk.exchange.placeOrder(order);
  }

  public getAddress() {
    // The SDK doesn't directly expose the address easily if initialized with private key 
    // but we can derive it or store it.
    // In this SDK, we might need to store it manually or use a helper.
    if (this.privateKey) {
      // For simplicity, I'll keep the viem logic to get address or just return null if not easy
      // Actually, I'll just use a small helper to get address from private key if needed.
      return null; // Will fix this below
    }
    return null;
  }

  // Re-implementing getInfo to keep compatibility
  async getInfoProxy2(type: string, payload: any = {}) {
    return this.getInfoCompat(type, payload);
  }
}

// Re-implementing getAddress using viem for simplicity since it's already in dependencies
import { privateKeyToAccount } from 'viem/accounts';

const originalGetAddress = HyperliquidService.prototype.getAddress;
HyperliquidService.prototype.getAddress = function() {
  if (this.walletAddress && this.walletAddress.startsWith('0x')) {
    return this.walletAddress;
  }
  if (this.privateKey && this.privateKey.startsWith('0x')) {
    try {
      const account = privateKeyToAccount(this.privateKey as `0x${string}`);
      return account.address;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Also need to fix the getInfo method name in the class
HyperliquidService.prototype.getInfo = HyperliquidService.prototype.getInfoCompat;

export const hyperliquidService = new HyperliquidService(
  process.env.NEXT_PUBLIC_HYPERLIQUID_PRIVATE_KEY,
  process.env.NEXT_PUBLIC_HYPERLIQUID_WALLET_ADDRESS
);
