from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional

class NewGameRequest(BaseModel):
    difficulty: str = "medium"
    num_inaccessible_locations: int = 5

class NewGameResponse(BaseModel):
    game_id: str
    status: str
    inaccessible_locations: List[str]
    villagers: List[Dict]

class InteractRequest(BaseModel):
    villager_id: str
    player_prompt: Optional[str] = None
    user_address: Optional[str] = None

class CompleteGameRequest(BaseModel):
    game_id: str
    user_address: str = Field(..., description="Player's wallet address (0x...)")
    score: int = Field(..., ge=0)
    won: bool
    is_true_ending: bool = False

    @validator('user_address')
    def validate_user_address(cls, v):
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Invalid wallet address format")
        return v

    @validator('score')
    def validate_score(cls, v):
        if v < 0:
            raise ValueError("Score cannot be negative")
        return v

class InteractResponse(BaseModel):
    villager_id: str
    villager_name: str
    npc_dialogue: str
    player_suggestions: List[str]

class GuessRequest(BaseModel):
    location_name: str

class GuessResponse(BaseModel):
    is_correct: bool
    is_true_ending: bool
    message: str