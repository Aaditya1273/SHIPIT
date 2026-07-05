import { nativeToScVal, xdr } from '@stellar/stellar-sdk';

export function bytesToScVal(hex: string): xdr.ScVal {
  const buf = Buffer.from(hex, 'hex');
  return xdr.ScVal.scvBytes(buf);
}

export function i128ToScVal(val: bigint): xdr.ScVal {
  return nativeToScVal(val, { type: 'i128' });
}

export function u64ToScVal(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: 'u64' });
}

export function u32ToScVal(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: 'u32' });
}

export function stringToScVal(val: string): xdr.ScVal {
  return nativeToScVal(val, { type: 'string' });
}
