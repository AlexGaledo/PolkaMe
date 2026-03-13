/**
 * useApi — unified API router hook
 *
 * Returns the same set of functions regardless of which wallet mode is active.
 * When walletMode === "polkadot" every call goes to the REST backend (backend.ts).
 * When walletMode === "evm"      every call goes to the on-chain contracts (index.ts).
 *
 * Pages import { useApi } from "./api/useApi" and call api.createDID(...) etc.
 * They no longer need to know which transport is in use.
 */

import { useWallet } from "../contexts/WalletContext";
import * as evm from "./index";
import * as bk  from "./backend";

export function useApi() {
  const { walletMode, activeAddress } = useWallet();
  const a = activeAddress || ""; // pre-bound address for Polkadot backend calls

  // ── Polkadot mode → REST backend ──────────────────────────────────────────
  if (walletMode === "polkadot") {
    return {
      // ── Identity ────────────────────────────────────────────────────────
      checkHasDID:           (address: string)                          => bk.checkHasDID(address),
      createDID:             (displayName: string)                      => bk.createDID(displayName, a),
      linkWallets:           (evmAddress: string)                       => bk.linkWallets(a, evmAddress),
      getUserIdentity:       (address: string)                          => bk.getUserIdentity(address),
      getVerificationStatus: (address: string)                          => bk.getVerificationStatus(address),
      getVerificationProgress:(address: string)                         => bk.getVerificationProgress(address),
      submitVerification:    (method: string)                           => bk.submitVerification(a, method),
      searchUser:            (query: string)                            => bk.searchUser(query),

      // ── Accounts ────────────────────────────────────────────────────────
      getLinkedChainAccounts:  (address: string)                        => bk.getLinkedChainAccounts(address),
      getLinkedSocialAccounts: (address: string)                        => bk.getLinkedSocialAccounts(address),
      getRecentActivity:       (address: string)                        => bk.getRecentActivity(address),
      getAuthorizedDApps:      (address: string)                        => bk.getAuthorizedDApps(address),
      linkChainAccountFull:    (chain: string, label: string, chainAddress: string, tag: string) =>
                                  bk.linkChainAccountFull(a, chain, label, chainAddress, tag),
      linkSocialAccountAPI:    (platform: string, handle: string)       => bk.linkSocialAccountAPI(a, platform, handle),
      revokeDApp:              (dAppId: string)                         => bk.revokeDApp(a, dAppId),
      authorizeDApp:           (name: string, dAppAddress: string)      => bk.authorizeDApp(a, name, dAppAddress),

      // ── Governance ──────────────────────────────────────────────────────
      getStakingMetrics:    (address: string)                           => bk.getStakingMetrics(address),
      getActiveProposals:   ()                                          => bk.getActiveProposals(),
      getValidators:        ()                                          => bk.getValidators(),
      stakeTokens:          (amount: string)                            => bk.stakeTokens(a, amount),
      createProposal:       (title: string, description: string, durationDays: number) =>
                                bk.createProposal(a, title, description, durationDays),
      voteOnProposal:       (id: string, vote: "aye" | "nay")          => bk.voteOnProposal(a, id, vote),
      claimStakingRewards:  ()                                          => bk.claimStakingRewards(a),

      // ── Security ────────────────────────────────────────────────────────
      // Hardware wallet: not applicable in Polkadot mode — return stubs
      getHardwareWallets:    () => Promise.resolve({ data: [] as any[], success: true as const }),
      connectHardwareWallet: () => Promise.resolve({ data: undefined as any, success: false as const, error: "Not supported in Polkadot mode" }),

      getPrivacyPreferences:    (address: string)                       => bk.getPrivacyPreferences(address),
      getActiveSessions:        (address: string)                       => bk.getActiveSessions(address),
      getSecurityLog:           (address: string)                       => bk.getSecurityLog(address),
      updatePrivacyPreference:  (id: string, enabled: boolean)         => bk.updatePrivacyPreference(a, id, enabled),
      revokeSession:            (id: string)                            => bk.revokeSession(a, id),
      revokeAllRemoteSessions:  ()                                      => bk.revokeAllRemoteSessions(a),
      initPrivacyPrefs:         ()                                      => bk.initPrivacyPrefs(a),
      createSession:            (device: string, browser: string, location: string) =>
                                    bk.createSession(a, device, browser, location),
    };
  }

  // ── EVM mode → on-chain contracts ────────────────────────────────────────
  return {
    // ── Identity ──────────────────────────────────────────────────────────
    checkHasDID:             evm.checkHasDID,
    createDID:               evm.createDID,
    linkWallets:             (_evmAddress: string) => Promise.resolve({ data: undefined as any, success: false as const, error: "Not required in EVM mode" }),
    getUserIdentity:         evm.getUserIdentity,
    getVerificationStatus:   evm.getVerificationStatus,
    getVerificationProgress: evm.getVerificationProgress,
    submitVerification:      evm.submitVerification,
    searchUser:              evm.searchUser,

    // ── Accounts ──────────────────────────────────────────────────────────
    getLinkedChainAccounts:  evm.getLinkedChainAccounts,
    getLinkedSocialAccounts: evm.getLinkedSocialAccounts,
    getRecentActivity:       evm.getRecentActivity,
    getAuthorizedDApps:      evm.getAuthorizedDApps,
    linkChainAccountFull:    evm.linkChainAccountFull,
    linkSocialAccountAPI:    evm.linkSocialAccountAPI,
    revokeDApp:              evm.revokeDApp,
    authorizeDApp:           evm.authorizeDApp,

    // ── Governance ────────────────────────────────────────────────────────
    getStakingMetrics:       evm.getStakingMetrics,
    getActiveProposals:      evm.getActiveProposals,
    getValidators:           evm.getValidators,
    stakeTokens:             evm.stakeTokens,
    createProposal:          evm.createProposal,
    voteOnProposal:          evm.voteOnProposal,
    claimStakingRewards:     evm.claimStakingRewards,

    // ── Security ──────────────────────────────────────────────────────────
    getHardwareWallets:      evm.getHardwareWallets,
    connectHardwareWallet:   evm.connectHardwareWallet,
    getPrivacyPreferences:   evm.getPrivacyPreferences,
    getActiveSessions:       evm.getActiveSessions,
    getSecurityLog:          evm.getSecurityLog,
    updatePrivacyPreference: evm.updatePrivacyPreference,
    revokeSession:           evm.revokeSession,
    revokeAllRemoteSessions: evm.revokeAllRemoteSessions,
    initPrivacyPrefs:        evm.initPrivacyPrefs,
    createSession:           evm.createSession,
  };
}
