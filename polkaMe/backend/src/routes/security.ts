/* ────────────────────────────────────────────────────────────────────
   PolkaMe — Security Routes  (ON-CHAIN via PolkaMeSecurity contract)

   Endpoints:
     GET    /:address/privacy                → securityContract.getPrivacyPreferences()
     POST   /:address/privacy/init           → securityContract.initializePrivacyPrefs()
     PATCH  /:address/privacy/:id            → securityContract.updatePrivacyPreference()
     GET    /:address/sessions               → securityContract.getActiveSessions()
     POST   /:address/sessions               → securityContract.createSession()
     DELETE /:address/sessions/:id           → securityContract.revokeSession()
     DELETE /:address/sessions               → securityContract.revokeAllRemoteSessions()
     GET    /:address/log                    → securityContract.getSecurityLog()
──────────────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express";
import { getContracts, getSignedContracts } from "../contract-client.js";
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
   GET /:address/privacy
   Returns privacy preferences from on-chain storage.
   Auto-initializes defaults if none exist.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:address/privacy", async (req: Request, res: Response) => {
  try {
    const evmAddress = resolveAddressOrFail(req.params.address, res);
    if (!evmAddress) return;
    const { security } = getContracts();

    const raw = await security.getPrivacyPreferences(evmAddress);

    // If no prefs exist, auto-initialize via a hint to the frontend
    if (raw.length === 0) {
      return res.json(success([]));
    }

    const prefs = raw.map((p: any, idx: number) => ({
      id: idx,
      label: p.label,
      description: p.description,
      enabled: p.enabled,
    }));

    return res.json(success(prefs));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /:address/privacy/init
   Initializes default privacy preferences on-chain (one-time).
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:address/privacy/init", async (req: Request, res: Response) => {
  try {
    const { security } = getSignedContracts();
    const tx = await security.initializePrivacyPrefs();
    await tx.wait();

    return res.json(success({ initialized: true, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   PATCH /:address/privacy/:id
   Toggles a privacy preference on-chain.
   Body: { enabled: boolean }
   ═══════════════════════════════════════════════════════════════════ */
router.patch("/:address/privacy/:id", async (req: Request, res: Response) => {
  try {
    const prefIndex = Number(req.params.id);
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json(fail("enabled must be a boolean"));
    }

    const { security } = getSignedContracts();
    const tx = await security.updatePrivacyPreference(prefIndex, enabled);
    await tx.wait();

    return res.json(success({ updated: true, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:address/sessions
   Returns active sessions from on-chain storage.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:address/sessions", async (req: Request, res: Response) => {
  try {
    const evmAddress = resolveAddressOrFail(req.params.address, res);
    if (!evmAddress) return;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const { security } = getContracts();
    const raw = await security.getActiveSessions(evmAddress);

    const items = raw
      .filter((s: any) => s.active)
      .map((s: any, idx: number) => ({
        id: idx,
        device: s.device,
        browser: s.browser,
        location: s.location,
        isCurrent: s.isCurrent,
        lastActive: new Date(Number(s.lastActive) * 1000).toISOString(),
        icon: s.device.toLowerCase().includes("iphone") ? "📱" : "💻",
      }));

    return res.json(success(paginate(items, page, limit)));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   POST /:address/sessions
   Creates a new session record on-chain.
   Body: { device, browser, location }
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:address/sessions", async (req: Request, res: Response) => {
  try {
    const { device, browser, location } = req.body;
    if (!device || !browser) {
      return res.status(400).json(fail("device and browser are required"));
    }

    const { security } = getSignedContracts();
    const tx = await security.createSession(device, browser, location || "Unknown", false);
    await tx.wait();

    return res.json(success({ created: true, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   DELETE /:address/sessions/:id
   Revokes a specific session by on-chain array index.
   ═══════════════════════════════════════════════════════════════════ */
router.delete("/:address/sessions/:id", async (req: Request, res: Response) => {
  try {
    const sessionIndex = Number(req.params.id);

    const { security } = getSignedContracts();
    const tx = await security.revokeSession(sessionIndex);
    await tx.wait();

    return res.json(success({ revoked: true, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   DELETE /:address/sessions  (no :id → revoke ALL remote)
   Revokes all sessions except the current one.
   ═══════════════════════════════════════════════════════════════════ */
router.delete("/:address/sessions", async (req: Request, res: Response) => {
  try {
    // Only match this route when there's NO :id parameter
    // Express routing handles this via route order (specific before general)

    const { security } = getSignedContracts();
    const tx = await security.revokeAllRemoteSessions();
    await tx.wait();

    // Count revoked sessions
    const evmAddress = resolveAddressOrFail(req.params.address, res);
    if (!evmAddress) return;
    const { security: readSecurity } = getContracts();
    const raw = await readSecurity.getActiveSessions(evmAddress);
    const remaining = raw.filter((s: any) => s.active).length;

    return res.json(success({ revoked: true, count: remaining, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /:address/log
   Returns the security event log from on-chain storage.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:address/log", async (req: Request, res: Response) => {
  try {
    const evmAddress = resolveAddressOrFail(req.params.address, res);
    if (!evmAddress) return;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const { security } = getContracts();
    const raw = await security.getSecurityLog(evmAddress);

    const items = raw.map((e: any, idx: number) => ({
      id: idx,
      event: e.eventDescription,
      source: e.source,
      timestamp: new Date(Number(e.timestamp) * 1000).toISOString(),
    }));

    return res.json(success(paginate(items, page, limit)));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

export default router;
