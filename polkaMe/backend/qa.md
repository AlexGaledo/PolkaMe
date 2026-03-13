# PolkaMe Backend — QA / Critique

This document is a critical review of the current backend. Issues are prioritized: **Critical** (must fix before production), **High** (significant risk or limitation), **Medium** (correctness/maintainability), and **Low** (polish/nice-to-have).

---

## Critical

### 1. No request body size limit

`express.json()` is called with no size cap. A client can send a multi-megabyte JSON body and the server will parse it all into memory.

**Fix:**

```typescript
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
```

---

### 2. Error messages expose internal details

Every catch block returns `err.message` verbatim:

```typescript
res.status(500).json(fail(err.message));
```

Contract revert reasons, stack details, or ABI fragments may leak to the client. An attacker can probe contract behavior by triggering reverts.

**Fix:** Log the full error server-side; return a generic message to the client:

```typescript
console.error("[PolkaMe]", err);
res.status(500).json(fail("Internal server error"));
```

---

### 3. No JWT revocation / logout

Once a JWT is issued it is valid until `JWT_EXPIRES_IN` (7 days). There is no `POST /api/auth/logout` endpoint and no blocklist. A stolen token stays valid for the full window.

**Fix (minimum viable):** Store a `jti` (JWT ID) in each token and a revoked token list. Check the list on every authenticated request. Alternatively, use a short-lived access token (15 min) + refresh token stored server-side.

---

### 4. Staking amounts are stored as display strings, not numbers

The governance contract stores staking amounts as `uint256` (wei), but the API formats them as display strings (e.g., `"5.0"` ETH). If frontend logic tries to do math on these strings, it will produce wrong results.

**Fix:** Return raw numeric values alongside formatted strings, or clearly document that amounts are display-only.

---

## High

### 5. No input validation library

Every route validates inputs manually. This is inconsistent, verbose, and easy to forget (some routes have no validation at all). Missing validation on `chain`, `platform`, `method`, `vote` fields means unexpected enum values could be submitted.

