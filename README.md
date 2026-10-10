[PACTUM_README.md](https://github.com/user-attachments/files/33281980/PACTUM_README.md)
# PACTUM

**Put a stake behind your goals. PACTUM turns everyday commitments into on-chain accountability challenges — track real progress, prove completion, and let smart contracts distribute the pool.**

A creator launches a challenge, sets the rules and stake, and invites others. Participants join using their wallets, work toward a measurable goal, and submit evidence. Device signals or peer approvals help determine the outcome. Participants who succeed recover their stake and share the stakes forfeited by those who fail, subject to the challenge rules.

**Built for Monad Testnet · DeFi · On-chain accountability**

- **Repository:** [github.com/sanjaykolapkar02-sys/PACTUM](https://github.com/sanjaykolapkar02-sys/PACTUM)
- **Network:** Monad Testnet (chain ID `10143`)
- **Live Link**[pactum-akqs.vercel.app](https://pactum-akqs.vercel.app/)  
- **contract add** : 0x91902715eE368c3782B0B1ab12d0948FA8aB1345
- **Token:** Test USD-denominated ERC-20 asset (DemoUSD concept; verify current deployment and token address before using)
- **Status:** Active development / testnet MVP. Deployment addresses, production URLs and end-to-end evidence should be added after verification.

---

## Verify it yourself

| Claim | Where to check |
| --- | --- |
| Public code | [PACTUM repository](https://github.com/sanjaykolapkar02-sys/PACTUM) |
| Frontend stack | `frontend/package.json` — React, Vite, TypeScript, Privy, viem |
| Backend stack | `backend/package.json` — Express, MongoDB/Mongoose, Privy SDK, viem |
| Smart contract tooling | `PACTUM-foundry/foundry.toml` — Solidity 0.8.24, Foundry |
| Monad deployment | **Add verified contract addresses and MonadVision links** |
| Hosted demo | **Add actual frontend and backend URLs** |
| Live transaction test | **Add transaction hashes and test output after running the complete flow** |

> Do not treat a passing local test or a Vercel deployment as proof that staking, verification, and settlement already work end to end on-chain.

## What this actually is

Habit trackers can tell you what you intended to do. PACTUM asks a harder question: **what happens when you attach a measurable financial commitment to that intention?**

The key idea is a shared commitment pool rather than a simple checklist. Every participant stakes a test token. Evidence determines which participants complete the challenge. The smart contract applies the agreed settlement rules so that successful participants recover their deposits and can receive additional rewards funded by unsuccessful participants.

Three elements make the approach distinctive:

1. **Real stakes, visible outcomes.** A commitment has an economic consequence, and relevant transfers can be inspected on Monad Testnet.
2. **Evidence rather than self-report alone.** Step counts and screen time can use device-originated signals through a companion integration and an authorized oracle. Other habits can use community evidence and approvals.
3. **Social accountability with programmable settlement.** Small groups can compete or collaborate under predefined joining, voting, deadline, and payout rules.

PACTUM is a **testnet demonstration**, not a promise of financial returns and not a production real-money staking product.

## Three challenge categories

| Category | User goal | Intended proof path |
| --- | --- | --- |
| **Health & Fitness** | Reach a defined daily step target | Android Health Connect step data, validated by the backend/oracle |
| **Screen Time** | Stay below a selected device usage limit | Device usage data through a permissioned Android companion and verifier |
| **Habits** | Complete a custom personal routine | Submitted evidence and group/peer review |

The two device-dependent categories require user permission and a supported data source. A web page alone cannot reliably read another phone's Health Connect or screen-time history. For the MVP, the oracle trust model is **one authorized signer**, not a decentralized oracle network.

## Challenge lifecycle

```text
Sign in / connect wallet
         |
Discover or create a challenge
         |
Set category, goal, stake, dates, minimum/maximum members
         |
Invite friends -> participants join and stake
         |
Challenge starts if minimum participation is met
         |
Participants perform goals and provide evidence
         |
Device verification / authorized oracle / peer review
         |
Determine outcomes according to deadlines and rules
         |
On-chain settlement -> stake returns and reward allocation
         |
Dashboard shows results, rewards and activity
```

### Participation and rules

- **Minimum participants:** creator-configurable, but at least **2**.
- **Maximum participants:** **15**.
- **Below minimum at joining close:** the challenge must be cancelled or handled through its specified refund logic.
- **Below the maximum but above the minimum:** the challenge can proceed with participants who joined.
- **Joining and proof deadlines:** fixed by the created challenge and enforced by the contract's state machine.
- **Approval requirement:** a fixed threshold selected when creating a challenge; it must be consistent with the contract's actual implementation.
- **1v1 challenges:** supported for known/trusted participants, with a warning in the UI about the limitations of peer review.

Rules must be locked when a challenge is created, rather than silently modified after participants have staked.

## Who gets paid?

Consider five people joining a challenge for **10 DemoUSD each**. The pool contains **50 DemoUSD**. If three finish successfully and two fail, the intended basic payout model is:

```text
Total locked:              50 DemoUSD
Successful stakes returned: 30 DemoUSD (10 each)
Failed stakes to distribute:20 DemoUSD
Reward per successful user: ~6.6667 DemoUSD
Gross payout per finisher:  ~16.6667 DemoUSD
```

This is an **illustrative calculation**, not an observed on-chain transaction. Actual transfers depend on ERC-20 decimal precision, contract rounding, fees (if any), and how the implementation handles remainder dust, zero winners, refunds, and unresolved results.

## Evidence and the oracle

```text
Android device / participant submission
                 |
Permissioned evidence collection
                 |
Backend: validate challenge, wallet, date and payload
                 |
Authorized oracle: approve or reject the result
                 |
Signed / authorized result submitted to Monad
                 |
Smart contract validates authority and challenge state
                 |
Outcome recorded -> settlement when eligible
```

The oracle should bind evidence to the participant wallet, challenge, measurement window, and decision. It must prevent reused or stale attestations. A missing or delayed result must follow an explicit pending/review policy; a verifier outage must not quietly invent a win or loss. The project design has included a **6-hour result timeout with controlled review for missing results** — validate the final deployed contract behavior before describing that as live functionality.

## The participant experience

| Area | Purpose |
| --- | --- |
| **Landing / authentication** | Learn about PACTUM and sign in through the configured login flow |
| **Dashboard** | See active challenges, progress, staked amounts and rewards |
| **Explore challenges** | Browse fitness, screen-time and habit challenges |
| **Create challenge** | Configure category, goal, stake, member limits, deadlines and rules |
| **Challenge details** | Review conditions, participants, pool and evidence requirements |
| **Join challenge** | Connect the wallet, approve the token if required, and deposit the stake |
| **My challenges** | Follow deadlines, submissions and outcomes |
| **Evidence / review** | Check device-based verification status or participate in peer review |
| **Rewards / activity** | View settlement outcomes and transaction history |

These are product areas and target flows; check each deployed route before advertising it as functional.

## Architecture

```text
       React + TypeScript + Vite frontend
                 |           |
                 |           +--> Privy login / embedded or linked wallet
                 |
            HTTPS API
                 |
     Express + TypeScript backend
          |                |
      MongoDB         Evidence / oracle service
          |                |
          +------- authorized transaction/result flow
                           |
                    Monad Testnet
                           |
             CommitmentPool smart contract
                           |
                DemoUSD ERC-20 stakes
```

The frontend manages navigation, transaction prompts and progress display. The backend owns application profiles, off-chain challenge metadata, evidence intake and verification orchestration. **The contract must be authoritative for deposits, settlement eligibility and payout accounting**; database records are not a substitute for actual chain state.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Lucide icons |
| Authentication and wallet UX | Privy |
| Chain interaction | viem |
| API | Node.js, Express, TypeScript |
| Persistence | MongoDB, Mongoose |
| Smart contracts | Solidity, Foundry, OpenZeppelin libraries |
| Chain | Monad Testnet (10143) |
| Device evidence | Android / Kotlin companion concept with Health Connect and screen-time permissions |
| Hosting | Frontend and backend configured for independent deployment, including Vercel |

## Repository structure

The paths below are **verified entry points**, not a claim to exhaustively list every file:

```text
PACTUM/
├── README.md                    # existing README describes an earlier HTML prototype
├── .env.example                 # legacy HTML configuration reference
├── frontend/
│   └── package.json            # React/Vite scripts and dependencies
├── backend/
│   └── package.json            # Express API scripts and dependencies
└── PACTUM-foundry/
    └── foundry.toml            # Solidity/Foundry configuration
```

Check the repository for the latest Android module, Solidity source files, deployment scripts and tests before adding their exact paths here.

## Run it yourself

### Prerequisites

- Node.js and npm compatible with the checked-in frontend/backend dependencies.
- [Foundry](https://book.getfoundry.sh/getting-started/installation) for smart contract tests and deployment.
- MongoDB connection string and Privy application credentials for configured backend/auth flows.
- Monad Testnet RPC access and testnet MON for gas on wallets that submit transactions. Obtain funds only from a trusted [Monad faucet](https://faucet.monad.xyz/).

### Clone

```bash
git clone https://github.com/sanjaykolapkar02-sys/PACTUM.git
cd PACTUM
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Available scripts include `npm run build`, `npm run typecheck`, `npm run lint` and `npm test`.

### Backend

In a separate terminal:

```bash
cd backend
npm install
npm run dev
```

The backend also defines `npm run build`, `npm run typecheck` and `npm test`. Supply the required backend environment values using the repo's current environment example and server configuration. Do not commit `.env` files or private keys.

### Contracts

```bash
cd PACTUM-foundry
forge build
forge test -vv
```

**Deployment is a separate explicit step.** Inspect and use the deployment script that actually exists in the repo, confirm constructor parameters, correct token/contract addresses, chain ID 10143, and deployer balance, then broadcast to Monad Testnet. Do not copy a different project's contract addresses or presume tests deployed a contract.

## End-to-end acceptance checks

Before marking the MVP as working, demonstrate the following with distinct wallets on Monad Testnet:

1. Authenticate and connect on the correct network.
2. Create a challenge with a valid stake, deadlines and membership limits.
3. Join from multiple wallets and confirm actual ERC-20 balances change.
4. Verify behavior when the minimum member count is not reached.
5. Verify valid evidence, missing evidence, delayed results and rejected approvals.
6. Confirm that only the authorized oracle can submit an oracle-driven result.
7. Finalize both successful and failed participants, then settle once.
8. Compare all before/after token balances with the contract's expected payouts.
9. Confirm stale signatures, duplicate claims, repeated votes and repeat settlement fail safely.
10. Capture transaction hashes, contract addresses and test logs for judges.

## Why Monad?

A commitment is more useful when joining, verifying and settling it is inexpensive enough to demonstrate with multiple real participants. Monad provides an EVM-compatible environment for deploying Solidity contracts and testing the complete on-chain stake-and-reward lifecycle.

PACTUM does **not** depend on a claim of currently measured gas savings or transactions per second to explain its value. Those figures should only be published after reproducible benchmarks.

## What remains to prove

- Confirm the currently deployed contract addresses and verified sources.
- Confirm frontend and backend production URLs, CORS settings and Privy allowed origins.
- Complete and demonstrate real device evidence intake, not just simulated values.
- Publish a real multi-wallet staking-to-settlement test with transaction evidence.
- Document refund, tie, zero-winner, dispute and rounding behavior precisely from deployed Solidity code.
- Add final screenshots, demo video and a deployment architecture diagram.

## Security and limitations

**Testnet-only:** DemoUSD-style assets are testing tokens and do not represent redeemable dollars. PACTUM's verification system is trust-dependent: the single authorized oracle can be a point of failure or compromise, and peer review can be biased or collusive. Health and usage metrics require consent, device permissions, freshness checks and careful data minimization. Never enter seed phrases into the web app or expose server signing keys through frontend environment variables.

---

**PACTUM — Make commitments count.**
