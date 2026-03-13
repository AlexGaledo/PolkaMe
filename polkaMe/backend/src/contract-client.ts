/* ────────────────────────────────────────────────────────────────────
   PolkaMe Backend — On-Chain Contract Client

   Connects to 4 deployed Solidity contracts via ethers.js:
     1. PolkaMeIdentity   — DID creation, verification, credentials, DID linking
     2. PolkaMeAccounts   — Chain accounts, social accounts, dApps, activity log
     3. PolkaMeGovernance — Staking, proposals, voting, validators
     4. PolkaMeSecurity   — Privacy prefs, sessions, security log

   API shape:
     getProvider()              → ethers.Provider
     getContracts()             → { identity, accounts, governance, security }
     getSignerForAddress(addr)  → ethers.Signer (server-side signer for txs)
     initialize()               → Promise<void> (confirms connection)
──────────────────────────────────────────────────────────────────── */

import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// ─── Contract ABIs ──────────────────────────────────────────────────
// Minimal ABIs containing only the functions the backend calls.
// Full ABIs can be imported from compiled artifacts if needed.

export const IDENTITY_ABI = [
  // DID Management
  "function createDID(string _displayName) external",
  "function createDIDFor(address _user, string _displayName) external",
  "function updateDisplayName(string _newName) external",
  "function getDID(address _user) external view returns (tuple(string didString, string displayName, uint8 reputationScore, int8 scoreChange, uint256 createdAt, uint256 updatedAt, bool active))",
  "function hasDID(address _user) external view returns (bool)",
  "function getVerificationStatus(address _user) external view returns (tuple(uint8 email, uint8 governance, uint8 socials, uint8 kyc))",
  "function getVerificationProgress(address _user) external view returns (uint8 currentStep, uint8 totalSteps, uint8 percentComplete)",
  // DID Linking
  "function linkPolkadotDID(string _polkadotDid) external",
  "function verifyDIDLink(address _user, uint256 _linkIndex) external",
  "function removeDIDLink(uint256 _index) external",
  "function getDIDLinks(address _user) external view returns (tuple(string evmDid, string polkadotDid, uint256 linkedAt, bool verified, bool active)[])",
  // Credentials & Reputation
  "function issueCredential(address _user, uint8 _credType, string _title, string _issuer, uint256 _expiresAt, string _metadataURI) external",
  "function revokeCredential(address _user, uint256 _index) external",
  "function requestCredentialAccess(address _user, uint256 _credIndex) external",
  "function getCredentials(address _user) external view returns (tuple(uint8 credType, string title, string issuer, uint256 issuedAt, uint256 expiresAt, bool revoked, string metadataURI)[])",
  "function isCredentialValid(address _user, uint256 _index) external view returns (bool)",
  // Verification Hub
  "function submitVerification(uint8 _field) external",
  "function setVerificationState(address _user, uint8 _field, uint8 _newState) external",
  // Platform Stats
  "function getPlatformStats() external view returns (uint256 users, uint256 creds, uint256 links)",
  // Score Delegation
  "function addScoreFor(address _user, uint8 _points) external",
  "function subScoreFor(address _user, uint8 _points) external",
  // Admin
  "function setVerifier(address _v, bool _trusted) external",
  "function setAuthorizedContract(address _contract, bool _auth) external",
  // Events
  "event DIDCreated(address indexed user, uint256 timestamp)",
  "event DIDUpdated(address indexed user, uint8 newScore)",
  "event DIDLinked(address indexed user, string polkadotDid, uint256 timestamp)",
  "event DIDLinkVerified(address indexed user, uint256 linkIndex)",
  "event DIDLinkRemoved(address indexed user, uint256 linkIndex)",
  "event CredentialIssued(address indexed user, uint256 indexed credIndex, uint8 credType)",
  "event CredentialShared(address indexed user, address indexed requester, uint256 indexed credIndex)",
  "event VerificationSubmitted(address indexed user, uint8 field)",
  "event VerificationRequested(address indexed dApp, address indexed user)",
];

export const ACCOUNTS_ABI = [
  // Chain Accounts
  "function linkChainAccount(uint8 _chain, string _label, string _address, string _tag) external",
  "function removeChainAccount(uint256 _index) external",
  "function getLinkedChainAccounts(address _user) external view returns (tuple(uint8 chain, string label, string accountAddress, string tag, uint256 linkedAt, bool active)[])",
  // Social Accounts
  "function linkSocialAccount(uint8 _platform, string _handle) external",
  "function verifySocialAccount(address _user, uint256 _index) external",
  "function removeSocialAccount(uint256 _index) external",
  "function getLinkedSocialAccounts(address _user) external view returns (tuple(uint8 platform, string handle, bool verified, uint256 linkedAt, bool active)[])",
  // Authorized dApps
  "function authorizeDApp(string _name, address _dAppAddress) external",
  "function revokeDApp(uint256 _index) external",
  "function getAuthorizedDApps(address _user) external view returns (tuple(string name, address dAppAddress, uint256 authorizedAt, uint256 lastAccessed, bool active)[])",
  // Activity Log
  "function logActivity(string _action, string _app, uint8 _status) external",
  "function getRecentActivity(address _user) external view returns (tuple(string action, string app, uint8 status, uint256 timestamp)[])",
  // Events
  "event ChainAccountLinked(address indexed user, uint8 chain, uint256 index)",
  "event SocialAccountLinked(address indexed user, uint8 platform, string handle)",
  "event DAppAuthorized(address indexed user, address indexed dApp, string name)",
  "event DAppRevoked(address indexed user, uint256 index)",
  "event ActivityLogged(address indexed user, string action)",
];

