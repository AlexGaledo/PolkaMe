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
  PrivacyPreference,
  ActiveSession,
  SecurityLogEntry,
  PlatformStats,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001/api";

function ok<T>(data: T): ApiResponse<T> {
  return { data, success: true };
}
function fail<T>(error: string): ApiResponse<T> {
  return { data: undefined as unknown as T, success: false, error };
}

// All functions below are placeholder stubs for the Polkadot-native backend.
// They return mock data or call the backend API when it becomes available.
// Each function signature mirrors the corresponding EVM API function.

export async function checkHasDID(_address: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/identity/has-did?address=${_address}`);
    const json = await res.json();
    return json.hasDID ?? false;
  } catch {
    return false;
  }
}

export async function createDID(displayName: string, address: string): Promise<ApiResponse<Identity>> {
  try {
    const res = await fetch(`${API_BASE_URL}/identity/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, address }),
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getUserIdentity(address: string): Promise<ApiResponse<Identity>> {
  try {
    const res = await fetch(`${API_BASE_URL}/identity/${address}`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getVerificationStatus(address: string): Promise<ApiResponse<VerificationStatus>> {
  try {
    const res = await fetch(`${API_BASE_URL}/identity/${address}/verification-status`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getLinkedChainAccounts(address: string): Promise<ApiResponse<LinkedChainAccount[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/accounts/${address}/chains`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getLinkedSocialAccounts(address: string): Promise<ApiResponse<LinkedSocialAccount[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/accounts/${address}/socials`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function linkChainAccountFull(
  address: string, chain: string, label: string, chainAddress: string, tag: string
): Promise<ApiResponse<{ linked: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/accounts/${address}/chains`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain, label, chainAddress, tag }),
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function linkSocialAccountAPI(
  address: string, platform: string, handle: string
): Promise<ApiResponse<{ linked: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/accounts/${address}/socials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, handle }),
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function authorizeDApp(
  address: string, name: string, dAppAddress: string
): Promise<ApiResponse<{ authorized: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/accounts/${address}/dapps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dAppAddress }),
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getRecentActivity(address: string): Promise<ApiResponse<ActivityEntry[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/accounts/${address}/activity`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getAuthorizedDApps(address: string): Promise<ApiResponse<AuthorizedDApp[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/accounts/${address}/dapps`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function revokeDApp(address: string, dAppId: string): Promise<ApiResponse<{ revoked: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/accounts/${address}/dapps/${dAppId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getStakingMetrics(address: string): Promise<ApiResponse<StakingMetrics>> {
  try {
    const res = await fetch(`${API_BASE_URL}/governance/${address}/staking`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function stakeTokens(address: string, amount: string): Promise<ApiResponse<{ staked: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/governance/${address}/stake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getActiveProposals(): Promise<ApiResponse<Proposal[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/governance/proposals`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function voteOnProposal(
  address: string, proposalId: string, vote: "aye" | "nay"
): Promise<ApiResponse<{ voted: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/governance/proposals/${proposalId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, vote }),
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function claimStakingRewards(address: string): Promise<ApiResponse<{ claimed: boolean; amount: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/governance/${address}/claim`, {
      method: "POST",
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function createProposal(
  address: string, title: string, description: string, durationDays: number
): Promise<ApiResponse<{ created: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/governance/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, title, description, durationDays }),
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getValidators(): Promise<ApiResponse<Validator[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/governance/validators`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getVerificationProgress(address: string): Promise<ApiResponse<VerificationProgress>> {
  try {
    const res = await fetch(`${API_BASE_URL}/identity/${address}/verification-progress`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function submitVerification(
  address: string, method: string
): Promise<ApiResponse<{ submitted: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/identity/${address}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getPrivacyPreferences(address: string): Promise<ApiResponse<PrivacyPreference[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/security/${address}/privacy`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function updatePrivacyPreference(
  address: string, prefId: string, enabled: boolean
): Promise<ApiResponse<{ updated: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/security/${address}/privacy/${prefId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function initPrivacyPrefs(address: string): Promise<ApiResponse<{ initialized: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/security/${address}/privacy/init`, {
      method: "POST",
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getActiveSessions(address: string): Promise<ApiResponse<ActiveSession[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/security/${address}/sessions`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function createSession(
  address: string, device: string, browser: string, location: string
): Promise<ApiResponse<{ created: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/security/${address}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device, browser, location }),
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function revokeSession(address: string, sessionId: string): Promise<ApiResponse<{ revoked: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/security/${address}/sessions/${sessionId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function revokeAllRemoteSessions(address: string): Promise<ApiResponse<{ revoked: boolean }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/security/${address}/sessions`, {
      method: "DELETE",
    });
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getSecurityLog(address: string): Promise<ApiResponse<SecurityLogEntry[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/security/${address}/log`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function searchUser(query: string): Promise<ApiResponse<Identity[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/identity/search?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getPlatformStats(): Promise<ApiResponse<PlatformStats>> {
  try {
    const res = await fetch(`${API_BASE_URL}/identity/stats`);
    const json = await res.json();
    return ok(json.data);
  } catch (e: any) {
    return fail(e.message);
  }
}
