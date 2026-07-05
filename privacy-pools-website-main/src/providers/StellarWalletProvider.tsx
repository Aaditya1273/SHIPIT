'use client';

import { createContext, useContext, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  signTransaction,
} from '@stellar/freighter-api';
import {
  TransactionBuilder,
  Networks,
  BASE_FEE,
  scValToNative,
  xdr,
  rpc,
  Operation,
} from '@stellar/stellar-sdk';

import { STELLAR_CONFIG } from '~/config/stellarConfig';

export interface StellarContextType {
  connected: boolean;
  publicKey: string | null;
  connectError: string | null;
  checkingFreighter: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  server: rpc.Server;
  contractId: string;
  isSubmitting: boolean;
  submitResult: { success: boolean; message: string } | null;
  callContract: (method: string, args: xdr.ScVal[]) => Promise<unknown>;
  clearSubmitResult: () => void;
}

const StellarContext = createContext<StellarContextType | null>(null);

export function useStellar(): StellarContextType {
  const ctx = useContext(StellarContext);
  if (!ctx) throw new Error('useStellar must be used within StellarWalletProvider');
  return ctx;
}

export function StellarWalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [checkingFreighter, setCheckingFreighter] = useState(false);
  const connectingRef = useRef(false);

  const server = useMemo(() => new rpc.Server(STELLAR_CONFIG.rpcUrl), []);
  const contractId = STELLAR_CONFIG.contractId;

  const clearSubmitResult = useCallback(() => setSubmitResult(null), []);

  useEffect(() => {
    (async () => {
      try {
        const resp = await isConnected();
        if (resp.isConnected) {
          const result = await getAddress();
          const addr = result.address || '';
          if (addr.startsWith('G') && addr.length === 56) {
            setPublicKey(addr);
            setConnected(true);
          }
        }
      } catch {
        // Freighter not available, nothing to auto-connect
      }
    })();
  }, []);

  const connect = useCallback(async () => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    setCheckingFreighter(true);
    setConnectError(null);

    try {
      // Step 1: Detect if Freighter is available by calling isConnected
      let connectedResp: { isConnected: boolean; error?: string };
      try {
        connectedResp = await isConnected();
      } catch {
        setConnectError('Freighter extension not detected. Please install Freighter from freighter.app');
        return;
      }

      if (connectedResp.error) {
        setConnectError('Freighter extension not detected. Please install Freighter from freighter.app');
        return;
      }

      // Step 2: Check if access is allowed
      let allowedResult: { isAllowed: boolean; error?: string };
      try {
        allowedResult = await isAllowed();
      } catch {
        setConnectError('Could not communicate with Freighter. Please refresh the page.');
        return;
      }

      if (allowedResult.error) {
        setConnectError('Freighter not responding. Make sure the extension is enabled.');
        return;
      }

      // Step 3: Request access (shows Freighter popup)
      if (!allowedResult.isAllowed) {
        try {
          const accessResult = await requestAccess();
          if (accessResult.error) {
            setConnectError('Access denied. Please approve the connection request in Freighter.');
            return;
          }
        } catch {
          setConnectError('Connection request timed out. Make sure Freighter is unlocked.');
          return;
        }
      }

      // Step 4: Get the public key
      let addrResult: { address: string; error?: string };
      try {
        addrResult = await getAddress();
      } catch {
        setConnectError('Failed to retrieve wallet address from Freighter.');
        return;
      }

      if (addrResult.error) {
        setConnectError('Failed to get address: ' + addrResult.error);
        return;
      }

      const addr = addrResult.address || '';
      if (!addr.startsWith('G') || addr.length !== 56) {
        setConnectError('Invalid Stellar address. Make sure Freighter is set to Testnet.');
        return;
      }

      setPublicKey(addr);
      setConnected(true);
      setConnectError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown connection error';
      setConnectError(msg);
    } finally {
      connectingRef.current = false;
      setCheckingFreighter(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setConnected(false);
    setConnectError(null);
  }, []);

  const callContract = useCallback(async (method: string, args: xdr.ScVal[]): Promise<unknown> => {
    if (!publicKey) throw new Error('Wallet not connected');

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const sourceAccount = await server.getAccount(publicKey);

      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.invokeContractFunction({
          contract: contractId,
          function: method,
          args,
        }))
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(tx);
      const simJson = JSON.parse(JSON.stringify(simulated));
      if (simJson.error) {
        throw new Error(`Simulation failed: ${simJson.error}`);
      }

      const prepared = rpc.assembleTransaction(tx, simulated).build();
      const signedResult = await signTransaction(prepared.toXDR(), { networkPassphrase: Networks.TESTNET });
      const signedXdr = (signedResult as { signedTxXdr: string }).signedTxXdr;
      const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);

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
          throw new Error(`Transaction failed: ${result.hash}`);
        }
        setSubmitResult({ success: true, message: `${method} transaction submitted successfully` });
        return receipt.returnValue ? scValToNative(receipt.returnValue) : null;
      }
      throw new Error(`Send failed: ${result.errorString || 'unknown error'}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Contract call failed';
      setSubmitResult({ success: false, message: msg });
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, [publicKey, server, contractId]);

  const value = useMemo(() => ({
    connected,
    publicKey,
    connectError,
    checkingFreighter,
    connect,
    disconnect,
    server,
    contractId,
    isSubmitting,
    submitResult,
    callContract,
    clearSubmitResult,
  }), [connected, publicKey, connectError, connect, disconnect, server, contractId, isSubmitting, submitResult, checkingFreighter, callContract, clearSubmitResult]);

  return (
    <StellarContext.Provider value={value}>
      {children}
    </StellarContext.Provider>
  );
}
