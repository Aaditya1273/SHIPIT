import { StorageManager } from './storageManager.js';
import { ethers } from 'ethers';
import sodium from 'libsodium-wrappers';
import { Base64 } from 'js-base64';

export class INFTManager extends StorageManager {
    constructor() {
        super();
        this.initLibsodium();
        this.initINFTContract();

        // 0G Storage focused images
        this.stageImages = {
            newborn: process.env.NEWBORN_IMAGE_CID,
            curious: process.env.CURIOUS_IMAGE_CID,
            master: process.env.MASTER_IMAGE_CID,
            wise: process.env.WISE_IMAGE_CID,
            savior: process.env.SAVIOR_IMAGE_CID
        };

        this.itemImages = {
            lantern: process.env.ITEM_LANTERN_CID,
            axe: process.env.ITEM_AXE_CID,
            fishing_rod: process.env.ITEM_FISHING_ROD_CID,
            shovel: process.env.ITEM_SHOVEL_CID,
            pickaxe: process.env.ITEM_PICKAXE_CID,
            hammer: process.env.ITEM_HAMMER_CID,
            bucket: process.env.ITEM_BUCKET_CID,
            scythe: process.env.ITEM_SCYTHE_CID
        };

        this.metadataVersions = new Map();
    }

    // ============== CONTRACT INITIALIZATION ==============

    async initINFTContract() {
        const INFT_CONTRACT_ADDRESS = process.env.INFT_CONTRACT_ADDRESS;
        console.log('🔗 Initializing INFT contract:', INFT_CONTRACT_ADDRESS);
        
        if (!INFT_CONTRACT_ADDRESS) {
            console.warn('⚠️ INFT_CONTRACT_ADDRESS not set in .env');
            return;
        }

        console.log('🔑 Using wallet address:', this.signer.address);
        
        const INFT_ABI = [
            "function birthINFT(address,string,string,string,bytes32,bytes) external returns (uint256)",
            "function evolveINFT(uint256,string,string,bytes32,bytes) external",
            "function initiateSecureTransfer(uint256,address,bytes) external",
            "function completeSecureTransferWithNewKey(uint256,address,bytes,uint256) external",
            "function authorizeUsage(uint256,address,uint256) external",
            "function getCurrentMetadata(uint256) external view returns (tuple(string,uint256,bytes32,string,address,uint256,bool,uint256))",
            "function getPlayerINFTs(address) external view returns (uint256[])",
            "function getMetadataHistory(uint256) external view returns (tuple(bytes32,string,uint256,uint256)[])"
        ];

        this.inftContract = new ethers.Contract(
            INFT_CONTRACT_ADDRESS,
            INFT_ABI,
            this.signer
        );

        console.log('✅ INFT contract initialized successfully');
    }

    async initLibsodium() {
        await sodium.ready;
        console.log('✅ Libsodium initialized for encryption');
    }

    // ============== ENCRYPTION UTILITIES ==============

    /**
     * Generate a keypair for encryption (owner's keys)
     */
    generateKeyPair() {
        const keypair = sodium.crypto_box_keypair();
        return {
            publicKey: Base64.fromUint8Array(keypair.publicKey),
            secretKey: Base64.fromUint8Array(keypair.privateKey)
        };
    }

    /**
     * Encrypt metadata with owner's public key
     */
    encryptMetadataForOwner(metadataJSON, ownerPublicKeyBase64) {
        try {
            const message = JSON.stringify(metadataJSON);
            const publicKey = Base64.toUint8Array(ownerPublicKeyBase64);
            
            // Add this validation check
            if (publicKey.length !== sodium.crypto_box_PUBLICKEYBYTES) {
                throw new Error(`Invalid public key length. Expected ${sodium.crypto_box_PUBLICKEYBYTES}, but got ${publicKey.length}.`);
            }

            const sealedBox = sodium.crypto_box_seal(message, publicKey);
            
            return Base64.fromUint8Array(sealedBox);
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error(`Failed to encrypt metadata: ${error.message}`);
        }
    }

    /**
     * Decrypt metadata with owner's secret key
     */
    decryptMetadata(encryptedDataBase64, publicKeyBase64, secretKeyBase64) {
        try {
            const sealedBox = Base64.toUint8Array(encryptedDataBase64);
            const publicKey = Base64.toUint8Array(publicKeyBase64);
            const secretKey = Base64.toUint8Array(secretKeyBase64);
            
            const decrypted = sodium.crypto_box_seal_open(sealedBox, publicKey, secretKey);
            
            return JSON.parse(sodium.to_string(decrypted));
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt metadata');
        }
    }

