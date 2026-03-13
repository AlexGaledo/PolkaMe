/* ────────────────────────────────────────────────────────────────────
   PolkaMe Backend — Auth Middleware

   Supports two wallet-based auth flows:

   1. EVM / thirdweb (Sign-In With Ethereum via EIP-4361)
      ● GET  /api/auth/payload?address=0x...  → { payload }
      ● POST /api/auth/login                  → { token }
        Body: { payload: LoginPayload, signature: "0x..." }

   2. Polkadot signature challenge
      ● GET  /api/auth/nonce?address=5...    → { nonce, message }
      ● POST /api/auth/polkadot/verify       → { token }
        Body: { address: "5...", signature: "0x..." }

   Both flows issue a signed JWT (HS256) containing:
      { address, walletType: "evm"|"polkadot", jti }

   The optionalAuth middleware attaches req.user when a valid token
   is present but does NOT reject unauthenticated requests.
   The requireAuth middleware returns 401 when no valid token is present.

   REQUIRE_AUTH env var (default "false") — when false, requireAuth
   behaves like optionalAuth so the frontend works without changes.
──────────────────────────────────────────────────────────────────── */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../types";

const JWT_SECRET     = process.env.JWT_SECRET || "dev_secret_CHANGE_IN_PROD";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const REQUIRE_AUTH   = process.env.REQUIRE_AUTH === "true";

// ─── Token helpers ───────────────────────────────────────────────────

/** Sign a JWT for the given wallet address + type */
export function signToken(address: string, walletType: "evm" | "polkadot"): string {
    const payload: JwtPayload = {
        address:    address.toLowerCase ? address.toLowerCase() : address,
        walletType,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
}

/** Verify a JWT string and return the decoded payload (or null if invalid) */
export function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
        return null;
    }
}

// ─── Extract bearer token from request ───────────────────────────────

function extractBearer(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return null;
    return header.slice(7).trim();
}

// ─── Middleware ───────────────────────────────────────────────────────

/**
 * optionalAuth — decodes the JWT if present; populates req.user.
 * Never blocks the request; use when you want the address but don't
 * require authentication for the endpoint to function.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
    const token = extractBearer(req);
    if (token) {
        const payload = verifyToken(token);
        if (payload) req.user = payload;
    }
    next();
}

/**
 * requireAuth — blocks unauthenticated requests with 401.
 *
 * When REQUIRE_AUTH=false (default) this behaves like optionalAuth so
 * the existing frontend continues to work without sending tokens.
 * Flip REQUIRE_AUTH=true once the frontend sends Authorization headers.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const token   = extractBearer(req);
    const payload = token ? verifyToken(token) : null;

    if (payload) {
        req.user = payload;
        return next();
    }

    if (!REQUIRE_AUTH) {
        // Auth is disabled — proceed without a user context
        return next();
    }

    res.status(401).json({ data: null, success: false, error: "Unauthorized: valid JWT required" });
}

/**
 * requireOwner — extends requireAuth by also ensuring the token's
 * address matches the :address route param.  Prevents users from
 * mutating other users' data.
 *
 * Falls through silently when REQUIRE_AUTH=false.
 */
export function requireOwner(req: Request, res: Response, next: NextFunction): void {
    const token   = extractBearer(req);
    const payload = token ? verifyToken(token) : null;

    if (!REQUIRE_AUTH) {
        if (payload) req.user = payload;
        return next();
    }

    if (!payload) {
        return void res.status(401).json({ data: null, success: false, error: "Unauthorized" });
    }

    const routeAddress = req.params.address?.toLowerCase();
    const tokenAddress = payload.address?.toLowerCase();

    if (routeAddress && tokenAddress && routeAddress !== tokenAddress) {
        return void res.status(403).json({ data: null, success: false, error: "Forbidden: address mismatch" });
    }

    req.user = payload;
    next();
}
