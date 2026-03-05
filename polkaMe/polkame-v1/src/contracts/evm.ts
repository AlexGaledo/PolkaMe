import { ethers } from "ethers";
import PolkaMeIdentityABI from "./PolkaMeIdentityABI.json";
import PolkaMeAccountsABI from "./PolkaMeAccountsABI.json";
import PolkaMeGovernanceABI from "./PolkaMeGovernanceABI.json";
import PolkaMeSecurityABI from "./PolkaMeSecurityABI.json";
import { ADDRESSES, HARDHAT_RPC } from "./shared";

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
      _signer = await provider.getSigner();
    } else {
      _signer = await (provider as ethers.JsonRpcProvider).getSigner(0);
    }
  }
  return _signer;
}

export function resetSigner() {
  _signer = null;
  _provider = null;
}

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

export async function connectWallet(): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No wallet detected. Please install MetaMask.");
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  await ensureHardhatNetwork();
  resetSigner();
  return accounts[0] ?? "";
}

export async function getUserAddress(): Promise<string> {
  if (_signer) return _signer.getAddress();
  const addr = await getConnectedAddress();
  if (addr) return addr;
  const signer = await getSigner();
  return signer.getAddress();
}

export function hasInjectedWallet(): boolean {
  return typeof window !== "undefined" && !!(window as any).ethereum;
}

export async function ensureHardhatNetwork(): Promise<void> {
  const eth = (window as any).ethereum;
  if (!eth) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x7A69" }],
    });
  } catch (switchErr: any) {
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
