/* ────────────────────────────────────────────────────────────────────
   PolkaMe Backend — shared TypeScript types
   These mirror the frontend types in polkame-v1/src/types/index.ts
   so the API contract stays in sync on both sides.
──────────────────────────────────────────────────────────────────── */

// ─── Generic API response wrapper ────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export function ok<T>(data: T): ApiResponse<T> {
  return { data, success: true };
}
/** Alias for ok() — used by route modules */
export const success = ok;

export function fail<T>(error: string): ApiResponse<T> {
  return { data: undefined as unknown as T, success: false, error };
}

// ─── Identity ────────────────────────────────────────────────────────
export interface Identity {
  id: string;               // same as walletAddress
  displayName: string;
  walletAddress: string;
  score: number;            // 0-100 identity strength score
  scoreChange: number;      // % change this period
  createdAt: string;        // ISO-8601
  updatedAt: string;
}

export interface VerificationStatus {
  email:      "verified" | "pending" | "unverified";
  governance: "verified" | "pending" | "unverified";
  socials:    "verified" | "pending" | "unverified";
  dao_badge:  "verified" | "pending" | "unverified";
}

export interface VerificationProgress {
  currentStep:     number;
  totalSteps:      number;
  percentComplete: number;
}

export interface PlatformStats {
  users:       string;
  parachains:  string;
  credentials: string;
}

// ─── DID Linking ────────────────────────────────────────────────────
// Represents a cross-chain DID link: a user attesting that they own both
// their Polkadot address and an EVM address (the "Mapped Together" diagram layer)
export interface LinkedDID {
  id:            string;
  ownerAddress:  string;
  linkedAddress: string;
  didType:       "evm" | "polkadot";
  createdAt:     string;
}

// ─── Accounts ────────────────────────────────────────────────────────
export type ChainType  = "polkadot" | "kusama" | "astar" | "moonbeam" | "custom";
export type SocialType = "twitter" | "discord" | "github";

export interface LinkedChainAccount {
  id:         string;
  chain:      ChainType;
  label:      string;
  address:    string;
  balance:    string;       // e.g. "428.50 DOT"
  tag:        string;       // e.g. "Primary Account"
  logoColor:  string;       // Tailwind bg class
}

export interface LinkedSocialAccount {
  id:       string;
  platform: SocialType;
  handle:   string;
  verified: boolean;
  linkedAt: string;
}

export type ActivityStatus = "success" | "pending" | "failed";

export interface ActivityEntry {
  id:        string;
  action:    string;
  icon:      string;        // Material icon name
  app:       string;
  status:    ActivityStatus;
  timestamp: string;
}

export interface AuthorizedDApp {
  id:          string;
  name:        string;
  lastLogin:   string;
  logoLetter:  string;
  logoBgColor: string;
}

// ─── Governance & Staking ────────────────────────────────────────────
export interface StakingMetrics {
  totalStaked:        string;
  claimableRewards:   string;
  votingPower:        string;
  votingWeight:       string;
  stakingApyTrend:    number[];   // 7 data points (Mon-Sun)
  currentApy:         number;
  participationPct:   number;
  totalVotes:         string;
  stakeChangePercent: number;
}

export interface Proposal {
  id:          string;
  refNum:      number;
  tag:         string;
  tagColor:    "amber" | "blue" | "green" | "red";
  title:       string;
  description: string;
  ayePct:      number;
  nayPct:      number;
  endsIn:      string;
}

export interface Validator {
  id:         string;
  shortName:  string;
  initials:   string;
  commission: string;
  selfStake:  string;
  rewards24h: string;
  status:     "active" | "waiting" | "inactive";
}

// ─── Security ────────────────────────────────────────────────────────
export interface PrivacyPreference {
  id:          string;
  label:       string;
  description: string;
  enabled:     boolean;
}

export interface ActiveSession {
  id:         string;
  device:     string;
  browser:    string;
  location:   string;
  isCurrent:  boolean;
  lastActive: string;
  icon:       string;
}

export interface SecurityLogEntry {
  id:        string;
  event:     string;
  source:    string;
  timestamp: string;
}

// ─── Auth ────────────────────────────────────────────────────────────
export interface JwtPayload {
  address:    string;       // Wallet address (EVM or Polkadot)
  walletType: "evm" | "polkadot";
  iat?:       number;
  exp?:       number;
  jti?:       string;       // JWT ID used for revocation
}

// Extends Express Request to carry decoded JWT payload after auth middleware
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
