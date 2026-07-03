// ZK-PAY: Privacy Pool on Stellar
// 
// Module entry point — replaces Solidity's contract layout.
// Files are in `contracts/` subdirectory alongside Solidity sources.
// #[path] attributes used to resolve module locations.
//
// REQUIRED: #![no_std] for WASM target (Soroban contracts)

#![no_std]

#[path = "contracts/lib/Constants.rs"]
pub mod constants;

#[path = "contracts/lib/ProofLib.rs"]
pub mod proof_lib;

#[path = "contracts/PrivacyPool.rs"]
pub mod privacy_pool;

#[path = "contracts/verifiers/mod.rs"]
pub mod verifiers;