export const GOVERNANCE_ABI = [
  // Staking
  "function stake() external payable",
  "function unstake(uint256 _amount) external",
  "function setConviction(uint8 _multiplier) external",
  "function claimRewards() external",
  "function getStakingMetrics(address _user) external view returns (tuple(uint256 totalStaked, uint256 claimableRewards, uint256 votingPower, uint256 lockExpiry, uint8 convictionMultiplier, uint256 lastClaimedAt))",
  // Proposals
  "function createProposal(string _title, string _desc, uint256 _duration) external",
  "function voteOnProposal(uint256 _id, uint8 _vote) external",
  "function closeProposal(uint256 _id) external",
  "function getActiveProposals() external view returns (tuple(uint256 refNum, string tag, string title, string description, uint256 ayeVotes, uint256 nayVotes, uint256 endTime, bool active, address proposer)[])",
  "function getProposal(uint256 _id) external view returns (tuple(uint256 refNum, string tag, string title, string description, uint256 ayeVotes, uint256 nayVotes, uint256 endTime, bool active, address proposer))",
  "function getProposalCount() external view returns (uint256)",
  // Validators
  "function getValidators() external view returns (tuple(string shortName, string initials, address validatorAddress, uint16 commissionBps, uint256 selfStake, uint8 status)[])",
  "function addValidator(string _name, string _initials, address _addr, uint16 _commission, uint256 _selfStake) external",
  // Cross-chain
  "function shareCredentialToPolkadot(uint256 _credIndex, uint256 _linkIndex) external",
  // Events
  "event ProposalCreated(uint256 indexed proposalId, uint256 refNum, string title, address proposer)",
  "event Voted(address indexed voter, uint256 indexed proposalId, uint8 vote, uint256 weight)",
  "event Staked(address indexed user, uint256 amount)",
  "event RewardsClaimed(address indexed user, uint256 amount)",
  "event CredentialShareRequested(address indexed user, string polkadotDid, uint256 credIndex)",
];

export const SECURITY_ABI = [
  // Privacy
  "function initializePrivacyPrefs() external",
  "function updatePrivacyPreference(uint256 _index, bool _enabled) external",
  "function getPrivacyPreferences(address _user) external view returns (tuple(string label, string description, bool enabled)[])",
  // Sessions
  "function createSession(string _device, string _browser, string _location, bool _isCurrent) external",
  "function revokeSession(uint256 _index) external",
  "function revokeAllRemoteSessions() external",
  "function getActiveSessions(address _user) external view returns (tuple(string device, string browser, string location, bool isCurrent, uint256 lastActive, bool active)[])",
  // Security Log
  "function logSecurityEvent(string _event, string _source) external",
  "function getSecurityLog(address _user) external view returns (tuple(string eventDescription, string source, uint256 timestamp)[])",
  // Events
  "event PrivacyUpdated(address indexed user, uint256 prefIndex, bool enabled)",
  "event SessionCreated(address indexed user, uint256 sessionIndex)",
  "event SessionRevoked(address indexed user, uint256 sessionIndex)",
  "event SecurityEvent(address indexed user, string eventDescription, string source)",
];

// ─── Configuration ──────────────────────────────────────────────────

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const IDENTITY_ADDR = process.env.IDENTITY_CONTRACT_ADDRESS ?? "";
const ACCOUNTS_ADDR = process.env.ACCOUNTS_CONTRACT_ADDRESS ?? "";
const GOVERNANCE_ADDR = process.env.GOVERNANCE_CONTRACT_ADDRESS ?? "";
const SECURITY_ADDR = process.env.SECURITY_CONTRACT_ADDRESS ?? "";
const BACKEND_WALLET_KEY = process.env.BACKEND_WALLET_KEY ?? "";

// ─── Singleton instances ────────────────────────────────────────────

let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;
let _ready = false;

export interface ContractInstances {
  identity: ethers.Contract;
  accounts: ethers.Contract;
  governance: ethers.Contract;
  security: ethers.Contract;
}

let _contracts: ContractInstances | null = null;

/** Returns the JSON-RPC provider singleton */
export function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return _provider;
}

/**
 * Returns the server-side wallet signer.
 * Used for administrative txs (e.g., verifier operations).
 * User-facing txs should be signed by the user's wallet on the frontend.
 */
