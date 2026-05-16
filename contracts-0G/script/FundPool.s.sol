// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

/**
 * @title FundPool
 * @dev Sends native 0G tokens to the StakingManager prize pool.
 *      Run this before players can use ranked mode.
 *
 * Usage:
 *   PRIVATE_KEY=0x<key> forge script script/FundPool.s.sol \
 *     --rpc-url https://evmrpc-testnet.0g.ai \
 *     --private-key 0x<key> \
 *     --broadcast --legacy
 *
 * The script sends 0.5 0G to the pool — enough for 5 winners at max stake (0.1 0G x 2x = 0.2 each).
 * Increase FUND_AMOUNT for more capacity.
 */
contract FundPool is Script {
    address constant STAKING_MANAGER = 0x2f48419F77E6cD6E9D319Dc1314a1b1008C8ddfB;
    uint256 constant FUND_AMOUNT = 0.5 ether; // 0.5 0G

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        (bool success, ) = payable(STAKING_MANAGER).call{value: FUND_AMOUNT}("");
        require(success, "Fund transfer failed");

        console.log("StakingManager pool funded with 0.5 0G");
        console.log("Pool address:", STAKING_MANAGER);
        console.log("New balance will be:", FUND_AMOUNT);

        vm.stopBroadcast();
    }
}
