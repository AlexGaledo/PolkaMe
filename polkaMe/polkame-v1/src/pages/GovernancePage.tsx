import { useEffect, useState } from "react";
import { Badge } from "../components/common";
import {
  getStakingMetrics,
  getActiveProposals,
  getValidators,
  voteOnProposal,
  claimStakingRewards,
} from "../api";
import type { StakingMetrics, Proposal, Validator } from "../types";

export default function GovernancePage() {
  const [metrics, setMetrics] = useState<StakingMetrics | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [validators, setValidators] = useState<Validator[]>([]);

  useEffect(() => {
    getStakingMetrics().then((r) => r.success && setMetrics(r.data));
    getActiveProposals().then((r) => r.success && setProposals(r.data));
    getValidators().then((r) => r.success && setValidators(r.data));
  }, []);

  return (
    <>
      {/* ─── Metric cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Total Staked"
          value={metrics?.totalStaked ?? "—"}
          unit="DOT"
          className="animate-fade-in-up stagger-1"
          footnote={
            <span className="text-emerald-500 text-sm font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              +{metrics?.stakeChangePercent ?? 0}% vs last era
            </span>
          }
        />
        <MetricCard
          label="Claimable Rewards"
          value={metrics?.claimableRewards ?? "—"}
          unit="DOT"
          className="animate-fade-in-up stagger-2"
          footnote={
            <button
              onClick={() => claimStakingRewards()}
              className="text-primary text-sm font-bold hover:underline"
            >
              Claim All Rewards
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
          <a
            href="#"
            className="text-primary text-sm font-semibold flex items-center gap-1 hover:underline"
          >
            View All
            <span className="material-symbols-outlined text-sm">
              arrow_forward
            </span>
          </a>
        </div>
        <div className="space-y-4">
          {proposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              onVote={(id) => voteOnProposal(id, "aye")}
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
  onVote,
}: {
  proposal: Proposal;
  onVote: (id: string) => void;
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
            <button
              onClick={() => onVote(proposal.id)}
              className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20"
            >
              Vote
            </button>
            <button className="px-3 py-2 border border-primary/20 rounded-lg hover:bg-primary/5">
              <span className="material-symbols-outlined text-sm">share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
