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

## Quick Start

```bash
# 1. Deploy contracts (in practice_contracts/)
cd ../practice_contracts
npx hardhat node                          # Start local chain
npx hardhat run scripts/deploy.ts         # Deploy 4 contracts
npx hardhat run scripts/seed.ts           # Seed test data

# 2. Configure backend
cd ../polkame/backend
cp .env.example .env
# Fill in contract addresses from deploy output + Hardhat account #0 private key

# 3. Start backend
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

## Project Structure

```
src/
├── index.ts              ← Entry point 
├── contract-client.ts    ← ethers.js provider + 4 contract instances
├── types.ts              ← TypeScript interfaces
├── middleware/
│   └── auth.ts           ← JWT sign/verify, requireOwner
└── routes/
    ├── auth.ts           ← Nonce + JWT (in-memory nonces)
    ├── identity.ts       ← DID, verification, credentials
    ├── accounts.ts       ← Chain/social accounts, dApps
    ├── governance.ts     ← Staking, proposals, voting
    └── security.ts       ← Privacy, sessions, security log
```
