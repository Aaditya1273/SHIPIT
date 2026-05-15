import logging
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class RewardManager:
    """Manages game completion and reward calculation for Beyond The Fog"""
    
    # Reward calculation constants (in 18 decimal units for FOG)
    BASE_REWARD = 10 * 10**18      # 10 FOG
    SCORE_MULTIPLIER = 10**15      # 0.001 FOG per point
    MAX_REWARD = 500 * 10**18      # 500 FOG max
    MIN_REWARD = 5 * 10**18        # 5 FOG min
    TRUE_ENDING_BONUS = 50 * 10**18 # 50 FOG bonus
    
    def __init__(self):
        pass
    
    def calculate_reward(self, score: int, is_true_ending: bool) -> int:
        """Calculate reward based on game performance"""
        try:
            reward = self.BASE_REWARD + (score * self.SCORE_MULTIPLIER)
            
            if is_true_ending:
                reward += self.TRUE_ENDING_BONUS
            
            reward = max(self.MIN_REWARD, min(reward, self.MAX_REWARD))
            
            logger.info(f"Calculated reward: {reward} (score={score}, true_ending={is_true_ending})")
            return int(reward)
            
        except Exception as e:
            logger.error(f"Error calculating reward: {e}")
            return self.BASE_REWARD
    
    def create_game_completion_record(
        self,
        user_address: str,
        game_session_id: str,
        score: int,
        won: bool,
        is_true_ending: bool
    ) -> Dict[str, Any]:
        """Create game completion record."""
        try:
            if not user_address or not game_session_id:
                raise ValueError("Invalid user_address or game_session_id")
            
            reward_amount = 0
            if won:
                reward_amount = self.calculate_reward(score, is_true_ending)
            
            return {
                "success": True,
                "gameSessionId": game_session_id,
                "userAddress": user_address,
                "score": score,
                "won": won,
                "isTrueEnding": is_true_ending,
                "rewardAmount": reward_amount,
                "completedAt": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error creating game completion record: {e}")
            raise


class RewardValidator:
    """Validates reward claims and game sessions"""
    
    @staticmethod
    def validate_user_address(address: str) -> bool:
        """Validate wallet address format"""
        try:
            if not address or not isinstance(address, str):
                return False
            if not address.startswith("0x"):
                return False
            return len(address) == 42
        except Exception as e:
            return False
    
    @staticmethod
    def validate_score(score: int) -> bool:
        return isinstance(score, int) and score >= 0