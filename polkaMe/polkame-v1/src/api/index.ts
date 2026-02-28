/* ------------------------------------------------------------------ */
/*  PolkaMe — Stubbed API layer                                       */
/*  Every function returns typed mock data.  Replace the body with    */
/*  real fetch/axios calls when the backend is ready.                  */
/* ------------------------------------------------------------------ */

import type {
  ApiResponse,
  Identity,
  VerificationStatus,
  LinkedChainAccount,
  LinkedSocialAccount,
  ActivityEntry,
  AuthorizedDApp,
  StakingMetrics,
  Proposal,
  Validator,
  VerificationProgress,
  HardwareWallet,
  PrivacyPreference,
  ActiveSession,
  SecurityLogEntry,
  PlatformStats,
} from "../types";

// ─── helpers ──────────────��───────────────────────────────────────────
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
function ok<T>(data: T): ApiResponse<T> {
  return { data, success: true };
}

// ─── Identity ─────────────────────────────────────────────────────────
export async function getUserIdentity(): Promise<ApiResponse<Identity>> {
  await delay();
  return ok<Identity>({
    id: "polkame-001",
    displayName: "Web3 Explorer",
    walletAddress: "5GrwvaEF...WzC5",
    score: 88,
    scoreChange: 5.2,
    createdAt: "2025-09-01T00:00:00Z",
    updatedAt: "2026-02-27T12:00:00Z",
  });
}

export async function getVerificationStatus(): Promise<ApiResponse<VerificationStatus>> {
  await delay();
  return ok<VerificationStatus>({
    email: "verified",
    governance: "verified",
    socials: "pending",
    kyc: "unverified",
  });
}

// ─── Linked Accounts ──────────────────────────────────────────────────
export async function getLinkedChainAccounts(): Promise<ApiResponse<LinkedChainAccount[]>> {
  await delay();
  return ok<LinkedChainAccount[]>([
    {
      id: "chain-1",
      chain: "polkadot",
      label: "Polkadot Mainnet",
      address: "15o...4h9r",
      balance: "428.50 DOT",
      tag: "Primary Account",
      logoColor: "bg-primary",
    },
    {
      id: "chain-2",
      chain: "kusama",
      label: "Kusama Relay",
      address: "E8w...2k9L",
      balance: "12.20 KSM",
      tag: "Staking Active",
      logoColor: "bg-black",
    },
  ]);
}

export async function getLinkedSocialAccounts(): Promise<ApiResponse<LinkedSocialAccount[]>> {
  await delay();
  return ok<LinkedSocialAccount[]>([
    {
      id: "social-1",
      platform: "twitter",
      handle: "@web3_enthusiast",
      verified: true,
      linkedAt: "2026-02-16T10:00:00Z",
    },
  ]);
}

export async function linkNewAccount(_chain: string): Promise<ApiResponse<{ linked: boolean }>> {
  await delay(500);
  return ok({ linked: true });
}

// ─── Activity ─────────────────────────────────────────────────────────
export async function getRecentActivity(): Promise<ApiResponse<ActivityEntry[]>> {
  await delay();
  return ok<ActivityEntry[]>([
    { id: "a1", action: "Sign Auth", icon: "vpn_key", app: "HydraDX Dex", status: "success", timestamp: "2 mins ago" },
    { id: "a2", action: "Identity Update", icon: "description", app: "Polkadot JS", status: "success", timestamp: "1 hour ago" },
    { id: "a3", action: "Governance Vote", icon: "link", app: "SubSquare", status: "pending", timestamp: "5 hours ago" },
  ]);
}

// ─── Authorized dApps ─────────────────────────────────────────────────
export async function getAuthorizedDApps(): Promise<ApiResponse<AuthorizedDApp[]>> {
  await delay();
  return ok<AuthorizedDApp[]>([
    { id: "d1", name: "Astar Network", lastLogin: "Today", logoLetter: "A", logoBgColor: "bg-primary" },
    { id: "d2", name: "HydraDX Protocol", lastLogin: "2m ago", logoLetter: "H", logoBgColor: "bg-purple-600" },
    { id: "d3", name: "Subscan Explorer", lastLogin: "2 days ago", logoLetter: "S", logoBgColor: "bg-blue-600" },
  ]);
}

export async function revokeDApp(_dAppId: string): Promise<ApiResponse<{ revoked: boolean }>> {
  await delay(400);
  return ok({ revoked: true });
}

// ─── Governance & Staking ─────────────────────────────────────────────
export async function getStakingMetrics(): Promise<ApiResponse<StakingMetrics>> {
  await delay();
  return ok<StakingMetrics>({
    totalStaked: "1,240.50",
    claimableRewards: "12.84",
    votingPower: "45.8k",
    votingWeight: "1.2x (3mo lock)",
    stakingApyTrend: [50, 75, 66, 83, 66, 80, 100],
    currentApy: 14.2,
    participationPct: 82.4,
    totalVotes: "4.2M",
    stakeChangePercent: 2.4,
  });
}

export async function getActiveProposals(): Promise<ApiResponse<Proposal[]>> {
  await delay();
  return ok<Proposal[]>([
    {
      id: "p1",
      refNum: 824,
      tag: "Referendum #824",
      tagColor: "amber",
      title: "Technical Fellowship: Runtime Upgrade v9430",
      description:
        "This proposal aims to upgrade the Polkadot relay chain to runtime version 9430, introducing enhancements to the XCM protocol and performance improvements for parachains.",
      ayePct: 88,
      nayPct: 12,
      endsIn: "2d 14h",
    },
    {
      id: "p2",
      refNum: 821,
      tag: "Referendum #821",
      tagColor: "blue",
      title: "Treasury Proposal: Polkadot Developer Conference 2026",
      description:
        "Funding request for the annual Polkadot Decoded flagship event to support global ecosystem growth and developer onboarding initiatives in Asia.",
      ayePct: 62,
      nayPct: 38,
      endsIn: "5d 22h",
    },
  ]);
}

