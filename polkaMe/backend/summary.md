# PolkaMe Backend — Summary

## What This Backend Does

PolkaMe's backend is a REST API for the **Polkadot wallet mode** of the frontend. When a user connects a Polkadot.js wallet, every action (creating an identity, linking accounts, staking, governance voting, security settings) goes through this server. EVM wallet users talk directly to on-chain contracts instead.

---

## Stack

| Layer | Technology | Why |
| --- | --- | --- |
| Runtime | Node.js 24 + TypeScript 5 | Type safety end-to-end |
| Framework | Express 4 | Mature, minimal |
| Storage | On-chain Solidity contracts via `ethers.js` | Decentralized, immutable, no server-side database needed |
| Auth (EVM) | **thirdweb v5** + JWT (HS256) | EIP-4361 payload generation + ECDSA verification via thirdweb Auth |
| Auth (Polkadot) | sr25519/ed25519 challenge-response + JWT | Polkadot.js extension signing |
| Crypto | `@polkadot/util-crypto` | Polkadot signature verification |
| Security headers | `helmet` | XSS, HSTS, CSP, etc. |
| Rate limiting | `express-rate-limit` | Brute-force protection |
| Hot reload | `tsx watch` | Dev server |

---

## Project Structure

```
backend/
├── .env                      ← Environment config (PORT, JWT_SECRET, contract addresses, etc.)
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts              ← Express app bootstrap + middleware wiring
    ├── contract-client.ts    ← ethers.js provider + 4 contract instances + enum mappings
    ├── types.ts              ← Shared TypeScript interfaces + ok/fail helpers
    ├── middleware/
    │   ├── auth.ts           ← JWT sign/verify, optionalAuth, requireAuth, requireOwner
    │   └── errorHandler.ts   ← Global Express error handler
    └── routes/
        ├── auth.ts           ← Wallet sign-in (nonce, EVM, Polkadot, /me)
        ├── identity.ts       ← DID management and verification
        ├── accounts.ts       ← Chain accounts, social accounts, dApps, activity log
        ├── governance.ts     ← Staking, proposals, voting, validators
        └── security.ts       ← Privacy preferences, sessions, security log
```

---

## On-Chain Storage (4 Solidity contracts)

All data is stored on-chain via 4 deployed Solidity contracts on an EVM-compatible Polkadot parachain (Moonbeam/Astar):

| Contract | Handles |
| --- | --- |
| `PolkaMeIdentity` | Core DID record (displayName, score, timestamps), verification statuses, DID linking (EVM ↔ Polkadot), credentials (KYC, DAO Badge, Reputation), platform stats |
| `PolkaMeAccounts` | Linked chain accounts (Polkadot, Kusama, Astar, Moonbeam), social accounts (Twitter, Discord, GitHub), authorized dApps, activity log |
| `PolkaMeGovernance` | Staking (conviction voting), governance proposals, voting, validators, cross-chain credential sharing |
| `PolkaMeSecurity` | Privacy preferences, session management, security event log |

### Seed Data (populated via `scripts/seed.ts`)

- **3 validators** — Parity Tech, Web3 Foundation, Stakeworld
- **3 governance proposals** — Validator count, Treasury, Unbonding period
- **3 DIDs** — Axel, Berlin, Carol

---

## Auth System

### Overview

Authentication is dual-mode and **optional by default** (`REQUIRE_AUTH=false`).

| Mode | Library | Flow |
| --- | --- | --- |
| EVM | **thirdweb v5** | EIP-4361 payload → MetaMask/thirdweb wallet sign → JWT |
| Polkadot | `@polkadot/util-crypto` | Server nonce → Polkadot.js extension sign → JWT |

### EVM (thirdweb) Auth Flow

```text
1. Client  → GET  /api/auth/payload?address=0x...
              ← { payload }   (EIP-4361 payload with nonce)

2. Client signs the payload with MetaMask / thirdweb ConnectButton

3. Client  → POST /api/auth/login  { payload, signature }
              ← { token }   (JWT HS256, expires in JWT_EXPIRES_IN = 7d)

4. Client stores token and sends:
              Authorization: Bearer <token>
```

### Polkadot Auth Flow

```text
1. Client  → GET  /api/auth/nonce?address=5...
              ← { nonce, message }   (plain text challenge, stored in-memory)

2. Client signs the message with Polkadot.js extension (sr25519/ed25519/ecdsa)

3. Client  → POST /api/auth/polkadot/verify  { address, signature }
              ← { token }   (JWT HS256, expires in JWT_EXPIRES_IN = 7d)

4. Client stores token and sends:
              Authorization: Bearer <token>
```

