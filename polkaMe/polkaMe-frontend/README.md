# PolkaMe — Frontend Prototype

> **Polkadot Solidity Hackathon 2026** — Sovereign identity management on Polkadot.

PolkaMe (formerly PolkaId) is a decentralized identity management application built on the Polkadot ecosystem. This repository contains the **frontend-only** prototype: there is no backend logic—all API interaction points are stubbed with strongly-typed async functions ready to be wired to real endpoints.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Styling | Tailwind CSS 3 + `@tailwindcss/forms` |
| Routing | React Router 6 |
| Font | Inter (Google Fonts) |
| Icons | Material Symbols Outlined (Google Fonts) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

---

## Project Structure

```
src/
├── api/              # Stubbed async API functions (typed JSON contracts)
│   └── index.ts
├── types/            # Shared TypeScript interfaces & types
│   └── index.ts
├── components/
│   ├── common/       # Reusable UI primitives (Button, Card, Badge…)
│   │   └── index.ts  # Barrel export
│   └── layout/       # Layout shells (PublicLayout, DashboardLayout…)
│       └── index.ts
├── pages/            # Full page components
│   ├── LandingPage.tsx
│   ├── DashboardPage.tsx
│   ├── VerificationPage.tsx
│   ├── GovernancePage.tsx
│   └── SecurityPage.tsx
├── router.tsx        # React Router configuration
├── App.tsx           # Root component (RouterProvider)
├── main.tsx          # Entry point
└── index.css         # Tailwind directives + mesh-gradient utility
```

---

## Pages

### 1. Landing Page (`/`)

**Purpose:** Public marketing page introducing PolkaMe.

| Section | Description |
|---------|------------|
| Hero | Tagline, CTA buttons, animated identity-verified card |
| Stats | Live platform metrics (users, parachains, credentials) |
| Features | Three-column feature grid (interoperability, security, user-owned data) |
| CTA Banner | Gradient call-to-action driving users to the dashboard |

**API calls:** `getPlatformStats()`

---

### 2. Identity Dashboard (`/dashboard`)

**Purpose:** Primary logged-in view showing identity score, linked accounts, activity, and authorized dApps.

| Section | Description |
|---------|------------|
| Identity Score | Strength meter (0-100) with weekly change badge |
| Verification Status | Email / Governance / Socials / KYC verification check list |
| Linked Accounts | Chain accounts (Polkadot, Kusama) + social accounts + "Add" button |
| Recent Activity | Table: action, app, status badge, timestamp |
| Authorized dApps | Sidebar list with revoke buttons |

**API calls:** `getUserIdentity()`, `getVerificationStatus()`, `getLinkedChainAccounts()`, `getLinkedSocialAccounts()`, `getRecentActivity()`, `getAuthorizedDApps()`

---

### 3. Verification Hub (`/verification`)

**Purpose:** Step-by-step identity verification flow (wallet, social, KYC).

| Section | Description |
|---------|------------|
| Progress Bar | Current step indicator with percentage |
| On-chain Identity | Connect Web3 wallet for asset verification |
| Social Accounts | Link Twitter/Discord for social proof |
| Real-world Credentials | KYC scan for government-issued ID |
| Privacy Notice | ZKP assurance + compliance badges |

**API calls:** `getVerificationProgress()`, `submitVerification(method)`

---

### 4. Governance & Staking (`/governance`)

**Purpose:** Staking metrics, voting participation, active proposals, and validator performance.

| Section | Description |
|---------|------------|
| Metric Cards | Total staked, claimable rewards, voting power |
| Charts | APY trend bar chart + voting participation donut |
| Active Proposals | Cards with aye/nay bars and vote buttons |
| Era Performance | Validator table with commission, self-stake, rewards |

**API calls:** `getStakingMetrics()`, `getActiveProposals()`, `getValidators()`, `voteOnProposal()`, `claimStakingRewards()`

---

### 5. Security Settings (`/security`)

**Purpose:** Seed phrase management, hardware wallet integration, privacy toggles, session management, and security audit log.

| Section | Description |
|---------|------------|
| Seed Phrase | Critical-action card with reveal/download buttons |
| Hardware Wallets | Ledger + Trezor connection cards |
| Privacy Preferences | Toggle switches (stealth mode, anonymous RPC, metadata scrubbing) |
| Active Sessions | Device list with revoke functionality |
| Security Log | Audit event table |

**API calls:** `getHardwareWallets()`, `getPrivacyPreferences()`, `updatePrivacyPreference()`, `getActiveSessions()`, `revokeSession()`, `revokeAllRemoteSessions()`, `getSecurityLog()`, `revealSeedPhrase()`, `connectHardwareWallet()`

---

## Design Tokens

Defined in `tailwind.config.ts`:

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#e6007a` | Polkadot pink — buttons, links, accents |
| `background-dark` | `#230f1a` | Dashboard/app background |
| `background-dark-deep` | `#1a0812` | Landing page mesh gradient base |
| `background-light` | `#f8f5f7` | Light-mode background |
| `neutral-muted` | `#3d2131` | Card/sidebar backgrounds |
| `neutral-border` | `#4b2037` | Borders in dark mode |
| `text-muted` | `#ce8db0` | Secondary text |

---

## API Stubs

All stub functions live in `src/api/index.ts`. Each returns a `Promise<ApiResponse<T>>` with this shape:

```ts
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}
```

Replace the mock `await delay()` bodies with real `fetch`/`axios` calls when the backend is ready. All request/response types are exported from `src/types/index.ts`.

---

## License

Built for the Polkadot Solidity Hackathon 2026.
