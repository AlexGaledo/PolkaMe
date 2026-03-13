/* ────────────────────────────────────────────────────────────────────
   PolkaMe Backend — Global error handler middleware

   Catches any error thrown (or passed to next()) in route handlers
   and returns a consistent { data, success, error } JSON response.
──────────────────────────────────────────────────────────────────── */

import { Request, Response, NextFunction } from "express";

export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PolkaMe]", message);
    res.status(500).json({ data: null, success: false, error: message });
}
