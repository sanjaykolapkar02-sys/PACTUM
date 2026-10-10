// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {HabitPoolFactory} from "../src/HabitPoolFactory.sol";

/// @notice Deploy an invite-only round for 2-5 wallets using the existing factory.
/// @dev Members must include vm.addr(PRIVATE_KEY), the creator. Uses *relative* deadlines.
contract CreatePool is Script {
    function run() external {
        uint256 key = vm.envUint("PRIVATE_KEY");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        uint256 expectedChainId = vm.envUint("EXPECTED_CHAIN_ID");
        require(block.chainid == expectedChainId, "Wrong chain");
        uint256 count = vm.envUint("MEMBER_COUNT");
        require(count >= 2 && count <= 5, "This helper supports 2..5 members");
        address[] memory members = new address[](count);
        for (uint256 i; i < count; ++i) {
            members[i] = vm.envAddress(string.concat("MEMBER_", vm.toString(i + 1)));
        }
        uint256 stakeUnits = vm.envUint("STAKE_USD") * 1e6; // DemoUSD 6 decimals
        uint256 joinDelay = vm.envUint("JOIN_DELAY_SECONDS");
        uint256 proofDuration = vm.envUint("PROOF_DURATION_SECONDS");
        require(joinDelay > 0 && proofDuration > 0, "Invalid durations");
        require(block.timestamp + joinDelay + proofDuration < type(uint64).max - 6 hours, "Deadline overflow");
        uint64 joinDeadline = uint64(block.timestamp + joinDelay);
        uint64 proofDeadline = uint64(block.timestamp + joinDelay + proofDuration);
        uint16 threshold = uint16(vm.envUint("REQUIRED_APPROVALS"));
        bytes32 metadataHash = vm.envBytes32("METADATA_HASH");
        vm.startBroadcast(key);
        address pool = HabitPoolFactory(factoryAddress).createPool(
            members, stakeUnits, joinDeadline, proofDeadline, threshold, metadataHash
        );
        vm.stopBroadcast();
        console2.log("HabitPool deployed:", pool);
        console2.log("Creator:", vm.addr(key));
        console2.log("Stake in DemoUSD base units:", stakeUnits);
        console2.log("Join deadline (Unix seconds):", uint256(joinDeadline));
        console2.log("Proof deadline (Unix seconds):", uint256(proofDeadline));
        console2.log("Voting deadline (Unix seconds):", uint256(proofDeadline) + 6 hours);
    }
}
