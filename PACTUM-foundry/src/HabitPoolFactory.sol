// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HabitPool} from "./HabitPool.sol";

/// @notice Permissionless deployment of private, invite-only single-round habit pools.
contract HabitPoolFactory {
    address public immutable stakingToken;
    address public immutable reviewer;
    address public immutable treasury;
    address[] public pools;
    mapping(address => address[]) private _creatorPools;

    event PoolCreated(address indexed pool, address indexed creator, uint256 indexed poolId, bytes32 metadataHash);

    constructor(address stakingToken_, address reviewer_, address treasury_) {
        require(stakingToken_ != address(0) && reviewer_ != address(0) && treasury_ != address(0), "Zero address");
        stakingToken = stakingToken_;
        reviewer = reviewer_;
        treasury = treasury_;
    }

    function createPool(
        address[] calldata invited,
        uint256 stake,
        uint64 joinDeadline,
        uint64 proofDeadline,
        uint16 requiredApprovals,
        bytes32 metadataHash
    ) external returns (address pool) {
        HabitPool newPool = new HabitPool(
            stakingToken, msg.sender, reviewer, treasury,
            invited, stake, joinDeadline, proofDeadline, requiredApprovals, metadataHash
        );
        pool = address(newPool);
        uint256 poolId = pools.length;
        pools.push(pool);
        _creatorPools[msg.sender].push(pool);
        emit PoolCreated(pool, msg.sender, poolId, metadataHash);
    }

    function poolCount() external view returns (uint256) { return pools.length; }
    function poolsByCreator(address creator) external view returns (address[] memory) { return _creatorPools[creator]; }
}
