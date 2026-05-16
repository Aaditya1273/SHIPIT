// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/StakingManager.sol";

contract DeployStakingManager is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy StakingManager (native 0G token)
        StakingManager stakingManager = new StakingManager();

        // Pre-fund the contract pool with 0.005 native 0G so it can pay out 2x rewards
        // Ensure deployer has sufficient balance.
        (bool success, ) = address(stakingManager).call{value: 0.005 ether}("");
        require(success, "Failed to fund pool");

        vm.stopBroadcast();

        console.log("StakingManager deployed to:", address(stakingManager));
        console.log("StakingManager initially funded with 0.005 native 0G");
    }
}
