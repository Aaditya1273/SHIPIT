//! ZK-PAY: Privacy Pool on Stellar
//! 
//! Migration: Constants.sol → Constants.rs
//! 
//! Groth16 on BLS12-381 — the curve available on Stellar today via CAP-0059.
//! (BN254 is gated on CAP-0074, still proposed.)
//! 
//! BLS12-381 scalar field modulus:
//!   52435875175126190479447740508185965837690552500527637822603658699938581184513
//! 
//! USDC on Stellar uses 7 decimals (stroops). All amounts are in stroops.
//! 1 USDC = 1_000_000 stroops

/// BLS12-381 scalar field modulus (for Fr field element validation)
/// Note: This exceeds u128 max, so it's stored as a hex string for reference.
/// The actual field modulus is used by the BLS12-381 host functions internally.
pub const BLS12_381_SCALAR_MODULUS_HEX: &str = "73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001";

/// Maximum tree depth for Merkle inclusion proofs.
/// Determines circuit constraint count at compile time (R1CS).
/// Identical to Solidity MAX_TREE_DEPTH = 32
pub const MAX_TREE_DEPTH: u32 = 32;

/// Root history buffer size — sliding window for state root validation.
pub const ROOT_HISTORY_SIZE: u32 = 64;

/// Maximum basis points (100% = 10_000 BPS)
pub const MAX_BPS: u32 = 10_000;

/// USDC decimal conversion: Stellar uses 7 decimals (stroops)
pub const STROOPS_PER_USDC: i128 = 1_000_000;