**Fix:** Add [Zod](https://zod.dev/) for request schema validation:

```typescript
import { z } from "zod";
const CreateIdentityBody = z.object({
    displayName: z.string().min(1).max(64),
    address:     z.string().min(4),
});
const { displayName, address } = CreateIdentityBody.parse(req.body); // throws if invalid
```

---

### 6. Verification flow is permanently stuck at `"pending"`

`POST /:address/verify` sets the status to `"pending"`. There is no admin endpoint or webhook to advance it to `"verified"`. The frontend verification wizard can never complete.

**Fix:** Add a privileged `PATCH /api/admin/verification/:address` endpoint (protected by an admin secret or a separate admin JWT role) to approve/reject verifications. Alternatively, auto-approve for MVP with a comment.

---

### 7. No tests

There are zero unit tests, integration tests, or end-to-end tests. Any refactor or new feature can silently break existing routes.

**Fix:** Add at minimum:

- Unit tests for contract-client helpers (enum mappers, initialization)
- Integration tests for auth flows using `supertest` + local Hardhat node
- Route smoke tests for all endpoints

```bash
npm install --save-dev jest @types/jest supertest @types/supertest ts-jest
```

---

### 8. No API versioning

All routes are mounted at `/api/*` with no version segment. Any breaking change in a route shape will immediately break all clients.

**Fix:** Mount at `/api/v1/*` from the start. This is trivial now and very hard to retrofit later.

---

### 9. No logging middleware

There is no request/response logging. In production it will be impossible to debug issues, trace slow requests, or detect attacks.

**Fix:**

```bash
npm install morgan @types/morgan
```

```typescript
import morgan from "morgan";
app.use(morgan("combined")); // or "dev" for local
```

---

### 10. `/health` endpoint should verify contract connectivity

The health endpoint checks chain connectivity but should also verify that contract calls succeed (e.g., a simple view call).

**Fix:**

```typescript
app.get("/health", async (_req, res) => {
    try {
        const { identity } = getContracts();
        await identity.getPlatformStats(); // quick view call
        res.json({ status: "ok", chain: "connected", timestamp: new Date().toISOString() });
    } catch {
        res.status(503).json({ status: "error", chain: "unavailable" });
    }
});
```

---

### 11. Backend signer signs all transactions

Currently the backend's `BACKEND_WALLET_KEY` is used to sign all write transactions. This means:
- All on-chain actions appear to come from one address
- The backend wallet needs ETH for gas
- The backend private key is a single point of failure

**Fix:** In production, the frontend should sign transactions with the user's wallet. The backend should serve as a read gateway only, or use meta-transactions (EIP-2771) for gasless user transactions.

---

## Medium

### 12. `stats` endpoint reads from on-chain counters

The `getPlatformStats()` contract function returns real counts, but network-level stats (e.g., parachain count) would need to come from an external API or indexer.

**Fix:** Clearly label external data estimates vs. on-chain data in the API response.

---

### 13. Staking APY trend data is simulated

The governance route returns placeholder `stakingApyTrend` values. This data is displayed as a chart on the frontend.

**Fix:** Integrate with a real staking data source or clearly mark simulated fields with a `_simulated: true` flag in the response.

---

### 14. `score_change` computation

The `scoreChange` field is returned from the contract's `DIDDocument` struct but may not be dynamically recomputed on every read.

**Fix:** Track score changes by comparing before/after values on mutation operations.

---

### 15. No refresh token mechanism

JWT_EXPIRES_IN defaults to 7 days. After expiry the user is silently logged out. There is no silent refresh, no refresh token, and no mechanism for the frontend to detect and handle token expiry gracefully.

**Fix:** Implement a refresh token endpoint or shorten access token to 1 hour and add `POST /api/auth/refresh`.

---

### 16. `REQUIRE_AUTH=false` ships as the default, but there is no startup warning

The server defaults to unauthenticated operation with no prominent warning in the logs. A developer deploying this to a staging/production environment might not notice.

**Fix:** Add a visible warning when `REQUIRE_AUTH` is false:

```typescript
if (process.env.REQUIRE_AUTH !== "true") {
    console.warn("[PolkaMe] ⚠  REQUIRE_AUTH=false — JWT auth is NOT enforced. Do not use in production.");
}
```

---

### 17. No HTTPS / TLS configuration

The server binds to plain HTTP on `PORT`. Any deployment without a reverse proxy (nginx, Caddy) will serve credentials over an unencrypted connection.

**Fix:** Document that the server must be deployed behind TLS (reverse proxy or Caddy autocert). Consider adding an `HTTPS_CERT` / `HTTPS_KEY` option for standalone TLS.

---

### 18. `proposals.ts` POST allows unauthenticated proposal creation

Any anonymous client can spam governance proposals via the API. The on-chain contract requires a DID but the API gateway has no auth check.

**Fix:** Add `requireAuth` middleware to `POST /proposals` and `POST /proposals/:id/vote`.

---

## Low

### 19. No OpenAPI / Swagger documentation

There is a handwritten `README.md` table but no machine-readable spec. Frontend clients cannot auto-generate typed fetch wrappers.

**Fix:** Add `swagger-jsdoc` + `swagger-ui-express`, or use a typed router like `trpc` or hand-author an `openapi.yaml`.

---

### 20. `activity_log` grows unbounded on-chain

Every action appends to the on-chain array. There is no pruning. Long-running accounts will generate large arrays that become expensive to read.

**Fix:** Implement pagination limits on reads and consider archiving old entries off-chain via an indexer.

---

### 21. No environment variable validation on startup

If `JWT_SECRET` is the placeholder string or `PORT` is not a number, the server starts silently and produces broken behaviour.

**Fix:** Add startup assertions:

```typescript
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a 32+ character random string");
}
```

---

## Summary Table

| # | Severity | Issue |
| --- | --- | --- |
| 1 | Critical | No request body size limit |
| 2 | Critical | Error messages expose internal details |
| 3 | Critical | No JWT revocation / logout |
| 4 | Critical | Staking amounts stored as display strings |
| 5 | High | No input validation library (Zod) |
| 6 | High | Verification permanently stuck at `"pending"` |
| 7 | High | No tests |
| 8 | High | No API versioning |
| 9 | High | No request logging middleware |
| 10 | High | `/health` should verify contract calls |
| 11 | High | Backend signer signs all transactions |
| 12 | Medium | Stats endpoint mixes on-chain and estimated data |
| 13 | Medium | Staking APY trend is simulated |
| 14 | Medium | `score_change` computation |
| 15 | Medium | No refresh token mechanism |
| 16 | Medium | No visible warning when `REQUIRE_AUTH=false` |
| 17 | Medium | No HTTPS / TLS configuration |
| 18 | Medium | Anonymous proposal creation allowed |
| 19 | Low | No OpenAPI spec |
| 20 | Low | `activity_log` grows unbounded on-chain |
| 21 | Low | No startup env var validation |
