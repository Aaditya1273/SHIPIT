import express from "express";
import cors from "cors";
import { StorageManager } from "./storageManager.js";
import { INFTManager } from './INFTManager.js';
import { GameEngine } from './lib/game/gameEngine.js';
import { randomUUID } from 'node:crypto';

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3002;

const storageManager = new StorageManager();
const inftManager = new INFTManager();
const gameEngine = new GameEngine();

// In-memory session store (move to 0G Storage for persistent sessions later)
const activeGames = new Map();

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Unified Core", timestamp: new Date() });
});

// ================= GAME ENGINE ENDPOINTS =================

app.post("/game/new", async (req, res) => {
  try {
    const { num_inaccessible_locations, difficulty, player_id } = req.body;
    const gameState = await gameEngine.startNewGame(num_inaccessible_locations || 3, difficulty || 'Medium');
    
    const gameId = randomUUID();
    activeGames.set(gameId, gameState);

    // Persist to 0G if player_id provided
    if (player_id) {
        await storageManager.saveGameState(player_id, gameState);
    }

    res.json({
        game_id: gameId,
        status: "success",
        story_theme: gameState.storyTheme,
        inaccessible_locations: gameState.inaccessibleLocations,
        villagers: gameState.villagers.map(v => ({ id: v.id, title: v.title, name: v.name }))
    });
  } catch (error) {
    console.error("Failed to create new game:", error);
    res.status(500).json({ error: "Failed to initialize game engine." });
  }
});

app.get("/game/:playerId/resume", async (req, res) => {
    try {
        const { playerId } = req.params;
        const gameState = await storageManager.getGameState(playerId);
        
        if (!gameState) return res.status(404).json({ error: "No saved game found for this player." });
        
        const gameId = randomUUID();
        activeGames.set(gameId, gameState);
        
        res.json({
            game_id: gameId,
            status: "resumed",
            story_theme: gameState.storyTheme,
            discovered_nodes: gameState.discoveredNodes,
            villagers: gameState.villagers.map(v => ({ id: v.id, title: v.title, name: v.name }))
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to resume game." });
    }
});

app.post("/game/:gameId/interact", async (req, res) => {
  try {
    const { gameId } = req.params;
    const { villager_id, player_prompt, player_id } = req.body;

    const gameState = activeGames.get(gameId);
    if (!gameState) return res.status(404).json({ error: "Game session not found." });

    const interaction = await gameEngine.interact(gameState, villager_id, player_prompt);
    
    // Auto-save state to 0G if player_id provided
    if (player_id) {
        await storageManager.saveGameState(player_id, gameState);
    }

    res.json({
        villager_id,
        villager_name: interaction.villager_name,
        npc_dialogue: interaction.npc_dialogue,
        player_suggestions: interaction.player_responses
    });
  } catch (error) {
    console.error("Interaction failed:", error);
    res.status(500).json({ error: "Interaction processing failed." });
  }
});

// ================= STORAGE ENDPOINTS =================

app.get("/dialogue/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const dialogue = await storageManager.getDialogue(walletAddress);
    res.json(dialogue);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve dialogue history." });
  }
});

app.post("/dialogue/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { newDialogue } = req.body;
    const success = await storageManager.saveDialogue(walletAddress, newDialogue);
    res.status(success ? 200 : 500).json({ success });
  } catch (error) {
    res.status(500).json({ message: "Failed to save dialogue." });
  }
});

// ================= INFT ENDPOINTS =================

app.post('/inft/create', async (req, res) => {
    try {
        const { playerAddress, gameMode, difficulty, ownerPublicKey } = req.body;
        const result = await inftManager.createGameINFT(playerAddress, gameMode, difficulty, ownerPublicKey);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/inft/evolve', async (req, res) => {
    try {
        const { tokenId, gameProgressData, ownerPublicKey } = req.body;
        const result = await inftManager.evolveINFT(tokenId, gameProgressData, ownerPublicKey);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/inft/player/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const infts = await inftManager.inftContract.getPlayerINFTs(address);
        res.json({ success: true, infts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
  console.log(`🚀 Beyond-The-Fog Unified Core listening at http://localhost:${port}`);
});
