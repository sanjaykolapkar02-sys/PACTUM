// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {DemoUSD} from "../src/DemoUSD.sol";
import {HabitPoolFactory} from "../src/HabitPoolFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address reviewer = vm.envAddress("REVIEWER_ADDRESS");
        uint256 expectedChainId = vm.envUint("EXPECTED_CHAIN_ID");
        require(block.chainid == expectedChainId, "Wrong network / chain ID");
        vm.startBroadcast(deployerPrivateKey);
        DemoUSD token = new DemoUSD(deployer);
        HabitPoolFactory factory = new HabitPoolFactory(address(token), reviewer, treasury);
        vm.stopBroadcast();
        console2.log("DemoUSD:", address(token));
        console2.log("HabitPoolFactory:", address(factory));
        console2.log("Deployer:", deployer);
        console2.log("Reviewer:", reviewer);
        console2.log("Treasury:", treasury);
    }
}
