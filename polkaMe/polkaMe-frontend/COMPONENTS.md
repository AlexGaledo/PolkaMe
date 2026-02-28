# PolkaMe — Component Library

Reference for every reusable component shipped with the PolkaMe frontend.

---

## Common Components (`src/components/common/`)

### `Button`

Multi-variant, multi-size button primitive used across all pages.

| Prop | Type | Default | Description |
|------|------|---------|------------|
| `variant` | `"primary" \| "secondary" \| "outline" \| "ghost" \| "danger"` | `"primary"` | Visual style |
| `size` | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` | Height / padding / font-size tier |
| `icon` | `string?` | — | Material Symbols icon name (left side) |
| `iconRight` | `string?` | — | Material Symbols icon name (right side) |
| `fullWidth` | `boolean` | `false` | Stretch to container width |
| `children` | `ReactNode` | — | Button label |

**API calls:** None.

**Usage:**
```tsx
<Button variant="primary" size="lg" icon="account_balance_wallet">
  Connect Wallet
</Button>
```

---

### `Card`

Generic container card with optional hover effect and padding presets.

| Prop | Type | Default | Description |
|------|------|---------|------------|
| `hoverable` | `boolean` | `false` | Adds hover border glow |
| `padding` | `"none" \| "sm" \| "md" \| "lg"` | `"md"` | Inner padding |
| `className` | `string?` | `""` | Extra classes |

**API calls:** None.

---

### `Icon`

Thin wrapper around Material Symbols Outlined for consistent sizing.

| Prop | Type | Default | Description |
|------|------|---------|------------|
| `name` | `string` | — | Material icon name |
| `size` | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` | Font-size class |
| `className` | `string?` | `""` | Extra classes |

**API calls:** None.

---

### `Badge`

Small pill-shaped label for statuses and tags.

| Prop | Type | Default | Description |
|------|------|---------|------------|
| `variant` | `"success" \| "warning" \| "info" \| "danger" \| "primary" \| "muted"` | `"primary"` | Color scheme |
| `children` | `ReactNode` | — | Badge text |

**API calls:** None.

**Usage:**
```tsx
<Badge variant="success">ACTIVE</Badge>
```

---

### `ProgressBar`

Horizontal progress indicator used in the Verification Hub.

| Prop | Type | Default | Description |
|------|------|---------|------------|
| `value` | `number` (0–100) | — | Fill percentage |
| `size` | `"sm" \| "md"` | `"md"` | Bar height |
| `showLabel` | `boolean` | `false` | Show percentage text above bar |

**API calls:** None.

---

### `Toggle`

Accessible switch/toggle for binary settings (Security page privacy prefs).

| Prop | Type | Default | Description |
|------|------|---------|------------|
| `enabled` | `boolean` | — | Current state |
| `onChange` | `(val: boolean) => void` | — | State change callback |
| `label` | `string?` | — | Primary text |
| `description` | `string?` | — | Secondary helper text |

**API calls:** None (parent calls `updatePrivacyPreference()`).

---

### `StatCard`

Landing-page metric card with label, big number, and subtext.

| Prop | Type | Default | Description |
|------|------|---------|------------|
| `label` | `string` | — | Uppercase accent label |
| `value` | `string` | — | Hero number (e.g.`"250k+"`) |
| `subtext` | `string?` | — | Description line |

**API calls:** None (parent passes data from `getPlatformStats()`).

---

### `SearchInput`

Styled search field with leading icon, used in the dashboard top bar.

| Prop | Type | Default | Description |
|------|------|---------|------------|
| `placeholder` | `string` | `"Search…"` | Input placeholder text |
| `className` | `string?` | `""` | Extra classes |

**API calls:** None.

---

## Layout Components (`src/components/layout/`)

### `PublicLayout`

Full-page shell for public (unauthenticated) routes. Wraps content with `PublicHeader` + `PublicFooter` inside a `mesh-gradient` background.

