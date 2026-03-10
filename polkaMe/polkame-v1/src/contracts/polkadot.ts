import type { ApiPromise } from "@polkadot/api";

let _api: ApiPromise | null = null;

export function setPolkadotApi(api: ApiPromise) {
  _api = api;
}

export function getPolkadotApi(): ApiPromise {
  if (!_api) {
    throw new Error("Polkadot API not initialized. Connect your Polkadot wallet first.");
  }
  return _api;
}

// Placeholder contract call stubs.
// These mirror the EVM contract API surface and will be implemented
// when the Polkadot-native backend and ink! contracts are ready.

export async function getUserAddress(): Promise<string> {
  throw new Error("Polkadot wallet: use WalletContext.polkadotAddress instead.");
}

export async function getIdentityContract() {
  const api = getPolkadotApi();
  // TODO: Replace with ink! contract instance via @polkadot/api-contract
  return { api, placeholder: true };
}

export async function getAccountsContract() {
  const api = getPolkadotApi();
  return { api, placeholder: true };
}

export async function getGovernanceContract() {
  const api = getPolkadotApi();
  return { api, placeholder: true };
}

export async function getSecurityContract() {
  const api = getPolkadotApi();
  return { api, placeholder: true };
}
