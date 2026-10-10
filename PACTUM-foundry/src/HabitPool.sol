// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice One private, single-round habit challenge. Each inviter must accept and stake.
/// @dev Token is assumed to be standard, non-rebasing, non-fee-on-transfer ERC20.
///      Proof content lives off-chain; only evidence hashes and wallet votes are on-chain.
contract HabitPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Phase { Open, Cancelled, ResultsFinalized, Settled }
    enum Outcome { None, PendingReview, Passed, Failed, Refunded }

    IERC20 public immutable token;
    address public immutable creator;
    address public immutable reviewer;
    address public immutable treasury;
    uint256 public immutable stake;
    uint64 public immutable joinDeadline;
    uint64 public immutable proofDeadline;
    uint64 public immutable voteDeadline;
    uint16 public immutable requiredApprovals; // Creator-selected threshold at creation
    uint16 public effectiveApprovals; // min(configured threshold, actual joined voters)
    bytes32 public immutable metadataHash;
    uint256 public constant FEE_BPS = 10; // 0.10% of forfeited (loser) stakes, in mixed outcomes only.
    uint256 public constant BPS_DENOMINATOR = 10_000;

    Phase public phase;
    address[] private _participants;
    uint256 public joinedCount;
    bool public membershipFinalized;
    uint256 public pendingCount;
    uint256 public feeOwed;
    bool public feesClaimed;

    mapping(address => bool) public invited;
    mapping(address => bool) public joined;
    mapping(address => bytes32) public evidenceHash;
    mapping(address => mapping(address => bool)) public hasVoted; // target => voter => cast
    mapping(address => uint256) public approvals;
    mapping(address => uint256) public voteCounts;
    mapping(address => Outcome) public outcome;
    mapping(address => uint256) public claimable;
    mapping(address => bool) public claimed;

    event Joined(address indexed participant, uint256 amount);
    event EvidenceSubmitted(address indexed participant, bytes32 indexed evidenceHash);
    event Voted(address indexed voter, address indexed target, bool approve);
    event CancelledUnfilled();
    event MembershipFinalized(uint256 joinedMembers, uint256 approvalsNeeded);
    event ResultsFinalized(uint256 pending);
    event PendingResolved(address indexed participant, Outcome outcome, bytes32 indexed reasonHash);
    event Settled(uint256 winners, uint256 losers, uint256 refunds, uint256 fee);
    event Claimed(address indexed participant, uint256 amount);
    event FeeClaimed(address indexed treasury, uint256 amount);

    constructor(
        address token_,
        address creator_,
        address reviewer_,
        address treasury_,
        address[] memory participants_,
        uint256 stake_,
        uint64 joinDeadline_,
        uint64 proofDeadline_,
        uint16 requiredApprovals_,
        bytes32 metadataHash_
    ) {
        require(token_ != address(0) && creator_ != address(0) && reviewer_ != address(0) && treasury_ != address(0), "Zero address");
        require(participants_.length >= 2 && participants_.length <= 101, "Participant count out of range");
        require(stake_ != 0 && metadataHash_ != bytes32(0), "Invalid stake or metadata");
        require(joinDeadline_ > block.timestamp && proofDeadline_ > joinDeadline_, "Invalid deadline");
        require(uint256(proofDeadline_) + 6 hours <= type(uint64).max, "Deadline overflow");
        uint256 voters = participants_.length - 1;
        // Fixed creator-selected positive approval requirement; no implicit majority policy.
        require(requiredApprovals_ >= 1 && requiredApprovals_ <= voters, "Invalid approval threshold");
        token = IERC20(token_);
        creator = creator_;
        reviewer = reviewer_;
        treasury = treasury_;
        stake = stake_;
        joinDeadline = joinDeadline_;
        proofDeadline = proofDeadline_;
        voteDeadline = uint64(uint256(proofDeadline_) + 6 hours);
        requiredApprovals = requiredApprovals_;
        metadataHash = metadataHash_;
        bool creatorInvited;
        for (uint256 i; i < participants_.length; ++i) {
            address person = participants_[i];
            require(person != address(0) && !invited[person], "Invalid or duplicate member");
            invited[person] = true;
            _participants.push(person);
            if (person == creator_) creatorInvited = true;
        }
        require(creatorInvited, "Creator must be invited");
    }

    function participants() external view returns (address[] memory) { return _participants; }
    function participantCount() external view returns (uint256) { return _participants.length; }

    function join() external nonReentrant {
        require(phase == Phase.Open && block.timestamp < joinDeadline, "Joining closed");
        require(invited[msg.sender] && !joined[msg.sender], "Not invited or joined");
        // Reject fee-on-transfer tokens, which break pool accounting.
        uint256 beforeBalance = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), stake);
        require(token.balanceOf(address(this)) == beforeBalance + stake, "Unsupported transfer fee token");
        joined[msg.sender] = true;
        joinedCount++;
        emit Joined(msg.sender, stake);
    }

    /// @notice Joining closes at deadline. Two or more funded wallets can proceed even if invitations expire.
    ///         One or zero funded wallets -> cancellation and full refunds.
    function finalizeMembership() public {
        require(phase == Phase.Open && !membershipFinalized && block.timestamp >= joinDeadline, "Cannot finalize membership");
        membershipFinalized = true;
        if (joinedCount < 2) {
            phase = Phase.Cancelled;
            emit CancelledUnfilled();
        } else {
            // The creator's chosen threshold is capped by the number of other joined voters.
            effectiveApprovals = uint16(requiredApprovals < joinedCount ? requiredApprovals : joinedCount - 1);
            emit MembershipFinalized(joinedCount, effectiveApprovals);
        }
    }

    function cancelUnfilled() external {
        require(phase == Phase.Open && !membershipFinalized && block.timestamp >= joinDeadline, "Cannot cancel yet");
        require(joinedCount < 2, "Enough participants to continue");
        finalizeMembership();
    }

    function submitEvidence(bytes32 hash) external {
        require(phase == Phase.Open && membershipFinalized, "Not active");
        require(block.timestamp >= joinDeadline && block.timestamp < proofDeadline, "Outside evidence window");
        require(joined[msg.sender] && hash != bytes32(0) && evidenceHash[msg.sender] == bytes32(0), "Invalid evidence");
        evidenceHash[msg.sender] = hash;
        emit EvidenceSubmitted(msg.sender, hash);
    }

    function vote(address target, bool approve) external {
        require(phase == Phase.Open && membershipFinalized, "Not active");
        require(block.timestamp >= proofDeadline && block.timestamp < voteDeadline, "Outside voting window");
        require(joined[msg.sender] && joined[target] && target != msg.sender, "Invalid voter or target");
        require(evidenceHash[target] != bytes32(0), "No submitted evidence");
        require(!hasVoted[target][msg.sender], "Already voted");
        hasVoted[target][msg.sender] = true;
        voteCounts[target]++;
        if (approve) approvals[target]++;
        emit Voted(msg.sender, target, approve);
    }

    /// @notice No evidence is an automatic failure at vote deadline. No/insufficient approvals also fails.
    function finalizeResults() external {
        require(phase == Phase.Open && membershipFinalized, "Not funded or already final");
        require(block.timestamp >= voteDeadline, "Voting not finished");
        phase = Phase.ResultsFinalized;
        for (uint256 i; i < _participants.length; ++i) {
            address person = _participants[i];
            if (!joined[person]) continue;
            // Missing evidence automatically fails; a submitted proof without enough approvals also fails.
            outcome[person] = evidenceHash[person] != bytes32(0) && approvals[person] >= effectiveApprovals
                ? Outcome.Passed : Outcome.Failed;
        }
        emit ResultsFinalized(pendingCount);
    }

    /// @notice Reserved for future disputes; automatic missing-proof failure does NOT enter review.
    ///         Reviewer cannot change finalized Passed/Failed results.
    ///         Reviewer may resolve ONLY PendingReview with public reason hash.
    /// @dev Reviewer is a trusted MVP role: their decisions materially affect payouts.
    function resolvePending(address person, Outcome decision, bytes32 reasonHash) external {
        require(msg.sender == reviewer, "Reviewer only");
        require(phase == Phase.ResultsFinalized && outcome[person] == Outcome.PendingReview, "Not pending");
        require(reasonHash != bytes32(0), "Reason required");
        require(decision == Outcome.Passed || decision == Outcome.Failed || decision == Outcome.Refunded, "Invalid decision");
        require(decision != Outcome.Passed || evidenceHash[person] != bytes32(0), "No proof for pass");
        outcome[person] = decision;
        pendingCount--;
        emit PendingResolved(person, decision, reasonHash);
    }

    /// @notice Allocate pull-based claims; winner's own stake is returned plus failed-stake share.
    ///         If there are zero winners, all participants get a full refund without fee.
    ///         If there are zero losers, all successful/refunded participants get stake without fee.
    function settle() external {
        require(phase == Phase.ResultsFinalized && pendingCount == 0, "Unresolved results");
        uint256 winners;
        uint256 losers;
        uint256 refunds;
        address lastWinner;
        for (uint256 i; i < _participants.length; ++i) {
            address person = _participants[i];
            if (!joined[person]) continue;
            Outcome result = outcome[person];
            if (result == Outcome.Passed) { winners++; lastWinner = person; }
            else if (result == Outcome.Failed) losers++;
            else if (result == Outcome.Refunded) refunds++;
            else revert("Invalid result");
        }
        phase = Phase.Settled;
        if (winners == 0) {
            // Explicitly agreed policy: everyone refunded if nobody wins.
            for (uint256 i; i < _participants.length; ++i) {
                if (joined[_participants[i]]) claimable[_participants[i]] = stake;
            }
        } else {
            uint256 failedPot = stake * losers;
            uint256 fee = (winners != 0 && losers != 0) ? (failedPot * FEE_BPS) / BPS_DENOMINATOR : 0;
            feeOwed = fee;
            uint256 prize = failedPot - fee;
            uint256 eachBonus = prize / winners;
            uint256 remainder = prize % winners;
            for (uint256 i; i < _participants.length; ++i) {
                address person = _participants[i];
                if (!joined[person]) continue;
                if (outcome[person] == Outcome.Passed) {
                    claimable[person] = stake + eachBonus + (person == lastWinner ? remainder : 0);
                } else if (outcome[person] == Outcome.Refunded) {
                    claimable[person] = stake;
                }
            }
        }
        emit Settled(winners, losers, refunds, feeOwed);
    }

    function claim() external nonReentrant {
        require(phase == Phase.Settled || phase == Phase.Cancelled, "Not claimable yet");
        require(joined[msg.sender] && !claimed[msg.sender], "Not eligible or already claimed");
        uint256 amount = phase == Phase.Cancelled ? stake : claimable[msg.sender];
        require(amount != 0, "No claim available");
        claimed[msg.sender] = true;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    function claimFees() external nonReentrant {
        require(msg.sender == treasury && phase == Phase.Settled, "Treasury only or not settled");
        require(!feesClaimed && feeOwed > 0, "No fees");
        feesClaimed = true;
        token.safeTransfer(treasury, feeOwed);
        emit FeeClaimed(treasury, feeOwed);
    }
}
