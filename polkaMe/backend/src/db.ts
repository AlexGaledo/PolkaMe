/* ────────────────────────────────────────────────────────────────────
    PolkaMe Backend — Database layer (@libsql/client)

    Uses @libsql/client which wraps SQLite as a WebAssembly module.
    No native compilation needed — works on any platform.

    API shape:
      getDb()      → Client  (synchronous singleton getter)
      initialize() → Promise<void>  (run once at startup)
    All helper functions (logActivity, etc.) are async.
──────────────────────────────────────────────────────────────────── */

import { createClient, type Client } from "@libsql/client";
import path from "path";
import dotenv from "dotenv";
import { v4 as uuid } from "uuid";

dotenv.config();

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, "..", "polkame.db");

// Singleton — one libsql client shared across all route handlers
let _db: Client | null = null;
let _ready = false;

/** Returns the singleton client. Call initialize() before use. */
export function getDb(): Client {
  if (!_db) {
    // file: URL format required by libsql for local SQLite
    _db = createClient({ url: `file:${DB_PATH}` });
  }
  return _db;
}

/** Run once at server startup: create tables + insert seed data */
export async function initialize(): Promise<void> {
  if (_ready) return;
  const db = getDb();
  await initSchema(db);
  await seedInitialData(db);
  _ready = true;
}

