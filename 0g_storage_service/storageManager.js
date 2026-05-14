import { Indexer, ZgFile } from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import os from "os";

// +++ NEW: Add gRPC imports
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

dotenv.config();

// --- Existing constants ---
const INDEXER_RPC = "https://indexer-storage-turbo.0g.ai";
const RPC_ENDPOINTS = [
  "https://evmrpc-testnet.0g.ai",
  "https://rpc-testnet.0g.ai",
  "https://og-testnet-evm.itrocket.net"
];
const DIALOGUE_MAP_FILE = path.join(os.tmpdir(), '0g-dialogue-map.json');

// +++ NEW: Add DA constants
const DA_PROTO_PATH = path.resolve('./proto/disperser.proto');
const DA_NODE_ADDRESS = 'localhost:51001';


export class StorageManager {
    constructor() {
        // --- Existing initializations ---
        this.indexer = new Indexer(INDEXER_RPC);
        this.currentRpcIndex = 0;
        this.provider = this._getNextProvider();
        this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        this.dialogueMap = new Map();

        // +++ NEW: Initialize DA Client
        this.daClient = this._initializeDaClient();
        
        this.initializeAndLog();
        console.log("✅ 0G Storage & DA Manager initialized successfully.");
    }
    
    _getNextProvider() {
        const url = RPC_ENDPOINTS[this.currentRpcIndex];
        console.log(`📡 Switching to RPC: ${url}`);
        this.evmRpc = url;
        this.currentRpcIndex = (this.currentRpcIndex + 1) % RPC_ENDPOINTS.length;
        return new ethers.JsonRpcProvider(url);
    }

    async _handleRpcError(error) {
        console.error(`❌ RPC Error: ${error.message}`);
        this.provider = this._getNextProvider();
        this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        return true;
    }

    // +++ NEW: Add a method to initialize the gRPC client for DA
    _initializeDaClient() {
        try {
            const packageDefinition = protoLoader.loadSync(DA_PROTO_PATH, {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true,
            });
            const daProto = grpc.loadPackageDefinition(packageDefinition).disperser;
            const client = new daProto.Disperser(DA_NODE_ADDRESS, grpc.credentials.createInsecure());
            console.log(`🔗 Connected to 0g DA Client at ${DA_NODE_ADDRESS}`);
            return client;
        } catch (error) {
            console.error("❌ Failed to initialize 0g DA Client. Is the Docker container running?", error);
            // Return a mock client to prevent crashes if the DA client isn't running
            return {
                disperseBlob: () => {
                    console.error("DA Client not available.");
                }
            };
        }
    }

  async initializeAndLog() {
    await this._loadDialogueMap();
    try {
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(this.signer.address);
      console.log(`🌐 Connected to network: Chain ID ${network.chainId}`);
      console.log(`💰 Wallet: ${this.signer.address}`);
      console.log(`💰 Balance: ${ethers.formatEther(balance)} A0GI`);
      
      if (balance === 0n) {
        console.warn("⚠️  WARNING: Wallet balance is 0! Get testnet tokens from https://faucet.0g.ai");
      }
    } catch (error) {
      console.error("Error getting network info:", error.message);
    }
  }