    // ============== 0G STORAGE OPERATIONS ==============
    /**
     * Uploads metadata to 0G Storage instead of IPFS.
     */
    async uploadTo0G(metadata) {
        try {
            console.log("📦 Uploading INFT Metadata to 0G Storage...");
            const result = await this._uploadAsFile(metadata);
            return result.rootHash;
        } catch (error) {
            console.error("❌ Failed to upload to 0G Storage:", error);
            throw error;
        }
    }

    /**
     * Build canonical 0G Storage URL (or just return the root hash)
     */
    build0gUrl(rootHash) {
        if (!rootHash) return null;
        return `0g://${rootHash}`; // Custom protocol for 0G Storage
    }

    // ============== INFT LIFECYCLE ==============

    /**
     * Create a new game INFT
     */
    async createGameINFT(playerAddress, gameMode, difficulty, ownerPublicKey) {
        try {
            console.log(`🎮 Creating INFT for ${playerAddress} in ${gameMode} mode`);

            // 1. Generate initial metadata
            const metadata = this.generateInitialMetadata(gameMode, difficulty);

            // 2. Upload to 0G Storage
            const rootHash = await this.uploadTo0G(metadata);
            console.log(`✅ Metadata uploaded to 0G: ${rootHash}`);

            // 3. Encrypt metadata for owner
            const encryptedMetadata = this.encryptMetadataForOwner(metadata, ownerPublicKey);

            // 4. Compute metadata hash
            const metadataHash = ethers.keccak256(
                ethers.toUtf8Bytes(JSON.stringify(metadata))
            );

            // 5. Create sealed key for owner
            const sealedKey = Buffer.from(`sealed_key_${playerAddress}_${Date.now()}`);

            // 6. Mint INFT on contract
            const tx = await this.inftContract.birthINFT(
                playerAddress,
                gameMode,
                difficulty,
                rootHash, // Use Root Hash instead of IPFS Hash
                metadataHash,
                sealedKey
            );

            const receipt = await tx.wait();
            const tokenId = this.extractTokenIdFromReceipt(receipt);

            return {
                tokenId,
                rootHash,
                metadataHash,
                metadata,
                encryptedMetadata
            };
        } catch (error) {
            console.error('❌ Failed to create INFT:', error);
            throw error;
        }
    }

    /**
     * Evolve INFT based on game progress
     * Updates metadata and creates new version
     */
    async evolveINFT(tokenId, gameProgressData, ownerPublicKey, oracleProof = null) {
        try {
            console.log(`🌱 Evolving INFT #${tokenId}`);

            // 1. Determine new stage
            const newStage = this.calculateStage(gameProgressData);

            // 2. Generate evolved metadata
            const evolvedMetadata = this.generateEvolvedMetadata(
                gameProgressData,
                newStage
            );

            // 3. Upload new metadata to 0G Storage
            const newRootHash = await this.uploadTo0G(evolvedMetadata);
            console.log(`✅ New metadata uploaded to 0G: ${newRootHash}`);

            // 4. Encrypt new metadata for owner
            const newEncryptedMetadata = this.encryptMetadataForOwner(
                evolvedMetadata,
                ownerPublicKey
            );

            // 5. Compute new metadata hash
            const newMetadataHash = ethers.keccak256(
                ethers.toUtf8Bytes(JSON.stringify(evolvedMetadata))
            );

            // 6. Create proof (simplified; in production, use oracle)
            const proof = oracleProof || this.generateSimpleProof(tokenId, newMetadataHash);

            // 7. Update contract
            const tx = await this.inftContract.evolveINFT(
                tokenId,
                newStage,
                newEncryptedMetadata,
                newMetadataHash,
                proof
            );

            await tx.wait();

            console.log(`✅ INFT #${tokenId} evolved to ${newStage}`);

            // Update version tracking
            const versionKey = `${tokenId}_v${gameProgressData.version || 1}`;
            this.metadataVersions.set(versionKey, {
                version: gameProgressData.version || 1,
                stage: newStage,
                metadata: evolvedMetadata,
                ipfsHash: newIpfsHash,
                metadataHash: newMetadataHash,
                timestamp: Date.now(),
                encryptedData: newEncryptedMetadata
            });

            return {
                tokenId,
                newStage,
                newRootHash,
                newMetadataHash,
                evolvedMetadata,
                encryptedMetadata: newEncryptedMetadata
            };
        } catch (error) {
            console.error(`❌ Failed to evolve INFT #${tokenId}:`, error);
            throw error;
        }
    }