// ─── Schema ──────────────────────────────────────────────────────────
async function initSchema(db: Client): Promise<void> {
  // Execute each CREATE TABLE statement individually via batch
  await db.batch([
    `CREATE TABLE IF NOT EXISTS identities (
      address       TEXT PRIMARY KEY,
      display_name  TEXT NOT NULL,
      score         INTEGER DEFAULT 10,
      score_change  REAL    DEFAULT 0,
      created_at    TEXT    NOT NULL,
      updated_at    TEXT    NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS verification_statuses (
      address     TEXT PRIMARY KEY,
      email       TEXT DEFAULT 'unverified',
      governance  TEXT DEFAULT 'unverified',
      socials     TEXT DEFAULT 'unverified',
      dao_badge   TEXT DEFAULT 'unverified'
    )`,
    `CREATE TABLE IF NOT EXISTS verification_progress (
      address      TEXT PRIMARY KEY,
      current_step INTEGER DEFAULT 0,
      total_steps  INTEGER DEFAULT 3
    )`,
    `CREATE TABLE IF NOT EXISTS chain_accounts (
      id            TEXT PRIMARY KEY,
      owner_address TEXT NOT NULL,
      chain         TEXT NOT NULL,
      label         TEXT NOT NULL,
      chain_address TEXT NOT NULL,
      balance       TEXT DEFAULT '0.00',
      tag           TEXT DEFAULT '',
      logo_color    TEXT DEFAULT 'bg-pink-500',
      created_at    TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS social_accounts (
      id            TEXT PRIMARY KEY,
      owner_address TEXT NOT NULL,
      platform      TEXT NOT NULL,
      handle        TEXT NOT NULL,
      verified      INTEGER DEFAULT 0,
      linked_at     TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS authorized_dapps (
      id            TEXT PRIMARY KEY,
      owner_address TEXT NOT NULL,
      name          TEXT NOT NULL,
      dapp_address  TEXT NOT NULL,
      last_login    TEXT NOT NULL,
      logo_letter   TEXT NOT NULL,
      logo_bg_color TEXT DEFAULT 'bg-blue-500',
      created_at    TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS activity_log (
      id            TEXT PRIMARY KEY,
      owner_address TEXT NOT NULL,
      action        TEXT NOT NULL,
      icon          TEXT DEFAULT 'swap_horiz',
      app           TEXT DEFAULT 'PolkaMe',
      status        TEXT DEFAULT 'success',
      timestamp     TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS staking (
      address               TEXT PRIMARY KEY,
      total_staked          REAL    DEFAULT 0,
      claimable_rewards     REAL    DEFAULT 0,
      conviction_multiplier INTEGER DEFAULT 1,
      lock_expiry           INTEGER DEFAULT 0,
      total_votes           INTEGER DEFAULT 0,
      updated_at            TEXT    NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS proposals (
      id               TEXT PRIMARY KEY,
      ref_num          INTEGER NOT NULL,
      tag              TEXT    DEFAULT 'Treasury',
      tag_color        TEXT    DEFAULT 'amber',
      title            TEXT    NOT NULL,
      description      TEXT    NOT NULL,
      aye_votes        REAL    DEFAULT 0,
      nay_votes        REAL    DEFAULT 0,
      ends_at          INTEGER NOT NULL,
      proposer_address TEXT    NOT NULL,
      created_at       TEXT    NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS votes (
      id               TEXT PRIMARY KEY,
      proposal_id      TEXT NOT NULL,
      voter_address    TEXT NOT NULL,
      vote             TEXT NOT NULL,
      weight           REAL DEFAULT 1,
      created_at       TEXT NOT NULL,
      UNIQUE(proposal_id, voter_address)
    )`,
    `CREATE TABLE IF NOT EXISTS validators (
      id          TEXT PRIMARY KEY,
      short_name  TEXT NOT NULL,
      initials    TEXT NOT NULL,
      commission  TEXT NOT NULL,
      self_stake  TEXT NOT NULL,
      rewards_24h TEXT NOT NULL,
      status      TEXT DEFAULT 'active'
    )`,
    `CREATE TABLE IF NOT EXISTS privacy_preferences (
      id            TEXT PRIMARY KEY,
      owner_address TEXT NOT NULL,
      label         TEXT NOT NULL,
      description   TEXT NOT NULL,
      enabled       INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id            TEXT PRIMARY KEY,
      owner_address TEXT NOT NULL,
      device        TEXT NOT NULL,
      browser       TEXT NOT NULL,
      location      TEXT NOT NULL,
      is_current    INTEGER DEFAULT 0,
      last_active   TEXT NOT NULL,
      icon          TEXT DEFAULT 'computer',
      created_at    TEXT NOT NULL,
      revoked       INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS security_log (
      id            TEXT PRIMARY KEY,
      owner_address TEXT NOT NULL,
      event         TEXT NOT NULL,
      source        TEXT NOT NULL,
      timestamp     TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS auth_nonces (
      address    TEXT PRIMARY KEY,
      nonce      TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    // ─── DID Linking (diagram: "Mapped Together") ─────────────────────────────
    // Stores the user-asserted mapping between their EVM address and Polkadot address.
    // did_type: "evm" | "polkadot"
    `CREATE TABLE IF NOT EXISTS linked_dids (
      id              TEXT PRIMARY KEY,
      owner_address   TEXT NOT NULL,
      linked_address  TEXT NOT NULL,
      did_type        TEXT NOT NULL,
      created_at      TEXT NOT NULL,
      UNIQUE(owner_address, linked_address)
    )`,
    // ─── Indexes (OWASP A04): prevent full-table scans on large datasets ───────
    `CREATE INDEX IF NOT EXISTS idx_chain_accounts_owner   ON chain_accounts    (owner_address)`,
    `CREATE INDEX IF NOT EXISTS idx_social_accounts_owner  ON social_accounts   (owner_address)`,
    `CREATE INDEX IF NOT EXISTS idx_authorized_dapps_owner ON authorized_dapps  (owner_address)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_log_owner     ON activity_log      (owner_address)`,
    `CREATE INDEX IF NOT EXISTS idx_privacy_prefs_owner    ON privacy_preferences (owner_address)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_owner         ON sessions          (owner_address)`,
    `CREATE INDEX IF NOT EXISTS idx_security_log_owner     ON security_log      (owner_address)`,
    `CREATE INDEX IF NOT EXISTS idx_votes_proposal         ON votes             (proposal_id)`,
    `CREATE INDEX IF NOT EXISTS idx_linked_dids_owner      ON linked_dids       (owner_address)`,
  ], "write");

  // ─── Column migration ────────────────────────────────────────────────────────
  // SQLite has no ADD COLUMN IF NOT EXISTS — run individually and swallow the
  // "duplicate column" error that occurs when the column already exists.
  try {
      await db.execute("ALTER TABLE verification_statuses ADD COLUMN dao_badge TEXT DEFAULT 'unverified'");
  } catch {
      // Column already exists — safe to ignore
  }
}


// ─── Seed data ───────────────────────────────────────────────────────
async function seedInitialData(db: Client): Promise<void> {
  // Validators — representative Polkadot validators (insert if not present)
  // Fixed IDs so INSERT OR IGNORE on the PRIMARY KEY correctly deduplicates on every restart.
  const validators = [
    { id: "seed-validator-parity-tech",     short_name: "Parity Tech",     initials: "PT", commission: "3%",  self_stake: "125,000 DOT", rewards_24h: "42.3 DOT",  status: "active"   },
    { id: "seed-validator-web3-foundation", short_name: "Web3 Foundation", initials: "WF", commission: "0%",  self_stake: "250,000 DOT", rewards_24h: "85.1 DOT",  status: "active"   },
    { id: "seed-validator-stakely",         short_name: "Stakely.io",      initials: "SK", commission: "5%",  self_stake:  "78,500 DOT", rewards_24h: "28.7 DOT",  status: "active"   },
    { id: "seed-validator-p2p",             short_name: "P2P Validator",   initials: "P2", commission: "3%",  self_stake: "195,000 DOT", rewards_24h: "61.2 DOT",  status: "active"   },
    { id: "seed-validator-figment",         short_name: "Figment",         initials: "FG", commission: "10%", self_stake:  "50,000 DOT", rewards_24h: "18.5 DOT",  status: "waiting"  },
    { id: "seed-validator-chorus-one",      short_name: "Chorus One",      initials: "CO", commission: "8%",  self_stake:  "88,000 DOT", rewards_24h: "32.0 DOT",  status: "active"   },
    { id: "seed-validator-everstake",       short_name: "Everstake",       initials: "EV", commission: "7%",  self_stake:  "42,000 DOT", rewards_24h: "15.3 DOT",  status: "inactive" },
  ];

  for (const v of validators) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO validators (id, short_name, initials, commission, self_stake, rewards_24h, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [v.id, v.short_name, v.initials, v.commission, v.self_stake, v.rewards_24h, v.status],
    });
  }

  // Sample proposals (only if the table is empty)
  const countResult = await db.execute("SELECT COUNT(*) as c FROM proposals");
  const count = Number(countResult.rows[0]?.c ?? 0);
  if (count === 0) {
    const now    = Date.now();
    const dayMs  = 86_400_000;
    const proposals = [
      {
        id: uuid(), ref_num: 856, tag: "Treasury", tag_color: "amber",
        title: "Fund PolkaMe Identity Infrastructure",
        description: "Request for 50,000 DOT to expand the PolkaMe decentralised identity layer across all parachain integrations.",
        aye_votes: 2_800_000, nay_votes: 420_000,
        ends_at: Math.floor((now + 5 * dayMs) / 1000),
        proposer_address: "system", created_at: new Date().toISOString(),
      },
      {
        id: uuid(), ref_num: 855, tag: "Runtime", tag_color: "blue",
        title: "Enable Cross-Chain Credential Sharing v2",
        description: "Upgrade the on-chain credential module to support XCM-based attestation sharing between parachains.",
        aye_votes: 1_500_000, nay_votes: 200_000,
        ends_at: Math.floor((now + 3 * dayMs) / 1000),
        proposer_address: "system", created_at: new Date().toISOString(),
      },
      {
        id: uuid(), ref_num: 854, tag: "Governance", tag_color: "green",
        title: "Reduce Minimum Conviction Lock Period",
        description: "Proposal to halve the 1x conviction lock period from 4 weeks to 2 weeks to increase governance participation.",
        aye_votes: 900_000, nay_votes: 1_100_000,
        ends_at: Math.floor((now + 1 * dayMs) / 1000),
        proposer_address: "system", created_at: new Date().toISOString(),
      },
    ];

    for (const p of proposals) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO proposals
              (id, ref_num, tag, tag_color, title, description, aye_votes, nay_votes, ends_at, proposer_address, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [p.id, p.ref_num, p.tag, p.tag_color, p.title, p.description, p.aye_votes, p.nay_votes, p.ends_at, p.proposer_address, p.created_at],
      });
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────


/** Append an entry to the activity log for a user */
export async function logActivity(
  ownerAddress: string,
  action: string,
  icon = "check_circle",
  app = "PolkaMe",
  status: "success" | "pending" | "failed" = "success"
): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO activity_log (id, owner_address, action, icon, app, status, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [uuid(), ownerAddress, action, icon, app, status, new Date().toISOString()],
  });
}

/** Append an entry to the security log for a user */
export async function logSecurity(
  ownerAddress: string,
  event: string,
  source: string
): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO security_log (id, owner_address, event, source, timestamp) VALUES (?, ?, ?, ?, ?)`,
    args: [uuid(), ownerAddress, event, source, new Date().toISOString()],
  });
}