export function getBackendSigner(): ethers.Wallet {
  if (!_signer) {
    if (!BACKEND_WALLET_KEY) {
      throw new Error("BACKEND_WALLET_KEY not set — cannot sign transactions");
    }
    _signer = new ethers.Wallet(BACKEND_WALLET_KEY, getProvider());
  }
  return _signer;
}

/** Returns contract instances connected to the provider (read-only) */
export function getContracts(): ContractInstances {
  if (!_contracts) {
    const provider = getProvider();
    _contracts = {
      identity: new ethers.Contract(IDENTITY_ADDR, IDENTITY_ABI, provider),
      accounts: new ethers.Contract(ACCOUNTS_ADDR, ACCOUNTS_ABI, provider),
      governance: new ethers.Contract(GOVERNANCE_ADDR, GOVERNANCE_ABI, provider),
      security: new ethers.Contract(SECURITY_ADDR, SECURITY_ABI, provider),
    };
  }
  return _contracts;
}

/** Returns contract instances connected to the backend signer (read-write) */
export function getSignedContracts(): ContractInstances {
  const signer = getBackendSigner();
  const contracts = getContracts();
  return {
    identity: contracts.identity.connect(signer) as ethers.Contract,
    accounts: contracts.accounts.connect(signer) as ethers.Contract,
    governance: contracts.governance.connect(signer) as ethers.Contract,
    security: contracts.security.connect(signer) as ethers.Contract,
  };
}

/** Run once at server startup: verify chain connection + contract deployment */
export async function initialize(): Promise<void> {
  if (_ready) return;

  const provider = getProvider();

  // Verify chain connectivity
  const network = await provider.getNetwork();
  console.log(`[PolkaMe] Connected to chain: ${network.name} (chainId: ${network.chainId})`);

  // Verify required contract addresses are set
  const missing: string[] = [];
  if (!IDENTITY_ADDR) missing.push("IDENTITY_CONTRACT_ADDRESS");
  if (!ACCOUNTS_ADDR) missing.push("ACCOUNTS_CONTRACT_ADDRESS");
  if (!GOVERNANCE_ADDR) missing.push("GOVERNANCE_CONTRACT_ADDRESS");
  if (!SECURITY_ADDR) missing.push("SECURITY_CONTRACT_ADDRESS");

  if (missing.length > 0) {
    throw new Error(`Missing contract addresses in .env: ${missing.join(", ")}`);
  }

  // Verify contracts are deployed (check bytecodes exist)
  const contracts = [
    { name: "PolkaMeIdentity", addr: IDENTITY_ADDR },
    { name: "PolkaMeAccounts", addr: ACCOUNTS_ADDR },
    { name: "PolkaMeGovernance", addr: GOVERNANCE_ADDR },
    { name: "PolkaMeSecurity", addr: SECURITY_ADDR },
  ];

  for (const c of contracts) {
    const code = await provider.getCode(c.addr);
    if (code === "0x") {
      throw new Error(`No contract deployed at ${c.name} address: ${c.addr}`);
    }
    console.log(`[PolkaMe] ✅ ${c.name} verified at ${c.addr}`);
  }

  // Initialize contract instances
  getContracts();

  _ready = true;
}

// ─── Enum helpers ───────────────────────────────────────────────────
// Map Solidity enum values to human-readable strings for API responses

export const VerificationStateMap: Record<number, "unverified" | "pending" | "verified"> = {
  0: "unverified",
  1: "pending",
  2: "verified",
};

export const ChainTypeMap: Record<number, string> = {
  0: "polkadot",
  1: "kusama",
  2: "astar",
  3: "moonbeam",
  4: "custom",
};

export const ChainTypeReverseMap: Record<string, number> = {
  polkadot: 0,
  kusama: 1,
  astar: 2,
  moonbeam: 3,
  custom: 4,
};

export const SocialTypeMap: Record<number, string> = {
  0: "twitter",
  1: "discord",
  2: "github",
};

export const SocialTypeReverseMap: Record<string, number> = {
  twitter: 0,
  discord: 1,
  github: 2,
};

export const ActivityStatusMap: Record<number, string> = {
  0: "success",
  1: "pending",
  2: "failed",
};

export const CredentialTypeMap: Record<number, string> = {
  1: "DAOBadge",
  2: "Reputation",
  3: "SocialProof",
  4: "ChainProof",
};

export const ValidatorStatusMap: Record<number, string> = {
  0: "active",
  1: "waiting",
  2: "inactive",
};

// ─── In-memory auth nonce store ─────────────────────────────────────
// Replaces the auth_nonces table for Polkadot challenge-response auth

export interface NonceEntry {
  nonce: string;
  createdAt: string;
}

export const nonceStore = new Map<string, NonceEntry>();

/**
 * Remove expired nonces periodically (every 5 minutes).
 * Nonces expire after 10 minutes.
 */
const NONCE_TTL_MS = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [address, entry] of nonceStore) {
    if (now - new Date(entry.createdAt).getTime() > NONCE_TTL_MS) {
      nonceStore.delete(address);
    }
  }
}, 5 * 60 * 1000);
