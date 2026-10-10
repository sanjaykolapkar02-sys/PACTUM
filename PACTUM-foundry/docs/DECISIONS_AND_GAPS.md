# PACTUM — Confirmed decisions and remaining blockers

## Confirmed and applied
- Name PACTUM, repo https://github.com/sanjaykolapkar02-sys/PACTUM
- Habits-only MVP with image evidence stored off-chain, hash on-chain, no device oracle.
- Fixed approval count configured by creator, immutable per challenge.
- If fewer invited wallets join, continue with at least two paid participants. Freeze effective approvals at min(configured approvals, joinedCount - 1).
- Missing proof automatically fails; insufficient approvals also fails; result finalization after vote window.
- One round per challenge, no carry-forward MVP.
- Fixed DemoUSD stake; 0.1% fee on forfeited loser pool ONLY for mixed winner/loser results.
- All winners or all losers => no fee, everybody who funded gets original stake back.
- Withdrawals only after settlement/cancellation; no mid-challenge opt-out.

## Important remaining product/security decisions
1. For a creator-configured 3-of-4 threshold, if only 3 join, implemented threshold is 2-of-2. Confirm this capacity cap, or replace with a different adjustment policy.
2. Minimum meaningful group size: 2 currently. For 1v1, single adversarial peer can approve/reject target; previously noted as known-only with UI warnings.
3. Creator may select only 1 approval in a large group. Require minimum majority in the product/contract, or accept creator-defined low trust? Current code accepts 1.
4. Do you want deliberate votes below threshold to fail (current) or manual appeal? Current project skips automatic appeal in MVP.
5. All-loser refund includes people without proof (as previously agreed). This is an incentive and fairness trade-off.
6. Evidence proofDeadline and 6-hour vote window are distinct. App must automate finalizeMembership() and finalizeResults() via a keeper or allow any user to call; Solidity does NOT run on a timer.
7. Each user can use multiple wallets unless backend enforces one verified wallet; wallet identity binding remains an off-chain policy.
8. Admin private keys, trusted reviewer role, fee treasury custody, token issuance limits and token faucet abuse need governance.
9. Token assumes ordinary ERC20; no fee-on-transfer, no rebasing. Solidity code is unaudited and needs local Foundry compilation, fuzz/property tests and testnet validation.
10. Multi-round carry-forward, dispute refunds and exact series closure deliberately deferred.
