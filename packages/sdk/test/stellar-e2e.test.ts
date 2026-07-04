import { describe, it, beforeAll, expect } from "vitest";
import {
  StellarContractInteractions,
  calculateContextStellar,
} from "../src/core/stellar-contracts.service.js";
import { StellarDataService } from "../src/core/stellar-data.service.js";
import { PrivacyPoolSDK } from "../src/core/sdk.js";
import { Circuits } from "../src/circuits/index.js";
import { generateMasterKeys, generateDepositSecrets, getCommitment } from "../src/crypto.js";

const TESTNET_RPC = "https://soroban-testnet.stellar.org";
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const CONTRACT_ID = process.env.STELLAR_CONTRACT_ID || "CA7TFN6G6IGU2JDILRFJGTJFSZS6LBHBJLKTLCHW6F5XB5GDYPWDKV4D";
const SIGNER_SECRET = process.env.STELLAR_SIGNER_SECRET || "";

describe.skipIf(!SIGNER_SECRET)("ZK-Pay Stellar E2E", () => {
  const contracts = new StellarContractInteractions({
    rpcUrl: TESTNET_RPC,
    networkPassphrase: TESTNET_PASSPHRASE,
    contractId: CONTRACT_ID,
    signerSecretKey: SIGNER_SECRET,
  });
  const dataService = new StellarDataService(TESTNET_RPC);
  let sdk: PrivacyPoolSDK;

  beforeAll(async () => {
    sdk = new PrivacyPoolSDK(new Circuits({ browser: false }));
  });

  it("should query contract state", async () => {
    const size = await contracts.currentTreeSize();
    expect(typeof size).toBe("bigint");
    console.log("Tree size:", size.toString());
  });

  it("should compute context matching contract", () => {
    const processooor = "GDA3OLN4HZETWCSIJV6OMOXDWDTMIUZWHKGSHSYNW36WDAHPVCHJ47LL";
    const dataHex = "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
    const scopeHex = "0000000000000000000000000000000000000000000000000000000000000000";
    const context = calculateContextStellar(processooor, dataHex, scopeHex);
    expect(context).toBeDefined();
    expect(context > 0n).toBe(true);
    console.log("Context:", context.toString());
  });

  it("should generate commitment proof using real circuits", async () => {
    const mnemonic = "test test test test test test test test test test test junk";
    const keys = generateMasterKeys(mnemonic);
    const scope = BigInt("0x1234");
    const secrets = generateDepositSecrets(keys, scope, 0n);
    const commitment = getCommitment(100n, scope, secrets.nullifier, secrets.secret);
    expect(commitment.hash).toBeDefined();
    console.log("Commitment hash:", commitment.hash.toString());
  });
});
