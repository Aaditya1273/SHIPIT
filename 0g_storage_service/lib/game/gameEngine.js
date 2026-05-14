// lib/game/gameEngine.js
import { ZeroGravityAI } from '../infra/llm.js';
import { VILLAGER_ROSTER, FAMILIARITY_LEVELS } from '../constants.js';

export class GameEngine {
    constructor() {
        this.llm = new ZeroGravityAI();
    }

    async startNewGame(numInaccessibleLocations, difficulty) {
        // 1. Generate Story Theme
        const storyContext = `You are an elite narrative designer for "Beyond-The-Fog". 
        Create a dark, atmospheric mystery theme for a mist-shrouded village.
        Define ${numInaccessibleLocations} unique locations that are "inaccessible" due to paranormal forces.
        Pick one "correct_location" where the missing friends are held.
        Return ONLY a JSON object: { "story_theme": "...", "inaccessible_locations": ["..."], "correct_location": "..." }`;
        
        const storyIdeaRaw = await this.llm.generate(storyContext);
        const storyIdea = JSON.parse(storyIdeaRaw);

        // 2. Build Quest Network
        const worldContext = `Construct a non-linear quest network for difficulty ${difficulty}.
        Theme: ${storyIdea.story_theme}.
        Objective: Find friends at ${storyIdea.correct_location}.
        Create 10 nodes with: node_id, villager_name (matching VILLAGER_ROSTER), content, required_familiarity (0-5), and preconditions (list of node_ids).
        Return ONLY a JSON object: { "nodes": [...] }`;
        
        const questNetworkRaw = await this.llm.generate(worldContext);
        const questNetwork = JSON.parse(questNetworkRaw);

        return {
            storyTheme: storyIdea.story_theme,
            inaccessibleLocations: storyIdea.inaccessible_locations,
            correctLocation: storyIdea.correct_location,
            questNetwork,
            villagers: VILLAGER_ROSTER.map((v, i) => ({
                id: `villager_${i}`,
                ...v,
                familiarity: 0,
                unproductiveTurns: 0,
                chatHistory: []
            })),
            discoveredNodes: [],
            knowledgeSummary: "You've just arrived in the village. Arthur Hobbs found you after a car crash. You heard a cry for help from your friends."
        };
    }

    async interact(gameState, villagerId, playerPrompt) {
        const villagerIndex = parseInt(villagerId.split('_')[1]);
        const villager = gameState.villagers[villagerIndex];

        // Determine clue status
        const clueStatus = this._getClueStatus(gameState, villager);

        const interactionContext = {
            villagerProfile: villager,
            chatHistory: villager.chatHistory,
            player_last_response: playerPrompt,
            conversational_status: clueStatus.status,
            context_node: clueStatus.node,
            player_knowledge_summary: gameState.knowledgeSummary,
            familiarity_level: villager.familiarity,
            familiarity_description: FAMILIARITY_LEVELS[villager.familiarity]
        };

        const interactionRaw = await this.llm.generate(JSON.stringify(interactionContext));
        const interactionData = JSON.parse(interactionRaw);

        // Update state
        villager.chatHistory.push({ role: 'player', content: playerPrompt });
        villager.chatHistory.push({ role: 'npc', content: interactionData.npc_dialogue });

        // Update familiarity (cap at +1)
        if (interactionData.new_familiarity_level > villager.familiarity) {
            villager.familiarity = Math.min(villager.familiarity + 1, 5);
        }

        // Handle revealed nodes
        if (interactionData.node_revealed_id && !gameState.discoveredNodes.includes(interactionData.node_revealed_id)) {
            gameState.discoveredNodes.push(interactionData.node_revealed_id);
            this._updateKnowledgeSummary(gameState);
        }

        return interactionData;
    }

    _getClueStatus(gameState, villager) {
        const undiscoveredNodes = gameState.questNetwork.nodes.filter(node => 
            node.villager_name === villager.name && !gameState.discoveredNodes.includes(node.node_id)
        );

        if (undiscoveredNodes.length === 0) return { status: 'PERMANENTLY_EXHAUSTED' };

        const sortedNodes = undiscoveredNodes.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        for (const node of sortedNodes) {
            const preconditionsMet = (node.preconditions || []).every(p => gameState.discoveredNodes.includes(p));
            const familiarityMet = !node.required_familiarity || villager.familiarity >= node.required_familiarity;

            if (preconditionsMet && familiarityMet) return { status: 'CAN_REVEAL', node };
        }

        return { status: 'HAS_LOCKED_CLUES', node: sortedNodes[0] };
    }

    _updateKnowledgeSummary(gameState) {
        const revealedContent = gameState.questNetwork.nodes
            .filter(n => gameState.discoveredNodes.includes(n.node_id))
            .map(n => n.content);
        gameState.knowledgeSummary = "Key points discovered: " + revealedContent.join("; ");
    serialize(gameState) {
        return JSON.stringify({
            storyTheme: gameState.storyTheme,
            inaccessibleLocations: gameState.inaccessibleLocations,
            correctLocation: gameState.correctLocation,
            questNetwork: gameState.questNetwork,
            villagers: gameState.villagers,
            discoveredNodes: gameState.discoveredNodes,
            knowledgeSummary: gameState.knowledgeSummary,
            timestamp: Date.now()
        });
    }

    deserialize(jsonString) {
        return JSON.parse(jsonString);
    }
}
