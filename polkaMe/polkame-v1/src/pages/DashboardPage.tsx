import { useEffect, useState } from "react";
import { Badge } from "../components/common";
import {
  getUserIdentity,
  getVerificationStatus,
  getLinkedChainAccounts,
  getLinkedSocialAccounts,
  getRecentActivity,
  getAuthorizedDApps,
} from "../api";
import type {
  Identity,
  VerificationStatus,
  LinkedChainAccount,
  LinkedSocialAccount,
  ActivityEntry,
  AuthorizedDApp,
} from "../types";

export default function DashboardPage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [chains, setChains] = useState<LinkedChainAccount[]>([]);
  const [socials, setSocials] = useState<LinkedSocialAccount[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [dApps, setDApps] = useState<AuthorizedDApp[]>([]);

  useEffect(() => {
    getUserIdentity().then((r) => r.success && setIdentity(r.data));
    getVerificationStatus().then((r) => r.success && setVerification(r.data));
    getLinkedChainAccounts().then((r) => r.success && setChains(r.data));
    getLinkedSocialAccounts().then((r) => r.success && setSocials(r.data));
    getRecentActivity().then((r) => r.success && setActivity(r.data));
    getAuthorizedDApps().then((r) => r.success && setDApps(r.data));
  }, []);

  return (
    <>
      {/* ─── Title row ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-6 animate-fade-in-down">
        <div>
          <h3 className="text-3xl font-black tracking-tight">
            Identity Overview
          </h3>
          <p className="text-text-muted mt-1">
            Manage your decentralized identifiers and linked cross-chain
            accounts.
          </p>
        </div>
        <button className="h-11 px-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] hover-glow">
          <span className="material-symbols-outlined">add</span>
          Create New ID
        </button>
      </div>

      {/* ─── Score + Verification ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score card */}
        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-neutral-muted to-background-dark border border-neutral-border rounded-xl p-6 flex flex-col justify-between animate-fade-in-up hover-glow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-text-muted font-medium text-sm">
                Total Identity Strength
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-5xl font-black">
                  {identity?.score ?? "—"}
                </span>
                <span className="text-text-muted text-xl font-bold">/ 100</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <Badge variant="success">
                +{identity?.scoreChange ?? 0}% this week
              </Badge>
              <div className="w-32 h-2 bg-neutral-border rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${identity?.score ?? 0}%` }}
                />
              </div>
            </div>
          </div>
          <p className="mt-6 text-sm text-text-muted max-w-md">
            Your identity score is "Excellent". Link your Twitter and Github to
            reach the 95+ VIP threshold.
          </p>
        </div>

        {/* Verification status */}
        <div className="bg-neutral-muted border border-neutral-border rounded-xl p-6 flex flex-col gap-4 animate-fade-in-up stagger-2">
          <h4 className="font-bold text-sm uppercase tracking-wider text-text-muted">
            Verification Status
          </h4>
          <div className="space-y-3">
            {verification &&
              (
                Object.entries(verification) as [string, string][]
              ).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined text-sm ${
                        val === "verified"
                          ? "text-primary"
                          : "text-text-muted"
                      }`}
                    >
                      {val === "verified" ? "check_circle" : "circle"}
                    </span>
                    <span className="capitalize">{key}</span>
                  </span>
                  <span
                    className={
                      val === "verified"
                        ? "text-primary font-medium"
                        : "text-text-muted italic"
                    }
                  >
                    {val === "verified"
                      ? "Verified"
                      : val === "pending"
                        ? "Pending"
                        : "—"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ─── Accounts & dApps grid ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Linked accounts */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <h4 className="text-xl font-bold animate-fade-in">Linked Accounts</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {chains.map((c) => (
              <ChainCard key={c.id} account={c} />
            ))}
            {socials.map((s) => (
              <SocialCard key={s.id} account={s} />
            ))}
            {/* Add button */}
            <button className="border border-dashed border-neutral-border p-4 rounded-xl hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center gap-2 group hover:border-primary/50 hover:scale-[1.02]">
              <span className="material-symbols-outlined text-text-muted group-hover:text-primary transition-all duration-300 scale-125 group-hover:rotate-90">
                add_circle
              </span>
              <span className="text-sm font-bold text-text-muted group-hover:text-primary">
                Link New Account
              </span>
            </button>
          </div>

          {/* Recent Activity */}
          <div className="mt-8">
            <h4 className="text-xl font-bold mb-4 animate-fade-in">Recent Activity</h4>
            <div className="bg-neutral-muted/30 border border-neutral-border rounded-xl overflow-hidden animate-fade-in-up">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-muted text-text-muted font-medium uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">App / Service</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border">
                  {activity.map((a) => (
                    <tr
                      key={a.id}
                      className="hover:bg-neutral-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-lg">
                          {a.icon}
                        </span>
                        {a.action}
                      </td>
                      <td className="px-6 py-4">{a.app}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            a.status === "success"
                              ? "success"
                              : a.status === "pending"
                                ? "info"
                                : "danger"
                          }
                        >
                          {a.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-text-muted">
                        {a.timestamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Authorized dApps */}
        <div className="lg:col-span-4 flex flex-col gap-4 animate-slide-in-right">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-bold">Authorized dApps</h4>
            <a
              href="#"
              className="text-primary text-xs font-bold hover:underline"
            >
              Manage All
            </a>
          </div>
          <div className="bg-neutral-muted/30 border border-neutral-border rounded-xl p-4 flex flex-col gap-4">
            {dApps.map((d, i) => (
              <div key={d.id}>
                <div className="flex items-center gap-3 group">
                  <div className="size-12 rounded-lg bg-background-dark flex items-center justify-center border border-neutral-border overflow-hidden">
                    <div
                      className={`${d.logoBgColor} size-full flex items-center justify-center text-white font-bold`}
                    >
                      {d.logoLetter}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{d.name}</p>
                    <p className="text-xs text-text-muted">
                      Last login: {d.lastLogin}
                    </p>
                  </div>
                  <button className="size-8 rounded flex items-center justify-center text-text-muted hover:text-red-400 transition-colors">
                    <span className="material-symbols-outlined text-xl">
                      block
                    </span>
                  </button>
                </div>
                {i < dApps.length - 1 && (
                  <div className="h-px bg-neutral-border mt-4" />
                )}
              </div>
            ))}
            <button className="w-full py-2 bg-neutral-border hover:bg-neutral-border/80 text-xs font-bold rounded-lg transition-colors mt-2">
              VIEW 12 MORE DAPPS
            </button>
          </div>

          {/* Security tip */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mt-4 animate-fade-in-up hover-glow">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-primary">
                security
              </span>
              <div>
                <p className="text-sm font-bold text-primary">
                  Pro-tip: Rotate keys
                </p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Regularly rotating your proxy keys increases identity security
                  against physical device theft.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Sub-components ───────────────────────────────────────────────── */

function ChainCard({ account }: { account: LinkedChainAccount }) {
  return (
    <div className="bg-neutral-muted/50 border border-neutral-border p-4 rounded-xl hover:border-primary/50 hover-lift transition-all duration-300 cursor-pointer group">
      <div className="flex justify-between mb-3">
        <div
          className={`size-10 ${account.logoColor} rounded-lg flex items-center justify-center group-hover:rotate-6 transition-transform duration-300`}
        >
          <span className="material-symbols-outlined text-white text-xl">
            currency_bitcoin
          </span>
        </div>
        <span className="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors">
          open_in_new
        </span>
      </div>
      <p className="font-bold">{account.label}</p>
      <p className="text-xs text-text-muted font-mono mt-1">
        {account.address}
      </p>
      <div className="mt-4 flex justify-between items-center text-xs">
        <span className="text-primary font-bold">{account.balance}</span>
        <span className="text-text-muted">{account.tag}</span>
      </div>
    </div>
  );
}

function SocialCard({ account }: { account: LinkedSocialAccount }) {
  return (
    <div className="bg-neutral-muted/50 border border-neutral-border p-4 rounded-xl hover:border-primary/50 hover-lift transition-all duration-300 cursor-pointer group">
      <div className="flex justify-between mb-3">
        <div className="size-10 bg-sky-500 rounded-lg flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
          <span className="material-symbols-outlined text-white">
            alternate_email
          </span>
        </div>
        {account.verified && (
          <span className="material-symbols-outlined text-emerald-400 text-sm">
            verified
          </span>
        )}
      </div>
      <p className="font-bold capitalize">{account.platform}</p>
      <p className="text-xs text-text-muted mt-1">{account.handle}</p>
      <div className="mt-4 text-xs">
        <span className="text-text-muted">
          Linked: {new Date(account.linkedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
