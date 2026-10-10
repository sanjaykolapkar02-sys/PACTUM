# CommitmentPool - Privy & Monad Testnet Integration Guide

## Overview

CommitmentPool uses **Privy** for Google OAuth and automatic embedded EVM wallet provisioning on the **Monad Testnet (Chain ID 10143)**.

- **Frontend:** Vanilla HTML/CSS/JavaScript with `@privy-io/js-sdk-core` and central `config.js`.
- **Backend:** Node.js/Express server verifying JWT access tokens via Privy JWKS and querying user profiles via Privy REST API.
- **Blockchain:** Monad Testnet (`https://testnet-rpc.monad.xyz`, Chain ID `10143`).

---

## 1. Where to Put Credentials

### Frontend (Public App ID only)
Open `config.js` at the root of the repository:
```javascript
// config.js
const APP_CONFIG = {
  // ⬇️ Paste your Privy App ID from dashboard.privy.io here:
  privyAppId: 'clxxxxxxxxxxxxxxxxxxxxxxx',

  backendUrl: 'http://localhost:3001',
  monadRpcUrl: 'https://testnet-rpc.monad.xyz',
  monadChainId: 10143
};
```
> **Security Rule:** Never paste `PRIVY_APP_SECRET` into frontend code or HTML files.

### Backend (App ID and App Secret)
Open `backend/.env` (created from `backend/.env.example`):
```env
# backend/.env
PRIVY_APP_ID=clxxxxxxxxxxxxxxxxxxxxxxx
PRIVY_APP_SECRET=your_privy_app_secret_from_dashboard
FRONTEND_ORIGIN=http://localhost:8000
PORT=3001
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAIN_ID=10143
```
> **Security Rule:** `backend/.env` is ignored by Git and must never be committed.

---

## 2. Privy Dashboard Configuration Checklist

1. **Create App:**
   - Log into [https://dashboard.privy.io](https://dashboard.privy.io).
   - Select or create your app.

2. **Enable Google Login:**
   - Go to **Login Methods** (or **Authentication**).
   - Enable **Google**.

3. **Configure Embedded Wallets:**
   - Go to **Embedded Wallets**.
   - Under **Create on login**, select **Automatic** (or toggle "Create EVM wallet automatically on login").
   - Ensure the wallet network is configured for EVM/Ethereum.

4. **Add Allowed Domains (CORS / Redirects):**
   - Go to **Settings** -> **Allowed Domains / Origins**.
   - Add:
     - `http://localhost:8000`
     - `http://127.0.0.1:8000`
     - (And any production URL where your frontend is hosted)

5. **Retrieve API Keys:**
   - Go to **Settings** -> **Basics / API Keys**.
   - Copy **App ID** -> Put into `config.js` and `backend/.env`.
   - Copy **App Secret** -> Put exclusively into `backend/.env`.

---

## 3. Running the Application

### Step 1: Start Backend Server
```bash
cd backend
npm install
npm start
```
You should see:
```text
[CommitmentPool Backend] Listening on http://localhost:3001
[CommitmentPool Backend] CORS allowed origin: http://localhost:8000
[CommitmentPool Backend] Privy App ID: clxxxxxxxxxxxxxxxxxxxxxxx
[CommitmentPool Backend] Monad Testnet RPC: https://testnet-rpc.monad.xyz (Chain ID: 10143)
```

### Step 2: Start Frontend Server
From the project root:
```bash
python -m http.server 8000
```
Open `http://localhost:8000/login.html` in your browser.

---

## 4. Testing & Verification

### Running Automated Test Suite
From `backend/`:
```bash
npm run test:all
```
This runs:
- 5 backend API security and health tests (unauthorized rejection, invalid token rejection, 404 handler, health check with Monad Chain ID).
- 11 client auth & Monad Testnet tests (embedded wallet discovery, MON balance BigInt formatting, address shortening, configuration error handling, live Monad Testnet RPC connectivity).

### Testing Live Google Login & Embedded Wallet Creation
1. Open `http://localhost:8000/login.html`.
2. Click **"Continue with Google"**.
3. Sign in with your Google account.
4. Verify you are redirected to `dashboard.html`.
5. Verify your Monad Testnet wallet address (`0x...`) and balance are displayed.
6. Click **"Get MON"** in the top navigation or sidebar to visit `faucet.html`, copy your embedded wallet address, and request testnet tokens from the official faucet.
