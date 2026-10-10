// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DemoUSD} from "../src/DemoUSD.sol";
import {HabitPool} from "../src/HabitPool.sol";
import {HabitPoolFactory} from "../src/HabitPoolFactory.sol";

contract HabitPoolTest is Test {
    uint256 internal constant STAKE = 10 * 1e6;
    DemoUSD internal usd;
    HabitPoolFactory internal factory;
    HabitPool internal pool;
    address internal reviewer = makeAddr("reviewer");
    address internal treasury = makeAddr("treasury");
    address[5] internal members;
    uint64 internal joinBy;
    uint64 internal proofBy;

    function setUp() public {
        usd = new DemoUSD(address(this));
        factory = new HabitPoolFactory(address(usd), reviewer, treasury);
        members[0] = makeAddr("alice");
        members[1] = makeAddr("bob");
        members[2] = makeAddr("carol");
        members[3] = makeAddr("dave");
        members[4] = makeAddr("erin");
        joinBy = uint64(block.timestamp + 1 days);
        proofBy = uint64(block.timestamp + 2 days);
        address[] memory invitations = new address[](5);
        for (uint256 i; i < 5; ++i) {
            invitations[i] = members[i];
            usd.mint(members[i], 100 * 1e6);
        }
        vm.prank(members[0]);
        pool = HabitPool(factory.createPool(invitations, STAKE, joinBy, proofBy, 3, keccak256("gym-rules-v1")));
    }

    function _joinAll() internal {
        for (uint256 i; i < 5; ++i) {
            vm.startPrank(members[i]);
            usd.approve(address(pool), STAKE);
            pool.join();
            vm.stopPrank();
        }
    }

    function _proofAll() internal {
        vm.warp(joinBy);
        pool.finalizeMembership();
        for (uint256 i; i < 5; ++i) {
            vm.prank(members[i]);
            pool.submitEvidence(keccak256(abi.encodePacked("photo", i)));
        }
    }

    /// @dev All other four participants vote for each target.
    function _votesWithPassedCount(uint256 passed) internal {
        vm.warp(proofBy);
        for (uint256 target; target < 5; ++target) {
            for (uint256 voter; voter < 5; ++voter) {
                if (voter != target) {
                    vm.prank(members[voter]);
                    pool.vote(members[target], target < passed);
                }
            }
        }
        vm.warp(uint256(proofBy) + 6 hours);
        pool.finalizeResults();
    }

    function testThreeWinnersTwoLosersFeeAndClaims() public {
        _joinAll();
        _proofAll();
        _votesWithPassedCount(3);
        pool.settle();
        assertEq(pool.feeOwed(), 20_000); // 0.10% of 20 DemoUSD, 6 decimals
        assertEq(pool.claimable(members[0]), 16_660_000);
        assertEq(pool.claimable(members[1]), 16_660_000);
        assertEq(pool.claimable(members[2]), 16_660_000);
        assertEq(pool.claimable(members[3]), 0);
        for (uint256 i; i < 3; ++i) {
            vm.prank(members[i]);
            pool.claim();
        }
        vm.prank(treasury);
        pool.claimFees();
        assertEq(usd.balanceOf(address(pool)), 0);
        assertEq(usd.balanceOf(treasury), 20_000);
        vm.prank(members[0]);
        vm.expectRevert();
        pool.claim();
        vm.prank(members[3]);
        vm.expectRevert();
        pool.claim();
    }

    function testAllWinnersFullRefundNoFee() public {
        _joinAll();
        _proofAll();
        _votesWithPassedCount(5);
        pool.settle();
        for (uint256 i; i < 5; ++i) assertEq(pool.claimable(members[i]), STAKE);
        assertEq(pool.feeOwed(), 0);
    }

    function testAllFailuresRefundNoFee() public {
        _joinAll();
        _proofAll();
        _votesWithPassedCount(0);
        pool.settle();
        for (uint256 i; i < 5; ++i) assertEq(pool.claimable(members[i]), STAKE);
        assertEq(pool.feeOwed(), 0);
    }

    function testOneJoinedPoolCancelledAndRefunded() public {
        vm.startPrank(members[0]);
        usd.approve(address(pool), STAKE);
        pool.join();
        vm.stopPrank();
        vm.warp(joinBy);
        pool.finalizeMembership();
        assertEq(uint256(pool.phase()), uint256(HabitPool.Phase.Cancelled));
        vm.prank(members[0]);
        pool.claim();
        assertEq(usd.balanceOf(address(pool)), 0);
    }

    function testFourOfFiveContinueWithAdjustedApprovals() public {
        for (uint256 i; i < 4; ++i) {
            vm.startPrank(members[i]);
            usd.approve(address(pool), STAKE);
            pool.join();
            vm.stopPrank();
        }
        vm.warp(joinBy);
        pool.finalizeMembership();
        assertEq(pool.effectiveApprovals(), 3);
        for (uint256 i; i < 4; ++i) {
            vm.prank(members[i]);
            pool.submitEvidence(keccak256(abi.encodePacked("proof", i)));
        }
        vm.warp(proofBy);
        for (uint256 target; target < 4; ++target) {
            for (uint256 voter; voter < 4; ++voter) {
                if (voter == target) continue;
                vm.prank(members[voter]);
                pool.vote(members[target], target < 2);
            }
        }
        vm.warp(uint256(proofBy) + 6 hours);
        pool.finalizeResults();
        pool.settle();
        assertEq(pool.claimable(members[0]), 19_990_000);
        assertEq(pool.claimable(members[1]), 19_990_000);
        assertEq(pool.claimable(members[4]), 0); // Never deposited
    }

    function testThreeJoinedThresholdCapsAtTwo() public {
        for (uint256 i; i < 3; ++i) {
            vm.startPrank(members[i]);
            usd.approve(address(pool), STAKE);
            pool.join();
            vm.stopPrank();
        }
        vm.warp(joinBy);
        pool.finalizeMembership();
        assertEq(pool.effectiveApprovals(), 2);
    }

    function testTwoOfFiveCanProceedWithOneApproval() public {
        for (uint256 i; i < 2; ++i) {
            vm.startPrank(members[i]);
            usd.approve(address(pool), STAKE);
            pool.join();
            vm.stopPrank();
        }
        vm.warp(joinBy);
        pool.finalizeMembership();
        assertEq(pool.effectiveApprovals(), 1);
        assertEq(uint256(pool.phase()), uint256(HabitPool.Phase.Open));
    }

    function testNoEvidenceFailsAutomaticallyWithoutReviewer() public {
        _joinAll();
        vm.warp(joinBy);
        pool.finalizeMembership();
        vm.prank(members[0]);
        pool.submitEvidence(keccak256("alice-proof"));
        vm.warp(proofBy);
        for (uint256 i = 1; i < 5; ++i) {
            vm.prank(members[i]);
            pool.vote(members[0], true);
        }
        vm.warp(uint256(proofBy) + 6 hours);
        pool.finalizeResults();
        assertEq(pool.pendingCount(), 0);
        assertEq(uint256(pool.outcome(members[1])), uint256(HabitPool.Outcome.Failed));
        pool.settle();
        assertEq(pool.claimable(members[0]), 49_960_000);
    }

    function testSelfVoteAndDuplicateVoteBlocked() public {
        _joinAll();
        _proofAll();
        vm.warp(proofBy);
        vm.prank(members[0]);
        vm.expectRevert();
        pool.vote(members[0], true);
        vm.prank(members[0]);
        pool.vote(members[1], true);
        vm.prank(members[0]);
        vm.expectRevert();
        pool.vote(members[1], true);
    }

    function testOnlyReviewerCanResolveAndImmutableFinalizedVoteOutcome() public {
        _joinAll();
        _proofAll();
        _votesWithPassedCount(3);
        vm.prank(reviewer);
        vm.expectRevert();
        pool.resolvePending(members[3], HabitPool.Outcome.Passed, keccak256("override"));
        assertEq(uint256(pool.outcome(members[3])), uint256(HabitPool.Outcome.Failed));
    }

    function testNotInvitedCannotJoin() public {
        address stranger = makeAddr("stranger");
        usd.mint(stranger, STAKE);
        vm.startPrank(stranger);
        usd.approve(address(pool), STAKE);
        vm.expectRevert();
        pool.join();
        vm.stopPrank();
    }

    function testZeroApprovalThresholdRejectedAtCreation() public {
        address[] memory group = new address[](5);
        for (uint256 i; i < 5; ++i) group[i] = members[i];
        vm.prank(members[0]);
        vm.expectRevert();
        factory.createPool(group, STAKE, joinBy, proofBy, 0, keccak256("bad-policy"));
    }

    function testTwoParticipantChallengeOneOtherPersonVote() public {
        address[] memory pair = new address[](2);
        pair[0] = members[0]; pair[1] = members[1];
        vm.prank(members[0]);
        HabitPool duel = HabitPool(factory.createPool(pair, STAKE, joinBy, proofBy, 1, keccak256("one-v-one")));
        for (uint256 i; i < 2; ++i) {
            vm.startPrank(members[i]);
            usd.approve(address(duel), STAKE);
            duel.join();
            vm.stopPrank();
        }
        vm.warp(joinBy);
        duel.finalizeMembership();
        vm.prank(members[0]); duel.submitEvidence(keccak256("a"));
        vm.prank(members[1]); duel.submitEvidence(keccak256("b"));
        vm.warp(proofBy);
        vm.prank(members[0]); duel.vote(members[1], false);
        vm.prank(members[1]); duel.vote(members[0], true);
        vm.warp(uint256(proofBy) + 6 hours);
        duel.finalizeResults();
        duel.settle();
        assertEq(duel.claimable(members[0]), 19_990_000);
        assertEq(duel.claimable(members[1]), 0);
        assertEq(duel.feeOwed(), 10_000);
    }
}
