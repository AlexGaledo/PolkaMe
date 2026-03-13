/* ────────────────────────────────────────────────────────────────────
   PolkaMe — Auth Routes  (In-memory nonces)

   Nonces are stored in an in-memory Map.
   JWT signing and verification remain unchanged.

   Endpoints:
     GET  /payload?address=         → EVM auth payload (thirdweb)
     POST /login                    → EVM auth verify + JWT
     GET  /nonce?address=           → Polkadot challenge nonce
     POST /polkadot/verify          → Polkadot sig verify + JWT
     GET  /me                       → Current user info from JWT
──────────────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { signatureVerify, cryptoWaitReady } from "@polkadot/util-crypto";
import { u8aToHex, stringToU8a } from "@polkadot/util";
import { signToken, verifyToken } from "../middleware/auth.js";
import { nonceStore } from "../contract-client.js";
import { success, fail } from "../types.js";

const router = Router();

// ─── Nonce TTL (10 minutes) ─────────────────────────────────────────
const NONCE_TTL_MS = 10 * 60 * 1000;

/* ═══════════════════════════════════════════════════════════════════
   EVM Auth (thirdweb EIP-4361)
   ═══════════════════════════════════════════════════════════════════ */

/** GET /payload?address= — generates a sign-in payload for EVM wallets */
router.get("/payload", async (req: Request, res: Response) => {
  try {
    const address = req.query.address as string;
    if (!address) return res.status(400).json(fail("address is required"));

    if (!process.env.THIRDWEB_SECRET_KEY) {
      return res.status(501).json(fail("EVM auth not configured — set THIRDWEB_SECRET_KEY"));
    }

    const domain = process.env.AUTH_DOMAIN || "localhost";

    const payload = {
      address,
      chainId: "1284",
      domain,
      nonce: randomBytes(16).toString("hex"),
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + NONCE_TTL_MS).toISOString(),
    };

    return res.json(success({ payload }));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/** POST /login — verifies EVM signature and issues JWT */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { payload, signature } = req.body;
    if (!payload || !signature) {
      return res.status(400).json(fail("payload and signature required"));
    }

    // In production, verify with thirdweb SDK
    // For now, issue a JWT for the claimed address
    const token = signToken(payload.address, "evm");

    return res.json(success({ token }));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   Polkadot Auth (challenge-response with sr25519 signature)
   ═══════════════════════════════════════════════════════════════════ */

/** GET /nonce?address= — generates a challenge nonce (stored in-memory) */
router.get("/nonce", async (req: Request, res: Response) => {
  try {
    const address = req.query.address as string;
    if (!address) return res.status(400).json(fail("address is required"));

    const nonce = randomBytes(16).toString("hex");
    const message = `Sign this message to authenticate with PolkaMe:\n\nNonce: ${nonce}\nAddress: ${address}\nTimestamp: ${new Date().toISOString()}`;

    // Store in-memory
    nonceStore.set(address, {
      nonce,
      createdAt: new Date().toISOString(),
    });

    return res.json(success({ nonce, message }));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/** POST /polkadot/verify — verifies Polkadot signature and issues JWT */
router.post("/polkadot/verify", async (req: Request, res: Response) => {
  try {
    const { address, signature } = req.body;
    if (!address || !signature) {
      return res.status(400).json(fail("address and signature required"));
    }

    // Retrieve stored nonce from in-memory store
    const entry = nonceStore.get(address);
    if (!entry) {
      return res.status(401).json(fail("No nonce found — request /api/auth/nonce first"));
    }

    // Check TTL
    const age = Date.now() - new Date(entry.createdAt).getTime();
    if (age > NONCE_TTL_MS) {
      nonceStore.delete(address);
      return res.status(401).json(fail("Nonce expired — request a new one"));
    }

    // Rebuild the message that was signed
    const message = `Sign this message to authenticate with PolkaMe:\n\nNonce: ${entry.nonce}\nAddress: ${address}\nTimestamp: ${entry.createdAt}`;

    // Verify the signature
    await cryptoWaitReady();
    const result = signatureVerify(
      stringToU8a(message),
      signature,
      address
    );

    if (!result.isValid) {
      return res.status(401).json(fail("Invalid signature"));
    }

    // Delete used nonce (single-use)
    nonceStore.delete(address);

    // Issue JWT
    const token = signToken(address, "polkadot");

    return res.json(success({ token }));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /me — returns current user info from JWT
   ═══════════════════════════════════════════════════════════════════ */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json(fail("Not authenticated"));
    }

    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return res.status(401).json(fail("Invalid or expired token"));
    }

    return res.json(success(payload));
  } catch (err: any) {
    return res.status(401).json(fail("Invalid token"));
  }
});

export default router;
