// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/UserRegistry.sol";
import "../src/GameItems.sol";
import "../src/StakingManager.sol";
import "../src/NarrativeINFT.sol";
import "../src/TradeManager.sol";

contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== Beyond The Fog - Deploy All ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // 1. UserRegistry
        UserRegistry userRegistry = new UserRegistry();
        console.log("UserRegistry:   ", address(userRegistry));

        // 2. GameItems (ERC-721)
        GameItems gameItems = new GameItems();
        console.log("GameItems:      ", address(gameItems));

        // 3. StakingManager
        StakingManager stakingManager = new StakingManager();
        console.log("StakingManager: ", address(stakingManager));

        // 4. NarrativeINFT (ERC-7857) — oracle = deployer (backend wallet)
        NarrativeINFT narrativeINFT = new NarrativeINFT(deployer);
        console.log("NarrativeINFT:  ", address(narrativeINFT));

        // 5. TradeManager — uses WrappedOGBase precompile (no constructor arg needed)
        TradeManager tradeManager = new TradeManager();
        console.log("TradeManager:   ", address(tradeManager));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Copy these into .env and contractConfig.js ===");
        console.log("USER_REGISTRY_ADDRESS=", address(userRegistry));
        console.log("GAME_ITEMS_ADDRESS=", address(gameItems));
        console.log("STAKING_MANAGER_ADDRESS=", address(stakingManager));
        console.log("NARRATIVE_INFT_ADDRESS=", address(narrativeINFT));
        console.log("TRADE_MANAGER_ADDRESS=", address(tradeManager));
    }
}
