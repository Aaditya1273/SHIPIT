'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  isConnected,
  getAddress,
  signTransaction,
} from '@stellar/freighter-api';
import {
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  xdr,
  rpc,
  Operation,
  Address,
  Asset,
} from '@stellar/stellar-sdk';

import {
  BLS_SCALAR_FIELD as BLS_FIELD,
  bigintToHex,
  hashPrecommitment,
  hashCommitment,
  hashNullifier,
} from './poseidon';

const STELLAR_CONFIG = {
  networkPassphrase: 'Test SDF Network ; September 2015' as const,
  rpcUrl: 'https://soroban-testnet.stellar.org:443' as const,
  contractId: 'CAYDGB7SLRONSTM4G562HEGPECFJNQKGRTSY4ZUJPGFX33HOUNAEX5LW' as const,
  assetId: 'CAEPLVCK4VMA6HJDKYWBIAV7DE7EBQ6ZWUCEHQ22DEJHEPMNLFNX2YQ6' as const,
  maxDepth: 32,
  assetCode: 'ZKUSDC',
  assetIssuer: 'GDA3OLN4HZETWCSIJV6OMOXDWDTMIUZWHKGSHSYNW36WDAHPVCHJ47LL',
};

/** Generate a random 31-byte bigint */
function rand31(): bigint {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  return BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
}

