/* ------------------------------------------------------------------ */
/*  PolkaMe — Contract configuration                                  */
/*  Uses browser wallet (MetaMask) when available, falls back to RPC  */
/* ------------------------------------------------------------------ */

import { ethers } from "ethers";
import PolkaMeIdentityABI from "./PolkaMeIdentityABI.json";
import PolkaMeAccountsABI from "./PolkaMeAccountsABI.json";
import PolkaMeGovernanceABI from "./PolkaMeGovernanceABI.json";
import PolkaMeSecurityABI from "./PolkaMeSecurityABI.json";

// ─── Deployed addresses (local Hardhat node) ─────────────────────────
export const ADDRESSES = {
  identity:   "0x0165878A594ca255338adfa4d48449f69242Eb8F",
  accounts:   "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  governance: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
  security:   "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
} as const;

const HARDHAT_RPC = "http://127.0.0.1:8545";

// ─── Provider + Signer (browser wallet first, fallback to RPC) ───────
let _provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null = null;
let _signer: ethers.Signer | null = null;

export function getProvider(): ethers.BrowserProvider | ethers.JsonRpcProvider {
  if (!_provider) {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      _provider = new ethers.BrowserProvider((window as any).ethereum);
    } else {
      _provider = new ethers.JsonRpcProvider(HARDHAT_RPC);
    }
  }
  return _provider;
}

export async function getSigner(): Promise<ethers.Signer> {
  if (!_signer) {
    const provider = getProvider();
    if (provider instanceof ethers.BrowserProvider) {
      // Prompts MetaMask to connect if not already
      _signer = await provider.getSigner();
    } else {
      _signer = await (provider as ethers.JsonRpcProvider).getSigner(0);
    }
  }
  return _signer;
}

/** Reset cached signer — call when wallet account changes */
export function resetSigner() {
  _signer = null;
  _provider = null;
}

/**
 * Get currently connected address WITHOUT any popup.
 * Returns "" if the wallet is not connected or locked.
 * Uses eth_accounts (read-only) instead of eth_requestAccounts.
 */
export async function getConnectedAddress(): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) return "";
  try {
    const accounts: string[] = await eth.request({ method: "eth_accounts" });
    return accounts[0] ?? "";
  } catch {
    return "";
  }
}

/**
 * Explicitly connect the wallet — shows MetaMask popup, then switches
 * to the Hardhat network. Call this only on a user gesture (button click).
 */
export async function connectWallet(): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No wallet detected. Please install MetaMask.");
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  await ensureHardhatNetwork();
  resetSigner(); // clear cache so getSigner() picks up the newly connected account
  return accounts[0] ?? "";
}

/**
 * Get the connected address. If cached signer exists use it; otherwise
 * use eth_accounts (no popup). Throws if not connected.
 */
export async function getUserAddress(): Promise<string> {
  if (_signer) return _signer.getAddress();
  const addr = await getConnectedAddress();
  if (addr) return addr;
  // Fall back to getSigner only if we reach here (user connected but cache cleared)
  const signer = await getSigner();
  return signer.getAddress();
}

/** Check if MetaMask (or any injected wallet) is available */
export function hasInjectedWallet(): boolean {
  return typeof window !== "undefined" && !!(window as any).ethereum;
}

/** Request MetaMask to switch to the local Hardhat network */
export async function ensureHardhatNetwork(): Promise<void> {
  const eth = (window as any).ethereum;
  if (!eth) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x7A69" }], // 31337 in hex
    });
  } catch (switchErr: any) {
    // Chain not added — add it
    if (switchErr.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x7A69",
          chainName: "Hardhat Local",
          rpcUrls: [HARDHAT_RPC],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        }],
      });
    }
  }
}

// ─── Contract instances ───────────────────────────────────────────────
export async function getIdentityContract() {
  const signer = await getSigner();
  return new ethers.Contract(ADDRESSES.identity, PolkaMeIdentityABI, signer);
}

export async function getAccountsContract() {
  const signer = await getSigner();
  return new ethers.Contract(ADDRESSES.accounts, PolkaMeAccountsABI, signer);
}

export async function getGovernanceContract() {
  const signer = await getSigner();
  return new ethers.Contract(ADDRESSES.governance, PolkaMeGovernanceABI, signer);
}

export async function getSecurityContract() {
  const signer = await getSigner();
  return new ethers.Contract(ADDRESSES.security, PolkaMeSecurityABI, signer);
}

// ─── Read-only provider (for querying any user without a signer) ─────
export function getReadProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(HARDHAT_RPC);
}

export function getIdentityReadOnly() {
  return new ethers.Contract(ADDRESSES.identity, PolkaMeIdentityABI, getReadProvider());
}

export function getAccountsReadOnly() {
  return new ethers.Contract(ADDRESSES.accounts, PolkaMeAccountsABI, getReadProvider());
}

export function getGovernanceReadOnly() {
  return new ethers.Contract(ADDRESSES.governance, PolkaMeGovernanceABI, getReadProvider());
}

export function getSecurityReadOnly() {
  return new ethers.Contract(ADDRESSES.security, PolkaMeSecurityABI, getReadProvider());
}

// ─── Enum maps (contract uint8 <-> frontend strings) ─────────────────
export const VERIFICATION_STATE = ["unverified", "pending", "verified"] as const;
export const CHAIN_TYPE = ["polkadot", "kusama", "astar", "moonbeam", "custom"] as const;
export const SOCIAL_TYPE = ["twitter", "discord", "github"] as const;
export const ACTIVITY_STATUS = ["success", "pending", "failed"] as const;
export const VALIDATOR_STATUS = ["active", "waiting", "inactive"] as const;