  async _loadDialogueMap() {
    try {
      const data = await fs.readFile(DIALOGUE_MAP_FILE, 'utf8');
      const obj = JSON.parse(data);
      this.dialogueMap = new Map(Object.entries(obj));
      console.log(`🗺️  Dialogue map loaded from ${DIALOGUE_MAP_FILE}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️  No existing dialogue map found. A new one will be created.');
      } else {
        console.error('Error loading dialogue map:', error);
      }
    }
  }

  async _saveDialogueMap() {
    try {
      const obj = Object.fromEntries(this.dialogueMap);
      await fs.writeFile(DIALOGUE_MAP_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving dialogue map:', error);
    }
  }

  async _uploadAsFile(data) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), '0g-storage-'));
    const tempFile = path.join(tempDir, `dialogue-${Date.now()}.json`);
    
    try {
      const jsonData = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      await fs.writeFile(tempFile, jsonData, 'utf8');
      
      console.log(`📝 Created temporary file: ${tempFile}`);
      
      const zgFile = await ZgFile.fromFilePath(tempFile);
      const [tree, treeErr] = await zgFile.merkleTree();
      
      if (treeErr) {
        throw new Error(`Failed to generate merkle tree: ${treeErr}`);
      }
      
      const rootHash = tree.rootHash();
      console.log(`🌳 File merkle root: ${rootHash}`);
      console.log(`📦 Uploading to 0G Storage...`);
      
      const [tx, uploadErr] = await this.indexer.upload(zgFile, this.evmRpc, this.signer);
      
      if (uploadErr) {
        throw new Error(`Upload failed: ${uploadErr}`);
      }
      
      console.log(`✅ File uploaded successfully!`);
      console.log(`📋 Transaction Hash: ${tx.hash || tx}`);
      console.log(`🔑 Root Hash: ${rootHash}`);
      console.log(`🔍 View transaction: https://chainscan-newton.0g.ai/tx/${tx.hash || tx}`);
      console.log(`🔍 View on StorageScan: https://storagescan-newton.0g.ai/`);
      
      await zgFile.close();
      await fs.unlink(tempFile);
      await fs.rmdir(tempDir);
      
      return { txHash: tx.hash || tx, rootHash };
    } catch (error) {
      try {
        await fs.unlink(tempFile);
        await fs.rmdir(tempDir);
      } catch {}
      throw error;
    }
  }

   async makeDataAvailable(data, description = "Game Event") {
        if (!this.daClient || typeof this.daClient.disperseBlob !== 'function') {
            throw new Error("0g DA Client is not initialized or available.");
        }

        console.log(`🚀 Dispersing data to 0g DA: ${description}`);

        const dataToDisperse = {
            timestamp: new Date().toISOString(),
            description: description,
            payload: data,
        };

        const dataBlob = Buffer.from(JSON.stringify(dataToDisperse));
        const accountId = "0xFB1991B8B2031eE3a163CC0f5dFce155ab200f6d";
        console.log(`📦 Blob size: ${dataBlob.length} bytes`);

        return new Promise((resolve, reject) => {
            const request = {
                data: dataBlob,
                account_id: accountId,
            };

            this.daClient.disperseBlob(request, (error, response) => {
                if (error) {
                    console.error('❌ 0g DA Dispersal Error:', error.details);
                    return reject(new Error('Failed to disperse data to 0g DA.'));
                }
                console.log('✅ 0g DA: Dispersal request successful.', response);
                resolve(response);
            });
        });
    }

  async saveFullDialogueHistory(walletAddress, fullHistory) {
    try {
      const data = typeof fullHistory === "string" ? fullHistory : JSON.stringify(fullHistory);
      
      const result = await this._uploadAsFile(data);
      
      this.dialogueMap.set(walletAddress, result.rootHash);
      await this._saveDialogueMap();
      
      console.log(`🗃️ Saved full dialogue history for ${walletAddress}`);
      console.log(`   Root Hash: ${result.rootHash}`);
      console.log(`   Transaction: ${result.txHash}`);
      
      return true;
    } catch (err) {
      console.error("❌ Error saving full dialogue history:", err);
      return false;
    }
  }

  async saveDialogue(walletAddress, newDialogue) {
    try {
      const existing = await this.getDialogue(walletAddress);
      const parsed = typeof existing === "object" && existing.dialogue_history
        ? existing
        : { dialogue_history: [] };

      const dialogueObj = typeof newDialogue === "string"
        ? JSON.parse(newDialogue)
        : newDialogue;

      parsed.dialogue_history.push({
        ...dialogueObj,
        timestamp: new Date().toISOString(),
      });

      const result = await this._uploadAsFile(JSON.stringify(parsed));
      
      this.dialogueMap.set(walletAddress, result.rootHash);
      await this._saveDialogueMap();

      console.log(`🗃️ Saved dialogue for ${walletAddress}`);
      console.log(`   Root Hash: ${result.rootHash}`);

      // +++ NEW: Commit to Blockchain for A1 Quality Persistence
      await this.updateDialogueOnChain(result.rootHash);

      // 2. (Optional) Make a critical part of the dialogue available on 0g DA
            if (dialogueObj.isCriticalEvent) {
                await this.makeDataAvailable(
                    { wallet: walletAddress, dialogue: dialogueObj },
                    "Critical Dialogue Event"
                );
            }
      
      return true;
    } catch (err) {
      console.error("❌ Error saving dialogue:", err);
      return false;
    }
  }

  async getDialogue(walletAddress, retries = 3, delay = 2000) {
    try {
      const rootHash = this.dialogueMap.get(walletAddress);
      
      if (!rootHash) {
        console.log(`ℹ️  No dialogue history found for ${walletAddress}`);
        return { dialogue_history: [] };
      }

      console.log(`📥 Attempting to download dialogue for ${walletAddress} (Root: ${rootHash})`);

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), '0g-download-'));
      const tempFile = path.join(tempDir, 'dialogue.json');
      
