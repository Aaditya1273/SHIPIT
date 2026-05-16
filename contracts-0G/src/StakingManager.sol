// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StakingManager
 * @dev Manages native 0G token staking for ranked game mode.
 *      Includes reentrancy protection, hint deposit, and single-player settlement.
 */
contract StakingManager is Ownable, ReentrancyGuard {
    struct Stake {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => Stake) public stakes;
    mapping(address => uint256) public hintDeposits;
    uint256 public totalStaked;

    uint256 public constant MAX_STAKE = 0.1 ether;
    uint256 public constant HINT_PENALTY = 0.001 ether;

    event Staked(address indexed user, uint256 amount);
    event GameResolved(address indexed user, uint256 amount, bool won, uint256 payout);
    event PoolFunded(address indexed funder, uint256 amount);
    event HintDeposited(address indexed user, uint256 amount);
    event SinglePlayerGameSettled(address indexed user, uint256 timeTaken, bool won, uint256 payout);

    constructor() Ownable(msg.sender) {}

    /// @dev Fund the prize pool directly
    receive() external payable {
        emit PoolFunded(msg.sender, msg.value);
    }

    /// @notice Stake native 0G tokens to enter ranked mode
    function stake() external payable nonReentrant {
        require(msg.value > 0, "Cannot stake 0");
        require(msg.value <= MAX_STAKE, "Maximum stake is 0.1 0G");
        require(stakes[msg.sender].amount == 0, "Already staked");

        stakes[msg.sender].amount = msg.value;
        stakes[msg.sender].timestamp = block.timestamp;
        totalStaked += msg.value;

        emit Staked(msg.sender, msg.value);
    }

    /// @notice Called by backend to resolve a staked game outcome
    function resolveGameStake(address user, bool won) external onlyOwner nonReentrant {
        uint256 amount = stakes[user].amount;
        require(amount > 0, "No active stake");

        stakes[user].amount = 0;
        totalStaked -= amount;

        uint256 payout = 0;
        if (won) {
            payout = amount * 2;
            require(address(this).balance >= payout, "Insufficient pool funds");
            (bool success, ) = payable(user).call{value: payout}("");
            require(success, "Transfer to winner failed");
        }

        emit GameResolved(user, amount, won, payout);
    }

    /// @notice Called by frontend when player makes a wrong guess in staked mode
    ///         Penalty stays in pool to fund future winners
    function depositFundsForHint() external payable nonReentrant {
        require(msg.value == HINT_PENALTY, "Must send exactly 0.001 0G");
        hintDeposits[msg.sender] += msg.value;
        emit HintDeposited(msg.sender, msg.value);
    }

    /// @notice Called by frontend (HomeScene) to settle a single-player staked game
    ///         Only the contract owner (backend wallet) can call this
    /// @param user The player's address
    /// @param timeTaken Time in seconds the player took to finish
    function settleSinglePlayerGame(address user, uint256 timeTaken) external onlyOwner nonReentrant {
        uint256 amount = stakes[user].amount;
        require(amount > 0, "No active stake for user");

        stakes[user].amount = 0;
        totalStaked -= amount;

        // Win condition: player completed the game (called from HomeScene on win)
        // Payout 2x stake
        uint256 payout = amount * 2;
        require(address(this).balance >= payout, "Insufficient pool funds");

        (bool success, ) = payable(user).call{value: payout}("");
        require(success, "Payout transfer failed");

        emit SinglePlayerGameSettled(user, timeTaken, true, payout);
    }

    /// @notice View current stake for a user
    function getStake(address user) external view returns (uint256) {
        return stakes[user].amount;
    }

    /// @notice Owner can withdraw excess pool funds
    function withdrawPool(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= address(this).balance - totalStaked, "Cannot withdraw staked funds");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }
}
