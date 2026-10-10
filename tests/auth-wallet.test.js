/**
 * tests/auth-wallet.test.js
 * Unit and integration tests for CommitmentPool Privy auth & Monad Testnet utilities.
 * Run: node tests/auth-wallet.test.js
 */

const assert = require('assert');
const path = require('path');

// Require privy-auth module
const PrivyAuth = require('../privy-auth.js');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('\n=== CommitmentPool Client Auth & Monad Wallet Tests ===\n');

  // 1. Monad Testnet Constants
  it('Monad Testnet constants are correctly configured for Chain ID 10143', () => {
    assert.strictEqual(PrivyAuth.MONAD_TESTNET.chainId, 10143);
    assert.strictEqual(PrivyAuth.MONAD_TESTNET.chainIdHex, '0x279f');
    assert.strictEqual(PrivyAuth.MONAD_TESTNET.rpcUrl, 'https://testnet-rpc.monad.xyz');
    assert.strictEqual(PrivyAuth.MONAD_TESTNET.faucetUrl, 'https://faucet.monad.xyz');
    assert.strictEqual(PrivyAuth.MONAD_TESTNET.symbol, 'MON');
  });

  // 2. Embedded Wallet Discovery
  it('findEmbeddedWallet returns null when user or linkedAccounts is empty', () => {
    assert.strictEqual(PrivyAuth.findEmbeddedWallet(null), null);
    assert.strictEqual(PrivyAuth.findEmbeddedWallet({}), null);
    assert.strictEqual(PrivyAuth.findEmbeddedWallet({ linkedAccounts: [] }), null);
  });

  it('findEmbeddedWallet ignores external wallets (MetaMask / Phantom)', () => {
    const user = {
      linkedAccounts: [
        { type: 'wallet', walletClientType: 'metamask', chainType: 'ethereum', address: '0xMetaMask' },
        { type: 'wallet', walletClientType: 'phantom', chainType: 'solana', address: '0xPhantom' }
      ]
    };
    assert.strictEqual(PrivyAuth.findEmbeddedWallet(user), null);
  });

  it('findEmbeddedWallet identifies Privy embedded EVM wallet regardless of array index', () => {
    const user = {
      linkedAccounts: [
        { type: 'google_oauth', email: 'test@example.com' },
        { type: 'wallet', walletClientType: 'coinbase_wallet', chainType: 'ethereum', address: '0xCoinbase' },
        { type: 'wallet', walletClientType: 'privy', chainType: 'ethereum', address: '0xPrivyEmbeddedWallet' }
      ]
    };
    const wallet = PrivyAuth.findEmbeddedWallet(user);
    assert.ok(wallet, 'Should find the embedded wallet');
    assert.strictEqual(wallet.address, '0xPrivyEmbeddedWallet');
    assert.strictEqual(wallet.walletClientType, 'privy');
    assert.strictEqual(wallet.chainType, 'ethereum');
  });

  // 3. MON Balance Formatting
  it('formatMON formats zero wei correctly', () => {
    assert.strictEqual(PrivyAuth.formatMON(0n), '0.0000 MON');
  });

  it('formatMON formats 1 MON correctly', () => {
    assert.strictEqual(PrivyAuth.formatMON(1000000000000000000n), '1.0000 MON');
  });

  it('formatMON formats decimal MON correctly without floating point errors', () => {
    assert.strictEqual(PrivyAuth.formatMON(1523400000000000000n), '1.5234 MON');
    assert.strictEqual(PrivyAuth.formatMON(50000000000000000n), '0.0500 MON');
    assert.strictEqual(PrivyAuth.formatMON(1234567890123456789n), '1.2345 MON');
  });

  // 4. Address Truncation Helper
  it('shortAddress truncates long ethereum addresses safely', () => {
    assert.strictEqual(PrivyAuth.shortAddress('0x1234567890abcdef1234567890abcdef12345678'), '0x1234...5678');
    assert.strictEqual(PrivyAuth.shortAddress('short'), 'short');
    assert.strictEqual(PrivyAuth.shortAddress(''), '');
  });

  // 5. Configuration Validation
  it('getConfig throws helpful error if Privy App ID is unconfigured or placeholder', () => {
    delete global.window;
    assert.throws(() => {
      PrivyAuth.getConfig();
    }, /Privy App ID is not configured/);

    global.window = { CP_CONFIG: { privyAppId: 'YOUR_PRIVY_APP_ID' } };
    assert.throws(() => {
      PrivyAuth.getConfig();
    }, /Privy App ID is not configured/);
  });

  it('getConfig returns configured options and allows custom Monad RPC', () => {
    global.window = {
      CP_CONFIG: {
        privyAppId: 'test-app-id-12345',
        backendUrl: 'http://localhost:3001',
        monadRpcUrl: 'https://custom-monad-rpc.xyz'
      }
    };
    const config = PrivyAuth.getConfig();
    assert.strictEqual(config.privyAppId, 'test-app-id-12345');
    assert.strictEqual(config.backendUrl, 'http://localhost:3001');
    assert.strictEqual(config.monadRpcUrl, 'https://custom-monad-rpc.xyz');
    assert.strictEqual(config.monadChainId, 10143);
  });

  // 6. Live Monad Testnet RPC verification
  await itAsync('Monad Testnet RPC endpoint returns correct Chain ID 10143 (0x279f)', async () => {
    const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] });
    const res = await fetch('https://testnet-rpc.monad.xyz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });
    assert.ok(res.ok, `RPC HTTP response status: ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.result, '0x279f', `Expected 0x279f, got ${data.result}`);
  });

  console.log(`\nResults: ${passed} PASS  ${failed} FAIL\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
