# ZK-Pay: Compliant Privacy Pools on Stellar

> The first production-grade privacy pool ported to Stellar, rebuilt for real-world money with native ZK primitives, compliance proofs, and selective disclosure.

Built for **Stellar Hacks: Real-World ZK** — June 15 to July 3, 2026

---

## 1. Intro

ZK-Pay brings battle-tested Privacy Pool technology from Ethereum to Stellar. Users deposit USDC publicly and withdraw privately, but every withdrawal must prove three things in zero-knowledge:
1. You are in the deposit Merkle tree
2. You are in an approved allowlist (ASP)
3. You have paid the correct tax/withholding

All verification happens on-chain in a Soroban contract using Stellar's new ZK host functions.

This is not a demo circuit. This is a real protocol, now running on Stellar testnet.

## 2. The Problem

Stellar moves real money — USDC, cross-border payments, tokenized RWAs. But businesses cannot use public chains for payroll, B2B settlement, or treasury because:

- Amounts and counterparties are fully public
- Existing privacy tools are non-compliant and get blocked by regulators
- ZK on Stellar was too expensive before Protocol 25 and 26

Result: institutions stay off-chain.

## 3. The Solution

ZK-Pay = Privacy Pools + Stellar-native compliance

- **Private transfers:** Deposit publicly, withdraw to a fresh address with no link
- **Compliance by design:** Every proof includes membership in an approved set. No proof = no withdrawal
- **Selective disclosure:** A view key lets auditors decrypt amount and tax data, while the public sees nothing
- **Built for Stellar:** Uses Poseidon2 and BN254 host functions introduced in Protocol 25 (X-Ray) and Protocol 26 (Yardstick)

## 4. Uniqueness

We did not build a toy from scratch. We ported a production protocol:

| Ethereum Privacy Pool | ZK-Pay on Stellar |
| --- | --- |
| Solidity verifier | Soroban Groth16 verifier using BN254 host functions |
| MiMC/Pedersen hash | Poseidon2 (native, 10x cheaper) |
| ERC20 USDC | Stellar USDC (classic asset) |
| MetaMask | Freighter wallet |
| Generic anonymity | Compliance proof + view key for auditors |

This is the first time a full deposit/withdraw/nullifier system with relayers runs on Stellar.

## 5. Why This Fits the Hackathon Perfectly

The brief asks for "ZK doing real work" on "real-world money movement." ZK-Pay delivers:

- **ZK is load-bearing:** Withdraw fails without a valid Groth16 proof
- **Stellar-native:** Verifies proofs inside Soroban, uses Poseidon2 and BN254
- **Real-world use case:** Confidential payroll for Indian startups, private B2B USDC settlement, compliant RWA payments
- **Mild to wild spectrum:** We ship the mild (proof-of-membership) and the wild (compliant privacy pool) in one product

## 6. Why This Wins

1. **Production ready:** Not a circuit demo. We bring deposit, withdraw, Merkle trees, nullifiers, relayer, SDK — already audited on Ethereum
2. **Perfect timing:** We leverage Protocol 25/26 primitives the day they become usable
3. **Solves Stellar's core tension:** Privacy vs compliance. We give both
4. **Business model built-in:** SaaS for compliance proofs, 5 bps per private payment
5. **Clear demo:** Public deposit, private withdraw, auditor verifies in 30 seconds

## 7. Architecture

```mermaid
graph TD
    A[User - Freighter Wallet] --> B[Next.js Business Dashboard]
    B --> C[ZK-Pay SDK]
    C --> D[WASM Prover - Circom/Noir]
    D --> E[Generates Proof]
    E --> F[Relayer Service]
    F --> G[Privacy Pool Contract - Soroban]
    G --> H[Groth16 Verifier]
    H --> I[BN254 Host Functions - Protocol 26]
    G --> J[Merkle Tree - Poseidon2 Host]
    G --> K[Stellar USDC Asset]
    G --> L[Allowlist Root Storage]
    M[Auditor Dashboard] --> N[View Key Decryption]
    N --> G
    G --> O[Nullifier Registry]
    ```