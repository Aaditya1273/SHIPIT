// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/NarrativeINFT.sol";

contract DeployiNFT is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Oracle = the backend wallet (deployer).
        // The backend signs ERC-7857 metadata evolution proofs with this key.
        // Can be updated later via setOracle() if the backend wallet rotates.
        NarrativeINFT inft = new NarrativeINFT(deployer);

        console.log("NarrativeINFT (ERC-7857) deployed at:", address(inft));
        console.log("Oracle set to (backend wallet):", deployer);

        vm.stopBroadcast();
    }
}
