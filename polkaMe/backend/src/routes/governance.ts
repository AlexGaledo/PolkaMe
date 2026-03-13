/* ────────────────────────────────────────────────────────────────────
    PolkaMe — Governance Routes  (ON-CHAIN via PolkaMeGovernance contract)

    Endpoints:
      GET  /:address/staking          → governanceContract.getStakingMetrics()
      POST /:address/stake            → governanceContract.stake{value}()
      POST /:address/claim            → governanceContract.claimRewards()
      GET  /proposals                 → governanceContract.getActiveProposals()
      POST /proposals                 → governanceContract.createProposal()
      POST /proposals/:id/vote        → governanceContract.voteOnProposal()
      GET  /validators                → governanceContract.getValidators()
──────────────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { getContracts, getSignedContracts, ValidatorStatusMap } from "../contract-client.js";
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

/* ═══════════════════════════════════════════════════════════════════
    GET /:address/staking
    Reads staking metrics from the Governance contract.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/:address/staking", async (req: Request, res: Response) => {
  try {
    const evmAddress = resolveAddressOrFail(req.params.address, res);
    if (!evmAddress) return;
    const { governance } = getContracts();

    const s = await governance.getStakingMetrics(evmAddress);

    return res.json(success({
      totalStaked: ethers.formatEther(s.totalStaked),
      claimableRewards: ethers.formatEther(s.claimableRewards),
      votingPower: s.votingPower.toString(),
      votingWeight: `${Number(s.convictionMultiplier)}x`,
      stakingApyTrend: [12.0, 12.5, 13.0, 14.2, 14.0, 14.1, 14.2],
      currentApy: 14.2,
      participationPct: 67,
      totalVotes: "0",
      stakeChangePercent: 0,
    }));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
    POST /:address/stake
    Stakes tokens by sending value with the transaction.
    Body: { amount: string } (in ETH units, e.g. "5.0")
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:address/stake", async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json(fail("amount is required"));

    const value = ethers.parseEther(amount);

    const { governance } = getSignedContracts();
    const tx = await governance.stake({ value });
    await tx.wait();

    return res.json(success({ staked: true, amount, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
    POST /:address/claim
    Claims staking rewards from the Governance contract.
   ═══════════════════════════════════════════════════════════════════ */
router.post("/:address/claim", async (req: Request, res: Response) => {
  try {
    const { governance } = getSignedContracts();
    const tx = await governance.claimRewards();
    await tx.wait();

    return res.json(success({ claimed: true, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
    GET /proposals
    Returns all proposals from on-chain storage.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/proposals", async (_req: Request, res: Response) => {
  try {
    const { governance } = getContracts();
    const raw = await governance.getActiveProposals();

    const now = Math.floor(Date.now() / 1000);
    const proposals = raw.map((p: any, idx: number) => {
      const totalVotes = Number(p.ayeVotes) + Number(p.nayVotes);
      const ayePct = totalVotes > 0 ? Math.round((Number(p.ayeVotes) / totalVotes) * 100) : 50;
      const nayPct = totalVotes > 0 ? 100 - ayePct : 50;
      const endsInSeconds = Number(p.endTime) - now;
      const endsInDays = Math.max(0, Math.ceil(endsInSeconds / 86400));

      return {
        id: idx,
        refNum: Number(p.refNum),
        tag: p.tag,
        tagColor: p.active ? "#E6007A" : "#666",
        title: p.title,
        description: p.description,
        ayePct,
        nayPct,
        endsIn: endsInDays > 0 ? `${endsInDays} days` : "Ended",
        active: p.active,
        proposer: p.proposer,
      };
    });

    return res.json(success(proposals));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
    POST /proposals
    Creates a governance proposal on-chain.
    Body: { address, title, description, durationDays }
   ═══════════════════════════════════════════════════════════════════ */
router.post("/proposals", async (req: Request, res: Response) => {
  try {
    const { title, description, durationDays } = req.body;
    if (!title) return res.status(400).json(fail("title is required"));
    if (!durationDays) return res.status(400).json(fail("durationDays is required"));

    const durationSeconds = Number(durationDays) * 24 * 3600;

    const { governance } = getSignedContracts();
    const tx = await governance.createProposal(title, description || "", durationSeconds);
    await tx.wait();

    return res.json(success({ created: true, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
    POST /proposals/:id/vote
    Votes on a proposal on-chain.
    Body: { address: string, vote: "aye"|"nay" }
   ═══════════════════════════════════════════════════════════════════ */
router.post("/proposals/:id/vote", async (req: Request, res: Response) => {
  try {
    const proposalId = Number(req.params.id);
    const { vote } = req.body;
    if (!vote) return res.status(400).json(fail("vote is required (aye or nay)"));

    // Vote enum: 0=None, 1=Aye, 2=Nay
    const voteValue = vote.toLowerCase() === "aye" ? 1 : 2;

    const { governance } = getSignedContracts();
    const tx = await governance.voteOnProposal(proposalId, voteValue);
    await tx.wait();

    return res.json(success({ voted: true, vote, txHash: tx.hash }));
  } catch (err: any) {
    if (err.reason) return res.status(400).json(fail(err.reason));
    return res.status(500).json(fail(err.message));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   GET /validators
   Returns the validator set from on-chain storage.
   ═══════════════════════════════════════════════════════════════════ */
router.get("/validators", async (_req: Request, res: Response) => {
  try {
    const { governance } = getContracts();
    const raw = await governance.getValidators();

    const validators = raw.map((v: any, idx: number) => ({
      id: idx,
      shortName: v.shortName,
      initials: v.initials,
      commission: `${(Number(v.commissionBps) / 100).toFixed(1)}%`,
      selfStake: ethers.formatEther(v.selfStake),
      rewards24h: "0.00",
      status: ValidatorStatusMap[Number(v.status)] ?? "inactive",
    }));

    return res.json(success(validators));
  } catch (err: any) {
    return res.status(500).json(fail(err.message));
  }
});

export default router;
