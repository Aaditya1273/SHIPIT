//! ZK-PAY: Privacy Pool on Stellar
//! 
//! Byte conversion helpers for flat proof types.
//! 
//! The actual proof structs (FlatGroth16Proof, FlatWithdrawProof, FlatRagequitProof)
//! live in PrivacyPool.rs since they need #[contracttype] for contract function args.
//! 
//! This module provides helper functions for converting between flat byte arrays
//! and BLS12-381 field elements / curve points used during verification.

use soroban_sdk::BytesN;

/// Extract u128 from the lower 16 bytes of a BytesN<32>
/// (BLS12-381 Fr field element has ~255 bits, fits in u128 for amounts)
pub fn bytes32_to_u128(bytes: &BytesN<32>) -> u128 {
    let arr = bytes.to_array();
    let mut buf = [0u8; 16];
    buf.copy_from_slice(&arr[16..32]);
    u128::from_be_bytes(buf)
}

/// Extract u32 from the lowest 4 bytes of a BytesN<32>
pub fn bytes32_to_u32(bytes: &BytesN<32>) -> u32 {
    let arr = bytes.to_array();
    let mut buf = [0u8; 4];
    buf.copy_from_slice(&arr[28..32]);
    u32::from_be_bytes(buf)
}

/// Convert u128 to BytesN<32> (big-endian, padded to 32 bytes)
pub fn u128_to_bytes32(val: u128) -> [u8; 32] {
    let mut bytes = [0u8; 32];
    bytes[16..32].copy_from_slice(&val.to_be_bytes());
    bytes
}
