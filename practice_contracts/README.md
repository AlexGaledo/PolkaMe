# PolkaMe — Smart Contracts (Hardhat)

Local Solidity contracts for the PolkaMe decentralized identity platform. Uses **Hardhat 3** with `hardhat-ethers` v4.

## Contracts

| Contract | Description |
|---|---|
| `PolkaMeTypes.sol` | Shared structs, enums, and events used across all contracts |
| `PolkaMeIdentity.sol` | Core DID management — create/update identity, verification, credentials, scoring |
| `PolkaMeAccounts.sol` | Linked chain accounts, social accounts, authorized dApps, activity log |
| `PolkaMeGovernance.sol` | Staking, proposals, voting, validators, conviction, rewards |
| `PolkaMeSecurity.sol` | Privacy preferences, active sessions, security audit log |

## Prerequisites

- **Node.js** ≥ 18
- **npm** (comes with Node.js)
- **MetaMask** browser extension (for frontend interaction)

## Quick Start — Local Testing

### 1. Install dependencies

```bash
cd practice_contracts
npm install
```

### 2. Start a local Hardhat node

Open a **dedicated terminal** — this process runs in the foreground:

```bash
npx hardhat node
```

This spins up a local EVM blockchain at `http://127.0.0.1:8545` with pre-funded test accounts.

> **Keep this terminal open** for the entire session. Closing it resets all contract state.

### 3. Deploy contracts

In a **second terminal**:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

You'll see the deployed addresses printed. The frontend expects specific addresses (from a deterministic deploy order), so **deploy before starting the frontend**.

### 4. Fund your MetaMask wallet (optional)

Edit `scripts/fund.ts` and replace the `target` address with your own MetaMask address, then run:

```bash
npx hardhat run scripts/fund.ts --network localhost
```

This sends 100 test ETH from a Hardhat account to your wallet so you can pay for gas.

### 5. Seed test data (optional)

> **Note:** The seed script uses hardcoded contract addresses. After a fresh deploy, update the `ADDRS` object inside `scripts/seed.ts` with the new addresses printed by `deploy.ts`.

```bash
npx hardhat run scripts/seed.ts --network localhost
```

This populates the contracts with sample DIDs, linked accounts, proposals, validators, etc.

### 6. Connect MetaMask to Hardhat

1. Open MetaMask → **Settings → Networks → Add Network**
2. Fill in:
   - **Network Name:** Hardhat Local
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** ETH
3. Switch to the Hardhat Local network

### 7. Run the frontend

```bash
cd polkaMe/polkame-v1
npm install
npm run dev
```

Open `http://localhost:5173` and connect your wallet.

## Running Tests

### Full test suite (Mocha + Chai)

```bash
npx hardhat test --network localhost
```

This runs `test/PolkaMe.test.ts` — **29 tests** covering all 4 contracts.

### Script-based test runner (alternative)

```bash
npx hardhat run scripts/test-all.ts --network localhost
```

## Scripts Reference

| Script | Purpose |
|---|---|
| `scripts/deploy.ts` | Deploys all 4 contracts and authorizes cross-contract calls |
| `scripts/fund.ts` | Sends 100 test ETH to a specified MetaMask address |
| `scripts/seed.ts` | Populates contracts with realistic sample data |
| `scripts/test-all.ts` | Script-based test runner (alternative to `npx hardhat test`) |

## Project Structure

```
practice_contracts/
├── contracts/              # Solidity source files
│   ├── PolkaMeTypes.sol
│   ├── PolkaMeIdentity.sol
│   ├── PolkaMeAccounts.sol
│   ├── PolkaMeGovernance.sol
│   └── PolkaMeSecurity.sol
├── scripts/                # Deploy, fund, seed, test scripts
├── test/                   # Mocha/Chai test suite
├── hardhat.config.ts       # Hardhat 3 configuration
└── package.json
```

## Troubleshooting

- **"Nonce too high" in MetaMask** — Reset your account: MetaMask → Settings → Advanced → Clear activity tab data
- **Contracts not responding** — Make sure the Hardhat node terminal is still running; restarting it wipes all state, so you need to redeploy
- **"Insufficient funds"** — Run `fund.ts` to top up your wallet
- **Contract size errors** — The optimizer is enabled with 200 runs in `hardhat.config.ts` to keep contracts under the 24KB EVM limit