    /**
     * Initiate secure transfer of INFT to another player
     */
    async initiateSecureTransfer(tokenId, currentOwner, newOwner, transferProof = null) {
        try {
            console.log(`🔐 Initiating secure transfer for INFT #${tokenId}`);

            const proof = transferProof || this.generateSimpleProof(
                tokenId,
                ethers.getAddress(newOwner)
            );

            const tx = await this.inftContract.initiateSecureTransfer(
                tokenId,
                newOwner,
                proof
            );

            const receipt = await tx.wait();

            console.log(`✅ Transfer initiated for INFT #${tokenId}`);

            return {
                tokenId,
                from: currentOwner,
                to: newOwner,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error(`❌ Failed to initiate transfer for INFT #${tokenId}:`, error);
            throw error;
        }
    }

    /**
     * Complete secure transfer with new owner's key
     */
    async completeSecureTransfer(
        tokenId,
        newOwner,
        newOwnerPublicKey,
        newSealedKey = null
    ) {
        try {
            console.log(`✅ Completing secure transfer for INFT #${tokenId}`);

            // Get current metadata
            const currentInftData = await this.inftContract.getCurrentMetadata(tokenId);

            // Re-encrypt metadata for new owner
            const metadataJSON = JSON.parse(
                Buffer.from(currentInftData.encryptedMetadataURI, 'base64').toString('utf8')
            );

            const newEncryptedMetadata = this.encryptMetadataForOwner(
                metadataJSON,
                newOwnerPublicKey
            );

            // Create new sealed key for new owner
            const sealedKey = newSealedKey || Buffer.from(
                `sealed_key_${newOwner}_${Date.now()}`
            );

            const keyValidUntil = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);

            const tx = await this.inftContract.completeSecureTransferWithNewKey(
                tokenId,
                newOwner,
                sealedKey,
                keyValidUntil
            );

            await tx.wait();

            console.log(`✅ INFT #${tokenId} transferred to ${newOwner}`);

            return {
                tokenId,
                newOwner,
                transactionHash: tx.hash,
                newEncryptedMetadata
            };
        } catch (error) {
            console.error(`❌ Failed to complete transfer for INFT #${tokenId}:`, error);
            throw error;
        }
    }

    // ============== METADATA GENERATION ==============

    generateInitialMetadata(gameMode, difficulty) {
        const timestamp = Date.now();

        return {
            name: `Village Mystery Guide #${timestamp.toString().slice(-4)}`,
            description:
                "An AI companion born from your first steps into the mysterious village. This entity will grow and evolve based on your choices, discoveries, and achievements.",
            image: this.build0gUrl(this.stageImages.newborn),
            external_url: "https://beyond-the-fog.game",
            attributes: [
                { trait_type: "Stage", value: "Newborn Guide" },
                { trait_type: "Game Mode", value: gameMode },
                { trait_type: "Difficulty", value: difficulty },
                { trait_type: "Mysteries Solved", value: 0 },
                { trait_type: "Villager Interactions", value: 0 },
                { trait_type: "Items Collected", value: 0 },
                { trait_type: "Penalties Paid", value: "0.00" },
                { trait_type: "Birth Timestamp", value: timestamp },
                { trait_type: "Rarity", value: "Common" }
            ],
            properties: {
                stage: "newborn",
                gameActive: true,
                completionTime: null,
                finalScore: null,
                personalityType: "Unknown",
                specialization: "None",
                version: 1
            }
        };
    }