/** Compute how many verification steps are complete for a user */
export async function computeVerificationProgress(address: string): Promise<{
  currentStep: number; totalSteps: number; percentComplete: number;
}> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM verification_statuses WHERE address = ?",
    args: [address],
  });
  const row = result.rows[0];
  if (!row) return { currentStep: 0, totalSteps: 3, percentComplete: 0 };

  const completed = ([row.socials, row.governance, row.dao_badge] as string[]).filter(s => s === "verified").length;
    return {
    currentStep: completed,
      totalSteps: 3,
      percentComplete: Math.round((completed / 3) * 100),
  };
}

/** Recalculate and persist a user's identity score based on linked data */
export async function recalculateScore(address: string): Promise<number> {
  const db = getDb();

  const [chainRes, socialRes, vsRes] = await Promise.all([
    db.execute({ sql: "SELECT COUNT(*) as c FROM chain_accounts  WHERE owner_address = ?", args: [address] }),
    db.execute({ sql: "SELECT COUNT(*) as c FROM social_accounts WHERE owner_address = ?", args: [address] }),
    db.execute({ sql: "SELECT * FROM verification_statuses WHERE address = ?",             args: [address] }),
  ]);

  const chainCount  = Number(chainRes.rows[0]?.c  ?? 0);
  const socialCount = Number(socialRes.rows[0]?.c ?? 0);
  const vs          = vsRes.rows[0];

  let score = 10;
  score += Math.min(chainCount  * 5,  25);
  score += Math.min(socialCount * 10, 30);
  if (vs) {
    if (vs.socials    === "verified") score += 10;
    if (vs.governance === "verified") score += 10;
      if (vs.dao_badge  === "verified") score += 10; // DAO participation badge
  }
  score = Math.min(score, 100);

  await db.execute({
    sql: "UPDATE identities SET score = ?, updated_at = ? WHERE address = ?",
    args: [score, new Date().toISOString(), address],
  });

  return score;
}

/** Development helper — wipe all tables and re-seed */
export async function resetDb(): Promise<void> {
  const fs = require("fs");
  if (_db) { _db.close(); _db = null; }
  _ready = false;
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  console.log("Database reset. Re-initialising…");
  await initialize();
  console.log("Done.");
}

