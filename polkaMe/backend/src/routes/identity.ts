/* ────────────────────────────────────────────────────────────────────
   PolkaMe — Identity Routes  (ON-CHAIN via PolkaMeIdentity contract)

   All reads  → ethers.js view calls (no gas, instant)
   All writes → ethers.js signed transactions (on-chain, costs gas)

   Endpoints:
     GET  /has-did?address=          → identityContract.hasDID()
     POST /create                    → identityContract.createDID()
     GET  /stats                     → identityContract.getPlatformStats()
     GET  /search?q=                 → (limited — on-chain has no full-text search)
     GET  /:address                  → identityContract.getDID()
     GET  /:address/verification-status   → identityContract.getVerificationStatus()
     GET  /:address/verification-progress → identityContract.getVerificationProgress()
     POST /:address/verify           → identityContract.submitVerification()
     GET  /:address/linked-dids      → identityContract.getDIDLinks()
     POST /:address/linked-dids      → identityContract.linkPolkadotDID()
     DELETE /:address/linked-dids/:id → identityContract.removeDIDLink()
     POST /:address/dao-badge        → identityContract.issueCredential(DAOBadge)
     POST /:address/credential-request → identityContract.requestCredentialAccess()
──────────────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express";
import { getContracts, getSignedContracts, VerificationStateMap } from "../contract-client.js";
import { success, fail } from "../types.js";
import {
  getMappedEvmAddress,
  isEvmAddress,
  resolveToEvmAddress,
  setAddressMapping,
} from "../address-mapping.js";

const router = Router();

// ─── Helper: map method name to Solidity field index ────────────────
const VERIFICATION_FIELD: Record<string, number> = {
  wallet: 0,   // email field (index 0)
  social: 2,   // socials field (index 2)
  dao_badge: 1, // governance field (index 1)
};

// ─── Helper: map credential type string to Solidity enum ────────────
const CREDENTIAL_TYPE: Record<string, number> = {
  dao_badge: 1,
  reputation: 2,
  socials: 3,
  chain_proof: 4,
};

function requireResolvedEvm(address: string, res: Response): string | null {
  const evmAddress = resolveToEvmAddress(address);
  if (!evmAddress) {
    res.status(404).json(fail("No linked EVM identity found for this address"));
    return null;
  }
  return evmAddress;
}

router.post("/link-wallets", async (req: Request, res: Response) => {
  try {
    const { polkadotAddress, evmAddress } = req.body || {};
    if (!polkadotAddress || !evmAddress) {
      return res.status(400).json(fail("polkadotAddress and evmAddress are required"));
    }
    if (isEvmAddress(polkadotAddress)) {
      return res.status(400).json(fail("polkadotAddress must be an SS58 address"));
    }
    if (!isEvmAddress(evmAddress)) {
      return res.status(400).json(fail("evmAddress must be a valid EVM 0x address"));
    }

    const { identity } = getContracts();
    const has = await identity.hasDID(evmAddress);
    if (!has) {
      return res.status(404).json(fail("Target EVM address does not have a DID yet"));
    }

    const mapped = setAddressMapping(polkadotAddress, evmAddress);
    return res.json(success({ linked: true, polkadotAddress, evmAddress: mapped }));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

router.get("/resolve-address", async (req: Request, res: Response) => {
  try {
    const address = req.query.address as string;
    if (!address) return res.status(400).json(fail("address query parameter required"));
    const evmAddress = resolveToEvmAddress(address);
    return res.json(success({
      inputAddress: address,
      evmAddress,
      mapped: !!evmAddress,
    }));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /has-did?address=
   Checks if an on-chain DID exists for the given address.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/has-did", async (req: Request, res: Response) => {
  try {
    const address = req.query.address as string;
    if (!address) return res.status(400).json(fail("address query parameter required"));

    if (!isEvmAddress(address)) {
      const mapped = getMappedEvmAddress(address);
      if (!mapped) return res.json({ hasDID: false, success: true });

      const { identity } = getContracts();
      const mappedExists: boolean = await identity.hasDID(mapped);
      return res.json({ hasDID: mappedExists, success: true, evmAddress: mapped });
    }

    const { identity } = getContracts();
    const exists: boolean = await identity.hasDID(address);
    return res.json({ hasDID: exists, success: true });
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /create
   Creates an on-chain DID. Accepts BOTH EVM (0x...) and SS58 (5...) addresses.
   Body: { displayName: string, address: string }

   For EVM addresses:     creates DID keyed by that address directly.
   For Polkadot SS58:     derives a deterministic shadow EVM address from
                          the SS58 public key, creates the DID there, and
                          auto-saves the SS58 → shadow mapping.
   ═══════════════════════════════════════════════════════════════════ */
