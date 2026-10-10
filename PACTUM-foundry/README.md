# PACTUM — Foundry / Monad Testnet MVP

This is a **reviewable, unaudited reference MVP** for the habit-only project. Project name: **PACTUM**. Repository: https://github.com/sanjaykolapkar02-sys/PACTUM. Solidity contracts must be tested on a local Anvil chain before deploying to Monad Testnet. No real money or production deployment.

## What's inside

```text
src/
  DemoUSD.sol          Demo ERC-20 (6 decimals, test faucet)
  HabitPoolFactory.sol Factory; creates one HabitPool per private round
  HabitPool.sol        Join, lock stake, evidence hash, vote, review, settle, claim
script/
  Deploy.s.sol         Token + factory deployment
  CreatePool.s.sol     Create a 2-5 wallet private challenge from a deployed factory
test/
  HabitPool.t.sol      Unit and edge-case tests
docs/
  DECISIONS_AND_GAPS.md Known decisions, mismatches, trust assumptions
foundry.toml
.env.example
```

## Division of responsibility

**MongoDB/backend:** login profile, reusable groups, habit templates, text/cover image, off-chain evidence pictures and references, notifications, searching, indexing events, eligibility UI, voting reminders. **NEVER** keep participant deposits in MongoDB, and NEVER let an API response alone authorize payouts.

**Solidity:** enforce invited wallet addresses, exact token stake, challenge deadlines, proof-hash existence, one on-chain vote per target/voter, outcomes, refund conditions, fee, pro-rata rewards, withdraw-once.

**Frontend/Privy:** show connected wallet and Monad network, request ERC-20 faucet/test tokens, send wallet-signed `approve`, `join`, `finalizeMembership`, `submitEvidence`, `vote`, `finalizeResults`, `settle`, and `claim` transactions; listen to receipts.

## Setup: Windows PowerShell / macOS / Linux

