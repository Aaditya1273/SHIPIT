// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GameItems.sol";

contract DeployGameItems is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        GameItems gameItems = new GameItems();

        vm.stopBroadcast();

        console.log("GameItems deployed to:", address(gameItems));
    }
}
