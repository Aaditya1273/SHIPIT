import * as StellarSdk from "@stellar/stellar-sdk";

export interface StellarEventFilter {
  contractId: string;
  startLedger?: number;
}

export interface StellarDepositEvent {
  commitment: string;
  label: string;
  value: bigint;
  ledger: number;
  txHash: string;
}

export interface StellarWithdrawalEvent {
  nullifier: string;
  value: bigint;
  ledger: number;
  txHash: string;
}

export class StellarDataService {
  private server: StellarSdk.rpc.Server;

  constructor(rpcUrl: string) {
    this.server = new StellarSdk.rpc.Server(rpcUrl);
  }

  async getDepositEvents(
    contractId: string,
    startLedger: number = 0
  ): Promise<StellarDepositEvent[]> {
    const response = await this.server.getEvents({
      startLedger,
      filters: [
        {
          contractId,
          topics: [StellarSdk.xdr.ScVal.scvSymbol("Deposited").toXDR()],
        },
      ],
      pagination: { limit: 100 },
    });
    return response.events.map((ev) => {
      const val = ev.value;
      const topics = ev.topic;
      return {
        commitment: val?.[0]?.toString() ?? "",
        label: val?.[1]?.toString() ?? "",
        value: BigInt(val?.[2]?.toString() ?? "0"),
        ledger: ev.ledger,
        txHash: ev.id,
      };
    });
  }

  async getWithdrawalEvents(
    contractId: string,
    startLedger: number = 0
  ): Promise<StellarWithdrawalEvent[]> {
    const response = await this.server.getEvents({
      startLedger,
      filters: [
        {
          contractId,
          topics: [StellarSdk.xdr.ScVal.scvSymbol("Withdrawn").toXDR()],
        },
      ],
      pagination: { limit: 100 },
    });
    return response.events.map((ev) => {
      const val = ev.value;
      return {
        nullifier: val?.[0]?.toString() ?? "",
        value: BigInt(val?.[1]?.toString() ?? "0"),
        ledger: ev.ledger,
        txHash: ev.id,
      };
    });
  }

  async getRootSetEvents(
    contractId: string,
    startLedger: number = 0
  ): Promise<{ root: string; ledger: number }[]> {
    const response = await this.server.getEvents({
      startLedger,
      filters: [
        {
          contractId,
          topics: [StellarSdk.xdr.ScVal.scvSymbol("RootSet").toXDR()],
        },
      ],
      pagination: { limit: 100 },
    });
    return response.events.map((ev) => ({
      root: ev.value?.[0]?.toString() ?? "",
      ledger: ev.ledger,
    }));
  }
}
