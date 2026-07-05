import { NextRequest, NextResponse } from 'next/server';
import {
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  rpc,
  Operation,
  Address,
} from '@stellar/stellar-sdk';

const DEPLOYER_SECRET = process.env.STELLAR_DEPLOYER_SECRET || '';
const ASSET_ID = process.env.NEXT_PUBLIC_STELLAR_ASSET_ID || 'CAEPLVCK4VMA6HJDKYWBIAV7DE7EBQ6ZWUCEHQ22DEJHEPMNLFNX2YQ6';
const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443';

const AMOUNT = 10_000_000_000n; // 1000 ZKUSDC (7 decimals)

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (!address || !address.startsWith('G') || address.length !== 56) {
      return NextResponse.json({ error: 'Invalid Stellar address' }, { status: 400 });
    }

    const server = new rpc.Server(RPC_URL);
    const deployer = Keypair.fromSecret(DEPLOYER_SECRET);

    const sourceAccount = await server.getAccount(deployer.publicKey());

    // Build transaction
    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.invokeContractFunction({
        contract: ASSET_ID,
        function: 'mint',
        args: [
          new Address(address).toScVal(),
          nativeToScVal(AMOUNT, { type: 'i128' }),
        ],
      }))
      .setTimeout(30)
      .build();

    // Simulate to get resource footprint (required for Soroban!)
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      return NextResponse.json({
        error: `Simulation failed: ${sim.error.substring(0, 200)}`,
      }, { status: 400 });
    }

    // Assemble transaction with resource footprint from simulation
    // This is CRITICAL - without it, Soroban transactions are malformed (txMALFORMED)
    const prepared = rpc.assembleTransaction(tx, sim).build();

    // Sign and send
    prepared.sign(deployer);

    const sendResult = await server.sendTransaction(prepared);

    if (sendResult.status === 'PENDING') {
      const hash = sendResult.hash;
      if (!hash) {
        return NextResponse.json({ error: 'No hash returned for pending tx' }, { status: 500 });
      }

      // Wait for confirmation (up to 30s)
      let receipt = await server.getTransaction(hash);
      let attempts = 0;
      while (receipt.status === 'NOT_FOUND' && attempts < 30) {
        await new Promise(r => setTimeout(r, 1000));
        receipt = await server.getTransaction(hash);
        attempts++;
      }

      if (receipt.status === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Transaction not found after 30s' }, { status: 500 });
      }

      if (receipt.status === 'FAILED') {
        return NextResponse.json({ error: `Mint TX failed on-chain: ${hash}` }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        hash,
        amount: AMOUNT.toString(),
      });
    }

    // Handle non-PENDING responses
    const errStr = sendResult.status === 'ERROR'
      ? `txMALFORMED or contract error (check your wallet)`
      : sendResult.status === 'DUPLICATE'
        ? 'Transaction already submitted (duplicate)'
        : `Status: ${sendResult.status}`;

    return NextResponse.json({ error: `Send failed: ${errStr}` }, { status: 500 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
