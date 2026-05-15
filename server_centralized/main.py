# main.py
# This script runs the FastAPI server, exposing the game engine through API endpoints.

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
import logging
import uuid
import os
import traceback
import sys
from datetime import datetime
import json
from dotenv import load_dotenv

from schemas import *
from game_logic.engine import GameEngine
from game_logic.state_manager import GameState
from reward_service import RewardManager, RewardValidator
from og_storage_service import OGStorageService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="Beyond The Fog - 0G Production Backend")

# Production CORS - Restrict this in real production to the actual frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change to ["https://beyondthefog.com"] for true prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (backed by file persistence)
active_games: dict[str, GameState] = {}

@app.on_event("startup")
async def startup_event():
    global game_engine, og_storage
    print("--- Server Startup ---")
    API_KEY = os.environ.get("GOOGLE_API_KEY")
    if not API_KEY:
        sys.exit("GOOGLE_API_KEY is not configured. Shutting down.")
    
    game_engine = GameEngine(api_key=API_KEY)
    og_storage = OGStorageService()
    
    if not os.path.exists("data"):
        os.makedirs("data")
    load_active_games()
    print("Game Engine and 0G Storage initialized successfully.")

def save_active_games():
    try:
        data = {gid: state.to_dict() for gid, state in active_games.items()}
        with open("data/active_sessions.json", "w") as f:
            json.dump(data, f)
    except Exception as e:
        logger.error(f"Failed to save sessions: {e}")

def load_active_games():
    global active_games
    try:
        if os.path.exists("data/active_sessions.json"):
            with open("data/active_sessions.json", "r") as f:
                data = json.load(f)
                active_games = {gid: GameState.from_dict(state_data) for gid, state_data in data.items()}
                logger.info(f"Loaded {len(active_games)} sessions from persistence")
    except Exception as e:
        logger.error(f"Failed to load sessions: {e}")

# --- Background Task: Anchor Dialogue ---
async def persist_dialogue_to_og(user_address: str, game_id: str, dialogue: Dict):
    """Persist dialogue to 0G Storage and anchor on-chain"""
    if not user_address or not og_storage.private_key:
        return
    
    logger.info(f"💾 Persisting dialogue for {user_address} to 0G")
    root_hash = await og_storage.upload_data({
        "game_id": game_id,
        "timestamp": datetime.now().isoformat(),
        "dialogue": dialogue
    })
    
    if root_hash:
        await og_storage.anchor_root(root_hash)

# --- Endpoints ---

@app.get("/")
async def root():
    return {"status": "online", "message": "Beyond The Fog - 0G Galileo API", "version": "1.0.0"}

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.post("/game/new", response_model=NewGameResponse)
async def create_new_game(request: NewGameRequest):
    game_id = str(uuid.uuid4())
    try:
        game_state = game_engine.start_new_game(
            game_id=game_id,
            num_inaccessible_locations=request.num_inaccessible_locations,
            difficulty=request.difficulty
        )
        active_games[game_id] = game_state
        save_active_games()
        
        initial_villagers = [{"id": f"villager_{i}", "title": v["title"]} for i, v in enumerate(game_state.villagers)]
        return NewGameResponse(game_id=game_id, status="success", inaccessible_locations=game_state.inaccessible_locations, villagers=initial_villagers)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/game/mint-item")
async def mint_item(request: Dict[str, Any]):
    """Mint a game item for the user (ERC1155)"""
    user_address = request.get("user_address")
    item_name = request.get("item_name")
    
    if not user_address or not item_name:
        raise HTTPException(status_code=400, detail="user_address and item_name required")
    
    # Map item names to IDs
    item_map = { "RUSTY_KEY": 0, "FOG_LANTERN": 1, "ANCIENT_MAP": 2 }
    item_id = item_map.get(item_name)
    
    if item_id is None:
        raise HTTPException(status_code=400, detail="Invalid item name")
    
    success = await og_storage.mint_game_item(user_address, item_id)
    if not success:
        raise HTTPException(status_code=500, detail="On-chain minting failed")
    
    return {"success": True, "message": f"Item {item_name} minted successfully."}

@app.post("/game/{game_id}/interact", response_model=InteractResponse)
async def interact(game_id: str, request: InteractRequest, background_tasks: BackgroundTasks):
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = active_games[game_id]
    try:
        villager_index = int(request.villager_id.split('_')[1])
        villager_name = game_state.villagers[villager_index]["name"]
        
        frustration = {"friends": len([m for m in game_state.full_npc_memory.get(villager_name, []) if "friend" in str(m.get("content")).lower()])}
        player_input = request.player_prompt or "Hello."

        dialogue_data = game_engine.process_interaction_turn(game_state, villager_name, player_input, frustration)
        save_active_games()
        
        if request.user_address:
            background_tasks.add_task(persist_dialogue_to_og, request.user_address, game_id, dialogue_data)

        return InteractResponse(villager_id=request.villager_id, villager_name=villager_name, npc_dialogue=dialogue_data.get("npc_dialogue"), player_suggestions=dialogue_data.get("player_responses"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/game/resume")
async def resume_game(request: Dict[str, str]):
    """Resume game by fetching latest state from 0G Storage"""
    user_address = request.get("user_address")
    if not user_address:
        raise HTTPException(status_code=400, detail="user_address required")
    
    latest_state = await og_storage.get_latest_dialogue(user_address)
    if not latest_state:
        raise HTTPException(status_code=404, detail="No previous state found on-chain")
    
    return {"success": True, "state": latest_state}

@app.post("/game/complete")
async def complete_game(request: CompleteGameRequest, background_tasks: BackgroundTasks):
    """Finalize game and distribute on-chain rewards"""
    try:
        reward_manager = RewardManager()
        reward_amount = reward_manager.calculate_reward(request.score, request.won)
        
        if request.won and reward_amount > 0 and request.user_address:
            # Distribute real FOG reward
            background_tasks.add_task(og_storage.distribute_reward, request.user_address, reward_amount)
        
        # Cleanup session
        if request.game_id in active_games:
            del active_games[request.game_id]
            save_active_games()
            
        return {
            "success": True,
            "reward": reward_amount,
            "message": "Journey complete. Rewards being distributed on-chain."
        }
    except Exception as e:
        logger.error(f"Completion failed: {e}")
        raise HTTPException(status_code=500, detail="Internal error during completion")

@app.post("/game/{game_id}/guess", response_model=GuessResponse)
async def guess(game_id: str, request: GuessRequest):
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = active_games[game_id]
    is_correct = request.location_name == game_state.correct_location
    
    key_clues = [n['node_id'] for n in game_state.quest_network.get('nodes', []) if n.get('key_clue')]
    discovered_key_clues = [nid for nid in game_state.player_state['discovered_nodes'] if nid in key_clues]
    is_true_ending = len(discovered_key_clues) == len(key_clues)

    message = f"You head towards {request.location_name}... "
    if is_correct:
        message += "You find your friends! " + ("TRUE ENDING UNLOCKED." if is_true_ending else "YOU WIN.")
    else:
        message += f"Nothing but fog. The truth was at {game_state.correct_location}."

    return GuessResponse(message=message, is_correct=is_correct, is_true_ending=is_true_ending)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)