router.post("/create", async (req: Request, res: Response) => {
  try {
    const { displayName, address } = req.body;
    if (!displayName || !address) {
      return res.status(400).json(fail("displayName and address are required"));
    }

    // Determine if this is an EVM or Polkadot address
    const isEvm = isEvmAddress(address);
    const evmAddress = resolveToEvmAddress(address);
    if (!evmAddress) {
      return res.status(400).json(fail("Invalid address — must be a valid EVM (0x...) or Polkadot SS58 address"));
    }

    // Check if DID already exists for this EVM key
    const { identity } = getContracts();
    const exists = await identity.hasDID(evmAddress);
    if (exists) {
      return res.status(409).json(fail("DID already exists for this address"));
    }

    // Use createDIDFor so the contract creates the DID at the target address,
    // not at the backend signer's address
    const { identity: signedIdentity } = getSignedContracts();
    const tx = await signedIdentity.createDIDFor(evmAddress, displayName);
    const receipt = await tx.wait();

    // Read back the created DID
    const did = await identity.getDID(evmAddress);
    const didPrefix = isEvm ? "did:ethr" : "did:polkadot";

    return res.json(success({
      id: address,
      displayName: did.displayName,
      walletAddress: address,
      polkadotAddress: isEvm ? undefined : address,
      evmAddress: evmAddress,
      did: `${didPrefix}:${address}`,
      score: Number(did.reputationScore),
      scoreChange: Number(did.scoreChange),
      createdAt: new Date(Number(did.createdAt) * 1000).toISOString(),
      updatedAt: new Date(Number(did.updatedAt) * 1000).toISOString(),
      txHash: receipt.hash,
    }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /stats
   Returns platform-wide statistics from on-chain counters.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const { identity } = getContracts();
    const [users, creds, links] = await identity.getPlatformStats();

    return res.json(success({
      users: Number(users),
      parachains: Number(links),
      credentials: Number(creds),
    }));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /search?q=
   On-chain storage doesn't support full-text search. Returns empty
   results for now — a subgraph/indexer can be added later.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || "").trim();
    if (!q) return res.json(success([]));

    // On-chain doesn't have a search index.
    // If q looks like an address (EVM or SS58), try to resolve and look up.
    const resolved = resolveToEvmAddress(q);
    if (resolved) {
      const { identity } = getContracts();
      const exists = await identity.hasDID(resolved);
      if (exists) {
        const did = await identity.getDID(resolved);
        return res.json(success([{
          id: q,
          displayName: did.displayName,
          walletAddress: q,
          score: Number(did.reputationScore),
          createdAt: new Date(Number(did.createdAt) * 1000).toISOString(),
        }]));
      }
    }

    return res.json(success([]));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:address
   Retrieves the full DID document from on-chain storage.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:address", async (req: Request, res: Response) => {
  try {
    const evmAddress = requireResolvedEvm(req.params.address, res);
    if (!evmAddress) return;
    const { identity } = getContracts();

    const exists = await identity.hasDID(evmAddress);
    if (!exists) {
      return res.status(404).json(fail("Identity not found"));
    }

    const did = await identity.getDID(evmAddress);

    return res.json(success({
      id: req.params.address,
      displayName: did.displayName,
      walletAddress: req.params.address,
      evmAddress: evmAddress,
      did: isEvmAddress(req.params.address) ? `did:ethr:${evmAddress}` : `did:polkadot:${req.params.address}`,
      score: Number(did.reputationScore),
      scoreChange: Number(did.scoreChange),
      createdAt: new Date(Number(did.createdAt) * 1000).toISOString(),
      updatedAt: new Date(Number(did.updatedAt) * 1000).toISOString(),
    }));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:address/verification-status
   Reads the 4-field verification status from on-chain.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:address/verification-status", async (req: Request, res: Response) => {
  try {
    const evmAddress = requireResolvedEvm(req.params.address, res);
    if (!evmAddress) return;
    const { identity } = getContracts();

    const exists = await identity.hasDID(evmAddress);
    if (!exists) return res.status(404).json(fail("Identity not found"));

    const v = await identity.getVerificationStatus(evmAddress);

    return res.json(success({
      email: VerificationStateMap[Number(v.email)] ?? "unverified",
      governance: VerificationStateMap[Number(v.governance)] ?? "unverified",
      socials: VerificationStateMap[Number(v.socials)] ?? "unverified",
      dao_badge: VerificationStateMap[Number(v.kyc)] ?? "unverified",
    }));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:address/verification-progress
   Returns step count and percent complete from on-chain.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:address/verification-progress", async (req: Request, res: Response) => {
  try {
    const evmAddress = requireResolvedEvm(req.params.address, res);
    if (!evmAddress) return;
    const { identity } = getContracts();

    const exists = await identity.hasDID(evmAddress);
    if (!exists) return res.status(404).json(fail("Identity not found"));

    const [currentStep, totalSteps, percentComplete] = await identity.getVerificationProgress(evmAddress);

    return res.json(success({
      currentStep: Number(currentStep),
      totalSteps: Number(totalSteps),
      percentComplete: Number(percentComplete),
    }));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /:address/verify
   Submits a verification request for a specific field on-chain.
   Body: { method: "wallet" | "social" | "kyc" | "dao_badge" }
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:address/verify", async (req: Request, res: Response) => {
  try {
    const { method } = req.body;
    const fieldIndex = VERIFICATION_FIELD[method];
    if (fieldIndex === undefined) {
      return res.status(400).json(fail("Invalid verification method. Use: wallet, social, dao_badge"));
    }

    const { identity } = getSignedContracts();
    const tx = await identity.submitVerification(fieldIndex);
    await tx.wait();

    return res.json(success({ submitted: true, method, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:address/linked-dids
   Returns all DID links (EVM ↔ Polkadot) from on-chain storage.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:address/linked-dids", async (req: Request, res: Response) => {
  try {
    const evmAddress = requireResolvedEvm(req.params.address, res);
    if (!evmAddress) return;
    const { identity } = getContracts();

    const links = await identity.getDIDLinks(evmAddress);

    const result = links
      .filter((l: any) => l.active)
      .map((l: any, idx: number) => ({
        id: idx,
        ownerAddress: evmAddress,
        linkedAddress: l.polkadotDid,
        didType: l.evmDid ? "evm" : "polkadot",
        verified: l.verified,
        createdAt: new Date(Number(l.linkedAt) * 1000).toISOString(),
      }));

    return res.json(success(result));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /:address/linked-dids
   Links a Polkadot DID to the user's EVM DID on-chain.
   Body: { linkedAddress: string, didType: "evm" | "polkadot" }
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:address/linked-dids", async (req: Request, res: Response) => {
  try {
    const { linkedAddress, didType } = req.body;
    if (!linkedAddress) {
      return res.status(400).json(fail("linkedAddress is required"));
    }

    const { identity } = getSignedContracts();
    const tx = await identity.linkPolkadotDID(linkedAddress);
    await tx.wait();

    return res.json(success({ linked: true, didType: didType || "polkadot", txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   DELETE /:address/linked-dids/:id
   Removes a DID link by its on-chain array index.
   ═══════════════════════════════════════════════════════════════════ */
router.delete("/:address/linked-dids/:id", async (req: Request, res: Response) => {
  try {
    const linkIndex = Number(req.params.id);

    const { identity } = getSignedContracts();
    const tx = await identity.removeDIDLink(linkIndex);
    await tx.wait();

    return res.json(success({ removed: true, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /:address/dao-badge
   Grants a DAO badge credential on-chain (+10 score).
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:address/dao-badge", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Issue a DAO Badge credential via the verifier (backend signer)
    const { identity } = getSignedContracts();
    const oneYear = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
    const tx = await identity.issueCredential(
      address,
      CREDENTIAL_TYPE.dao_badge,  // 1 = DAOBadge
      "PolkaMe DAO Badge",
      "PolkaMe Platform",
      oneYear,
      ""
    );
    await tx.wait();

    return res.json(success({ granted: true, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /:address/credential-request
   Any dApp can request credential access from a user.
   Emits on-chain events for transparency.
   Body: { targetAddress, credentialType }
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:address/credential-request", async (req: Request, res: Response) => {
  try {
    const { targetAddress, credentialType } = req.body;
    if (!targetAddress || !credentialType) {
      return res.status(400).json(fail("targetAddress and credentialType required"));
    }

    const { identity } = getContracts();

    // Check target has the credential type
    const resolvedTarget = resolveToEvmAddress(targetAddress);
    if (!resolvedTarget) {
      return res.status(404).json(fail("No linked EVM identity found for targetAddress"));
    }

    const creds = await identity.getCredentials(resolvedTarget);
    const credTypeNum = CREDENTIAL_TYPE[credentialType];
    if (credTypeNum === undefined) {
      return res.status(400).json(fail("Invalid credentialType"));
    }

    // Find the first valid credential of this type
    let credIndex = -1;
    let credStatus = "unverified";
    for (let i = 0; i < creds.length; i++) {
      if (Number(creds[i].credType) === credTypeNum && !creds[i].revoked) {
        credIndex = i;
        credStatus = "verified";
        break;
      }
    }

    if (credIndex >= 0) {
      // Emit on-chain credential access event
      const { identity: signedId } = getSignedContracts();
      const tx = await signedId.requestCredentialAccess(resolvedTarget, credIndex);
      await tx.wait();
    }

    return res.json(success({
      credentialType,
      status: credStatus,
      granted: credIndex >= 0,
    }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

export default router;
