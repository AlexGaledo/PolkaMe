# PolkaMe Backend — On-Chain (v2.0)

> **Storage: On-chain Solidity contracts via ethers.js**

## Stack

| Layer | Technology |
|-------|-----------|
| Server | Express + TypeScript |
| Storage | 4 Solidity contracts on EVM-compatible Polkadot parachain (Moonbeam/Astar) |
| Chain Client | ethers.js v6 |
| Auth | JWT (HS256) + Polkadot signature challenge |
| Crypto | `@polkadot/util-crypto` (WASM) |
| Contracts | Hardhat 3 (compile, deploy, test — all from this directory) |

## Quick Start

```bash
# 1. Install all dependencies (API + Hardhat)
npm install

# 2. Start local chain & deploy contracts
npm run node:local                        # Terminal 1 — keep running
npm run deploy:local                      # Terminal 2 — deploy 4 contracts
npm run seed:local                        # Terminal 2 — seed test data (optional)

# 3. Configure backend
cp .env.example .env
# Fill in contract addresses from deploy output + Hardhat account #0 private key

# 4. Start backend
npm run dev
```

## Architecture & Dual-DID Model

```text
Frontend  →  Express (thin gateway)  →  Solidity Contracts (on-chain)
                                        ├── PolkaMeIdentity   (DIDs, verification, credentials)
                                        ├── PolkaMeAccounts   (chain/social accounts, dApps)
                                        ├── PolkaMeGovernance (staking, proposals, voting)
                                        └── PolkaMeSecurity   (privacy, sessions, security log)
```

### The Dual-DID Model (SS58 ↔ EVM)

Because Solidity strictly uses 20-byte `address` (EVM H160) keys, Polkadot SS58 addresses cannot interact with the contracts natively. PolkaMe solves this with a **Shadow EVM Derivation** model:

1. **EVM Users** create DIDs natively using their 0x address (`did:ethr:0x...`).
2. **Polkadot Users** (SS58) submit a create request. The backend derives a deterministic EVM "shadow" address from their SS58 public key (`keccak256(pubkey)[12:]`).
3. The backend uses `createDIDFor(shadowAddress)` to create the DID on-chain (`did:polkadot:5Grw...`).
4. **Resolution Layer**: Any read/write hitting the backend parses the input address. If it's SS58, the backend seamlessly routes the request to the mapped shadow EVM address, making the EVM boundary completely invisible to the frontend/user.
5. **Linking**: A user can explicitly link a Polkadot DID to an EVM DID to merge reputations.

- **Reads** → `ethers.Contract.functionName()` (view calls, free, instant)
- **Writes** → `ethers.Contract.functionName().signAndSend()` (on-chain tx, costs gas)
- **Auth nonces** → in-memory `Map` (ephemeral, no on-chain storage)

## Environment Variables

```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=<random-secret>
JWT_EXPIRES_IN=7d
REQUIRE_AUTH=false

# On-chain
RPC_URL=http://127.0.0.1:8545
IDENTITY_CONTRACT_ADDRESS=0x...
ACCOUNTS_CONTRACT_ADDRESS=0x...
GOVERNANCE_CONTRACT_ADDRESS=0x...
SECURITY_CONTRACT_ADDRESS=0x...
BACKEND_WALLET_KEY=0x...
```

## API Endpoints

All endpoints return `{ data: T, success: boolean, error?: string }`.

| Module | Key Endpoints |
|--------|--------------|
| Auth | `GET /nonce`, `POST /polkadot/verify`, `POST /login`, `GET /me` |
| Identity | `POST /create`, `GET /:address`, `POST /:address/linked-dids`, `POST /:address/verify` |
| Accounts | `POST /:address/chains`, `POST /:address/socials`, `POST /:address/dapps` |
| Governance | `POST /:address/stake`, `GET /proposals`, `POST /proposals/:id/vote` |
| Security | `POST /:address/privacy/init`, `POST /:address/sessions`, `GET /:address/log` |

## NPM Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start API server in dev mode (hot-reload) |
| `npm run build` | Compile TypeScript API to `dist/` |
| `npm start` | Run compiled API |
| `npm run node:local` | Start local Hardhat node |
| `npm run compile` | Compile Solidity contracts |
| `npm run deploy:local` | Deploy contracts to local node |
| `npm run test:contracts` | Run contract test suite (29 tests) |
| `npm run seed:local` | Populate contracts with sample data |
| `npm run fund:local` | Send test ETH to a wallet |

## Project Structure

```
backend/
├── src/                    # Express API server
│   ├── index.ts            ← Entry point
│   ├── contract-client.ts  ← ethers.js provider + 4 contract instances
│   ├── types.ts            ← TypeScript interfaces
│   ├── middleware/
│   │   └── auth.ts         ← JWT sign/verify, requireOwner
│   └── routes/
│       ├── auth.ts         ← Nonce + JWT (in-memory nonces)
│       ├── identity.ts     ← DID, verification, credentials
│       ├── accounts.ts     ← Chain/social accounts, dApps
│       ├── governance.ts   ← Staking, proposals, voting
│       └── security.ts     ← Privacy, sessions, security log
├── contracts/              # Solidity source files
│   ├── PolkaMeTypes.sol
│   ├── PolkaMeIdentity.sol
│   ├── PolkaMeAccounts.sol
│   ├── PolkaMeGovernance.sol
│   └── PolkaMeSecurity.sol
├── scripts/                # Hardhat deploy, seed, fund scripts
├── test/                   # Mocha/Chai contract test suite
├── hardhat.config.ts       # Hardhat 3 configuration
├── tsconfig.json           # TypeScript config (API server only)
└── package.json            # Unified dependencies
```

## Contracts

| Contract | Description |
|---|---|
| `PolkaMeTypes.sol` | Shared structs, enums, and events used across all contracts |
| `PolkaMeIdentity.sol` | Core DID management — create/update identity, verification, credentials, scoring |
| `PolkaMeAccounts.sol` | Linked chain accounts, social accounts, authorized dApps, activity log |
| `PolkaMeGovernance.sol` | Staking, proposals, voting, validators, conviction, rewards |
| `PolkaMeSecurity.sol` | Privacy preferences, active sessions, security audit log |