### Security Details

- Nonces are **single-use** — deleted from memory before verification completes (prevents timing attacks and replay attacks)
- Nonces expire after **10 minutes** (OWASP A07)
- JWT is HS256 signed with a 32-byte random `JWT_SECRET`
- Rate limit: 20 req / 15 min / IP on `/api/auth/*`
- Three middleware levels: `optionalAuth` (non-blocking), `requireAuth` (blocks if REQUIRE_AUTH=true), `requireOwner` (also checks `:address` param matches token)
- `THIRDWEB_SECRET_KEY` must be set for EVM auth to work (get from https://thirdweb.com/dashboard → Settings → API Keys)

---

## API Endpoints (47 total)

All responses follow `{ data: T, success: boolean, error?: string }`.
Paginated list endpoints accept `?page=1&limit=20` query params and return `{ page, limit, items: T[] }`.

### Auth — `GET|POST /api/auth`

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| GET | `/payload?address=` | None | — | `{ payload }` (EVM thirdweb) |
| POST | `/login` | None | `{ payload, signature }` | `{ token }` (EVM) |
| GET | `/nonce?address=` | None | — | `{ nonce, message }` (Polkadot only) |
| POST | `/polkadot/verify` | None | `{ address, signature }` | `{ token }` |
| GET | `/me` | Optional | — | JWT payload |

### Identity — `/api/identity`

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| GET | `/has-did?address=` | None | — | `{ hasDID }` |
| POST | `/create` | None | `{ displayName, address }` | `Identity` |
| GET | `/stats` | None | — | `PlatformStats` |
| GET | `/search?q=` | None | — | `Identity[]` |
| GET | `/:address` | None | — | `Identity` |
| GET | `/:address/verification-status` | None | — | `VerificationStatus` |
| GET | `/:address/verification-progress` | None | — | `VerificationProgress` |
| POST | `/:address/verify` | Owner | `{ method }` | `{ submitted }` |
| GET | `/:address/linked-dids` | None | — | `LinkedDID[]` |
| POST | `/:address/linked-dids` | Owner | `{ linkedAddress, didType }` | `{ linked }` |
| DELETE | `/:address/linked-dids/:linkId` | Owner | — | `{ removed }` |
| POST | `/:address/dao-badge` | Owner | — | `{ granted }` |
| POST | `/:requester/credential-request` | None | `{ targetAddress, credentialType }` | `{ status, granted }` |

`method` values: `"wallet"` (sets governance), `"social"` (sets socials), `"kyc"`, `"dao_badge"` — all set to `"pending"`.
`didType` values: `"evm"` or `"polkadot"`.
`credentialType` values: `"kyc"`, `"socials"`, `"governance"`, `"dao_badge"`.

### Accounts — `/api/accounts/:address` (all lists paginated)

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| GET | `/chains?page=&limit=` | None | — | `{ page, limit, items: LinkedChainAccount[] }` |
| POST | `/chains` | Owner | `{ chain, label, chainAddress, tag }` | `{ linked }` |
| GET | `/socials?page=&limit=` | None | — | `{ page, limit, items: LinkedSocialAccount[] }` |
| POST | `/socials` | Owner | `{ platform, handle }` | `{ linked }` |
| GET | `/dapps?page=&limit=` | None | — | `{ page, limit, items: AuthorizedDApp[] }` |
| POST | `/dapps` | Owner | `{ name, dAppAddress }` | `{ authorized }` |
| DELETE | `/dapps/:dAppId` | Owner | — | `{ revoked }` |
| GET | `/activity?page=&limit=` | None | — | `{ page, limit, items: ActivityEntry[] }` |

### Governance — `/api/governance`

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| GET | `/:address/staking` | None | — | `StakingMetrics` |
| POST | `/:address/stake` | Owner | `{ amount }` | `{ staked }` |
| POST | `/:address/claim` | Owner | — | `{ claimed, amount }` |
| GET | `/proposals` | None | — | `Proposal[]` |
| POST | `/proposals` | optional | `{ address, title, description, durationDays }` | `{ created }` |
| POST | `/proposals/:id/vote` | optional | `{ address, vote }` | `{ voted }` |
| GET | `/validators` | None | — | `Validator[]` |

`vote` values: `"aye"` or `"nay"`. Votes are deduplicated via on-chain UNIQUE enforcement.
When a JWT is present the authenticated address is used regardless of the body `address` field (IDOR fix).

### Security — `/api/security/:address` (sessions + log paginated)

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| GET | `/privacy` | None | — | `PrivacyPreference[]` (auto-seeded) |
| POST | `/privacy/init` | None | — | `{ initialized }` |
| PATCH | `/privacy/:prefId` | Owner | `{ enabled }` | `{ updated }` |
| GET | `/sessions?page=&limit=` | **Owner** | — | `{ page, limit, items: ActiveSession[] }` |
| POST | `/sessions` | Owner | `{ device, browser, location }` | `{ created }` |
| DELETE | `/sessions/:sessionId` | Owner | — | `{ revoked }` |
| DELETE | `/sessions` | Owner | — | `{ revoked, count }` |
| GET | `/log?page=&limit=` | **Owner** | — | `{ page, limit, items: SecurityLogEntry[] }` |

---

## Security Hardening (OWASP Top 10)

| OWASP | Risk | Fix Applied |
| --- | --- | --- |
| A01 | Broken Access Control (IDOR) | `requireOwner` added to sessions, log, sessions GET. JWT address wins over body in governance. |
| A02 | Cryptographic Failures | All `err.message` replaced with `"Internal server error"` in all route handlers. |
| A03 | Injection | On-chain contracts validate all inputs via Solidity modifiers. Parameterized ethers.js calls. |
| A04 | Insecure Design | Pagination on all list endpoints (max 100). On-chain storage provides built-in data integrity. |
| A05 | Security Misconfiguration | `express.json({ limit: "50kb" })` body size cap. `helmet()`. CORS locked to env var. |
| A07 | Auth Failures | Single-use nonces, 10-min TTL, rate limit 20/15min on auth routes. thirdweb replaces SIWE. |
| A09 | Security Logging | `logSecurity()` called on every auth, DID link, session event, credential request. |

| Feature | Config |
| --- | --- |
| `helmet()` | All default HTTP security headers (HSTS, XSS filter, noSniff, CSP, etc.) |
| Global rate limit | 300 requests / 15 min / IP |
| Auth rate limit | 20 requests / 15 min / IP (on `/api/auth/*`) |
| CORS | Locked to `CORS_ORIGIN` env var |
| Single-use nonces | Replay attack prevention |
| Nonce TTL | 10 minutes |
| JWT secret | 32-byte cryptographically random value |
| Body size limit | 50 KB max on all JSON / form endpoints |

---

## Environment Variables

```dotenv
PORT=3001
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=<32-byte-hex>          # auto-generated if missing
JWT_EXPIRES_IN=7d
REQUIRE_AUTH=false                # set to true in production

# On-chain configuration
RPC_URL=http://127.0.0.1:8545
IDENTITY_CONTRACT_ADDRESS=0x...
ACCOUNTS_CONTRACT_ADDRESS=0x...
GOVERNANCE_CONTRACT_ADDRESS=0x...
SECURITY_CONTRACT_ADDRESS=0x...
BACKEND_WALLET_KEY=0x...

# Required for EVM (thirdweb) auth:
# Get from https://thirdweb.com/dashboard → Settings → API Keys → Secret Key
THIRDWEB_SECRET_KEY=

# Domain used in the EIP-4361 payload (should match your frontend URL)
AUTH_DOMAIN=localhost
```

Set `REQUIRE_AUTH=true` once the frontend sends `Authorization: Bearer <token>` headers.

---

## How to Run

### Prerequisites

- Node.js 18+
- Hardhat (for local development chain)

### Development

```bash
# 1. Deploy contracts to local chain
cd practice_contracts
npx hardhat node                     # Start local EVM chain
npx hardhat run scripts/deploy.ts    # Deploy 4 contracts
npx hardhat run scripts/seed.ts      # Seed test data

# 2. Configure and start backend
cd ../polkaMe/backend
cp .env.example .env                 # Fill in contract addresses from deploy output
npm install
npm run dev
```

Server starts on `http://localhost:3001`. The backend connects to the deployed contracts via ethers.js and verifies all 4 contract addresses on startup.

Startup logs you should see:

```
[PolkaMe] ✅ Polkadot WASM crypto ready
[PolkaMe] Connected to chain: hardhat (chainId: 31337)
[PolkaMe] ✅ PolkaMeIdentity verified at 0x...
[PolkaMe] ✅ PolkaMeAccounts verified at 0x...
[PolkaMe] ✅ PolkaMeGovernance verified at 0x...
[PolkaMe] ✅ PolkaMeSecurity verified at 0x...
[PolkaMe] 🚀 Backend running at http://localhost:3001
[PolkaMe] 📡 Storage: ON-CHAIN (Solidity contracts via ethers.js)
```

### Production Build

```bash
npm run build    # compiles to dist/
npm run start    # runs dist/index.js
```

---

## How to Test Manually

### 1. Health check

```bash
curl http://localhost:3001/api/health
# → { "status": "ok", "chain": { "name": "hardhat", "chainId": 31337 }, "storage": "on-chain" }
```

### 2. Create an identity (Polkadot mode)

```bash
curl -X POST http://localhost:3001/api/identity/create \
  -H "Content-Type: application/json" \
  -d '{ "displayName": "Alice", "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" }'
```

### 3. Auth flow (Polkadot) — works without THIRDWEB_SECRET_KEY

```bash
# Step 1 — get nonce
curl "http://localhost:3001/api/auth/nonce?address=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
# returns { nonce, message } — sign the message with Polkadot.js extension

# Step 2 — submit signature
curl -X POST http://localhost:3001/api/auth/polkadot/verify \
  -H "Content-Type: application/json" \
  -d '{ "address": "5GrwvaEF...", "signature": "0x..." }'
# → { "data": { "token": "eyJ..." }, "success": true }
```

### 4. Auth flow (EVM / thirdweb) — requires THIRDWEB_SECRET_KEY

```bash
# Step 1 — get EIP-4361 payload
curl "http://localhost:3001/api/auth/payload?address=0xYourAddress"
# returns { payload } — sign payload.message with MetaMask / thirdweb ConnectButton

# Step 2 — submit signed payload
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "payload": <payload from step 1>, "signature": "0x..." }'
# → { "data": { "token": "eyJ..." }, "success": true }
```

### 5. Link a cross-chain DID (auth required)

```bash
export TOKEN="eyJ..."
export ADDR="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

curl -X POST "http://localhost:3001/api/identity/$ADDR/linked-dids" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "linkedAddress": "0xYourEVMAddress", "didType": "evm" }'

# List linked DIDs (no auth required)
curl "http://localhost:3001/api/identity/$ADDR/linked-dids"
```

### 6. Grant DAO badge (auth required)

```bash
curl -X POST "http://localhost:3001/api/identity/$ADDR/dao-badge" \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Credential request (dApp side — no auth required)

```bash
curl -X POST "http://localhost:3001/api/identity/0xDAppAddress/credential-request" \
  -H "Content-Type: application/json" \
  -d '{ "targetAddress": "5GrwvaEF...", "credentialType": "kyc" }'
# → { "credentialType": "kyc", "status": "verified", "granted": true }
```

### 8. Submit verification

```bash
curl -X POST "http://localhost:3001/api/identity/$ADDR/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "method": "dao_badge" }'
```

### 9. List validators

```bash
curl http://localhost:3001/api/governance/validators
```

### 10. Paginated activity log

```bash
curl "http://localhost:3001/api/accounts/$ADDR/activity?page=1&limit=10"
```

### 11. Security log (auth required)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/security/$ADDR/log?page=1&limit=20"
```

---

## Score Calculation

Score is managed on-chain by the `PolkaMeIdentity` contract. The `addScoreFor` / `subScoreFor` pattern allows authorized contracts (like `PolkaMeAccounts`) to modify a user's reputation score:

```
base score:             10
+ chain accounts:       +5 per account   (max +25)
+ social accounts:      +10 per account  (max +30)
+ socials verified:     +10
+ governance verified:  +10
+ KYC verified:         +15
+ DAO badge:            +10
─────────────────────────
max:                   100
```

---

## Frontend Integration

The frontend at `polkame-v1/src/api/backend.ts` calls all endpoints via `fetch`. Authorization headers are added automatically when a JWT is stored:

```typescript
import { storeToken, clearToken } from "./api/backend";

// After successful auth (Polkadot or EVM):
storeToken(token);    // saves to localStorage

// On disconnect:
clearToken();         // removes from localStorage
```

All mutation calls (POST/PATCH/DELETE) include `Authorization: Bearer <token>` automatically via the `authHeaders()` helper. This is a no-op when no token is stored, and `REQUIRE_AUTH=false` means the backend accepts unauthenticated requests during development.

### EVM Frontend Auth (thirdweb ConnectButton)

Use `thirdweb`'s `ConnectButton` (already in the frontend stack). After the user connects:

```typescript
// 1. Get payload from backend
const { data: { payload } } = await fetch(`/api/auth/payload?address=${address}`).then(r => r.json());

// 2. Sign with thirdweb wallet (done automatically by ConnectButton if you use useActiveAccount())
const signature = await account.signMessage({ message: payload.message });

// 3. Exchange for JWT
const { data: { token } } = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload, signature })
}).then(r => r.json());

storeToken(token);
```
