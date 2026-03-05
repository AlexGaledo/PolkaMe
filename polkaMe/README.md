# PolkaMe Frontend

> Read `claude.md` first for the original task requirements used during the restructure.

## Project Structure

```
polkaMe/
  claude.md              # Original restructure requirements
  README.md              # This file
  polkame-v1/
    backend_guide.txt    # Full REST API endpoint reference
    src/
      api/
        index.ts         # EVM API layer (ethers.js contract calls)
        backend.ts       # Polkadot-native backend API stubs (REST calls)
      contracts/
        shared.ts        # Contract addresses + enum maps (HARDCODED)
        evm.ts           # EVM wallet + contract instances (ethers.js)
        polkadot.ts      # Polkadot contract stubs (future ink!)
        index.ts         # Barrel re-export
      contexts/
        WalletContext.tsx # Global wallet state (EVM/Polkadot toggle)
      components/
        common/WalletToggle.tsx   # EVM/Polkadot mode switch button
        layout/DashboardLayout.tsx
        layout/PublicHeader.tsx
      pages/             # All 5 pages use useWallet() context
```

## Wallet Modes

The frontend supports two wallet modes via `WalletContext`:

| Mode | Wallet | Contract Calls | Status |
|------|--------|---------------|--------|
| **EVM** | MetaMask (ThirdWeb) | Direct via ethers.js | Working |
| **Polkadot** | Polkadot.js extension | REST API via `api/backend.ts` | Stubs only |

Users switch between modes using the `WalletToggle` component in the sidebar/header.

---

## Running Locally

```bash
# Terminal 1: Start Hardhat node
cd practice_contracts
npx hardhat node

# Terminal 2: Deploy contracts
cd practice_contracts
npx hardhat run scripts/deploy.ts --network localhost
# IMPORTANT: Update addresses in src/contracts/shared.ts with the output

# Terminal 3: Start frontend
cd polkaMe/polkame-v1
yarn dev
```

---

## Hardcoded Contract Addresses

`src/contracts/shared.ts` has hardcoded addresses for the local Hardhat node.
These change every time you restart `npx hardhat node` and redeploy.

To move to Sepolia or another network:
1. Configure Sepolia in `practice_contracts/hardhat.config.ts`:
   ```ts
   networks: {
     sepolia: {
       url: "https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY",
       accounts: ["YOUR_DEPLOYER_PRIVATE_KEY"],
       chainId: 11155111
     }
   }
   ```
2. Get Sepolia ETH from a faucet
3. Deploy: `npx hardhat run scripts/deploy.ts --network sepolia`
4. Update addresses in `shared.ts` with the deployment output
5. Update `HARDHAT_RPC` in `shared.ts` to the Sepolia RPC URL
6. Update `ensureHardhatNetwork()` in `evm.ts` to use Sepolia chainId (`0xAA36A7`)

Better long-term: move addresses to `.env` variables.

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_TEMPLATE_CLIENT_ID` | ThirdWeb client ID (EVM mode) | Set in `.env` |
| `VITE_BACKEND_URL` | Polkadot backend API base URL | `http://localhost:3001/api` |
| `VITE_POLKADOT_WS_ENDPOINT` | Polkadot node WebSocket | `wss://rpc.polkadot.io` |

---

## Backend API (Polkadot Mode)

When `walletMode === "polkadot"`, the frontend calls REST endpoints defined in `api/backend.ts`.
The full endpoint reference is in `polkame-v1/backend_guide.txt`.

All endpoints return: `{ data: T, success: boolean, error?: string }`

### Endpoint Summary

**Identity** (`/api/identity/`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/has-did?address={addr}` | Check if user has a DID |
| POST | `/create` | Create a new DID |
| GET | `/{address}` | Get user identity |
| GET | `/{address}/verification-status` | Get verification status |
| GET | `/{address}/verification-progress` | Get verification progress |
| POST | `/{address}/verify` | Submit verification |
| GET | `/search?q={query}` | Search users |
| GET | `/stats` | Platform statistics |

**Accounts** (`/api/accounts/{address}/`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/chains` | Get linked chain accounts |
| POST | `/chains` | Link a chain account |
| GET | `/socials` | Get linked social accounts |
| POST | `/socials` | Link a social account |
| GET | `/dapps` | Get authorized dApps |
| POST | `/dapps` | Authorize a dApp |
| DELETE | `/dapps/{dAppId}` | Revoke a dApp |
| GET | `/activity` | Get recent activity |

**Governance** (`/api/governance/`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/{address}/staking` | Get staking metrics |
| POST | `/{address}/stake` | Stake tokens |
| POST | `/{address}/claim` | Claim staking rewards |
| GET | `/proposals` | Get active proposals |
| POST | `/proposals` | Create a proposal |
| POST | `/proposals/{id}/vote` | Vote on proposal |
| GET | `/validators` | Get validators |

**Security** (`/api/security/{address}/`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/privacy` | Get privacy preferences |
| POST | `/privacy/init` | Initialize preferences |
| PATCH | `/privacy/{prefId}` | Toggle a preference |
| GET | `/sessions` | Get active sessions |
| POST | `/sessions` | Register a session |
| DELETE | `/sessions/{sessionId}` | Revoke a session |
| DELETE | `/sessions` | Revoke all remote sessions |
| GET | `/log` | Get security log |

---

## Known EVM Mode Issues (Pre-existing)

These are bugs in the original API/contract layer, not caused by the restructure:

| Issue | Root Cause |
|-------|-----------|
| dApp authorize ENS error | ethers.js tries ENS resolution on Hardhat (no ENS support) |
| Identity score not updating live | UI doesn't re-fetch after mutations, needs page refresh |
| Social proof counter shows 0/3 | Verification status doesn't re-read after linking socials |
| Verify Wallet stuck on "Pending" | Contract sets pending but nothing moves it to verified |
| Claim rewards / vote errors | Contract requires prior staking or unmet conditions |

---

## For Backend Development

To build the Polkadot-native backend:

1. Create a server (Node.js/Express) implementing all endpoints above
2. Start it on port 3001 (or set `VITE_BACKEND_URL`)
3. Enable CORS for `http://localhost:5173`
4. Return responses in the `{ data, success, error }` format
5. The frontend will work automatically since `api/backend.ts` already calls these endpoints

The Polkadot contract stubs in `src/contracts/polkadot.ts` are placeholders for future ink! contract integration via `@polkadot/api-contract`.
