/* ────────────────────────────────────────────────────────────────────
   PolkaMe Backend — Entry Point  (ON-CHAIN: connects to deployed contracts)

   All state lives on-chain via Solidity contracts
   deployed on an EVM-compatible Polkadot parachain (Moonbeam/Astar).
──────────────────────────────────────────────────────────────────── */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { initialize as initChain, getProvider } from "./contract-client.js";

import authRoutes from "./routes/auth.js";
import identityRoutes from "./routes/identity.js";
import accountsRoutes from "./routes/accounts.js";
import governanceRoutes from "./routes/governance.js";
import securityRoutes from "./routes/security.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

async function bootstrap() {
  // ── 1. Initialize Polkadot WASM crypto (for sig verification) ──
  await cryptoWaitReady();
  console.log("[PolkaMe] ✅ Polkadot WASM crypto ready");

  // ── 2. Connect to blockchain & verify deployed contracts ──────
  await initChain();

  // ── 3. Build Express app ──────────────────────────────────────
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(cors({
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }));

  // Global rate limiter (100 req/min per IP)
  app.use(rateLimit({
    windowMs: 60_000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Body parsing
  app.use(express.json({ limit: "1mb" }));

  // Auth routes get their own stricter rate limit
  app.use("/api/auth", rateLimit({
    windowMs: 60_000,
    max: 20,
    message: { success: false, error: "Too many auth requests" },
  }));

  // ── 4. Register routes ────────────────────────────────────────
  app.use("/api/auth", authRoutes);
  app.use("/api/identity", identityRoutes);
  app.use("/api/accounts", accountsRoutes);
  app.use("/api/governance", governanceRoutes);
  app.use("/api/security", securityRoutes);

  // Health check — includes chain connection status
  app.get("/api/health", async (_req, res) => {
    try {
      const provider = getProvider();
      const network = await provider.getNetwork();
      res.json({
        status: "ok",
        chain: {
          name: network.name,
          chainId: Number(network.chainId),
        },
        storage: "on-chain (Solidity contracts)",
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({ status: "error", storage: "disconnected" });
    }
  });

  // ── 5. Start server ───────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`\n[PolkaMe] 🚀 Backend running at http://localhost:${PORT}`);
    console.log(`[PolkaMe] 📡 Storage: ON-CHAIN (Solidity contracts via ethers.js)`);
    console.log(`[PolkaMe] 🔗 CORS origin: ${CORS_ORIGIN}\n`);
  });
}

bootstrap().catch((err) => {
  console.error("[PolkaMe] ❌ Failed to start:", err.message);
  process.exit(1);
});
