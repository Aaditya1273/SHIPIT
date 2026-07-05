import { NextRequest, NextResponse } from 'next/server';
import {
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  rpc,
  Operation,
  xdr,
  Account,
} from '@stellar/stellar-sdk';

const DEPLOYER_SECRET = process.env.STELLAR_DEPLOYER_SECRET || '';
const CONTRACT_ID = process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID || 'CAYDGB7SLRONSTM4G562HEGPECFJNQKGRTSY4ZUJPGFX33HOUNAEX5LW';
const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, rootHex } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    const server = new rpc.Server(RPC_URL);
    const deployer = Keypair.fromSecret(DEPLOYER_SECRET);
    const sourceAccount = await server.getAccount(deployer.publicKey());

    if (action === 'set-root') {
      return await handleSetRoot(server, deployer, sourceAccount, rootHex);
    }

    if (action === 'init-pool') {
      return await handleInitPool(server, deployer, sourceAccount, body);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleSetRoot(
  server: rpc.Server,
  deployer: Keypair,
  sourceAccount: Account,
  rootHex: string
) {
  if (!rootHex || rootHex.length !== 64) {
    return NextResponse.json({ error: 'Invalid root hex (must be 64 hex chars)' }, { status: 400 });
  }

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'set_root',
      args: [xdr.ScVal.scvBytes(Buffer.from(rootHex, 'hex'))],
    }))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    return NextResponse.json({
      error: `set_root simulation failed: ${sim.error.substring(0, 200)}`,
    }, { status: 400 });
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(deployer);

  const sendResult = await server.sendTransaction(prepared);
  if (sendResult.status === 'PENDING' && sendResult.hash) {
    let receipt = await server.getTransaction(sendResult.hash);
    let attempts = 0;
    while (receipt.status === 'NOT_FOUND' && attempts < 30) {
      await new Promise(r => setTimeout(r, 1000));
      receipt = await server.getTransaction(sendResult.hash);
      attempts++;
    }
    if (receipt.status === 'NOT_FOUND' || receipt.status === 'FAILED') {
      return NextResponse.json({ error: `set_root TX ${receipt.status}` }, { status: 500 });
    }
    return NextResponse.json({ success: true, hash: sendResult.hash });
  }

  return NextResponse.json({ error: `set_root send failed: ${sendResult.status}` }, { status: 500 });
}

async function handleInitPool(
  server: rpc.Server,
  deployer: Keypair,
  sourceAccount: Account,
  body: Record<string, unknown>
) {
  const { commitmentHex, labelHex } = body as {
    commitmentHex?: string;
    labelHex?: string;
  };

  if (!commitmentHex || commitmentHex.length !== 64) {
    return NextResponse.json({ error: 'Invalid commitmentHex (must be 64 hex chars)' }, { status: 400 });
  }
  if (!labelHex || labelHex.length !== 64) {
    return NextResponse.json({ error: 'Invalid labelHex (must be 64 hex chars)' }, { status: 400 });
  }

  const steps: string[] = [];

  // Step 1: Set the state root (the Poseidon commitment itself for a 1-leaf tree)
  const stateRootBytes = Buffer.from(commitmentHex, 'hex');
  const stateRootTx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'set_root',
      args: [xdr.ScVal.scvBytes(stateRootBytes)],
    }))
    .setTimeout(30)
    .build();

  const stateRootSim = await server.simulateTransaction(stateRootTx);
  if (rpc.Api.isSimulationError(stateRootSim)) {
    const errMsg = stateRootSim.error;
    const isAuthError = errMsg.includes('OnlyPostman');
    return NextResponse.json({
      error: `set_root simulation failed: ${errMsg.substring(0, 200)}`,
      errorCode: isAuthError ? 'not_authorized' : 'simulation_error',
    }, { status: 400 });
  }

  const preparedStateRoot = rpc.assembleTransaction(stateRootTx, stateRootSim).build();
  preparedStateRoot.sign(deployer);
  const stateRootResult = await server.sendTransaction(preparedStateRoot);

  if (stateRootResult.status === 'PENDING' && stateRootResult.hash) {
    let receipt = await server.getTransaction(stateRootResult.hash);
    let attempts = 0;
    while (receipt.status === 'NOT_FOUND' && attempts < 30) {
      await new Promise(r => setTimeout(r, 1000));
      receipt = await server.getTransaction(stateRootResult.hash);
      attempts++;
    }
    if (receipt.status === 'FAILED') {
      return NextResponse.json({ error: `set_root TX failed: ${stateRootResult.hash}` }, { status: 500 });
    }
    steps.push(`State root set: ${stateRootResult.hash.slice(0, 16)}...`);
  } else {
    return NextResponse.json({ error: `set_root failed: ${stateRootResult.status}` }, { status: 500 });
  }

  // Step 2: Update the allowlist root to match the label (for single-label tree)
  const newSource = await server.getAccount(deployer.publicKey());
  const allowlistTx = new TransactionBuilder(newSource, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'update_allowlist_root',
      args: [xdr.ScVal.scvBytes(Buffer.from(labelHex, 'hex'))],
    }))
    .setTimeout(30)
    .build();

  try {
    const allowlistSim = await server.simulateTransaction(allowlistTx);
    if (!rpc.Api.isSimulationError(allowlistSim)) {
      const preparedAllowlist = rpc.assembleTransaction(allowlistTx, allowlistSim).build();
      preparedAllowlist.sign(deployer);
      const allowlistResult = await server.sendTransaction(preparedAllowlist);
      if (allowlistResult.status === 'PENDING' && allowlistResult.hash) {
        let receipt = await server.getTransaction(allowlistResult.hash);
        let attempts = 0;
        while (receipt.status === 'NOT_FOUND' && attempts < 30) {
          await new Promise(r => setTimeout(r, 1000));
          receipt = await server.getTransaction(allowlistResult.hash);
          attempts++;
        }
        if (receipt.status !== 'FAILED') {
          steps.push(`Allowlist root set: ${allowlistResult.hash.slice(0, 16)}...`);
        }
      }
    }
  } catch {
    steps.push('Allowlist root: skipped');
  }

  // Step 3: Update ASP root
  const aspSource = await server.getAccount(deployer.publicKey());
  const aspTx = new TransactionBuilder(aspSource, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'update_root',
      args: [
        xdr.ScVal.scvBytes(Buffer.from(labelHex, 'hex')),
        nativeToScVal('QmTest12345678901234567890123456789012345678901234567890', { type: 'string' }),
      ],
    }))
    .setTimeout(30)
    .build();

  try {
    const aspSim = await server.simulateTransaction(aspTx);
    if (!rpc.Api.isSimulationError(aspSim)) {
      const preparedAsp = rpc.assembleTransaction(aspTx, aspSim).build();
      preparedAsp.sign(deployer);
      const aspResult = await server.sendTransaction(preparedAsp);
      if (aspResult.status === 'PENDING' && aspResult.hash) {
        let receipt = await server.getTransaction(aspResult.hash);
        let attempts = 0;
        while (receipt.status === 'NOT_FOUND' && attempts < 30) {
          await new Promise(r => setTimeout(r, 1000));
          receipt = await server.getTransaction(aspResult.hash);
          attempts++;
        }
        if (receipt.status !== 'FAILED') {
          steps.push(`ASP root set: ${aspResult.hash.slice(0, 16)}...`);
        }
      }
    }
  } catch {
    steps.push('ASP root: skipped');
  }

  return NextResponse.json({
    success: true,
    steps,
    message: steps.join('\n'),
  });
}
