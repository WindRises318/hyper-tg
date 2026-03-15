import { encode } from "@msgpack/msgpack";
import { keccak256, toBytes, bytesToHex, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const HL_DOMAIN = {
  name: "Exchange",
  version: "1",
  chainId: 1337,
  verifyingContract: "0x0000000000000000000000000000000000000000" as const,
};

export const HL_TYPES = {
  Agent: [
    { name: "source", type: "string" },
    { name: "connectionId", type: "bytes32" },
  ],
};

function floatToWire(x: number): string {
  const rounded = x.toFixed(8);
  if (Math.abs(parseFloat(rounded) - x) >= 1e-12) {
    throw new Error(`floatToWire causes rounding: ${x}`);
  }
  let res = rounded.replace(/\.?0+$/, "");
  if (res === "-0") res = "0";
  return res;
}

function removeTrailingZeros(x: string): string {
  if (!x.includes(".")) return x;
  const res = x.replace(/\.?0+$/, "");
  return res === "-0" ? "0" : res;
}

function normalizeTrailingZeros(action: any): any {
  if (!action || typeof action !== "object") return action;
  if (Array.isArray(action)) return action.map(normalizeTrailingZeros);
  const res: any = { ...action };
  for (const key in res) {
    if (Object.prototype.hasOwnProperty.call(res, key)) {
      const val = res[key];
      if (val && typeof val === "object") {
        res[key] = normalizeTrailingZeros(val);
      } else if ((key === "p" || key === "s") && typeof val === "string") {
        res[key] = removeTrailingZeros(val);
      }
    }
  }
  return res;
}

export function formatPriceTo5SigFigs(price) {
  if (!price) return "0";

  const p = Number(price.toPrecision(5));

  return p.toLocaleString("fullwide", {
    useGrouping: false,
    maximumSignificantDigits: 5,
  });
}

export function orderTypeToWire(orderType: any): any {
  if (orderType.limit) {
    return { limit: orderType.limit };
  }
  if (orderType.trigger) {
    return {
      trigger: {
        isMarket: orderType.trigger.isMarket,
        triggerPx: floatToWire(Number(orderType.trigger.triggerPx)),
        tpsl: orderType.trigger.tpsl,
      },
    };
  }
  throw new Error("Invalid order type");
}

export function orderToWire(order: any, assetIndex: number): any {
  const res: any = {
    a: assetIndex,
    b: order.is_buy,
    p:
      typeof order.limit_px === "string"
        ? removeTrailingZeros(order.limit_px)
        : floatToWire(order.limit_px),
    s:
      typeof order.sz === "string"
        ? removeTrailingZeros(order.sz)
        : floatToWire(order.sz),
    r: order.reduce_only,
    t: orderTypeToWire(order.order_type),
  };
  if (order.cloid !== undefined) {
    res.c = order.cloid;
  }
  return res;
}

export function orderWireToAction(
  orders: any[],
  grouping: string = "na",
  builder?: any,
): any {
  return {
    type: "order",
    orders,
    grouping,
    ...(builder !== undefined
      ? { builder: { b: builder.address.toLowerCase(), f: builder.fee } }
      : {}),
  };
}

export function floatToIntForHashing(x: number): number {
  return floatToUsdInt(x);
}

export function floatToUsdInt(x: number): number {
  const res = x * Math.pow(10, 6);
  if (Math.abs(Math.round(res) - res) >= 0.001) {
    throw new Error(`floatToInt causes rounding: ${x}`);
  }
  return Math.round(res);
}

export function getTimestampMs(): number {
  return Date.now();
}

export function actionHash(
  action: any,
  vaultAddress: string | null,
  nonce: number,
): Hex {
  const normalized = normalizeTrailingZeros(action);
  const msgpackBytes = encode(normalized);

  const vaultAddressLen = vaultAddress === null ? 0 : 20;
  const payload = new Uint8Array(msgpackBytes.length + 8 + 1 + vaultAddressLen);

  payload.set(msgpackBytes, 0);

  const view = new DataView(payload.buffer);
  view.setBigUint64(msgpackBytes.length, BigInt(nonce), false); // Big endian

  if (vaultAddress === null) {
    view.setUint8(msgpackBytes.length + 8, 0);
  } else {
    view.setUint8(msgpackBytes.length + 8, 1);
    payload.set(toBytes(vaultAddress as Hex), msgpackBytes.length + 9);
  }

  return keccak256(payload);
}

export async function signL1Action(
  privateKey: string,
  action: any,
  vaultAddress: string | null,
  nonce: number,
  isMainnet: boolean,
) {
  const hash = actionHash(action, vaultAddress, nonce);
  const message = {
    source: isMainnet ? "a" : "b",
    connectionId: hash,
  };

  const account = privateKeyToAccount(privateKey as Hex);
  const signatureHex = await account.signTypedData({
    domain: HL_DOMAIN,
    types: HL_TYPES,
    primaryType: "Agent",
    message,
  });

  // Extract r, s, v from signature
  const r = signatureHex.slice(0, 66);
  const s = "0x" + signatureHex.slice(66, 130);
  let v = parseInt(signatureHex.slice(130, 132), 16);
  if (v < 27) v += 27;

  return { r, s, v };
}
