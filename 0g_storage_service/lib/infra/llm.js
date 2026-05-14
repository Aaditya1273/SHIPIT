// lib/infra/llm.js
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = "https://evmrpc-testnet.0g.ai";
const LLAMA_PROVIDER_ADDRESS = "0xf07240Efa67755B5311bc75784a061eDB47165Dd";
const MINIMUM_DEPOSIT_AMOUNT = "1.1";

export class ZeroGravityAI {
    constructor() {
        this.broker = null;
        this.wallet = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        const privateKey = process.env.OG_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("CRITICAL: OG_PRIVATE_KEY environment variable is not set!");
        }

        console.log("🤖 Initializing 0G Compute Broker...");
        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            this.wallet = new ethers.Wallet(privateKey, provider);
            this.broker = await createZGComputeNetworkBroker(this.wallet);
            
            await this._ensureLedgerFunded();
            await this._acknowledgeProvider();

            this.isInitialized = true;
            console.log(`✅ 0G Compute initialized with wallet: ${this.wallet.address}`);
        } catch (error) {
            console.error("❌ Failed to initialize 0G Compute:", error);
            throw error;
        }
    }

    async _ensureLedgerFunded() {
        let computeLedger;
        try {
            computeLedger = await this.broker.ledger.getLedger();
        } catch (error) {
            if (error.code === 'BAD_DATA' || (error.revert && error.revert.name === 'LedgerNotExists')) {
                computeLedger = null;
            } else {
                throw error;
            }
        }

        const requiredLedgerBalance = ethers.parseEther(MINIMUM_DEPOSIT_AMOUNT);
        const currentBalance = computeLedger ? computeLedger.totalBalance : 0n;
        const amountToDeposit = requiredLedgerBalance - currentBalance;

        if (amountToDeposit > 0n) {
            const amountToDepositEther = ethers.formatEther(amountToDeposit);
            console.log(`💰 Funding 0G Compute Ledger with ${amountToDepositEther} OG...`);
            
            if (!computeLedger) {
                await this.broker.ledger.addLedger(parseFloat(amountToDepositEther));
            } else {
                await this.broker.ledger.depositFund(parseFloat(amountToDepositEther));
            }
        }
    }

    async _acknowledgeProvider() {
        try {
            await this.broker.inference.acknowledgeProviderSigner(LLAMA_PROVIDER_ADDRESS);
        } catch (e) {
            if (!e.message || !e.message.includes("already exists")) {
                throw e;
            }
        }
    }

    async generate(prompt) {
        if (!this.isInitialized) await this.initialize();

        try {
            console.log("📡 Sending inference request to 0G...");
            const headers = await this.broker.inference.getRequestHeaders(LLAMA_PROVIDER_ADDRESS, prompt);
            const { endpoint, model } = await this.broker.inference.getServiceMetadata(LLAMA_PROVIDER_ADDRESS);

            const response = await fetch(`${endpoint}/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    model: model,
                }),
            });

            if (!response.ok) {
                throw new Error(`0G Provider error: ${response.statusText}`);
            }

            const data = await response.json();
            const answer = data.choices[0].message.content;

            // Process on-chain verification
            await this.broker.inference.processResponse(LLAMA_PROVIDER_ADDRESS, answer, data.id);

            return this._cleanJsonResponse(answer);
        } catch (error) {
            console.error("❌ 0G Compute error:", error);
            throw error;
        }
    }

    _cleanJsonResponse(text) {
        text = text.trim();
        if (text.startsWith("```json")) text = text.slice(7);
        if (text.endsWith("```")) text = text.slice(0, -3);
        return text.trim();
    }
}
