/* ────────────────────────────────────────────────────────────────────
   PolkaMe — Accounts Routes  (ON-CHAIN via PolkaMeAccounts contract)

   Endpoints:
     GET  /:address/chains      → accountsContract.getLinkedChainAccounts()
     POST /:address/chains      → accountsContract.linkChainAccount()
     GET  /:address/socials     → accountsContract.getLinkedSocialAccounts()
     POST /:address/socials     → accountsContract.linkSocialAccount()
     GET  /:address/dapps       → accountsContract.getAuthorizedDApps()
     POST /:address/dapps       → accountsContract.authorizeDApp()
     DELETE /:address/dapps/:id → accountsContract.revokeDApp()
     GET  /:address/activity    → accountsContract.getRecentActivity()
──────────────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express";
import {
  getContracts,
  getSignedContracts,
  ChainTypeMap,
  ChainTypeReverseMap,
  SocialTypeMap,
  SocialTypeReverseMap,
  ActivityStatusMap,
} from "../contract-client.js";
import { success, fail } from "../types.js";
import { resolveToEvmAddress } from "../address-mapping.js";

const router = Router();

function resolveAddressOrFail(address: string, res: Response): string | null {
  const evmAddress = resolveToEvmAddress(address);
  if (!evmAddress) {
    res.status(404).json(fail("No linked EVM identity found for this address"));
    return null;
  }
  return evmAddress;
}

// Helper: paginate an array
function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return {
    page,
    limit,
    items: items.slice(start, start + limit),
  };
}

/* ═══════════════════════════════════════════════════════════════════
   GET /:address/chains
   Returns linked chain accounts from on-chain storage.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:address/chains", async (req: Request, res: Response) => {
  try {
    const evmAddress = resolveAddressOrFail(req.params.address, res);
    if (!evmAddress) return;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const { accounts } = getContracts();
    const raw = await accounts.getLinkedChainAccounts(evmAddress);

    // Filter active and map to API shape
    const items = raw
      .filter((a: any) => a.active)
      .map((a: any, idx: number) => ({
        id: idx,
        chain: ChainTypeMap[Number(a.chain)] ?? "custom",
        label: a.label,
        address: a.accountAddress,
        balance: "0",
        tag: a.tag,
        logoColor: "#E6007A",
      }));

    return res.json(success(paginate(items, page, limit)));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /:address/chains
   Links a new chain account on-chain.
   Body: { chain, label, chainAddress, tag }
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:address/chains", async (req: Request, res: Response) => {
  try {
    const { chain, label, chainAddress, tag } = req.body;
    if (!chain || !chainAddress) {
      return res.status(400).json(fail("chain and chainAddress are required"));
    }

    const chainType = ChainTypeReverseMap[chain.toLowerCase()] ?? 4; // default Custom

    const { accounts } = getSignedContracts();
    const tx = await accounts.linkChainAccount(chainType, label || chain, chainAddress, tag || "");
    await tx.wait();

    return res.json(success({ linked: true, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:address/socials
   Returns linked social accounts from on-chain storage.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:address/socials", async (req: Request, res: Response) => {
  try {
    const evmAddress = resolveAddressOrFail(req.params.address, res);
    if (!evmAddress) return;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const { accounts } = getContracts();
    const raw = await accounts.getLinkedSocialAccounts(evmAddress);

    const items = raw
      .filter((s: any) => s.active)
      .map((s: any, idx: number) => ({
        id: idx,
        platform: SocialTypeMap[Number(s.platform)] ?? "custom",
        handle: s.handle,
        verified: s.verified,
        linkedAt: new Date(Number(s.linkedAt) * 1000).toISOString(),
      }));

    return res.json(success(paginate(items, page, limit)));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /:address/socials
   Links a social account on-chain.
   Body: { platform: "twitter"|"discord"|"github", handle: string }
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:address/socials", async (req: Request, res: Response) => {
  try {
    const { platform, handle } = req.body;
    if (!platform || !handle) {
      return res.status(400).json(fail("platform and handle are required"));
    }

    const platType = SocialTypeReverseMap[platform.toLowerCase()];
    if (platType === undefined) {
      return res.status(400).json(fail("Invalid platform. Use: twitter, discord, github"));
    }

    const { accounts } = getSignedContracts();
    const tx = await accounts.linkSocialAccount(platType, handle);
    await tx.wait();

    return res.json(success({ linked: true, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:address/dapps
   Returns authorized dApps from on-chain storage.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:address/dapps", async (req: Request, res: Response) => {
  try {
    const evmAddress = resolveAddressOrFail(req.params.address, res);
    if (!evmAddress) return;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const { accounts } = getContracts();
    const raw = await accounts.getAuthorizedDApps(evmAddress);

    const items = raw
      .filter((d: any) => d.active)
      .map((d: any, idx: number) => ({
        id: idx,
        name: d.name,
        dAppAddress: d.dAppAddress,
        lastLogin: new Date(Number(d.lastAccessed) * 1000).toISOString(),
        logoLetter: d.name.charAt(0).toUpperCase(),
        logoBgColor: "#E6007A",
      }));

    return res.json(success(paginate(items, page, limit)));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /:address/dapps
   Authorizes a dApp on-chain.
   Body: { name: string, dAppAddress: string }
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:address/dapps", async (req: Request, res: Response) => {
  try {
    const { name, dAppAddress } = req.body;
    if (!name || !dAppAddress) {
      return res.status(400).json(fail("name and dAppAddress are required"));
    }

    const { accounts } = getSignedContracts();
    const tx = await accounts.authorizeDApp(name, dAppAddress);
    await tx.wait();

    return res.json(success({ authorized: true, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   DELETE /:address/dapps/:id
   Revokes a dApp authorization on-chain by array index.
   ═══════════════════════════════════════════════════════════════════ */
router.delete("/:address/dapps/:id", async (req: Request, res: Response) => {
  try {
    const dAppIndex = Number(req.params.id);

    const { accounts } = getSignedContracts();
    const tx = await accounts.revokeDApp(dAppIndex);
    await tx.wait();

    return res.json(success({ revoked: true, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:address/activity
   Returns the activity log from on-chain storage.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:address/activity", async (req: Request, res: Response) => {
  try {
    const evmAddress = resolveAddressOrFail(req.params.address, res);
    if (!evmAddress) return;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const { accounts } = getContracts();
    const raw = await accounts.getRecentActivity(evmAddress);

    const items = raw.map((a: any, idx: number) => ({
      id: idx,
      action: a.action,
      icon: "🔗",
      app: a.app,
      status: ActivityStatusMap[Number(a.status)] ?? "pending",
      timestamp: new Date(Number(a.timestamp) * 1000).toISOString(),
    }));

    return res.json(success(paginate(items, page, limit)));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

export default router;