export async function voteOnProposal(
  _proposalId: string,
  _vote: "aye" | "nay",
): Promise<ApiResponse<{ voted: boolean }>> {
  await delay(600);
  return ok({ voted: true });
}

export async function claimStakingRewards(): Promise<ApiResponse<{ claimed: boolean; amount: string }>> {
  await delay(800);
  return ok({ claimed: true, amount: "12.84 DOT" });
}

export async function getValidators(): Promise<ApiResponse<Validator[]>> {
  await delay();
  return ok<Validator[]>([
    { id: "v1", shortName: "Parity-01", initials: "P1", commission: "3.0%", selfStake: "1.2M DOT", rewards24h: "+0.42 DOT", status: "active" },
    { id: "v2", shortName: "Web3Foundation-4", initials: "W3", commission: "0.5%", selfStake: "840K DOT", rewards24h: "+0.38 DOT", status: "active" },
    { id: "v3", shortName: "Zzug-Dot", initials: "ZD", commission: "10.0%", selfStake: "5.1M DOT", rewards24h: "+0.88 DOT", status: "active" },
  ]);
}

// ─── Verification Hub ─────────────────────────────────────────────────
export async function getVerificationProgress(): Promise<ApiResponse<VerificationProgress>> {
  await delay();
  return ok<VerificationProgress>({ currentStep: 1, totalSteps: 3, percentComplete: 33 });
}

export async function submitVerification(
  _method: "wallet" | "social" | "kyc",
): Promise<ApiResponse<{ submitted: boolean }>> {
  await delay(700);
  return ok({ submitted: true });
}

// ─── Security ─────────────────────────────────────────────────────────
export async function getHardwareWallets(): Promise<ApiResponse<HardwareWallet[]>> {
  await delay();
  return ok<HardwareWallet[]>([
    {
      id: "hw1",
      name: "Ledger Nano S/X",
      description: "Connect your Ledger device to sign transactions offline for cold storage security.",
      icon: "developer_board",
      badge: "Recommended",
      badgeVariant: "recommended",
    },
    {
      id: "hw2",
      name: "Trezor Model T/One",
      description: "Industry standard open-source hardware wallet integration via Trezor Connect.",
      icon: "memory",
      badge: "Alternative",
      badgeVariant: "alternative",
    },
  ]);
}

export async function getPrivacyPreferences(): Promise<ApiResponse<PrivacyPreference[]>> {
  await delay();
  return ok<PrivacyPreference[]>([
    { id: "pp1", label: "Stealth Mode", description: "Hide balance on startup", enabled: true },
    { id: "pp2", label: "Anonymous RPC", description: "Route traffic through TOR/VPN", enabled: false },
    { id: "pp3", label: "Metadata Scrubbing", description: "Remove transaction tags locally", enabled: true },
  ]);
}

export async function updatePrivacyPreference(
  _prefId: string,
  _enabled: boolean,
): Promise<ApiResponse<{ updated: boolean }>> {
  await delay(300);
  return ok({ updated: true });
}

export async function getActiveSessions(): Promise<ApiResponse<ActiveSession[]>> {
  await delay();
  return ok<ActiveSession[]>([
    { id: "s1", device: "MacOS", browser: "Chrome 118", location: "London, UK", isCurrent: true, lastActive: "Now", icon: "laptop_mac" },
    { id: "s2", device: "iPhone 14 Pro", browser: "iOS 17", location: "Berlin, DE", isCurrent: false, lastActive: "2h ago", icon: "smartphone" },
  ]);
}

export async function revokeSession(_sessionId: string): Promise<ApiResponse<{ revoked: boolean }>> {
  await delay(400);
  return ok({ revoked: true });
}

export async function revokeAllRemoteSessions(): Promise<ApiResponse<{ revoked: boolean }>> {
  await delay(500);
  return ok({ revoked: true });
}

export async function getSecurityLog(): Promise<ApiResponse<SecurityLogEntry[]>> {
  await delay();
  return ok<SecurityLogEntry[]>([
    { id: "sl1", event: "Password Changed", source: "192.168.1.1", timestamp: "2026-02-24 14:32" },
    { id: "sl2", event: "Seed Phrase Viewed", source: "User Authorized", timestamp: "2026-02-20 09:15" },
  ]);
}

export async function revealSeedPhrase(_password: string): Promise<ApiResponse<{ phrase: string }>> {
  await delay(1000);
  return ok({ phrase: "abandon ability able about above absent absorb abstract absurd abuse access accident alcohol alien all alpha already also alter always amateur amazing among amount amused" });
}

export async function connectHardwareWallet(
  _walletType: "ledger" | "trezor",
): Promise<ApiResponse<{ connected: boolean }>> {
  await delay(1200);
  return ok({ connected: true });
}

// ─── Landing ──────────────────────────────────────────────────────────
export async function getPlatformStats(): Promise<ApiResponse<PlatformStats>> {
  await delay();
  return ok<PlatformStats>({
    users: "250k+",
    parachains: "45+",
    credentials: "1.2M+",
  });
}
