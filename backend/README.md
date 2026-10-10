# CommitmentPool Backend API

Backend service for the **PACTUM / CommitmentPool** habit-accountability application on Monad Testnet.

## Architecture

- **Runtime**: Node.js (>= 18)
- **Language**: TypeScript & Express.js
- **Database**: MongoDB (Atlas or local) via Mongoose ODM
- **Authentication**: Privy server-side token verification (`@privy-io/node` & `jose`)
- **Network**: Monad Testnet (Chain ID `10143`, RPC `https://testnet-rpc.monad.xyz`)
- **Validation**: Zod schema validation
- **Testing**: Vitest & Supertest

## Directory Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── env.ts          # Zod typed environment validation & error redaction
│   │   ├── database.ts     # Reusable MongoDB connection & ping health checks
│   │   └── monad.ts        # Monad Testnet network configuration
│   ├── middleware/
│   │   ├── errorHandler.ts # Centralized operational/internal error handling
│   │   └── notFound.ts     # 404 handler
│   ├── modules/
│   │   ├── users/          # UserModel schema & index definitions
│   │   ├── challenges/     # ChallengeModel schema & index definitions
│   │   ├── participants/   # ParticipantModel schema & unique compound indexes
│   │   ├── submissions/    # SubmissionModel schema & index definitions
│   │   └── votes/          # VoteModel schema & duplicate voting prevention
│   ├── utils/
│   │   ├── ApiError.ts     # Standardized operational error abstractions
│   │   └── asyncHandler.ts # Express async handler wrapper
│   ├── tests/
│   │   ├── database.test.ts # Connection lifecycle, ping, and credential redaction tests
│   │   ├── health.test.ts   # /api/health and /health endpoint tests
│   │   └── models.test.ts   # Mongoose schemas and validation rules tests
│   ├── app.ts              # Express application setup
│   └── server.ts           # Server bootstrap and graceful shutdown
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the required environment variables:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | HTTP Server port | `4000` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `http://localhost:5174` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/commitmentpool` |
| `PRIVY_APP_ID` | Privy Application ID | `cl...` |
| `PRIVY_APP_SECRET` | Privy Server Secret | `sec_...` |
| `MONAD_RPC_URL` | Monad Testnet RPC endpoint | `https://testnet-rpc.monad.xyz` |
| `MONAD_CHAIN_ID` | Monad Testnet Chain ID | `10143` |

> [!CAUTION]
> Never commit `.env` to Git. Real credentials, MongoDB URIs, and Privy secrets must never be exposed or printed to client logs.

## Available Commands

- `npm run dev`: Start TypeScript server in development watch mode via `tsx`.
- `npm run build`: Compile TypeScript to `dist/`.
- `npm run typecheck`: Validate TypeScript types (`tsc --noEmit`).
- `npm test`: Run automated Vitest test suite (`vitest run`).
- `npm run test:legacy`: Run legacy verification script (`node test/api.test.js`).
- `npm start`: Start legacy/compiled server.

## Health Endpoints

### 1. `GET /api/health`

Verifies actual database connectivity by executing a live `admin().ping()` command:

```bash
curl -X GET http://localhost:4000/api/health
```

Example healthy response (`200 OK`):
```json
{
  "success": true,
  "service": "commitmentpool-api",
  "status": "ok",
  "chainId": 10143,
  "timestamp": "2026-10-10T09:22:00.000Z",
  "database": {
    "connected": true,
    "status": "connected",
    "latencyMs": 2,
    "error": null
  }
}
```

Example degraded response (`503 Service Unavailable`):
```json
{
  "success": false,
  "service": "commitmentpool-api",
  "status": "degraded",
  "chainId": 10143,
  "timestamp": "2026-10-10T09:22:00.000Z",
  "database": {
    "connected": false,
    "status": "disconnected",
    "latencyMs": null,
    "error": "Database is disconnected"
  }
}
```

### 2. `GET /health`

Backward-compatible health endpoint for legacy tooling:

```bash
curl -X GET http://localhost:4000/health
```

## Security Best Practices Implemented

1. **Credential Redaction**: `sanitizeMongoUri` strips all passwords and usernames from connection logs.
2. **CORS Isolation**: Configured strictly for `FRONTEND_ORIGIN` (disallows wildcard origins when credentials are used).
3. **HTTP Headers**: Enhanced via `helmet`.
4. **Body Limiting**: JSON body limited to `1mb`.
5. **No Floating Point Staking**: Stake amounts are stored as integer base-unit strings (`wei`), preventing JavaScript floating-point inaccuracies.
