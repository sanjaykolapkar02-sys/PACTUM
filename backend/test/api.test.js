/**
 * CommitmentPool Backend API Tests
 * Run: node test/api.test.js
 *
 * Tests /health, /api/me (no token), /api/me (bad token), /api/me (malformed token), 404 route.
 * Live Privy verification requires an actual session token.
 */

const http = require('http');
const app = require('../server');

let BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
let serverInstance = null;

function req(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

let passed = 0, failed = 0, blocked = 0;

function result(name, status, detail = '') {
  console.log(`[${status}] ${name}${detail ? ' - ' + detail : ''}`);
  if (status === 'PASS') passed++;
  else if (status === 'FAIL') failed++;
  else blocked++;
}

async function startServerIfNeeded() {
  try {
    const res = await req('GET', '/health');
    if (res.status === 200) {
      console.log(`Connected to existing backend server at ${BASE_URL}`);
      return;
    }
  } catch (_) {
    // Server not running on BASE_URL; start in-process on an ephemeral port
  }

  return new Promise((resolve, reject) => {
    serverInstance = app.listen(0, () => {
      const address = serverInstance.address();
      BASE_URL = `http://localhost:${address.port}`;
      console.log(`Started in-process test server at ${BASE_URL}`);
      resolve();
    });
    serverInstance.on('error', reject);
  });
}

async function runTests() {
  console.log('\n=== CommitmentPool Backend API Tests ===\n');

  await startServerIfNeeded();

  // --- GET /health ---
  try {
    const r = await req('GET', '/health');
    if (r.status === 200 && r.body.status === 'ok' && r.body.chainId === '10143') {
      result('GET /health returns 200 with status:ok and Monad chainId 10143', 'PASS');
    } else {
      result('GET /health returns 200 with status:ok and Monad chainId 10143', 'FAIL', `Got ${r.status} ${JSON.stringify(r.body)}`);
    }
  } catch (e) {
    result('GET /health returns 200 with status:ok', 'FAIL', `Connection error: ${e.message}`);
  }

  // --- GET /api/me (no token) ---
  try {
    const r = await req('GET', '/api/me');
    if (r.status === 401 && r.body.error === 'unauthorized') {
      result('GET /api/me without token returns 401 unauthorized', 'PASS');
    } else {
      result('GET /api/me without token returns 401 unauthorized', 'FAIL', `Got ${r.status} ${JSON.stringify(r.body)}`);
    }
  } catch (e) {
    result('GET /api/me without token returns 401', 'FAIL', `Connection error: ${e.message}`);
  }

  // --- GET /api/me (malformed token) ---
  try {
    const r = await req('GET', '/api/me', { Authorization: 'Bearer not.a.real.privy.token' });
    if (r.status === 401) {
      result('GET /api/me with malformed token returns 401', 'PASS');
    } else {
      result('GET /api/me with malformed token returns 401', 'FAIL', `Got ${r.status} ${JSON.stringify(r.body)}`);
    }
  } catch (e) {
    result('GET /api/me with malformed token returns 401', 'FAIL', `Connection error: ${e.message}`);
  }

  // --- GET /api/me (expired / invalid signature token) ---
  try {
    const fakeToken = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0In0.invalid';
    const r = await req('GET', '/api/me', { Authorization: `Bearer ${fakeToken}` });
    if (r.status === 401) {
      result('GET /api/me with expired/invalid token returns 401', 'PASS');
    } else {
      result('GET /api/me with expired/invalid token returns 401', 'FAIL', `Got ${r.status}`);
    }
  } catch (e) {
    result('GET /api/me with expired/invalid token returns 401', 'FAIL', `Connection error: ${e.message}`);
  }

  // --- 404 handler ---
  try {
    const r = await req('GET', '/api/does-not-exist');
    if (r.status === 404) {
      result('Unknown route returns 404', 'PASS');
    } else {
      result('Unknown route returns 404', 'FAIL', `Got ${r.status}`);
    }
  } catch (e) {
    result('Unknown route returns 404', 'FAIL', `Connection error: ${e.message}`);
  }

  // --- GET /api/me (valid token) - BLOCKED without live credentials ---
  result(
    'GET /api/me with live Privy access token returns 200 + user profile',
    'BLOCKED',
    'Requires live Privy credentials and user session. To test: PRIVY_ACCESS_TOKEN=<token> node test/api.test.js'
  );

  // Optional live token verification check if provided
  if (process.env.PRIVY_ACCESS_TOKEN) {
    try {
      const r = await req('GET', '/api/me', { Authorization: `Bearer ${process.env.PRIVY_ACCESS_TOKEN}` });
      if (r.status === 200 && r.body.privyUserId) {
        result('GET /api/me with live Privy token returns 200 + user', 'PASS', `userId: ${r.body.privyUserId}`);
      } else {
        result('GET /api/me with live Privy token returns 200 + user', 'FAIL', `Got ${r.status} ${JSON.stringify(r.body)}`);
      }
    } catch (e) {
      result('GET /api/me with live Privy token returns 200 + user', 'FAIL', `Connection error: ${e.message}`);
    }
  }

  console.log(`\nResults: ${passed} PASS  ${failed} FAIL  ${blocked} BLOCKED\n`);

  if (serverInstance) {
    serverInstance.close();
  }

  if (failed > 0) process.exit(1);
}

runTests().catch(e => {
  console.error(e);
  if (serverInstance) serverInstance.close();
  process.exit(1);
});