1. Install Foundry from [getfoundry.sh](https://getfoundry.sh/introduction/installation). For Unix-style shells the usual command is:

   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   forge --version
   ```

   On Windows prefer WSL2 or a documented Foundry Windows setup; run the shell commands in WSL.

2. Unzip this project, then open the folder in a terminal:

   ```bash
   cd habitpool-foundry
   forge install --no-git OpenZeppelin/openzeppelin-contracts@v5.4.0
   forge install --no-git foundry-rs/forge-std
   forge build
   forge test -vvv
   ```

   Pin the chosen `forge-std` commit for a locked production build. Dependencies are **not bundled** in this ZIP.

3. Copy `.env.example` to `.env`, set values, do not commit `.env`.

   ```bash
   cp .env.example .env
   ```

4. Optional: test local Anvil and deployment (use **Anvil's throwaway key only**):

   Terminal A:
   ```bash
   anvil
   ```

   Terminal B: edit `.env` to local `RPC_URL=http://127.0.0.1:8545`, `EXPECTED_CHAIN_ID=31337`, local-only private key and addresses, then:
   ```bash
   set -a; source .env; set +a
   forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC_URL" --broadcast -vvvv
   ```

5. Monad Testnet deployment — use a **fresh testnet-only deployer wallet** and testnet MON gas. Verify current official network details at [Monad docs](https://docs.monad.xyz/), and set `RPC_URL`, `EXPECTED_CHAIN_ID`, `PRIVATE_KEY`, `REVIEWER_ADDRESS`, `TREASURY_ADDRESS`:

   ```bash
   set -a; source .env; set +a
   cast chain-id --rpc-url "$RPC_URL"
   forge build
   forge test -vvv
   forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC_URL" -vvvv       # dry run
   forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC_URL" --broadcast -vvvv
   ```

   Never paste a real private key into ChatGPT or commit it to GitHub. Prefer a local testnet keystore/hardware wallet approach and `--account` where possible when productionizing the deploy script.

## Create first challenge with Foundry

After deploying the token + factory, add `FACTORY_ADDRESS`, `MEMBER_COUNT`, `MEMBER_1`, `MEMBER_2`, `STAKE_USD`, `JOIN_DELAY_SECONDS`, `PROOF_DURATION_SECONDS`, `REQUIRED_APPROVALS` and `METADATA_HASH` to `.env`. `MEMBER_1` or another named member **must be the deployer wallet**, since it creates the challenge. For a two-member round set required approvals to 1. Create metadata hash with `cast keccak "my-habit-rules-v1"` (canonical JSON/bytes preferred for actual integration). Then:

```bash
set -a; source .env; set +a
forge script script/CreatePool.s.sol:CreatePool --rpc-url "$RPC_URL" -vvvv        # dry run
forge script script/CreatePool.s.sol:CreatePool --rpc-url "$RPC_URL" --broadcast -vvvv
```

Read the emitted `PoolCreated` event or script log to get the pool address. Store that in backend MongoDB along with creation tx hash, chain ID, deadline timestamps and metadata hash. After this, each invitee must faucet/approve/join from **their own** wallet.

## How a complete challenge works

1. Backend creates a draft group with invited **wallet addresses** (creator included) and uploads habit cover/rules to trusted app storage. Calculate a canonical metadata hash and keep original content in MongoDB.
2. `HabitPoolFactory.createPool(invited, stake, joinDeadline, proofDeadline, requiredApprovals, metadataHash)` returns an emitted `PoolCreated` event with pool contract address.
3. Invitees `DemoUSD.faucet()` once to get fake dollars if needed (not part of production finance).
4. Each participant calls `DemoUSD.approve(poolAddress, stake)` then `HabitPool.join()` using own wallet. User cannot reverse stake once fully funded.
5. After join deadline, call `finalizeMembership()`. If 2+ have joined, the challenge continues with those actual funded members and an adjusted approval count. With fewer than 2, it cancels and funded wallets can reclaim stakes.
6. After `finalizeMembership()`, and between `joinDeadline` and `proofDeadline`, each funded member uploads evidence to backend and calls `submitEvidence(bytes32 hash)` from their own wallet. Keep **actual images OFF CHAIN**. Hash the final evidence payload consistently and prevent backend substitution. Once posted hash cannot change.
7. During the next 6 hours, other members call `vote(targetWallet, approve)` once per target. Self-voting and duplicate voting revert.
8. After vote window expires, call `finalizeResults()`. Approvals >= `requiredApprovals` => Pass; otherwise Fail if votes exist; no evidence or no votes => PendingReview.
9. Missing proof or insufficient approvals is automatically marked Failed at result finalization. The reviewer legacy hook is inactive in this MVP since no PendingReview outcomes are generated.
10. Once all results resolved, anyone may call `settle()`. If there are no passed members, all recover their own stake; if all passed, everyone gets their own stake. Otherwise successful members receive their original stake plus equal shares of losers' stakes **minus 0.1% of losers' stakes**, allocated as claimable balances.
11. Each winner or refunded member calls `claim()` once. Treasury calls `claimFees()` for nonzero fees. Backend indexes the emitted events for the UI.

**Example:** 5 members, each 10 DemoUSD => 50 total. 3 pass, 2 fail => 20 forfeited, fee 0.02, distributable 19.98, each winner claims 16.66; losers claim nothing.

**Warnings:** Two friends voting on each other in 1v1 are a high-collusion risk; only do so with known/trusted users and show a warning. For 100-person groups every person may vote on every other proof, i.e. thousands of wallet transactions; not feasible UX at scale. No emergency admin withdrawal exists. Anyone may finalize membership and results after deadlines, avoiding dependence on a reviewer.

## Contract integration snippets

Token faucet:
```bash
cast send "$TOKEN_ADDRESS" "faucet()" --rpc-url "$RPC_URL" --private-key "$PARTICIPANT_TEST_KEY"
```

Approve token (10 DemoUSD has 6 decimals, so 10000000 units):
```bash
cast send "$TOKEN_ADDRESS" "approve(address,uint256)" "$POOL_ADDRESS" 10000000 --rpc-url "$RPC_URL" --private-key "$PARTICIPANT_TEST_KEY"
```

Join:
```bash
cast send "$POOL_ADDRESS" "join()" --rpc-url "$RPC_URL" --private-key "$PARTICIPANT_TEST_KEY"
```

Join-state query:
```bash
cast call "$POOL_ADDRESS" "joined(address)(bool)" "$WALLET_ADDRESS" --rpc-url "$RPC_URL"
```

Backend needs the factory and pool ABIs from `out/HabitPoolFactory.sol/HabitPoolFactory.json` and `out/HabitPool.sol/HabitPool.json`; frontend likewise, ideally via a shared `packages/contracts/` directory.

## Security considerations

- **Testnet only; unaudited**. On-chain transactions cost gas even for fake USD.
- Invited member list, vote threshold, stake, deadlines and reviewer addresses are fixed during deployment of an individual pool.
- `join` is protected from reentrancy and balance-checks incoming transfers; outgoing claims are guarded and marked claimed before transfer.
- Rewards use pull payments; no unbounded loop of token transfers during `settle()`.
- Loops over at most 101 participants during `finalizeResults` and `settle`; real chain gas profiling is mandatory.
- No wallet rebind; if Privy wallet is lost, on-chain funds remain claimable only by that same wallet.
- **Never** assume screenshot proof is trustworthy. This MVP does not independently verify step counts, screen time, or image authenticity.
- Read `docs/DECISIONS_AND_GAPS.md` before finalizing policies. Some earlier proposals were ambiguous and not implemented.


## PACTUM policy update (2026-10-10)

- The creator chooses a **fixed approval count** at pool creation (`REQUIRED_APPROVALS`, 1..invitedCount-1). This number is immutable.
- When joining ends, anyone may call `finalizeMembership()`. For `joinedCount >= 2` the effective threshold is `min(requiredApprovals, joinedCount - 1)`, frozen for this single round. Example: 5 invited, 4 joined, configured 3 -> effective 3; 3 joined -> effective 2. **This is a capacity cap, not a percentage-preserving formula**.
- With fewer than 2 funded participants, the pool cancels and funded participants can claim refunds.
- **No proof by proof deadline => automatic Failed** at `finalizeResults()`, after the separate 6-hour voting period. Insufficient approvals / no votes => Failed as well. The trusted reviewer can no longer override these results.
- All-failed outcomes still return original stakes to everyone and charge no fee, as previously decided; therefore a missing-proof failure does not guarantee financial forfeiture if nobody wins.
- One challenge = one round for this MVP. Carry-forward and further rounds are out of scope.
- Only joined members participate or vote; invited-but-unjoined addresses never receive a claim.

### Deployment safety

This is *not audited* and depends on off-chain honesty of peer approval. Do not deploy with real-value assets. The current fixed-approval option can be `1`, allowing a single approving peer even in a large group; consider requiring majority later if desired. Two-user mode means one wallet controls approval of the other user.
