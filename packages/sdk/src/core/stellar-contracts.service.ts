import * as StellarSdk from "@stellar/stellar-sdk";
import { Keypair } from "@stellar/stellar-sdk";
import { createHash } from "crypto";

export interface StellarContractConfig {
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string;
  signerSecretKey: string;
}

export interface StellarTxResponse {
  hash: string;
  status: string;
}

export interface StellarWithdrawalData {
  processooor: string;
  data: string;
}

export interface StellarWithdrawProof {
  a: string;
  b: string;
  c: string;
  pubSignals: string[];
}

function hexToBytes(hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/, ""), "hex");
}

function bnToHex32(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

export class StellarContractInteractions {
  private server: StellarSdk.rpc.Server;
  private config: StellarContractConfig;
  private contract: StellarSdk.Contract;
  private keypair: Keypair;

  constructor(config: StellarContractConfig) {
    this.config = config;
    this.server = new StellarSdk.rpc.Server(config.rpcUrl);
    this.contract = new StellarSdk.Contract(config.contractId);
    this.keypair = Keypair.fromSecret(config.signerSecretKey);
  }

  private async submitTx(
    tx: StellarSdk.Transaction
  ): Promise<StellarTxResponse> {
    tx.sign(this.keypair);
    const response = await this.server.sendTransaction(tx);
    if (response.status === "ERROR") {
      throw new Error(`Transaction failed: ${response.errorResult}`);
    }
    let getResponse = await this.server.getTransaction(response.hash);
    while (getResponse.status === "NOT_FOUND") {
      await new Promise((r) => setTimeout(r, 1000));
      getResponse = await this.server.getTransaction(response.hash);
    }
    if (getResponse.status === "SUCCESS") {
      return { hash: response.hash, status: "SUCCESS" };
    }
    throw new Error(`Transaction failed: ${getResponse.status}`);
  }

  private async buildAndSubmit(
    method: string,
    args: StellarSdk.xdr.ScVal[]
  ): Promise<StellarTxResponse> {
    const sourceAccount = await this.server.getAccount(
      this.keypair.publicKey()
    );
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(180)
      .build();

    const simulation = await this.server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }
    const prepared = StellarSdk.rpc.assembleTransaction(tx, simulation).build();
    return this.submitTx(prepared);
  }

  async deposit(
    depositor: string,
    value: bigint,
    precommitmentHex: string
  ): Promise<StellarTxResponse> {
    return this.buildAndSubmit("deposit", [
      StellarSdk.Address.fromString(depositor).toScVal(),
      StellarSdk.nativeToScVal(value, { type: "i128" }),
      StellarSdk.xdr.ScVal.scvBytes(hexToBytes(precommitmentHex)),
    ]);
  }

  async withdraw(
    processooor: string,
    dataHex: string,
    proof: StellarWithdrawProof
  ): Promise<StellarTxResponse> {
    const withdrawal = StellarSdk.xdr.ScVal.scvMap([
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol("processooor"),
        val: StellarSdk.Address.fromString(processooor).toScVal(),
      }),
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol("data"),
        val: StellarSdk.xdr.ScVal.scvBytes(hexToBytes(dataHex)),
      }),
    ]);
    const flatProof = StellarSdk.xdr.ScVal.scvMap([
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol("proof"),
        val: StellarSdk.xdr.ScVal.scvMap([
          new StellarSdk.xdr.ScMapEntry({
            key: StellarSdk.xdr.ScVal.scvSymbol("a"),
            val: StellarSdk.xdr.ScVal.scvBytes(hexToBytes(proof.a)),
          }),
          new StellarSdk.xdr.ScMapEntry({
            key: StellarSdk.xdr.ScVal.scvSymbol("b"),
            val: StellarSdk.xdr.ScVal.scvBytes(hexToBytes(proof.b)),
          }),
          new StellarSdk.xdr.ScMapEntry({
            key: StellarSdk.xdr.ScVal.scvSymbol("c"),
            val: StellarSdk.xdr.ScVal.scvBytes(hexToBytes(proof.c)),
          }),
        ]),
      }),
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol("pub_signals"),
        val: StellarSdk.xdr.ScVal.scvVec(
          proof.pubSignals.map((s) =>
            StellarSdk.xdr.ScVal.scvBytes(hexToBytes(s))
          )
        ),
      }),
    ]);
    return this.buildAndSubmit("withdraw", [withdrawal, flatProof]);
  }

  async setRoot(rootHex: string): Promise<StellarTxResponse> {
    return this.buildAndSubmit("set_root", [
      StellarSdk.xdr.ScVal.scvBytes(hexToBytes(rootHex)),
    ]);
  }

  async latestRoot(): Promise<string> {
    const result = await this.server.simulateTransaction(
      new StellarSdk.TransactionBuilder(
        await this.server.getAccount(this.keypair.publicKey()),
        {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: this.config.networkPassphrase,
        }
      )
        .addOperation(this.contract.call("latest_root"))
        .setTimeout(180)
        .build()
    );
    if (
      !StellarSdk.rpc.Api.isSimulationSuccess(result) ||
      !result.result?.retval
    ) {
      throw new Error("Failed to query latest_root");
    }
    return Buffer.from(result.result.retval.toXDR()).toString("hex");
  }

  async currentTreeSize(): Promise<bigint> {
    const result = await this.server.simulateTransaction(
      new StellarSdk.TransactionBuilder(
        await this.server.getAccount(this.keypair.publicKey()),
        {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: this.config.networkPassphrase,
        }
      )
        .addOperation(this.contract.call("current_tree_size"))
        .setTimeout(180)
        .build()
    );
    if (
      !StellarSdk.rpc.Api.isSimulationSuccess(result) ||
      !result.result?.retval
    ) {
      throw new Error("Failed to query current_tree_size");
    }
    return StellarSdk.scValToNative(result.result.retval) as bigint;
  }

  async isNullifierSpent(nullifierHex: string): Promise<boolean> {
    const result = await this.server.simulateTransaction(
      new StellarSdk.TransactionBuilder(
        await this.server.getAccount(this.keypair.publicKey()),
        {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: this.config.networkPassphrase,
        }
      )
        .addOperation(
          this.contract.call(
            "is_nullifier_spent",
            StellarSdk.xdr.ScVal.scvBytes(hexToBytes(nullifierHex))
          )
        )
        .setTimeout(180)
        .build()
    );
    if (
      !StellarSdk.rpc.Api.isSimulationSuccess(result) ||
      !result.result?.retval
    ) {
      throw new Error("Failed to query is_nullifier_spent");
    }
    return StellarSdk.scValToNative(result.result.retval) as boolean;
  }
}

export function calculateContextStellar(
  processooor: string,
  dataHex: string,
  scopeHex: string
): bigint {
  const input = Buffer.concat([
    hexToBytes(dataHex),
    hexToBytes(scopeHex),
  ]);
  const hash = createHash("sha256").update(input).digest();
  return BigInt("0x" + hash.toString("hex"));
}