      try {
        const downloadPromise = this.indexer.download(rootHash, tempFile, true);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Download operation timed out after 45 seconds')), 45000)
        );

        const err = await Promise.race([downloadPromise, timeoutPromise]);
        
        if (err) {
          const errorMessage = typeof err === 'object' ? JSON.stringify(err) : err.toString();
          throw new Error(`SDK download function failed: ${errorMessage}`);
        }
        
        console.log(`✅ Download completed successfully for ${walletAddress}.`);
        const content = await fs.readFile(tempFile, 'utf8');
        const data = JSON.parse(content);
        
        await fs.unlink(tempFile);
        await fs.rmdir(tempDir);
        
        return data;
      } catch (error) {
        try {
          await fs.unlink(tempFile);
          await fs.rmdir(tempDir);
        } catch {}
        throw error;
      }
    } catch (error) {
      console.error(`[Attempt ${4 - retries}/3] Error retrieving dialogue for ${walletAddress}:`, error.message);
      
      if (retries > 1) {
        console.log(`   Retrying in ${delay / 1000} seconds...`);
        await new Promise(res => setTimeout(res, delay));
        return this.getDialogue(walletAddress, retries - 1, delay * 1.5);
      } else {
        console.error(`❌ All retry attempts failed for ${walletAddress}. Returning empty history.`);
        return { dialogue_history: [] };
      }
    }
  }

  async updateDialogueOnChain(rootHash) {
    try {
      const contractAddress = "0x6b542A9361A7dd16c0b6396202A192326154a1e2";
      const abi = [
        "function updateDialogueRoot(string memory _rootHash) external"
      ];
      const contract = new ethers.Contract(contractAddress, abi, this.signer);
      
      console.log(`🔗 Sending transaction to update dialogue root on-chain...`);
      const tx = await contract.updateDialogueRoot(rootHash);
      console.log(`📡 Tx sent: ${tx.hash}. Waiting for confirmation...`);
      await tx.wait();
      console.log(`✅ Dialogue root hash persisted on-chain!`);
      return true;
    } catch (error) {
      console.error("❌ Failed to update dialogue root on-chain:", error.message);
      return false;
    }
  async saveGameState(walletAddress, gameState) {
    try {
      console.log(`💾 Persisting game state for ${walletAddress} to 0G Storage...`);
      const data = typeof gameState === "string" ? gameState : JSON.stringify(gameState);
      
      const result = await this._uploadAsFile(data);
      
      // Map wallet to game state root
      this.dialogueMap.set(`${walletAddress}_state`, result.rootHash);
      await this._saveDialogueMap();
      
      console.log(`✅ Game state persisted. Root: ${result.rootHash}`);
      return result.rootHash;
    } catch (err) {
      console.error("❌ Error saving game state:", err);
      return null;
    }
  }

  async getGameState(walletAddress) {
    try {
      const rootHash = this.dialogueMap.get(`${walletAddress}_state`);
      if (!rootHash) return null;
      
      console.log(`📥 Resuming game state for ${walletAddress} (Root: ${rootHash})`);
      
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), '0g-state-download-'));
      const tempFile = path.join(tempDir, 'state.json');
      
      const err = await this.indexer.download(rootHash, tempFile, true);
      if (err) throw new Error(`Download failed: ${err}`);
      
      const content = await fs.readFile(tempFile, 'utf8');
      const data = JSON.parse(content);
      
      await fs.unlink(tempFile);
      await fs.rmdir(tempDir);
      
      return data;
    } catch (error) {
      console.error(`❌ Error retrieving game state for ${walletAddress}:`, error.message);
      return null;
    }
  }
}