    generateEvolvedMetadata(gameData, stage) {
        const stageNames = {
            newborn: "Newborn Guide",
            curious: "Curious Seeker",
            master: "Tool Master",
            wise: "Wise Explorer",
            savior: "Village Savior"
        };

        const rarityMap = {
            newborn: "Common",
            curious: "Uncommon",
            master: "Rare",
            wise: "Epic",
            savior: "Legendary"
        };

        return {
            name: `Village Mystery Guide #${gameData.tokenId || "Unknown"}`,
            description: this.generateStageDescription(stage, gameData),
            image: this.build0gUrl(this.stageImages[stage]),
            external_url: "https://beyond-the-fog.game",
            attributes: [
                { trait_type: "Stage", value: stageNames[stage] },
                { trait_type: "Game Mode", value: gameData.gameMode || "single_player" },
                { trait_type: "Mysteries Solved", value: gameData.mysteriesSolved || 0 },
                { trait_type: "Villager Interactions", value: gameData.villagerInteractions || 0 },
                { trait_type: "Items Collected", value: gameData.itemsCollected || 0 },
                { trait_type: "Penalties Paid", value: gameData.penaltiesPaid || "0.00" },
                { trait_type: "Current Score", value: gameData.currentScore || 0 },
                { trait_type: "Rarity", value: rarityMap[stage] },
                { trait_type: "Personality Type", value: this.analyzePersonality(gameData) },
                { trait_type: "Specialization", value: this.determineSpecialization(gameData) },
                { trait_type: "Play Duration", value: `${gameData.playDurationSeconds || 0}s` }
            ],
            properties: {
                stage,
                gameActive: !gameData.isCompleted,
                completionTime: gameData.completionTime || null,
                finalScore: gameData.finalScore || null,
                collectedItems: gameData.collectedItemNames || [],
                conversationHistory: gameData.dialogueCount || 0,
                version: gameData.version || 1,
                lastUpdated: Date.now()
            }
        };
    }

    generateStageDescription(stage, gameData) {
        const descriptions = {
            newborn:
                "A newly awakened consciousness, eager to explore the village mysteries.",
            curious:
                "An inquisitive entity that has begun to understand the village's secrets through conversations.",
            master:
                "A skilled companion that has mastered the art of tool collection and practical problem-solving.",
            wise: "An experienced guide with deep knowledge of the village's hidden truths and ancient wisdom.",
            savior:
                "A legendary hero who has successfully unraveled the mystery and saved the missing friends."
        };

        let description = descriptions[stage];

        if (gameData.villagerInteractions > 5) {
            description += " Known for engaging deeply with villagers.";
        }

        if (gameData.itemsCollected > 2) {
            description += " Renowned for collecting essential tools.";
        }

        if (gameData.penaltiesPaid && parseFloat(gameData.penaltiesPaid) > 0) {
            description += " Shows resilience in learning from mistakes.";
        }

        return description;
    }

    calculateStage(gameData) {
        const interactions = gameData.villagerInteractions || 0;
        const items = gameData.itemsCollected || 0;
        const progress = gameData.progressPercentage || 0;

        if (progress >= 90) return "savior";
        if (progress >= 70 || items >= 3) return "wise";
        if (progress >= 40 || interactions >= 5) return "master";
        if (interactions >= 2 || items >= 1) return "curious";
        return "newborn";
    }

    analyzePersonality(gameData) {
        const interactions = gameData.villagerInteractions || 0;
        const items = gameData.itemsCollected || 0;
        const penalties = parseFloat(gameData.penaltiesPaid || "0");

        if (interactions > items && penalties === 0) return "Diplomatic";
        if (items > interactions && penalties === 0) return "Practical";
        if (penalties > 0) return "Persistent";
        if (interactions > 8) return "Social";
        if (items > 3) return "Collector";
        return "Balanced";
    }

    determineSpecialization(gameData) {
        const items = gameData.collectedItemNames || [];

        if (items.includes("LANTERN") && items.includes("PICKAXE")) return "Cave Explorer";
        if (items.includes("FISHING_ROD") && items.includes("BUCKET")) return "Water Specialist";
        if (items.includes("AXE") && items.includes("HAMMER")) return "Craftsman";
        if (items.includes("SHOVEL") && items.includes("SCYTHE")) return "Earth Worker";
        if (items.length >= 4) return "Master Collector";
        if (items.length >= 2) return "Tool Specialist";
        return "Generalist";
    }

    // ============== IPFS OPERATIONS ==============
    // IPFS operations removed for 0G Purity

    // ============== PROOF GENERATION ==============

    generateSimpleProof(tokenId, dataHash) {
        // In production, this should be signed by oracle
        const proofData = ethers.solidityPacked(
            ["uint256", "bytes32", "uint256"],
            [tokenId, dataHash, Math.floor(Date.now() / 1000)]
        );

        return proofData;
    }

    // ============== EXTRACTION HELPERS ==============

    extractTokenIdFromReceipt(receipt) {
        const transferEvent = receipt.logs.find(
            (log) =>
                log.topics[0] ===
                ethers.id("Transfer(address,address,uint256)")
        );

        if (transferEvent) {
            return parseInt(transferEvent.topics[3], 16);
        }

        return null;
    }
}