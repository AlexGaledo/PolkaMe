/* ------------------------------------------------------------------ */
/*  PolkaMe — shared TypeScript interfaces & types                    */
/*  All API payload shapes live here so frontend ↔ backend contracts  */
/*  stay consistent from day one.                                     */
/* ------------------------------------------------------------------ */

// ─── Identity ────────────────────────────────────────────────────────
export interface Identity {
  id: string;
  displayName: string;
  walletAddress: string;
  score: number;          // 0-100 identity strength
  scoreChange: number;    // % change this period
  createdAt: string;      // ISO-8601
  updatedAt: string;
}

export interface VerificationStatus {
  email: "verified" | "pending" | "unverified";
  governance: "verified" | "pending" | "unverified";
  socials: "verified" | "pending" | "unverified";
  kyc: "verified" | "pending" | "unverified";
}

// ─── Linked Accounts ─────────────────────────────────────────────────
export type ChainType = "polkadot" | "kusama" | "astar" | "moonbeam" | "custom";
export type SocialType = "twitter" | "discord" | "github";

export interface LinkedChainAccount {
  id: string;
  chain: ChainType;
  label: string;
  address: string;         // truncated display
  balance: string;         // e.g. "428.50 DOT"
  tag: string;             // e.g. "Primary Account"
  logoUrl?: string;
  logoColor: string;       // Tailwind-safe bg color
}

export interface LinkedSocialAccount {
  id: string;
  platform: SocialType;
  handle: string;
  verified: boolean;
  linkedAt: string;        // ISO-8601
}

// ─── Activity ────────────────────────────────────────────────────────
export type ActivityStatus = "success" | "pending" | "failed";

export interface ActivityEntry {
  id: string;
  action: string;
  icon: string;            // Material icon name
  app: string;
  status: ActivityStatus;
  timestamp: string;
}

// ─── Authorized dApps ────────────────────────────────────────────────
export interface AuthorizedDApp {
  id: string;
  name: string;
  lastLogin: string;
  logoLetter: string;
  logoBgColor: string;     // Tailwind-safe bg color
}

// ─── Governance & Staking ────────────────────────────────────────────
export interface StakingMetrics {
  totalStaked: string;
  claimableRewards: string;
  votingPower: string;
  votingWeight: string;
  stakingApyTrend: number[];   // 7 values (Mon-Sun)
  currentApy: number;
  participationPct: number;
  totalVotes: string;
  stakeChangePercent: number;
}

export interface Proposal {
  id: string;
  refNum: number;
  tag: string;
  tagColor: "amber" | "blue" | "green" | "red";
  title: string;
  description: string;
  ayePct: number;
  nayPct: number;
  endsIn: string;          // human-readable
}

export interface Validator {
  id: string;
  shortName: string;
  initials: string;
  commission: string;
  selfStake: string;
  rewards24h: string;
  status: "active" | "waiting" | "inactive";
}

// ─── Verification Hub ────────────────────────────────────────────────
export interface VerificationProgress {
  currentStep: number;
  totalSteps: number;
  percentComplete: number;
}

// ─── Security ────────────────────────────────────────────────────────
export interface HardwareWallet {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge: string;
  badgeVariant: "recommended" | "alternative";
}

export interface PrivacyPreference {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  isCurrent: boolean;
  lastActive: string;
  icon: string;
}

export interface SecurityLogEntry {
  id: string;
  event: string;
  source: string;
  timestamp: string;
}

// ─── Landing stats ───────────────────────────────────────────────────
export interface PlatformStats {
  users: string;
  parachains: string;
  credentials: string;
}

// ─── Generic API response wrapper ────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}
