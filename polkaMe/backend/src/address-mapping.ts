/* ────────────────────────────────────────────────────────────────────
   PolkaMe — Address Mapping (SS58 ↔ EVM Shadow Address)

   Polkadot SS58 addresses cannot be used directly as Solidity mapping
   keys (EVM uses 20-byte H160 addresses). This module:

   1. Derives a *deterministic* EVM "shadow" address from any SS58
      public key:  keccak256(pubkey)[12:]
   2. Persists the mapping to disk so it survives restarts.
   3. Provides `resolveToEvmAddress()` used by all backend routes to
      transparently handle both address formats.
──────────────────────────────────────────────────────────────────── */

import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { decodeAddress } from "@polkadot/util-crypto";

interface AddressMapFile {
  mappings: Record<string, string>;
}

const DATA_DIR = path.resolve(__dirname, "..", ".data");
const MAP_FILE = path.join(DATA_DIR, "address-mapping.json");

let loaded = false;
const mappings = new Map<string, string>();

function ensureLoaded(): void {
  if (loaded) return;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(MAP_FILE)) {
    try {
      const raw = fs.readFileSync(MAP_FILE, "utf8");
      const json = JSON.parse(raw) as AddressMapFile;
      for (const [polkadot, evm] of Object.entries(json.mappings || {})) {
        if (ethers.isAddress(evm)) {
          mappings.set(polkadot, ethers.getAddress(evm));
        }
      }
    } catch {
      // Ignore malformed file and continue with an empty mapping store
    }
  }

  loaded = true;
}

function persist(): void {
  ensureLoaded();
  const json: AddressMapFile = { mappings: Object.fromEntries(mappings.entries()) };
  fs.writeFileSync(MAP_FILE, JSON.stringify(json, null, 2), "utf8");
}

// ─── Public helpers ─────────────────────────────────────────────────

export function isEvmAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export function normalizeEvmAddress(address: string): string {
  return ethers.getAddress(address);
}

/**
 * Derive a deterministic EVM "shadow" address from an SS58 public key.
 *
 * How it works:
 *   1. decodeAddress("5Grw...") → 32-byte Uint8Array (the raw public key)
 *   2. keccak256(pubkey) → 32-byte hash
 *   3. Take last 20 bytes → valid EVM address
 *
 * The same SS58 always produces the same EVM address.
 * This address is NOT a real wallet — it's just a deterministic key
 * for the Solidity mapping so the contract can store Polkadot DIDs.
 */
export function deriveEvmAddress(ss58Address: string): string {
  const publicKey = decodeAddress(ss58Address); // Uint8Array (32 bytes)
  const hash = ethers.keccak256(publicKey);
  return ethers.getAddress("0x" + hash.slice(-40)); // last 20 bytes → checksummed
}

export function getMappedEvmAddress(polkadotAddress: string): string | null {
  ensureLoaded();
  return mappings.get(polkadotAddress) || null;
}

export function setAddressMapping(polkadotAddress: string, evmAddress: string): string {
  ensureLoaded();
  const normalized = normalizeEvmAddress(evmAddress);
  mappings.set(polkadotAddress, normalized);
  persist();
  return normalized;
}

/**
 * Resolve any address (SS58 or EVM) to an EVM address.
 *
 * - EVM address → returned as-is (checksummed)
 * - SS58 address → look up existing mapping, or derive + save a new shadow
 */
export function resolveToEvmAddress(address: string): string | null {
  if (isEvmAddress(address)) return normalizeEvmAddress(address);

  // Check for an existing mapping first
  const existing = getMappedEvmAddress(address);
  if (existing) return existing;

  // No mapping yet — try to derive one
  try {
    const shadow = deriveEvmAddress(address);
    setAddressMapping(address, shadow);
    return shadow;
  } catch {
    return null; // Not a valid SS58 address either
  }
}
