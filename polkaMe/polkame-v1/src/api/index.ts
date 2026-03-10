/* ------------------------------------------------------------------ */
/*  PolkaMe — API layer (reads from deployed Solidity contracts)      */
/*  Connected to local Hardhat node at http://127.0.0.1:8545          */
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

import {
  getIdentityContract,
  getAccountsContract,
  getGovernanceContract,
  getSecurityContract,
  getUserAddress,
  getIdentityReadOnly,
  getAccountsReadOnly,
  getGovernanceReadOnly,
  getSecurityReadOnly,
  VERIFICATION_STATE,
  CHAIN_TYPE,
  SOCIAL_TYPE,
  ACTIVITY_STATUS,
  VALIDATOR_STATUS,
} from "../contracts";

// ─── helpers ──────────────────────────────────────────────────────────
function ok<T>(data: T): ApiResponse<T> {
  return { data, success: true };
}
function fail<T>(error: string): ApiResponse<T> {
  return { data: undefined as unknown as T, success: false, error };
}

function tsFromUnix(ts: bigint): string {
  return new Date(Number(ts) * 1000).toISOString();
}

function timeAgo(ts: bigint): string {
  const secs = Math.floor(Date.now() / 1000) - Number(ts);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function timeLeft(endTs: bigint): string {
  const secs = Number(endTs) - Math.floor(Date.now() / 1000);
  if (secs <= 0) return "ended";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  return `${d}d ${h}h`;
}

// ─── Identity ─────────────────────────────────────────────────────────

/** Check if the given address (or connected wallet) already has a DID.
 *  Uses read-only contract — never triggers a wallet popup. */
export async function checkHasDID(forAddress?: string): Promise<boolean> {
  try {
    const identity = getIdentityReadOnly();
    const addr = forAddress ?? await getUserAddress();
    return await identity.hasDID(addr);
  } catch {
    return false;
  }
}

/** Create a new DID for the connected wallet */
export async function createDID(displayName: string): Promise<ApiResponse<Identity>> {
  try {
    const identity = await getIdentityContract();
    const tx = await identity.createDID(displayName);
    await tx.wait();
    // Read back the fresh DID
    return getUserIdentity();
  } catch (e: any) {
    return fail(e.message);
  }
}

/** Search for a user by wallet address OR display name.
 *  Address: direct lookup. Name: scans DIDCreated events to find all users, then matches. */
export async function searchUser(addressOrName: string): Promise<ApiResponse<Identity[]>> {
  try {
    const identity = getIdentityReadOnly();
    const { ethers } = await import("ethers");
    const query = addressOrName.trim();
    const isAddr = ethers.isAddress(query);

    // If it looks like an address, do a direct lookup
    if (isAddr) {
      const has = await identity.hasDID(query);
      if (!has) return ok([]);
      const did = await identity.getDID(query);
      return ok([{
        id: `did:ethr:${query}`,
        displayName: did.displayName,
        walletAddress: query,
        score: Number(did.reputationScore),
        scoreChange: Number(did.scoreChange),
        createdAt: tsFromUnix(did.createdAt),
        updatedAt: tsFromUnix(did.updatedAt),
      }]);
    }

    // Otherwise, search by name — scan DIDCreated events to get all registered addresses
    const filter = identity.filters.DIDCreated();
    const events = await identity.queryFilter(filter, 0, "latest");
    const results: Identity[] = [];
    const lowerQuery = (query as string).toLowerCase();

    for (const ev of events) {
      const userAddr = (ev as any).args?.[0] ?? (ev as any).args?.user;
      if (!userAddr) continue;
      try {
        const did = await identity.getDID(userAddr);
        if (did.displayName.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: `did:ethr:${userAddr}`,
            displayName: did.displayName,
            walletAddress: userAddr,
            score: Number(did.reputationScore),
            scoreChange: Number(did.scoreChange),
            createdAt: tsFromUnix(did.createdAt),
            updatedAt: tsFromUnix(did.updatedAt),
          });
        }
      } catch {
        // skip users whose DID was deactivated
      }
    }
    return ok(results);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getUserIdentity(forAddress?: string): Promise<ApiResponse<Identity>> {
  try {
    const identity = getIdentityReadOnly();
    const addr = forAddress || await getUserAddress();
    const has = await identity.hasDID(addr);
    if (!has) return fail("No DID — call createDID first");
    const did = await identity.getDID(addr);
    return ok<Identity>({
      id: `did:ethr:${addr}`,
      displayName: did.displayName,
      walletAddress: addr,
      score: Number(did.reputationScore),
      scoreChange: Number(did.scoreChange),
      createdAt: tsFromUnix(did.createdAt),
      updatedAt: tsFromUnix(did.updatedAt),
    });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getVerificationStatus(forAddress?: string): Promise<ApiResponse<VerificationStatus>> {
  try {
    const identity = getIdentityReadOnly();
    const addr = forAddress || await getUserAddress();
    const v = await identity.getVerificationStatus(addr);
    return ok<VerificationStatus>({
      email: VERIFICATION_STATE[Number(v.email)] as VerificationStatus["email"],
      governance: VERIFICATION_STATE[Number(v.governance)] as VerificationStatus["governance"],
      socials: VERIFICATION_STATE[Number(v.socials)] as VerificationStatus["socials"],
      kyc: VERIFICATION_STATE[Number(v.kyc)] as VerificationStatus["kyc"],
    });
  } catch (e: any) {
    return fail(e.message);
  }
}

// ─── Linked Accounts ──────────────────────────────────────────────────
export async function getLinkedChainAccounts(forAddress?: string): Promise<ApiResponse<LinkedChainAccount[]>> {
  try {
    const accounts = getAccountsReadOnly();
    const addr = forAddress || await getUserAddress();
    const raw = await accounts.getLinkedChainAccounts(addr);
    const COLORS = ["bg-primary", "bg-black", "bg-blue-600", "bg-purple-600", "bg-gray-500"];
    const result: LinkedChainAccount[] = raw
      .filter((a: any) => a.active)
      .map((a: any, i: number) => ({
        id: `chain-${i}`,
        chain: CHAIN_TYPE[Number(a.chain)] as LinkedChainAccount["chain"],
        label: a.label,
        address: a.accountAddress,
        balance: "—",
        tag: a.tag,
        logoColor: COLORS[Number(a.chain)] || "bg-gray-500",
      }));
    return ok(result);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getLinkedSocialAccounts(forAddress?: string): Promise<ApiResponse<LinkedSocialAccount[]>> {
  try {
    const accounts = getAccountsReadOnly();
    const addr = forAddress || await getUserAddress();
    const raw = await accounts.getLinkedSocialAccounts(addr);
    const result: LinkedSocialAccount[] = raw
      .filter((a: any) => a.active)
      .map((a: any, i: number) => ({
        id: `social-${i}`,
        platform: SOCIAL_TYPE[Number(a.platform)] as LinkedSocialAccount["platform"],
        handle: a.handle,
        verified: a.verified,
        linkedAt: tsFromUnix(a.linkedAt),
      }));
    return ok(result);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function linkNewAccount(chain: string): Promise<ApiResponse<{ linked: boolean }>> {
  try {
    const accounts = await getAccountsContract();
    const chainIndex = CHAIN_TYPE.indexOf(chain as any);
    const tx = await accounts.linkChainAccount(
      chainIndex >= 0 ? chainIndex : 4,
      chain,
      "pending-address",
      "New",
    );
    await tx.wait();
    return ok({ linked: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

/** Link a chain account with full details */
export async function linkChainAccountFull(
  chain: string, label: string, address: string, tag: string
): Promise<ApiResponse<{ linked: boolean }>> {
  try {
    const accounts = await getAccountsContract();
    const chainIndex = CHAIN_TYPE.indexOf(chain.toLowerCase() as any);
    const tx = await accounts.linkChainAccount(
      chainIndex >= 0 ? chainIndex : 4, label, address, tag
    );
    await tx.wait();
    return ok({ linked: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

/** Link a social account */
export async function linkSocialAccountAPI(
  platform: "twitter" | "discord" | "github", handle: string
): Promise<ApiResponse<{ linked: boolean }>> {
  try {
    const accounts = await getAccountsContract();
    const platformIndex = SOCIAL_TYPE.indexOf(platform);
    const tx = await accounts.linkSocialAccount(platformIndex, handle);
    await tx.wait();
    return ok({ linked: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

/** Authorize a dApp */
export async function authorizeDApp(
  name: string, dAppAddress: string
): Promise<ApiResponse<{ authorized: boolean }>> {
  try {
    const accounts = await getAccountsContract();
    const tx = await accounts.authorizeDApp(name, dAppAddress);
    await tx.wait();
    return ok({ authorized: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

/** Log an activity entry */
export async function logActivity(
  action: string, app: string, status: "success" | "pending" | "failed"
): Promise<ApiResponse<{ logged: boolean }>> {
  try {
    const accounts = await getAccountsContract();
    const statusIndex = ACTIVITY_STATUS.indexOf(status);
    const tx = await accounts.logActivity(action, app, statusIndex);
    await tx.wait();
    return ok({ logged: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

/** Stake tokens */
export async function stakeTokens(amountEth: string): Promise<ApiResponse<{ staked: boolean }>> {
  try {
    const governance = await getGovernanceContract();
    const { ethers } = await import("ethers");
    const tx = await governance.stake({ value: ethers.parseEther(amountEth) });
    await tx.wait();
    return ok({ staked: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

/** Create a governance proposal */
export async function createProposal(
  title: string, description: string, durationDays: number
): Promise<ApiResponse<{ created: boolean }>> {
  try {
    const governance = await getGovernanceContract();
    const tx = await governance.createProposal(title, description, durationDays * 86400);
    await tx.wait();
    return ok({ created: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

/** Initialize privacy preferences (first time) */
export async function initPrivacyPrefs(): Promise<ApiResponse<{ initialized: boolean }>> {
  try {
    const security = await getSecurityContract();
    const tx = await security.initializePrivacyPrefs();
    await tx.wait();
    return ok({ initialized: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

/** Create a session */
export async function createSession(
  device: string, browser: string, location: string
): Promise<ApiResponse<{ created: boolean }>> {
  try {
    const security = await getSecurityContract();
    const tx = await security.createSession(device, browser, location, true);
    await tx.wait();
    return ok({ created: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

// ─── Activity ─────────────────────────────────────────────────────────
export async function getRecentActivity(forAddress?: string): Promise<ApiResponse<ActivityEntry[]>> {
  try {
    const accounts = getAccountsReadOnly();
    const addr = forAddress || await getUserAddress();
    const raw = await accounts.getRecentActivity(addr);
    const ICONS: Record<string, string> = {
      "Linked wallet": "account_balance_wallet",
      "Sign Auth": "vpn_key",
      "Identity Update": "description",
      "Governance Vote": "how_to_vote",
    };
    const result: ActivityEntry[] = raw.map((a: any, i: number) => ({
      id: `a${i}`,
      action: a.action,
      icon: ICONS[a.action] || "receipt_long",
      app: a.app,
      status: ACTIVITY_STATUS[Number(a.status)] as ActivityEntry["status"],
      timestamp: timeAgo(a.timestamp),
    }));
    return ok(result);
  } catch (e: any) {
    return fail(e.message);
  }
}

// ─── Authorized dApps ─────────────────────────────────────────────────
export async function getAuthorizedDApps(forAddress?: string): Promise<ApiResponse<AuthorizedDApp[]>> {
  try {
    const accounts = getAccountsReadOnly();
    const addr = forAddress || await getUserAddress();
    const raw = await accounts.getAuthorizedDApps(addr);
    const COLORS = ["bg-primary", "bg-purple-600", "bg-blue-600", "bg-red-500", "bg-green-600"];
    const result: AuthorizedDApp[] = raw
      .filter((d: any) => d.active)
      .map((d: any, i: number) => ({
        id: `d${i}`,
        name: d.name,
        lastLogin: timeAgo(d.lastAccessed),
        logoLetter: d.name.charAt(0),
        logoBgColor: COLORS[i % COLORS.length],
      }));
    return ok(result);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function revokeDApp(dAppId: string): Promise<ApiResponse<{ revoked: boolean }>> {
  try {
    const accounts = await getAccountsContract();
    const index = parseInt(dAppId.replace("d", ""), 10);
    const tx = await accounts.revokeDApp(index);
    await tx.wait();
    return ok({ revoked: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

// ─── Governance & Staking ─────────────────────────────────────────────
export async function getStakingMetrics(forAddress?: string): Promise<ApiResponse<StakingMetrics>> {
  try {
    const governance = getGovernanceReadOnly();
    const addr = forAddress || await getUserAddress();
    const m = await governance.getStakingMetrics(addr);
    const { ethers } = await import("ethers");
    return ok<StakingMetrics>({
      totalStaked: ethers.formatEther(m.totalStaked),
      claimableRewards: ethers.formatEther(m.claimableRewards),
      votingPower: ethers.formatEther(m.votingPower),
      votingWeight: `${Number(m.convictionMultiplier)}x conviction`,
      stakingApyTrend: [50, 75, 66, 83, 66, 80, 100], // placeholder — no on-chain APY history
      currentApy: 14.2,
      participationPct: 82.4,
      totalVotes: "—",
      stakeChangePercent: 0,
    });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getActiveProposals(): Promise<ApiResponse<Proposal[]>> {
  try {
    const governance = getGovernanceReadOnly();
    const raw = await governance.getActiveProposals();
    const result: Proposal[] = raw.map((p: any, i: number) => {
      const total = Number(p.ayeVotes) + Number(p.nayVotes);
      return {
        id: `p${i}`,
        refNum: Number(p.refNum),
        tag: p.tag,
        tagColor: (["amber", "blue", "green", "red"] as const)[i % 4],
        title: p.title,
        description: p.description,
        ayePct: total > 0 ? Math.round((Number(p.ayeVotes) / total) * 100) : 0,
        nayPct: total > 0 ? Math.round((Number(p.nayVotes) / total) * 100) : 0,
        endsIn: timeLeft(p.endTime),
      };
    });
    return ok(result);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function voteOnProposal(
  proposalId: string,
  vote: "aye" | "nay",
): Promise<ApiResponse<{ voted: boolean }>> {
  try {
    const governance = await getGovernanceContract();
    const index = parseInt(proposalId.replace("p", ""), 10);
    const voteVal = vote === "aye" ? 1 : 2; // Vote enum: 0=None, 1=Aye, 2=Nay
    const tx = await governance.voteOnProposal(index, voteVal);
    await tx.wait();
    return ok({ voted: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function claimStakingRewards(): Promise<ApiResponse<{ claimed: boolean; amount: string }>> {
  try {
    const governance = await getGovernanceContract();
    const tx = await governance.claimRewards();
    await tx.wait();
    return ok({ claimed: true, amount: "claimed" });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getValidators(): Promise<ApiResponse<Validator[]>> {
  try {
    const governance = getGovernanceReadOnly();
    const raw = await governance.getValidators();
    const { ethers } = await import("ethers");
    const result: Validator[] = raw.map((v: any, i: number) => ({
      id: `v${i}`,
      shortName: v.shortName,
      initials: v.initials,
      commission: `${Number(v.commissionBps) / 100}%`,
      selfStake: `${ethers.formatEther(v.selfStake)} DOT`,
      rewards24h: "—",
      status: VALIDATOR_STATUS[Number(v.status)] as Validator["status"],
    }));
    return ok(result);
  } catch (e: any) {
    return fail(e.message);
  }
}

// ─── Verification Hub ─────────────────────────────────────────────────
export async function getVerificationProgress(forAddress?: string): Promise<ApiResponse<VerificationProgress>> {
  try {
    const identity = await getIdentityReadOnly();
    const addr = forAddress || await getUserAddress();
    const [step, total, pct] = await identity.getVerificationProgress(addr);
    return ok<VerificationProgress>({
      currentStep: Number(step),
      totalSteps: Number(total),
      percentComplete: Number(pct),
    });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function submitVerification(
  method: "wallet" | "social" | "kyc",
): Promise<ApiResponse<{ submitted: boolean }>> {
  try {
    const identity = await getIdentityContract();
    // Map frontend method names to contract uint8 field IDs
    const FIELD_MAP: Record<string, number> = { wallet: 0, social: 2, kyc: 3 };
    const tx = await identity.submitVerification(FIELD_MAP[method] ?? 0);
    await tx.wait();
    return ok({ submitted: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

// ─── Security ─────────────────────────────────────────────────────────
export async function getHardwareWallets(): Promise<ApiResponse<HardwareWallet[]>> {
  // Hardware wallet list is static UI data — no contract storage needed
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

export async function getPrivacyPreferences(forAddress?: string): Promise<ApiResponse<PrivacyPreference[]>> {
  try {
    const security = getSecurityReadOnly();
    const addr = forAddress || await getUserAddress();
    const raw = await security.getPrivacyPreferences(addr);
    const result: PrivacyPreference[] = raw.map((p: any, i: number) => ({
      id: `pp${i}`,
      label: p.label,
      description: p.description,
      enabled: p.enabled,
    }));
    return ok(result);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function updatePrivacyPreference(
  prefId: string,
  enabled: boolean,
): Promise<ApiResponse<{ updated: boolean }>> {
  try {
    const security = await getSecurityContract();
    const index = parseInt(prefId.replace("pp", ""), 10);
    const tx = await security.updatePrivacyPreference(index, enabled);
    await tx.wait();
    return ok({ updated: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getActiveSessions(forAddress?: string): Promise<ApiResponse<ActiveSession[]>> {
  try {
    const security = getSecurityReadOnly();
    const addr = forAddress || await getUserAddress();
    const raw = await security.getActiveSessions(addr);
    const result: ActiveSession[] = raw
      .filter((s: any) => s.active)
      .map((s: any, i: number) => ({
        id: `s${i}`,
        device: s.device,
        browser: s.browser,
        location: s.location,
        isCurrent: s.isCurrent,
        lastActive: timeAgo(s.lastActive),
        icon: s.device.toLowerCase().includes("phone") || s.device.toLowerCase().includes("iphone")
          ? "smartphone"
          : "laptop_mac",
      }));
    return ok(result);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function revokeSession(sessionId: string): Promise<ApiResponse<{ revoked: boolean }>> {
  try {
    const security = await getSecurityContract();
    const index = parseInt(sessionId.replace("s", ""), 10);
    const tx = await security.revokeSession(index);
    await tx.wait();
    return ok({ revoked: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function revokeAllRemoteSessions(): Promise<ApiResponse<{ revoked: boolean }>> {
  try {
    const security = await getSecurityContract();
    const tx = await security.revokeAllRemoteSessions();
    await tx.wait();
    return ok({ revoked: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getSecurityLog(forAddress?: string): Promise<ApiResponse<SecurityLogEntry[]>> {
  try {
    const security = getSecurityReadOnly();
    const addr = forAddress || await getUserAddress();
    const raw = await security.getSecurityLog(addr);
    const result: SecurityLogEntry[] = raw.map((e: any, i: number) => ({
      id: `sl${i}`,
      event: e.eventDescription,
      source: e.source,
      timestamp: tsFromUnix(e.timestamp),
    }));
    return ok(result);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function revealSeedPhrase(_password: string): Promise<ApiResponse<{ phrase: string }>> {
  // Seed phrases are NEVER stored on-chain — purely client-side
  return ok({ phrase: "This is a demo. Real seed phrases are managed by your wallet (MetaMask/Polkadot.js)." });
}

export async function connectHardwareWallet(
  _walletType: "ledger" | "trezor",
): Promise<ApiResponse<{ connected: boolean }>> {
  // Hardware wallet pairing is wallet-level, not contract-level
  return ok({ connected: true });
}

// ─── Landing ──────────────────────────────────────────────────────────
export async function getPlatformStats(): Promise<ApiResponse<PlatformStats>> {
  try {
    const identity = getIdentityReadOnly(); // read-only — no wallet needed
    const [users, creds, links] = await identity.getPlatformStats();
    return ok<PlatformStats>({
      users: Number(users) > 0 ? `${Number(users)}` : "0",
      parachains: `${Number(links)}`,
      credentials: `${Number(creds)}`,
    });
  } catch (e: any) {
    return fail(e.message);
  }
}