export default function StellarDemoPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusSeverity, setStatusSeverity] = useState<'info' | 'success' | 'error' | 'warning'>('info');

  // Deposit params
  const [depositValue, setDepositValue] = useState('1000000000'); // stroops
  const [precommitmentHex, setPrecommitmentHex] = useState('');
  const [nullifier, setNullifier] = useState('');
  const [secret, setSecret] = useState('');
  const [labelField, setLabelField] = useState('');
  const [commitment, setCommitment] = useState('');
  const [scopeHex, setScopeHex] = useState('');

  // Step 2: Fund & Deposit
  const [faucetDone, setFaucetDone] = useState(false);
  const [trustlineDone, setTrustlineDone] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  const [depositTxHash, setDepositTxHash] = useState('');
  const [onChainCommitment, setOnChainCommitment] = useState('');

  // Step 3-4: Proof
  const [proofState, setProofState] = useState<{
    contextHex: string;
    nullifierHashHex: string;
  } | null>(null);
  const [proofResult, setProofResult] = useState<string>('');
  const [withdrawSubmitted, setWithdrawSubmitted] = useState(false);
  const [withdrawTxHash, setWithdrawTxHash] = useState('');

  // Step 4a: Pool initialization via relayer
  const [poolInitStatus, setPoolInitStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [poolInitSteps, setPoolInitSteps] = useState<string[]>([]);

  // Raw snarkjs proof data for withdrawal submission
  const [rawProofData, setRawProofData] = useState<{ proof: unknown; publicSignals: string[] } | null>(null);

  const serverRef = useRef(new rpc.Server(STELLAR_CONFIG.rpcUrl));
  const server = serverRef.current;

  // ─── Helpers ─────────────────────────────────────────────

  const setStatusMsg = useCallback((msg: string, severity: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setStatus(msg);
    setStatusSeverity(severity);
  }, []);

  /** Fetch contract scope (SHA256 of contract_id + network_id + asset) */
  const fetchScope = useCallback(async (): Promise<string> => {
    if (!publicKey) throw new Error('Not connected');
    const source = await server.getAccount(publicKey);
    const tx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.invokeContractFunction({
        contract: STELLAR_CONFIG.contractId,
        function: 'scope',
        args: [],
      }))
      .setTimeout(30)
      .build();
    const sim = await server.simulateTransaction(tx);
    // Check for simulation errors using the SDK's type guard
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error('Scope query: ' + sim.error);
    }
    if (!sim.result?.retval) throw new Error('No scope returned');
    const bytes = scValToNative(sim.result.retval) as number[];
    return Buffer.from(bytes).toString('hex');
  }, [publicKey, server]);

  /** Check user's ZKUSDC balance via SAC balance() */
  const fetchBalance = useCallback(async (): Promise<bigint> => {
    if (!publicKey) return 0n;
    try {
      const source = await server.getAccount(publicKey);
      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.invokeContractFunction({
          contract: STELLAR_CONFIG.assetId,
          function: 'balance',
          args: [new Address(publicKey).toScVal()],
        }))
        .setTimeout(30)
        .build();
      const sim = await server.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim)) return 0n;
      if (!sim.result?.retval) return 0n;
      return scValToNative(sim.result.retval) as bigint;
    } catch {
      return 0n;
    }
  }, [publicKey, server]);

  // ─── Auto-connect Freighter ──────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const resp = await isConnected();
        if (resp.isConnected) {
          const { address } = await getAddress();
          setPublicKey(address);
          setConnected(true);
        }
      } catch {
        // Freighter not available
      }
    })();
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      const { address } = await getAddress();
      setPublicKey(address);
      setConnected(true);
      setStatusMsg('Connected: ' + address, 'success');
    } catch {
      setStatusMsg('Please install Freighter wallet extension', 'error');
    }
  }, [setStatusMsg]);

  // ─── Step 1: Generate Deposit Parameters ────────────────

  const genDepositParams = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setStatusMsg('Generating deposit parameters...\nFetching contract scope...', 'info');
    try {
      // Fetch the actual scope from the contract
      const scope = await fetchScope();
      setScopeHex(scope);

      // Generate random values
      const nullifierBig = rand31();
      const secretBig = rand31();
      const valueBig = BigInt(depositValue);

      // Compute label: SHA256(scope || nonce:0) -> reduce to BLS field
      const nonce = 0n;
      const nonceBuf = Buffer.alloc(8);
      nonceBuf.writeBigUInt64BE(nonce);
      const scopeBuf = Buffer.from(scope, 'hex');
      const { createHash } = await import('crypto');
      const labelDigest = createHash('sha256').update(Buffer.concat([scopeBuf, nonceBuf])).digest();
      const label = BigInt('0x' + labelDigest.toString('hex')) % BLS_FIELD;

      // Real Poseidon hashing matching the circuit:
      //   precommitment = Poseidon([nullifier, secret])
      //   commitment    = Poseidon([value, label, precommitment])
      //   nullifierHash = Poseidon([nullifier])
      const precommitment = hashPrecommitment(nullifierBig, secretBig);
      const comm = hashCommitment(valueBig, label, precommitment);
      const nh = hashNullifier(nullifierBig);

      setNullifier(nullifierBig.toString());
      setSecret(secretBig.toString());
      setLabelField(label.toString());
      setPrecommitmentHex(bigintToHex(precommitment));
      setCommitment(comm.toString());

      setStatusMsg(
        `✅ Parameters generated!\n` +
        `Precommitment: ${bigintToHex(precommitment)}\n` +
        `Commitment: ${comm.toString()}\n` +
        `NullifierHash: ${nh.toString()}\n` +
        `Label: ${label.toString()}`,
        'success'
      );
      setActiveStep(1);
    } catch (e) {
      setStatusMsg('Error: ' + (e as Error).message, 'error');
    }
    setLoading(false);
  }, [depositValue, publicKey, fetchScope]);

  // ─── Step 2: Fund Wallet ──────────────────────────────────

  const handleFaucet = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setStatusMsg('Requesting test ZKUSDC tokens...', 'info');
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: publicKey }),
      });
      const data = await res.json();
      if (data.success) {
        setFaucetDone(true);
        // Refresh balance
        const bal = await fetchBalance();
        setBalance(bal.toString());
        setStatusMsg(
          `✅ Received ${(BigInt(data.amount) / 10_000_000n).toString()} ZKUSDC! TX: ${data.hash.slice(0, 16)}...\n` +
          `Balance: ${(bal / 10_000_000n).toString()} ZKUSDC`,
          'success'
        );
      } else {
        throw new Error(data.error || 'Faucet request failed');
      }
    } catch (e) {
      setStatusMsg('Faucet error: ' + (e as Error).message, 'error');
    }
    setLoading(false);
  }, [publicKey, fetchBalance]);

  const handleEstablishTrustline = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setStatusMsg('Establishing trustline for ZKUSDC...\nYou may need to approve in Freighter.', 'info');
    try {
      const sourceAccount = await server.getAccount(publicKey);

      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: STELLAR_CONFIG.networkPassphrase,
      })
        .addOperation(Operation.changeTrust({
          asset: new Asset(STELLAR_CONFIG.assetCode, STELLAR_CONFIG.assetIssuer),
          limit: '10000000000',
        }))
        .setTimeout(30)
        .build();

      const signedResult = await signTransaction(tx.toXDR(), {
        networkPassphrase: STELLAR_CONFIG.networkPassphrase,
      });
      const signedXdr = (signedResult as { signedTxXdr: string }).signedTxXdr;
      const signedTx = TransactionBuilder.fromXDR(signedXdr, STELLAR_CONFIG.networkPassphrase);

      const result = (await server.sendTransaction(signedTx)) as unknown as {
        status: string; hash: string; errorString?: string;
      };
      if (result.status === 'PENDING') {
        let receipt = await server.getTransaction(result.hash);
        while (receipt.status === 'NOT_FOUND') {
          await new Promise(r => setTimeout(r, 1000));
          receipt = await server.getTransaction(result.hash);
        }
        if (receipt.status === 'FAILED') {
          throw new Error(`Trustline TX failed`);
        }
        setTrustlineDone(true);
        // Refresh balance after trustline is set
        try { const bal = await fetchBalance(); setBalance(bal.toString()); } catch { /* ignore */ }
        setStatusMsg('Trustline established successfully! ✅', 'success');
      } else {
        throw new Error('Trustline send failed: ' + result.errorString);
      }
    } catch (e) {
      setStatusMsg('Trustline error: ' + (e as Error).message, 'error');
    }
    setLoading(false);
  }, [publicKey, server]);

  // ─── Step 2b: Submit Deposit ──────────────────────────────

  const buildContractCall = useCallback(async (method: string, args: xdr.ScVal[]) => {
    if (!publicKey) throw new Error('Not connected');

    const sourceAccount = await server.getAccount(publicKey);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.invokeContractFunction({
        contract: STELLAR_CONFIG.contractId,
        function: method,
        args,
      }))
      .setTimeout(30)
      .build();

    const simulated = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error('Simulation: ' + simulated.error);
    }

    const prepared = rpc.assembleTransaction(tx, simulated).build();
    const signedResult = await signTransaction(prepared.toXDR(), {
      networkPassphrase: STELLAR_CONFIG.networkPassphrase,
    });
    const signedXdr = (signedResult as { signedTxXdr: string }).signedTxXdr;
    const signedTx = TransactionBuilder.fromXDR(signedXdr, STELLAR_CONFIG.networkPassphrase);

    const result = (await server.sendTransaction(signedTx)) as unknown as {
      status: string; hash: string; errorString?: string;
    };

    if (result.status === 'PENDING') {
      const hash = result.hash;
      setDepositTxHash(hash);
      let receipt = await server.getTransaction(hash);
      while (receipt.status === 'NOT_FOUND') {
        await new Promise(r => setTimeout(r, 1000));
        receipt = await server.getTransaction(hash);
      }
      if (receipt.status === 'FAILED') {
        throw new Error(`TX failed: ${hash}`);
      }
      // Return the raw return value for parsing
      return receipt.returnValue ? scValToNative(receipt.returnValue) as unknown : null;
    }
    throw new Error('Send failed: ' + result.errorString);
  }, [publicKey, server]);

  const handleDeposit = useCallback(async () => {
    if (!publicKey || !precommitmentHex) return;
    setLoading(true);
    setStatusMsg('Submitting deposit...\nPlease approve in Freighter.', 'info');
    try {
      // Check balance first
      const bal = await fetchBalance();
      const val = BigInt(depositValue);
      if (bal < val) {
        throw new Error(
          `Insufficient balance: you have ${(bal / 10_000_000n).toString()} ZKUSDC ` +
          `but need ${(val / 10_000_000n).toString()} ZKUSDC. ` +
          `Use the faucet to get test tokens first.`
        );
      }

      const addrScVal = new Address(publicKey).toScVal();
      const valueScVal = nativeToScVal(val, { type: 'i128' });
      const precommitScVal = xdr.ScVal.scvBytes(Buffer.from(precommitmentHex, 'hex'));

      const commitmentBytes = await buildContractCall('deposit', [addrScVal, valueScVal, precommitScVal]) as number[];

      // Convert the returned bytes to hex
      const commitmentHex = Buffer.from(commitmentBytes).toString('hex');
      const commitmentBig = BigInt('0x' + commitmentHex);

      setOnChainCommitment(commitmentHex);

      setStatusMsg(
        `✅ Deposit successful!\n` +
        `On-chain commitment: ${commitmentBig.toString()}`,
        'success'
      );
      setActiveStep(2);
    } catch (e) {
      const errMsg = (e as Error).message;
      if (errMsg.includes('not within the allowed range') || errMsg.includes('balance')) {
        setStatusMsg(
          '❌ Deposit failed: Insufficient ZKUSDC balance.\n' +
          'Click "Get Test Tokens (Faucet)" first, then establish a trustline.',
          'error'
        );
      } else {
        setStatusMsg('Deposit error: ' + errMsg, 'error');
      }
    }
    setLoading(false);
  }, [publicKey, precommitmentHex, depositValue, buildContractCall, fetchBalance]);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    const bal = await fetchBalance();
    setBalance(bal.toString());
    setStatusMsg(`Balance: ${(bal / 10_000_000n).toString()} ZKUSDC`, bal > 0n ? 'success' : 'info');
  }, [publicKey, fetchBalance]);

  // ─── Step 3: Generate Proof Parameters ───────────────────

  const handleGenerateProof = useCallback(async () => {
    setLoading(true);
    setStatusMsg('Generating zero-knowledge proof parameters...', 'info');
    try {
      const value = BigInt(depositValue);
      const nullifierBig = BigInt(nullifier);
      const label = BigInt(labelField);
      const scope = scopeHex;

      // Compute context: SHA256(data || scope) -> reduce to BLS field
      // where data = label_32bytes || value_32bytes (both encoded as 32-byte field elements)
      const dataBuf = Buffer.concat([
        Buffer.from(bigintToHex(label, 32), 'hex'),
        Buffer.from(bigintToHex(value, 32), 'hex'),
      ]);
      const scopeBuf = Buffer.from(scope, 'hex');
      const { createHash } = await import('crypto');
      const ctxDigest = createHash('sha256').update(Buffer.concat([dataBuf, scopeBuf])).digest();
      const context = BigInt('0x' + ctxDigest.toString('hex')) % BLS_FIELD;

      // Compute nullifierHash = Poseidon([nullifier])
      const nh = hashNullifier(nullifierBig);

      setProofState({
        contextHex: bigintToHex(context),
        nullifierHashHex: bigintToHex(nh),
      });

      setStatusMsg(
        '✅ Proof parameters ready!\n' +
        `Context: ${bigintToHex(context)}\n` +
        `NullifierHash: ${bigintToHex(nh)}\n\n` +
        `For full Groth16 proving, run:\n` +
        `  node packages/sdk/scripts/zkpay-e2e.mjs gen-proof`,
        'success'
      );
      setActiveStep(3);
    } catch (e) {
      setStatusMsg('Proof gen error: ' + (e as Error).message, 'error');
    }
    setLoading(false);
  }, [nullifier, depositValue, labelField, scopeHex]);

  // ─── Step 4: Browser-based Groth16 Proof ─────────────────

  const handleBrowserProof = useCallback(async () => {
    setLoading(true);
    setStatusMsg('Loading snarkjs and circuit artifacts...', 'info');
    try {
      const snarkjs = await import('snarkjs');

      // Fetch circuit artifacts from /circuits/ directory
      const wasmResp = await fetch('/circuits/withdraw.wasm');
      const zkeyResp = await fetch('/circuits/withdraw.zkey');

      if (!wasmResp.ok || !zkeyResp.ok) {
        setStatusMsg(
          'Circuit artifacts not found in /public/circuits/.\n' +
          'Copy from packages/circuits/build/withdraw_bls/ to public/circuits/\n' +
          'or use the CLI: node packages/sdk/scripts/zkpay-e2e.mjs gen-proof',
          'warning'
        );
        setLoading(false);
        return;
      }

      const wasmBuf = await wasmResp.arrayBuffer();
      const zkeyBuf = await zkeyResp.arrayBuffer();

      const value = BigInt(depositValue);
      const nullifierBig = BigInt(nullifier);
      const secretBig = BigInt(secret);
      const label = BigInt(labelField);

      // Generate new nullifier/secret for the remaining balance
      const newNullifier = rand31();
      const newSecret = rand31();

      // Convert hex context to decimal string (snarkjs expects decimal, not hex)
      const ctxDecimal = proofState?.contextHex
        ? BigInt('0x' + proofState.contextHex).toString()
        : '0';

      // Recompute the commitment (state root for 1-leaf tree = leaf itself)
      const precommitmentVal = hashPrecommitment(nullifierBig, secretBig);
      const existingCommitment = hashCommitment(value, label, precommitmentVal);

      // For a single-leaf LeanIMT, the root equals the leaf itself
      // (because there are no siblings to hash with — the leaf propagates up)
      const stateRootDecimal = existingCommitment.toString();
      // For a single-label ASP tree, the root equals the label itself
      const aspRootDecimal = label.toString();

      // Build circuit input matching the withdraw.circom template (Withdraw(maxTreeDepth=32))
      const circuitInput = {
        withdrawnValue: value.toString(),
        stateRoot: stateRootDecimal,
        stateTreeDepth: '0',
        ASPRoot: aspRootDecimal,
        ASPTreeDepth: '0',
        context: ctxDecimal,
        label: label.toString(),
        existingValue: value.toString(),
        existingNullifier: nullifierBig.toString(),
        existingSecret: secretBig.toString(),
        newNullifier: newNullifier.toString(),
        newSecret: newSecret.toString(),
        stateSiblings: Array(STELLAR_CONFIG.maxDepth).fill('0'),
        stateIndex: '0',
        ASPSiblings: Array(STELLAR_CONFIG.maxDepth).fill('0'),
        ASPIndex: '0',
      };

      setStatusMsg('Generating Groth16 proof in browser (may take a moment)...', 'info');

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInput,
        new Uint8Array(wasmBuf) as unknown as Parameters<typeof snarkjs.groth16.fullProve>[1],
        new Uint8Array(zkeyBuf) as unknown as Parameters<typeof snarkjs.groth16.fullProve>[2]
      );

      setProofResult(JSON.stringify({ proof, publicSignals }, null, 2));
      setRawProofData({ proof: proof as unknown, publicSignals });
      setStatusMsg('✅ Groth16 proof generated in browser!', 'success');
      setActiveStep(4);
    } catch (e) {
      setStatusMsg('Browser proof error: ' + (e as Error).message, 'error');
    }
    setLoading(false);
  }, [nullifier, secret, depositValue, labelField, proofState]);

  // ─── Step 4b: Submit Withdrawal to Contract ───────────────

  /** Convert a snarkjs G1 proof point {pi_a/pi_c} to 96-byte hex (x_48 || y_48) */
  function g1ToHex(p: string[]): string {
    return bigintToHex(BigInt(p[0]), 48) + bigintToHex(BigInt(p[1]), 48);
  }

  /** Convert a snarkjs G2 proof point {pi_b} to 192-byte hex (x1_48 || x0_48 || y1_48 || y0_48) */
  function g2ToHex(p: string[][]): string {
    const x0 = BigInt(p[0][0]);
    const x1 = BigInt(p[0][1]);
    const y0 = BigInt(p[1][0]);
    const y1 = BigInt(p[1][1]);
    // Soroban BLS12-381 expects Fp2 as c1 (imaginary) || c0 (real)
    return bigintToHex(x1, 48) + bigintToHex(x0, 48) + bigintToHex(y1, 48) + bigintToHex(y0, 48);
  }

  // ─── Step 4a: Initialize Pool via Relayer ───────────────

  const handleInitPool = useCallback(async () => {
    if (!publicKey || !commitment || !labelField) return;
    setLoading(true);
    setPoolInitStatus('pending');
    setStatusMsg('Initializing pool: setting Merkle root on-chain via relayer...', 'info');
    try {
      const commHex = bigintToHex(BigInt(commitment), 32);
      const labelHex = bigintToHex(BigInt(labelField), 32);

      const res = await fetch('/api/relayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'init-pool',
          commitmentHex: commHex,
          labelHex: labelHex,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const steps = data.steps || [];
        setPoolInitSteps(steps);
        setPoolInitStatus('done');
        setStatusMsg(
          `✅ Pool initialized!\n${steps.join('\n')}`,
          'success'
        );
      } else {
        setPoolInitStatus('error');
        if (data.errorCode === 'not_authorized' || data.error?.includes('OnlyPostman')) {
          setStatusMsg(
            '⚠️ Deployer secret not available or not configured as postman.\n' +
            'Please ensure STELLAR_DEPLOYER_SECRET is set in your .env.local file.',
            'warning'
          );
        } else {
          throw new Error(data.error || 'Pool init failed');
        }
      }
    } catch (e) {
      setPoolInitStatus('error');
      setStatusMsg('Pool init error: ' + (e as Error).message, 'error');
    }
    setLoading(false);
  }, [publicKey, commitment, labelField]);

  // ─── Step 4b: Submit Withdrawal to Contract ───────────────

  const handleSubmitWithdrawal = useCallback(async () => {
    if (!publicKey) {
      setStatusMsg('❌ Not connected to Freighter. Please connect your wallet.', 'error');
      return;
    }
    if (!rawProofData) {
      setStatusMsg(
        '❌ No proof data found. Go back to Step 3 and click "Generate Groth16 Proof in Browser" first.',
        'error'
      );
      return;
    }
    if (!scopeHex) {
      setStatusMsg('❌ Contract scope not set. Go back to Step 1 and regenerate parameters.', 'error');
      return;
    }
    setLoading(true);
    setStatusMsg('Submitting withdrawal to Soroban contract...\nPlease approve in Freighter.', 'info');
    try {
      const rawProof = rawProofData.proof as {
        pi_a: string[];
        pi_b: string[][];
        pi_c: string[];
      };
      const rawSignals = rawProofData.publicSignals as string[];

      // Convert snarkjs proof to flat byte format
      const flatA = g1ToHex(rawProof.pi_a);
      const flatB = g2ToHex(rawProof.pi_b);
      const flatC = g1ToHex(rawProof.pi_c);

      // Build exactly 10 public signals as 32-byte hex (contract requires exactly 10)
      // Signals [0-7] from the circuit (decimal strings → convert to hex)
      // Signal  [8] = allowlist root (must match on-chain AllowlistRoot set by relayer)
      // Signal  [9] = ciphertext for auditor (not implemented yet, use zero)
      const flatSignals = rawSignals.slice(0, 8).map(s => bigintToHex(BigInt(s)));
      flatSignals.push(bigintToHex(BigInt(labelField), 32)); // [8] allowlist root
      flatSignals.push(bigintToHex(0n));                      // [9] ciphertext

      // Build withdrawal data: label_32bytes || value_32bytes = 64 bytes
      const value = BigInt(depositValue);
      const label = BigInt(labelField);
      const dataHex = bigintToHex(label, 32) + bigintToHex(value, 32);

      // Build the FlatWithdrawProof ScVal
      // Withdrawal struct: { processooor: Address, data: BytesN<64> }
      // ⚠️ ScMap entries MUST be sorted alphabetically by key!
      const processooorAddr = new Address(publicKey);
      const withdrawalScVal = xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('data'),
          val: xdr.ScVal.scvBytes(Buffer.from(dataHex, 'hex')),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('processooor'),
          val: processooorAddr.toScVal(),
        }),
      ]);

      // FlatWithdrawProof struct: { proof: FlatGroth16Proof, pub_signals: Vec<BytesN<32>> }
      // Keys: 'proof' < 'pub_signals' (sorted alphabetically) ✓
      const proofScVal = xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('proof'),
          val: xdr.ScVal.scvMap([
            // Inner FlatGroth16Proof keys: 'a', 'b', 'c' (sorted) ✓
            new xdr.ScMapEntry({
              key: xdr.ScVal.scvSymbol('a'),
              val: xdr.ScVal.scvBytes(Buffer.from(flatA, 'hex')),
            }),
            new xdr.ScMapEntry({
              key: xdr.ScVal.scvSymbol('b'),
              val: xdr.ScVal.scvBytes(Buffer.from(flatB, 'hex')),
            }),
            new xdr.ScMapEntry({
              key: xdr.ScVal.scvSymbol('c'),
              val: xdr.ScVal.scvBytes(Buffer.from(flatC, 'hex')),
            }),
          ]),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('pub_signals'),
          val: xdr.ScVal.scvVec(flatSignals.map(s => xdr.ScVal.scvBytes(Buffer.from(s, 'hex')))),
        }),
      ]);

      // Submit the withdrawal
      const sourceAccount = await server.getAccount(publicKey);
      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.invokeContractFunction({
          contract: STELLAR_CONFIG.contractId,
          function: 'withdraw',
          args: [withdrawalScVal, proofScVal],
        }))
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(tx);

      // Check simulation for specific errors
      if (rpc.Api.isSimulationError(simulated)) {
        const errMsg = simulated.error;
        if (errMsg.includes('UnknownStateRoot') || errMsg.includes('error code 5')) {
          throw new Error(
            'Merkle root not set on-chain. ' +
            'The relayer must call set_root() first. ' +
            'Run: node packages/sdk/scripts/zkpay-e2e.mjs set-root'
          );
        }
        throw new Error('Withdraw simulation: ' + errMsg);
      }

      const prepared = rpc.assembleTransaction(tx, simulated).build();
      const signedResult = await signTransaction(prepared.toXDR(), {
        networkPassphrase: STELLAR_CONFIG.networkPassphrase,
      });
      const signedXdr = (signedResult as { signedTxXdr: string }).signedTxXdr;
      const signedTx = TransactionBuilder.fromXDR(signedXdr, STELLAR_CONFIG.networkPassphrase);

      const result = (await server.sendTransaction(signedTx)) as unknown as {
        status: string; hash: string; errorString?: string;
      };

      if (result.status === 'PENDING') {
        const hash = result.hash;
        setWithdrawTxHash(hash);
        let receipt = await server.getTransaction(hash);
        while (receipt.status === 'NOT_FOUND') {
          await new Promise(r => setTimeout(r, 1000));
          receipt = await server.getTransaction(hash);
        }
        if (receipt.status === 'FAILED') {
          throw new Error(`Withdraw TX failed: ${hash}`);
        }
        setWithdrawSubmitted(true);
        setStatusMsg(
          `✅ Withdrawal submitted on-chain!\n` +
          `TX: ${hash.slice(0, 24)}...`,
          'success'
        );
      } else {
        throw new Error('Send failed: ' + result.errorString);
      }
    } catch (e) {
      const errMsg = (e as Error).message;
      // Detect common errors
      if (errMsg.includes('UnknownStateRoot') || errMsg.includes('root not set')) {
        setStatusMsg(
          '⚠️ Withdrawal simulation failed: Merkle root not set.\n' +
          'The relayer must register the state root first.\n' +
          'Run: node packages/sdk/scripts/zkpay-e2e.mjs set-root\n' +
          'Then try again.',
          'warning'
        );
      } else {
        setStatusMsg('Withdraw error: ' + errMsg, 'error');
      }
    }
    setLoading(false);
  }, [publicKey, depositValue, labelField, scopeHex, server, rawProofData]);

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom fontWeight="bold">
        ZK-Pay on Stellar
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Zero-Knowledge Privacy Pool powered by BLS12-381 Groth16 on Soroban
      </Typography>

      {/* ─── Wallet / Contract Header ──────────────────── */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="body2" color="text.secondary">Contract</Typography>
            <Typography variant="body1" fontFamily="monospace" fontSize="0.8rem">
              {STELLAR_CONFIG.contractId}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Asset</Typography>
            <Typography variant="body1">ZKUSDC (Testnet)</Typography>
          </Box>
          {connected ? (
            <Chip
              label={`Connected: ${publicKey?.slice(0, 8)}...`}
              color="success"
              onDelete={async () => {
                setPublicKey(null);
                setConnected(false);
                setActiveStep(0);
              }}
            />
          ) : (
            <Button variant="contained" onClick={handleConnect}>
              Connect Freighter
            </Button>
          )}
        </Box>
      </Paper>

      {/* ─── Stepper ───────────────────────────────────── */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {['Generate Params', 'Fund & Deposit', 'Generate Proof', 'Withdraw'].map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {/* ─── Status / Progress ─────────────────────────── */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {status && (
        <Alert
          severity={statusSeverity}
          sx={{ mb: 2, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem' }}
        >
          {status}
        </Alert>
      )}

      {/* ═══ Step 0: Generate Params ═══════════════════════ */}
      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Step 1: Generate Deposit Parameters</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the deposit amount in stroops (1 ZKUSDC = 10,000,000 stroops).
              Default: 100 ZKUSDC = 1,000,000,000 stroops.
            </Typography>
            <TextField
              fullWidth
              label="Deposit Value (stroops)"
              value={depositValue}
              onChange={e => setDepositValue(e.target.value)}
              sx={{ mb: 2 }}
              disabled={loading}
              helperText="In smallest unit (stroops, 7 decimals)"
            />
            <Button
              variant="contained"
              onClick={genDepositParams}
              disabled={loading || !connected}
              size="large"
            >
              Generate Parameters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══ Step 1: Fund & Deposit ════════════════════════ */}
      {activeStep >= 1 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Step 2: Fund Wallet &amp; Deposit</Typography>
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem' }}>
              ZKUSDC is a Stellar Asset Contract (SAC). Follow these steps in order:
              <ol style={{ margin: '4px 0', paddingLeft: '1.2rem' }}>
                <li>Get test tokens from the faucet</li>
                <li>Establish a trustline for <strong>{STELLAR_CONFIG.assetCode}</strong></li>
                <li>Submit the deposit transaction</li>
              </ol>
            </Alert>

            {/* Deposit params summary */}
            <Box sx={{
              mb: 2, fontFamily: 'monospace', fontSize: '0.75rem',
              bgcolor: 'grey.900', color: 'limegreen', p: 1.5, borderRadius: 1,
            }}>
              <Typography variant="body2" sx={{ color: 'limegreen' }}>
                Precommitment: {precommitmentHex.slice(0, 24)}...
              </Typography>
              <Typography variant="body2" sx={{ color: 'limegreen' }}>
                Commitment: {commitment.slice(0, 24)}...
              </Typography>
              {onChainCommitment && (
                <Typography variant="body2" sx={{ color: 'cyan' }}>
                  On-chain: {BigInt('0x' + onChainCommitment).toString().slice(0, 24)}...
                </Typography>
              )}
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Button
                variant={faucetDone ? 'contained' : 'outlined'}
                color={faucetDone ? 'success' : 'primary'}
                onClick={handleFaucet}
                disabled={loading || faucetDone}
              >
                {faucetDone ? '✓ Tokens Received' : 'Get Test Tokens (Faucet)'}
              </Button>
              <Button
                variant={trustlineDone ? 'contained' : 'outlined'}
                color={trustlineDone ? 'success' : 'primary'}
                onClick={handleEstablishTrustline}
                disabled={loading || trustlineDone}
              >
                {trustlineDone ? '✓ Trustline Set' : 'Establish Trustline'}
              </Button>
              <Button
                variant="outlined"
                onClick={refreshBalance}
                disabled={loading}
              >
                Check Balance
              </Button>
            </Box>

            {balance !== '0' && (
              <Alert severity="success" sx={{ mb: 2, fontSize: '0.85rem' }}>
                Balance: {(BigInt(balance) / 10_000_000n).toString()} ZKUSDC
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleDeposit}
              disabled={loading || !precommitmentHex || !faucetDone || !trustlineDone}
              fullWidth
            >
              {!faucetDone || !trustlineDone
                ? 'Complete Faucet + Trustline First'
                : onChainCommitment
                  ? '✅ Deposit Complete'
                  : 'Submit Deposit'}
            </Button>

            {depositTxHash && (
              <Alert severity="success" sx={{ mt: 2, fontSize: '0.85rem' }}>
                Deposit TX: {depositTxHash.slice(0, 24)}...
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ Step 2: Generate Proof ════════════════════════ */}
      {activeStep >= 2 && (onChainCommitment || depositTxHash) && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Step 3: Generate Withdraw Proof</Typography>
            {!proofState ? (
              <Button
                variant="contained"
                onClick={handleGenerateProof}
                disabled={loading}
                size="large"
              >
                Generate Proof Parameters
              </Button>
            ) : (
              <>
                <Alert severity="success" sx={{ mb: 2, fontSize: '0.85rem' }}>
                  Withdrawal proof parameters ready.
                </Alert>
                <Box sx={{
                  fontFamily: 'monospace', fontSize: '0.75rem',
                  bgcolor: 'grey.900', color: 'limegreen', p: 1.5, borderRadius: 1, mb: 2,
                }}>
                  <Typography sx={{ color: 'limegreen' }}>
                    Context: {proofState.contextHex.slice(0, 32)}...
                  </Typography>
                  <Typography sx={{ color: 'limegreen' }}>
                    NullifierHash: {proofState.nullifierHashHex.slice(0, 32)}...
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Full Groth16 Proof (Browser)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Requires circuit artifacts (withdraw.wasm + withdraw.zkey) in <code>public/circuits/</code>.
                  Copy from <code>packages/circuits/build/withdraw_bls/</code>.
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleBrowserProof}
                  disabled={loading}
                >
                  Generate Groth16 Proof in Browser
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Or use the CLI: <code>node packages/sdk/scripts/zkpay-e2e.mjs gen-proof</code>
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ Step 3: Withdraw ═══════════════════════════════ */}
      {activeStep >= 3 && proofState && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Step 4: Submit Withdrawal</Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              The withdrawal submits the Groth16 proof to the Soroban contract,
              which verifies it using BLS12-381 host functions (CAP-0059).
            </Alert>

            {/* Relayer: Initialize Pool & Set Root */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Step 4a: Initialize Pool (Set Merkle Root)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Before the withdrawal can verify, the relayer must register the
              Merkle root on-chain via <code>set_root()</code>. This requires the
              deployer secret configured in the server.
            </Typography>

            {poolInitStatus === 'idle' && (
              <Button
                variant="contained"
                color="warning"
                size="large"
                onClick={handleInitPool}
                disabled={loading}
                fullWidth
                sx={{ mb: 2 }}
              >
                Initialize Pool &amp; Set Root
              </Button>
            )}

            {poolInitStatus === 'pending' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Setting Merkle root on-chain... (may take a moment)
              </Alert>
            )}

            {poolInitStatus === 'done' && (
              <Alert severity="success" sx={{ mb: 2 }}>
                ✅ Pool initialized! Roots are set.
                {poolInitSteps.length > 0 && (
                  <ul style={{ margin: '4px 0', paddingLeft: '1.2rem' }}>
                    {poolInitSteps.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                )}
              </Alert>
            )}

            {poolInitStatus === 'error' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Pool init failed. Make sure STELLAR_DEPLOYER_SECRET is set in .env.local.
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Step 4b: Submit Withdrawal
            </Typography>

            {!withdrawSubmitted && !withdrawTxHash && (
              <>
                <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem' }}>
                  Submit the zero-knowledge proof to the Privacy Pool contract.
                  The contract will verify the proof and transfer ZKUSDC to your wallet.
                </Alert>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSubmitWithdrawal}
                  disabled={loading || poolInitStatus !== 'done' || !rawProofData}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {poolInitStatus !== 'done'
                    ? 'Initialize Pool First (Step 4a above)'
                    : !rawProofData
                      ? 'Generate Groth16 Proof in Browser First (Step 3)'
                      : 'Submit Withdrawal to Stellar'}
                </Button>
              </>
            )}

            {withdrawSubmitted && (
              <Alert severity="success" sx={{ mb: 2 }}>
                ✅ Withdrawal submitted to the Stellar network!
              </Alert>
            )}

            {withdrawTxHash && !withdrawSubmitted && (
              <Alert severity="success" sx={{ mb: 2, fontSize: '0.85rem' }}>
                TX: {withdrawTxHash.slice(0, 24)}...
              </Alert>
            )}

            {proofResult && (
              <Box sx={{
                fontFamily: 'monospace', fontSize: '0.7rem',
                bgcolor: 'grey.900', color: '#aaa', p: 1.5, borderRadius: 1,
                maxHeight: 200, overflow: 'auto', mb: 2,
              }}>
                <pre>{proofResult.slice(0, 1500)}</pre>
              </Box>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Alternative: use the CLI — <code>node packages/sdk/scripts/zkpay-e2e.mjs submit-withdraw</code>
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* ─── Footer ─────────────────────────────────────── */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Powered by Soroban (Stellar Smart Contracts) + Groth16 BLS12-381 zk-SNARKs
        </Typography>
      </Box>
    </Container>
  );
}
