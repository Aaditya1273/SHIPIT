/**
 * Browser-compatible Poseidon hash over the BLS12-381 scalar field.
 *
 * Matches the circuit's Poseidon hashing (circomlib's poseidon.circom) but
 * over the BLS12-381 Fr field instead of BN254.
 *
 * BLS12-381 scalar field modulus:
 *   52435875175126190479447740508185965837690552500527637822603658699938581184513
 *
 * Imports Poseidon constants from circomlibjs and uses native BigInt for
 * field arithmetic — no WASM dependencies needed for a handful of hashes.
 */

import constantsData from './poseidon_constants.json';

// ─── BLS12-381 Scalar Field ─────────────────────────────────────
export const BLS_SCALAR_FIELD =
  52435875175126190479447740508185965837690552500527637822603658699938581184513n;

// ─── Field arithmetic using native BigInt ───────────────────────
function F_e(a: bigint | string | number): bigint {
  const v = typeof a === 'bigint' ? a : BigInt(a);
  return ((v % BLS_SCALAR_FIELD) + BLS_SCALAR_FIELD) % BLS_SCALAR_FIELD;
}
function F_add(a: bigint, b: bigint): bigint {
  return (F_e(a) + F_e(b)) % BLS_SCALAR_FIELD;
}
function F_mul(a: bigint, b: bigint): bigint {
  return (F_e(a) * F_e(b)) % BLS_SCALAR_FIELD;
}
function F_square(a: bigint): bigint {
  return F_mul(a, a);
}
function pow5(a: bigint): bigint {
  return F_mul(a, F_square(F_square(a)));
}

// ─── Poseidon constants ─────────────────────────────────────────
// The JSON has keys 'C', 'M', 'P', 'S', each an array indexed by (t - 2)
// where t = rate + 1 = number of inputs + 1
// C: bigint[][]   indexed by [t-2][index]
// M: bigint[][][] indexed by [t-2][row][col]
// P: bigint[][][] indexed by [t-2][row][col]
// S: bigint[][]   indexed by [t-2][index] (flat array)
type PoseidonConstants = {
  C: string[][];
  M: string[][][];
  P: string[][][];
  S: string[][];
};

const raw = constantsData as unknown as PoseidonConstants;

const N_ROUNDS_F = 8;
const N_ROUNDS_P = [56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68];

// Pre-parse string constants to BigInts
const C: bigint[][] = raw.C.map((row) => row.map((v) => BigInt(v)));
const M: bigint[][][] = raw.M.map((mat) => mat.map((row) => row.map((v) => BigInt(v))));
const P: bigint[][][] = raw.P.map((mat) => mat.map((row) => row.map((v) => BigInt(v))));
const S: bigint[][] = raw.S.map((row) => row.map((v) => BigInt(v)));

/**
 * Poseidon hash over the BLS12-381 scalar field.
 *
 * @param inputs - Array of bigint field elements to hash
 * @returns The Poseidon hash (single field element)
 */
export default function poseidon(inputs: (bigint | string | number)[]): bigint {
  const t = inputs.length + 1; // rate + 1
  const nRoundsP = N_ROUNDS_P[t - 2] ?? 57;

  const fieldC = C[t - 2];
  const fieldS = S[t - 2];
  const fieldM = M[t - 2];
  const fieldP = P[t - 2];

  // Initialise state: [F.zero, ...inputs]
  let state: bigint[] = [0n, ...inputs.map((a) => F_e(a))];

  // Add round constants
  state = state.map((a, i) => F_add(a, fieldC[i]));

  // First half of full rounds (minus 1)
  for (let r = 0; r < N_ROUNDS_F / 2 - 1; r++) {
    state = state.map((a) => pow5(a));
    state = state.map((a, i) => F_add(a, fieldC[(r + 1) * t + i]));
    state = state.map((_, i) =>
      state.reduce((acc, a, j) => F_add(acc, F_mul(fieldM[j][i], a)), 0n)
    );
  }

  // Middle full round with partial-like matrix (P)
  state = state.map((a) => pow5(a));
  state = state.map((a, i) => F_add(a, fieldC[(N_ROUNDS_F / 2) * t + i]));
  state = state.map((_, i) =>
    state.reduce((acc, a, j) => F_add(acc, F_mul(fieldP[j][i], a)), 0n)
  );

  // Partial rounds
  for (let r = 0; r < nRoundsP; r++) {
    state[0] = pow5(state[0]);
    state[0] = F_add(state[0], fieldC[(N_ROUNDS_F / 2 + 1) * t + r]);
    const s0 = state.reduce(
      (acc, a, j) => F_add(acc, F_mul(fieldS[(t * 2 - 1) * r + j], a)),
      0n
    );
    for (let k = 1; k < t; k++) {
      state[k] = F_add(state[k], F_mul(state[0], fieldS[(t * 2 - 1) * r + t + k - 1]));
    }
    state[0] = s0;
  }

  // Second half of full rounds (minus 1)
  for (let r = 0; r < N_ROUNDS_F / 2 - 1; r++) {
    state = state.map((a) => pow5(a));
    state = state.map((a, i) =>
      F_add(a, fieldC[(N_ROUNDS_F / 2 + 1) * t + nRoundsP + r * t + i])
    );
    state = state.map((_, i) =>
      state.reduce((acc, a, j) => F_add(acc, F_mul(fieldM[j][i], a)), 0n)
    );
  }

  // Final full round
  state = state.map((a) => pow5(a));
  state = state.map((_, i) =>
    state.reduce((acc, a, j) => F_add(acc, F_mul(fieldM[j][i], a)), 0n)
  );

  let raw = state[0];
  if (raw < 0n) raw += BLS_SCALAR_FIELD;
  return raw;
}

/**
 * Hash helpers matching the circuit's CommitmentHasher template:
 *
 *   nullifierHash  = Poseidon([nullifier])
 *   precommitment  = Poseidon([nullifier, secret])
 *   commitment     = Poseidon([value, label, precommitment])
 */
export function hashNullifier(nullifier: bigint): bigint {
  return poseidon([nullifier]);
}

export function hashPrecommitment(nullifier: bigint, secret: bigint): bigint {
  return poseidon([nullifier, secret]);
}

export function hashCommitment(
  value: bigint,
  label: bigint,
  precommitment: bigint
): bigint {
  return poseidon([value, label, precommitment]);
}

/**
 * Convert a bigint to a hex string of the given byte length.
 */
export function bigintToHex(v: bigint | string, bytes = 32): string {
  const n = typeof v === 'string' ? BigInt(v) : v;
  return n.toString(16).padStart(bytes * 2, '0');
}

/**
 * Reduce a SHA256 hash modulo the BLS12-381 scalar field.
 */
export function reduceToField(hashHex: string): bigint {
  return BigInt('0x' + hashHex) % BLS_SCALAR_FIELD;
}
