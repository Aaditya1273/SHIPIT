import * as StellarSdk from "@stellar/stellar-sdk";
import { Keypair } from "@stellar/stellar-sdk";
import { createHash } from "crypto";

export interface StellarRelayerConfig {
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string;
  signerSecretKey: string;
  horizonUrl?: string;
  feeBps?: number;
  minWithdrawAmount?: bigint;
}

export interface StellarRelayRequest {
  processooor: string;
  data: string;
  proofA: string;
  proofB: string;
  proofC: string;
  pubSignals: string[];
  scopeHex: string;
}

export interface StellarRelayResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

function hexToBytes(hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/, ""), "hex");
}

export class StellarRelayerService {
  private server: StellarSdk.rpc.Server;
  private contract: StellarSdk.Contract;
  private keypair: Keypair;
  private config: StellarRelayerConfig;

  constructor(config: StellarRelayerConfig) {
    this.config = config;
    this.server = new StellarSdk.rpc.Server(config.rpcUrl);
    this.contract = new StellarSdk.Contract(config.contractId);
    this.keypair = Keypair.fromSecret(config.signerSecretKey);
  }

  get address(): string {
    return this.keypair.publicKey();
  }

  async processWithdrawal(req: StellarRelayRequest): Promise<StellarRelayResponse> {
    try {
      // 1. Verify context matches
      const expectedContext = calculateContext(req.data, req.scopeHex);
      const proofContextHex = req.pubSignals[7] ?? "0";
      const proofContext = BigInt(proofContextHex.startsWith("0x") ? proofContextHex : "0x" + proofContextHex);
      if (proofContext !== expectedContext) {
        return { success: false, error: "Context mismatch" };
      }

      // 2. Build and submit the withdrawal TX
      const txHash = await this.submitWithdrawTx(req);
      return { success: true, txHash };
    } catch (err: any) {
      return { success: false, error: err.message ?? String(err) };
    }
  }

  private async submitWithdrawTx(req: StellarRelayRequest): Promise<string> {
    const source = await this.server.getAccount(this.keypair.publicKey());

    const withdrawalScVal = StellarSdk.xdr.ScVal.scvMap([
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol("processooor"),
        val: StellarSdk.Address.fromString(req.processooor).toScVal(),
      }),
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol("data"),
        val: StellarSdk.xdr.ScVal.scvBytes(hexToBytes(req.data)),
      }),
    ]);

    const flatProofScVal = StellarSdk.xdr.ScVal.scvMap([
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol("proof"),
        val: StellarSdk.xdr.ScVal.scvMap([
          new StellarSdk.xdr.ScMapEntry({
            key: StellarSdk.xdr.ScVal.scvSymbol("a"),
            val: StellarSdk.xdr.ScVal.scvBytes(hexToBytes(req.proofA)),
          }),
          new StellarSdk.xdr.ScMapEntry({
            key: StellarSdk.xdr.ScVal.scvSymbol("b"),
            val: StellarSdk.xdr.ScVal.scvBytes(hexToBytes(req.proofB)),
          }),
          new StellarSdk.xdr.ScMapEntry({
            key: StellarSdk.xdr.ScVal.scvSymbol("c"),
            val: StellarSdk.xdr.ScVal.scvBytes(hexToBytes(req.proofC)),
          }),
        ]),
      }),
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol("pub_signals"),
        val: StellarSdk.xdr.ScVal.scvVec(
          req.pubSignals.map((s) =>
            StellarSdk.xdr.ScVal.scvBytes(hexToBytes(s))
          )
        ),
      }),
    ]);

    let tx = new StellarSdk.TransactionBuilder(source, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(this.contract.call("withdraw", withdrawalScVal, flatProofScVal))
      .setTimeout(180)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation: ${sim.error}`);
    }
    tx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
    tx.sign(this.keypair);

    const sendRes = await this.server.sendTransaction(tx);
    if (sendRes.status === "ERROR") {
      throw new Error(`Send: ${sendRes.errorResult}`);
    }

    let getRes = await this.server.getTransaction(sendRes.hash);
    while (getRes.status === "NOT_FOUND") {
      await new Promise((r) => setTimeout(r, 1000));
      getRes = await this.server.getTransaction(sendRes.hash);
    }
    if (getRes.status !== "SUCCESS") {
      throw new Error(`Confirm: ${getRes.status}`);
    }

    return sendRes.hash;
  }

  async setMerkleRoot(rootHex: string): Promise<string> {
    const source = await this.server.getAccount(this.keypair.publicKey());
    let tx = new StellarSdk.TransactionBuilder(source, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(
        this.contract.call(
          "set_root",
          StellarSdk.xdr.ScVal.scvBytes(hexToBytes(rootHex))
        )
      )
      .setTimeout(180)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation: ${sim.error}`);
    }
    tx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
    tx.sign(this.keypair);

    const sendRes = await this.server.sendTransaction(tx);
    if (sendRes.status === "ERROR") {
      throw new Error(`Send: ${sendRes.errorResult}`);
    }
    let getRes = await this.server.getTransaction(sendRes.hash);
    while (getRes.status === "NOT_FOUND") {
      await new Promise((r) => setTimeout(r, 1000));
      getRes = await this.server.getTransaction(sendRes.hash);
    }
    return sendRes.hash;
  }
}

export function calculateContext(dataHex: string, scopeHex: string): bigint {
  const input = Buffer.concat([hexToBytes(dataHex), hexToBytes(scopeHex)]);
  const hash = createHash("sha256").update(input).digest();
  return BigInt("0x" + hash.toString("hex"));
}
