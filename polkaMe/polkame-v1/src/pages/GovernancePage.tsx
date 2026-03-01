import { useEffect, useState } from "react";
import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { client } from "../client";
import { Badge } from "../components/common";
import {
  getStakingMetrics,
  getActiveProposals,
  getValidators,
  voteOnProposal,
  claimStakingRewards,
  stakeTokens,
  createProposal,
} from "../api";
import { ensureHardhatNetwork, resetSigner } from "../contracts";
import type { StakingMetrics, Proposal, Validator } from "../types";

export default function GovernancePage() {
  const activeAccount = useActiveAccount();
  const [metrics, setMetrics] = useState<StakingMetrics | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Modal states ────────────────────────────────────────────
  const [showStake, setShowStake] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("");
  const [staking, setStaking] = useState(false);
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({ title: "", description: "", days: "7" });
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [voting, setVoting] = useState<string | null>(null); // id being voted on
  const [claiming, setClaiming] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      if (!activeAccount?.address) { setLoading(false); return; }
      await ensureHardhatNetwork();
      const [m, p, v] = await Promise.all([
        getStakingMetrics(activeAccount?.address),
        getActiveProposals(),
        getValidators(),
      ]);
      if (m.success) setMetrics(m.data);
      if (p.success) setProposals(p.data);
      if (v.success) setValidators(v.data);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (activeAccount?.address) { resetSigner(); loadAll(); }
  }, [activeAccount?.address]);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (eth) {
      const handler = () => { resetSigner(); loadAll(); };
      eth.on("accountsChanged", handler);
      return () => eth.removeListener("accountsChanged", handler);
    }
  }, []);

  async function handleStake() {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
    setStaking(true);
    const res = await stakeTokens(stakeAmount);
    if (res.success) {
      setShowStake(false); setStakeAmount("");
      await loadAll();
    } else { alert("Stake error: " + res.error); }
    setStaking(false);
  }

  async function handleCreateProposal() {
    if (!proposalForm.title.trim() || !proposalForm.description.trim()) return;
    setCreatingProposal(true);
    const res = await createProposal(proposalForm.title, proposalForm.description, parseInt(proposalForm.days) || 7);
    if (res.success) {
      setShowNewProposal(false); setProposalForm({ title: "", description: "", days: "7" });
      await loadAll();
    } else { alert("Proposal error: " + res.error); }
    setCreatingProposal(false);
  }

  async function handleVote(id: string, vote: "aye" | "nay") {
    setVoting(id);
    const res = await voteOnProposal(id, vote);
    if (!res.success) alert("Vote error: " + res.error);
    await loadAll();
    setVoting(null);
  }

  async function handleClaim() {
    setClaiming(true);
    const res = await claimStakingRewards();
    if (res.success) { await loadAll(); } else { alert("Claim error: " + res.error); }
    setClaiming(false);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <span className="material-symbols-outlined text-6xl text-red-400">error</span>
        <p className="text-red-400 text-lg font-bold">{error}</p>
        <button onClick={loadAll} className="px-6 py-2 bg-primary text-white rounded-lg font-bold">Retry</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-20 animate-fade-in-up">
        <div className="size-24 bg-primary/20 rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-primary">how_to_vote</span>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black">Connect &amp; Participate</h2>
          <p className="text-text-muted mt-2 max-w-md">Connect your wallet to access governance features.</p>
        </div>
        <ConnectButton client={client} appMetadata={{ name: "PolkaMe", url: "https://polkame.io" }} />
      </div>
    );
  }

  return (
    <>
      {/* ─── Stake Modal ──────────────────────────────────── */}
      {showStake && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setShowStake(false)}>
          <div className="bg-background-dark border border-neutral-border rounded-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Stake Tokens</h3>
            <input type="number" step="0.01" min="0" placeholder="Amount in DOT" value={stakeAmount}
              onChange={e => setStakeAmount(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted" />
            <div className="flex gap-2">
              <button onClick={() => setShowStake(false)} className="flex-1 h-10 bg-neutral-border rounded-lg font-bold text-sm">Cancel</button>
              <button onClick={handleStake} disabled={staking || !stakeAmount}
                className="flex-1 h-10 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center">
                {staking ? <div className="animate-spin size-5 border-2 border-white border-t-transparent rounded-full" /> : "Stake"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── New Proposal Modal ───────────────────────────── */}
      {showNewProposal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setShowNewProposal(false)}>
          <div className="bg-background-dark border border-neutral-border rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Create Proposal</h3>
            <input placeholder="Proposal title" value={proposalForm.title}
              onChange={e => setProposalForm({ ...proposalForm, title: e.target.value })}
              className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted" />
            <textarea placeholder="Describe your proposal..." rows={4} value={proposalForm.description}
              onChange={e => setProposalForm({ ...proposalForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted resize-none" />
            <input type="number" min="1" placeholder="Duration (days)" value={proposalForm.days}
              onChange={e => setProposalForm({ ...proposalForm, days: e.target.value })}
              className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted" />
            <div className="flex gap-2">
              <button onClick={() => setShowNewProposal(false)} className="flex-1 h-10 bg-neutral-border rounded-lg font-bold text-sm">Cancel</button>
              <button onClick={handleCreateProposal} disabled={creatingProposal || !proposalForm.title.trim()}
                className="flex-1 h-10 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center">
                {creatingProposal ? <div className="animate-spin size-5 border-2 border-white border-t-transparent rounded-full" /> : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Metric cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Total Staked"
          value={metrics?.totalStaked ?? "—"}
          unit="DOT"
          className="animate-fade-in-up stagger-1"
          footnote={
            <button
              onClick={() => setShowStake(true)}
              className="text-primary text-sm font-bold hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              Stake More
            </button>
          }
        />
        <MetricCard
          label="Claimable Rewards"
          value={metrics?.claimableRewards ?? "—"}
          unit="DOT"
          className="animate-fade-in-up stagger-2"
          footnote={
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="text-primary text-sm font-bold hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              {claiming ? (
                <div className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full" />
              ) : (
                <>Claim All Rewards</>
              )}
            </button>
          }
        />
        <MetricCard
          label="Active Voting Power"
          value={metrics?.votingPower ?? "—"}
          unit="VP"
          className="animate-fade-in-up stagger-3"
          footnote={
            <span className="text-slate-400 text-sm">
              Weight: {metrics?.votingWeight}
            </span>
          }
        />
      </div>

      {/* ─── Charts row ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* APY trend */}
        <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in-up hover-glow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Staking APY Trend</h3>
            <span className="text-primary font-bold">
              {metrics?.currentApy ?? "—"}%
            </span>
          </div>
          <div className="h-48 flex items-end gap-2">
            {(metrics?.stakingApyTrend ?? Array(7).fill(0)).map((v, i) => (
              <div
                key={i}
                className="flex-1 bg-primary rounded-t-sm origin-bottom animate-bar-grow"
                style={{ height: `${v}%`, opacity: 0.2 + (i / 10), animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-slate-400">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>

        {/* Voting participation */}
        <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in-up stagger-2 hover-glow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Voting Participation</h3>
            <span className="text-primary font-bold">
              {metrics?.participationPct ?? "—"}%
            </span>
          </div>
          <div className="relative h-48 flex items-center justify-center">
            <svg className="size-40 rotate-[-90deg]" viewBox="0 0 160 160">
              <circle
                className="text-primary/10"
                cx="80"
                cy="80"
                r="70"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="12"
              />
              <circle
                className="text-primary animate-draw-circle"
                cx="80"
                cy="80"
                r="70"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray="440"
                strokeDashoffset={
                  440 - (440 * (metrics?.participationPct ?? 0)) / 100
                }
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">
                {metrics?.totalVotes ?? "—"}
              </span>
              <span className="text-xs text-slate-400">Total Votes</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Active Proposals ──────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Active Proposals</h3>
          <button
            onClick={() => setShowNewProposal(true)}
            className="text-primary text-sm font-semibold flex items-center gap-1 hover:underline"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Proposal
          </button>
        </div>
        <div className="space-y-4">
          {proposals.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              <span className="material-symbols-outlined text-4xl mb-2">how_to_vote</span>
              <p>No proposals yet. Be the first to create one!</p>
            </div>
          )}
          {proposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              voting={voting === p.id}
              onVote={(id, vote) => handleVote(id, vote)}
            />
          ))}
        </div>
      </div>

      {/* ─── Validators table ──────────────────────────────── */}
      <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 overflow-hidden animate-fade-in-up">
        <h3 className="text-xl font-bold mb-6">Era Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-primary/10">
                <th className="pb-4 px-2">Validator</th>
                <th className="pb-4 px-2">Commission</th>
                <th className="pb-4 px-2 text-right">Self-Stake</th>
                <th className="pb-4 px-2 text-right">Rewards (24h)</th>
                <th className="pb-4 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {validators.map((v) => (
                <tr key={v.id}>
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                        {v.initials}
                      </div>
                      <span className="font-medium">{v.shortName}</span>
                    </div>
                  </td>
                  <td className="py-4 px-2">{v.commission}</td>
                  <td className="py-4 px-2 text-right">{v.selfStake}</td>
                  <td className="py-4 px-2 text-right text-emerald-500 font-medium">
                    {v.rewards24h}
                  </td>
                  <td className="py-4 px-2 text-right">
                    <Badge variant="success">{v.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ─── Sub-components ───────────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  unit,
  footnote,
  className = "",
}: {
  label: string;
  value: string;
  unit: string;
  footnote: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-6 rounded-xl bg-primary/5 border border-primary/20 hover-lift hover-glow ${className}`}>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <h3 className="text-3xl font-bold mt-1">
        {value} <span className="text-primary text-xl">{unit}</span>
      </h3>
      <div className="mt-2">{footnote}</div>
    </div>
  );
}

const TAG_COLORS: Record<string, string> = {
  amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
  blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
  green: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600",
  red: "bg-red-100 dark:bg-red-900/30 text-red-600",
};

function ProposalCard({
  proposal,
  voting,
  onVote,
}: {
  proposal: Proposal;
  voting: boolean;
  onVote: (id: string, vote: "aye" | "nay") => void;
}) {
  return (
    <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 hover:border-primary/40 hover-lift transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${TAG_COLORS[proposal.tagColor]}`}
            >
              {proposal.tag}
            </span>
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">
                schedule
              </span>
              Ending in {proposal.endsIn}
            </span>
          </div>
          <h4 className="text-lg font-bold mb-2">{proposal.title}</h4>
          <p className="text-sm text-slate-400 line-clamp-2">
            {proposal.description}
          </p>
        </div>
        <div className="w-full md:w-64 space-y-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-emerald-500">
              Aye {proposal.ayePct}%
            </span>
            <span className="font-medium text-rose-500">
              Nay {proposal.nayPct}%
            </span>
          </div>
          <div className="h-2 w-full bg-primary/10 rounded-full flex overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${proposal.ayePct}%` }}
            />
            <div
              className="h-full bg-rose-500"
              style={{ width: `${proposal.nayPct}%` }}
            />
          </div>
          <div className="flex gap-2">
            {voting ? (
              <div className="flex-1 flex items-center justify-center py-2">
                <div className="animate-spin size-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                <button
                  onClick={() => onVote(proposal.id, "aye")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-bold shadow-lg"
                >
                  Aye
                </button>
                <button
                  onClick={() => onVote(proposal.id, "nay")}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg text-sm font-bold shadow-lg"
                >
                  Nay
                </button>
              </>
            )}
            <button className="px-3 py-2 border border-primary/20 rounded-lg hover:bg-primary/5">
              <span className="material-symbols-outlined text-sm">share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