**Renders:** `<Outlet />` from React Router.

---

### `PublicHeader`

Sticky top nav for the landing page—logo, nav links, "Connect Wallet" CTA.

| Internal | Notes |
|----------|-------|
| Logo links to `/` | Branding: "Polka**Me**" |
| Nav links | Features, Ecosystem, Governance, Docs |
| CTA | Routes to `/dashboard` |

---

### `PublicFooter`

Site-wide footer—brand column, Platform / Resources / Company link columns, copyright, and system-status badge.

---

### `DashboardLayout`

Sidebar + top-bar shell for authenticated routes (dashboard, verification, governance, security).

| Area | Contents |
|------|----------|
| Sidebar | Logo, nav links (Dashboard, Verification, Governance, Security), current wallet display, "Switch Account" button |
| Top bar | Dynamic page title, `SearchInput`, notification + wallet icon buttons |
| Content | `<Outlet />` rendered inside a max-width padded container |

**API calls:** None directly (pages handle their own data loading).

---

## Type Definitions (`src/types/index.ts`)

All API payload shapes are centralized here. Key types:

- `Identity`, `VerificationStatus`
- `LinkedChainAccount`, `LinkedSocialAccount`
- `ActivityEntry`, `AuthorizedDApp`
- `StakingMetrics`, `Proposal`, `Validator`
- `VerificationProgress`
- `HardwareWallet`, `PrivacyPreference`, `ActiveSession`, `SecurityLogEntry`
- `PlatformStats`
- `ApiResponse<T>` — generic wrapper for all API returns

---

## API Stubs (`src/api/index.ts`)

Every function is `async`, returns `Promise<ApiResponse<T>>`, and simulates a 300ms network delay.

| Function | Return Type | Used By |
|----------|------------|---------|
| `getUserIdentity()` | `Identity` | DashboardPage |
| `getVerificationStatus()` | `VerificationStatus` | DashboardPage |
| `getLinkedChainAccounts()` | `LinkedChainAccount[]` | DashboardPage |
| `getLinkedSocialAccounts()` | `LinkedSocialAccount[]` | DashboardPage |
| `linkNewAccount(chain)` | `{ linked: boolean }` | DashboardPage |
| `getRecentActivity()` | `ActivityEntry[]` | DashboardPage |
| `getAuthorizedDApps()` | `AuthorizedDApp[]` | DashboardPage |
| `revokeDApp(id)` | `{ revoked: boolean }` | DashboardPage |
| `getStakingMetrics()` | `StakingMetrics` | GovernancePage |
| `getActiveProposals()` | `Proposal[]` | GovernancePage |
| `getValidators()` | `Validator[]` | GovernancePage |
| `voteOnProposal(id, vote)` | `{ voted: boolean }` | GovernancePage |
| `claimStakingRewards()` | `{ claimed, amount }` | GovernancePage |
| `getVerificationProgress()` | `VerificationProgress` | VerificationPage |
| `submitVerification(method)` | `{ submitted: boolean }` | VerificationPage |
| `getHardwareWallets()` | `HardwareWallet[]` | SecurityPage |
| `getPrivacyPreferences()` | `PrivacyPreference[]` | SecurityPage |
| `updatePrivacyPreference(id, enabled)` | `{ updated: boolean }` | SecurityPage |
| `getActiveSessions()` | `ActiveSession[]` | SecurityPage |
| `revokeSession(id)` | `{ revoked: boolean }` | SecurityPage |
| `revokeAllRemoteSessions()` | `{ revoked: boolean }` | SecurityPage |
| `getSecurityLog()` | `SecurityLogEntry[]` | SecurityPage |
| `revealSeedPhrase(password)` | `{ phrase: string }` | SecurityPage |
| `connectHardwareWallet(type)` | `{ connected: boolean }` | SecurityPage |
| `getPlatformStats()` | `PlatformStats` | LandingPage |
