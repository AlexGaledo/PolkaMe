import { useEffect, useState } from "react";
import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { client } from "../client";
import { Badge } from "../components/common";
import {
  getUserIdentity,
  getVerificationStatus,
  getLinkedChainAccounts,
  getLinkedSocialAccounts,
  getRecentActivity,
  getAuthorizedDApps,
  checkHasDID,
  createDID,
  linkChainAccountFull,
  linkSocialAccountAPI,
  revokeDApp,
  authorizeDApp,
  searchUser,
} from "../api";
import { ensureHardhatNetwork, resetSigner } from "../contracts";
import type {
  Identity,
  VerificationStatus,
  LinkedChainAccount,
  LinkedSocialAccount,
  ActivityEntry,
  AuthorizedDApp,
} from "../types";

export default function DashboardPage() {
  const activeAccount = useActiveAccount();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [chains, setChains] = useState<LinkedChainAccount[]>([]);
  const [socials, setSocials] = useState<LinkedSocialAccount[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [dApps, setDApps] = useState<AuthorizedDApp[]>([]);
  const [hasDID, setHasDID] = useState<boolean | null>(null); // null = loading
  const [creating, setCreating] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Modal states ────────────────────────────────────────────
  const [showLinkChain, setShowLinkChain] = useState(false);
  const [showLinkSocial, setShowLinkSocial] = useState(false);
  const [chainForm, setChainForm] = useState({ chain: "polkadot", label: "", address: "", tag: "Primary" });
  const [socialForm, setSocialForm] = useState({ platform: "twitter" as "twitter"|"discord"|"github", handle: "" });
  const [showAuthDApp, setShowAuthDApp] = useState(false);
  const [dAppForm, setDAppForm] = useState({ name: "", address: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Identity[] | undefined>(undefined);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const addr = activeAccount?.address;
      if (!addr) { setLoading(false); return; }
      await ensureHardhatNetwork();
      const has = await checkHasDID(addr);
      setHasDID(has);
      if (!has) { setLoading(false); return; }
      const [id, ver, ch, so, act, da] = await Promise.all([
        getUserIdentity(addr),
        getVerificationStatus(addr),
        getLinkedChainAccounts(addr),
        getLinkedSocialAccounts(addr),
        getRecentActivity(addr),
        getAuthorizedDApps(addr),
      ]);
      if (id.success) setIdentity(id.data);
      if (ver.success) setVerification(ver.data);
      if (ch.success) setChains(ch.data);
      if (so.success) setSocials(so.data);
      if (act.success) setActivity(act.data);
      if (da.success) setDApps(da.data);
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (activeAccount?.address) {
      resetSigner();
      loadAll();
    }
  }, [activeAccount?.address]);

  // Also reload on MetaMask account changes not caught by ThirdWeb
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (eth) {
      const handler = () => { resetSigner(); loadAll(); };
      eth.on("accountsChanged", handler);
      return () => eth.removeListener("accountsChanged", handler);
    }
  }, []);

  async function handleCreateDID() {
    if (!nameInput.trim()) return;
    setCreating(true);
    try { await ensureHardhatNetwork(); } catch (e: any) { alert(e.message); setCreating(false); return; }
    const res = await createDID(nameInput.trim());
    if (res.success) {
      setHasDID(true);
      setIdentity(res.data);
      await loadAll();
    } else {
      alert("Error: " + res.error);
    }
    setCreating(false);
  }

  async function handleLinkChain() {
    if (!chainForm.label || !chainForm.address) return;
    const res = await linkChainAccountFull(chainForm.chain, chainForm.label, chainForm.address, chainForm.tag);
    if (res.success) {
      setShowLinkChain(false);
      setChainForm({ chain: "polkadot", label: "", address: "", tag: "Primary" });
      getLinkedChainAccounts(activeAccount?.address).then((r) => { if (r.success) setChains(r.data); });
    } else {
      alert("Error: " + res.error);
    }
  }

  async function handleLinkSocial() {
    if (!socialForm.handle) return;
    const res = await linkSocialAccountAPI(socialForm.platform, socialForm.handle);
    if (res.success) {
      setShowLinkSocial(false);
      setSocialForm({ platform: "twitter", handle: "" });
      getLinkedSocialAccounts(activeAccount?.address).then((r) => { if (r.success) setSocials(r.data); });
    } else {
      alert("Error: " + res.error);
    }
  }

  async function handleRevokeDApp(id: string) {
    if (!confirm("Revoke this dApp?")) return;
    const res = await revokeDApp(id);
    if (res.success) {
      getAuthorizedDApps(activeAccount?.address).then((r) => { if (r.success) setDApps(r.data); });
    }
  }

  async function handleAuthorizeDApp() {
    if (!dAppForm.name.trim() || !dAppForm.address.trim()) return;
    const res = await authorizeDApp(dAppForm.name.trim(), dAppForm.address.trim());
    if (res.success) {
      setShowAuthDApp(false);
      setDAppForm({ name: "", address: "" });
      getAuthorizedDApps(activeAccount?.address).then((r) => { if (r.success) setDApps(r.data); });
    } else {
      alert("Error: " + res.error);
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query || query.length < 3) { setSearchResult(undefined); return; }
    const res = await searchUser(query);
    setSearchResult(res.success ? res.data : []);
  }

  // ── Error / Loading states ──────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <span className="material-symbols-outlined text-6xl text-red-400">error</span>
        <p className="text-red-400 text-lg font-bold">{error}</p>
        <button onClick={loadAll} className="px-6 py-2 bg-primary text-white rounded-lg font-bold">
          Retry
        </button>
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

  // ── Not connected ───────────────────────────────────────────
  if (!activeAccount) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-20 animate-fade-in-up">
        <div className="size-24 bg-primary/20 rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-primary">account_balance_wallet</span>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black">Connect &amp; Create Your Identity</h2>
          <p className="text-text-muted mt-2 max-w-md">
            Connect your wallet to access your decentralized identity on PolkaMe.
          </p>
        </div>
        <ConnectButton client={client} appMetadata={{ name: "PolkaMe", url: "https://polkame.io" }} />
      </div>
    );
  }

  // ── No DID — onboarding ─────────────────────────────────────
  if (!hasDID) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-20 animate-fade-in-up">
        <div className="size-24 bg-primary/20 rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-primary">person_add</span>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black">Welcome to PolkaMe</h2>
          <p className="text-text-muted mt-2 max-w-md">
            Create your decentralized identity to get started. This will register
            a DID on-chain tied to your wallet address.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <input
            type="text"
            placeholder="Enter your display name..."
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateDID()}
            className="h-12 px-4 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleCreateDID}
            disabled={creating || !nameInput.trim()}
            className="h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {creating ? (
              <div className="animate-spin size-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <span className="material-symbols-outlined">add</span>
                Create Your Identity
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ─── Search results overlay ────────────────────────── */}
      {searchResult !== undefined && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setSearchResult(undefined)}>
          <div className="bg-background-dark border border-neutral-border rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Search Results</h3>
            {searchResult.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {searchResult.map((r) => {
                  const isYou = activeAccount?.address?.toLowerCase() === r.walletAddress.toLowerCase();
                  return (
                    <div key={r.walletAddress} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-muted/50 hover:bg-neutral-muted transition-colors">
                      <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {r.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate">{r.displayName}</p>
                          {isYou && <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full">You</span>}
                        </div>
                        <p className="text-xs text-text-muted font-mono truncate">{r.walletAddress}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{r.score}</p>
                        <p className="text-[10px] text-text-muted">Score</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-text-muted">No user found matching that query.</p>
            )}
            <button onClick={() => setSearchResult(undefined)} className="mt-4 px-4 py-2 bg-neutral-border rounded-lg text-sm font-bold w-full">Close</button>
          </div>
        </div>
      )}

      {/* ─── Link Chain Modal ──────────────────────────────── */}
      {showLinkChain && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setShowLinkChain(false)}>
          <div className="bg-background-dark border border-neutral-border rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Link Chain Account</h3>
            <select value={chainForm.chain} onChange={e => setChainForm({...chainForm, chain: e.target.value})}
              className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white">
              <option value="polkadot">Polkadot</option>
              <option value="kusama">Kusama</option>
              <option value="astar">Astar</option>
              <option value="moonbeam">Moonbeam</option>
              <option value="custom">Other</option>
            </select>
            <input placeholder="Label (e.g. My Wallet)" value={chainForm.label}
              onChange={e => setChainForm({...chainForm, label: e.target.value})}
              className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted" />
            <input placeholder="Account address" value={chainForm.address}
              onChange={e => setChainForm({...chainForm, address: e.target.value})}
              className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted font-mono text-xs" />
            <input placeholder="Tag (Primary, Hot, Staking...)" value={chainForm.tag}
              onChange={e => setChainForm({...chainForm, tag: e.target.value})}
              className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted" />
            <div className="flex gap-2">
              <button onClick={() => setShowLinkChain(false)} className="flex-1 h-10 bg-neutral-border rounded-lg font-bold text-sm">Cancel</button>
              <button onClick={handleLinkChain} className="flex-1 h-10 bg-primary text-white rounded-lg font-bold text-sm">Link Account</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Link Social Modal ─────────────────────────────── */}
      {showLinkSocial && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setShowLinkSocial(false)}>
          <div className="bg-background-dark border border-neutral-border rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Link Social Account</h3>
            <select value={socialForm.platform} onChange={e => setSocialForm({...socialForm, platform: e.target.value as any})}
              className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white">
              <option value="twitter">Twitter / X</option>
              <option value="discord">Discord</option>
              <option value="github">GitHub</option>
            </select>
            <input placeholder="Handle (e.g. @yourname)" value={socialForm.handle}
              onChange={e => setSocialForm({...socialForm, handle: e.target.value})}
              className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted" />
            <div className="flex gap-2">
              <button onClick={() => setShowLinkSocial(false)} className="flex-1 h-10 bg-neutral-border rounded-lg font-bold text-sm">Cancel</button>
              <button onClick={handleLinkSocial} className="flex-1 h-10 bg-primary text-white rounded-lg font-bold text-sm">Link Account</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Authorize dApp Modal ──────────────────────────── */}
      {showAuthDApp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setShowAuthDApp(false)}>
          <div className="bg-background-dark border border-neutral-border rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Authorize dApp</h3>
            <p className="text-xs text-text-muted">Grant a decentralized application access to your PolkaMe identity.</p>
            <input placeholder="dApp Name (e.g. Astar Portal)" value={dAppForm.name}
              onChange={e => setDAppForm({...dAppForm, name: e.target.value})}
              className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted" />
            <input placeholder="dApp Contract Address (0x...)" value={dAppForm.address}
              onChange={e => setDAppForm({...dAppForm, address: e.target.value})}
              className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted" />
            <div className="flex gap-2">
              <button onClick={() => setShowAuthDApp(false)} className="flex-1 h-10 bg-neutral-border rounded-lg font-bold text-sm">Cancel</button>
              <button onClick={handleAuthorizeDApp} className="flex-1 h-10 bg-primary text-white rounded-lg font-bold text-sm">Authorize</button>
            </div>
          </div>
        </div>
      )}

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
        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch(searchQuery)}
            placeholder="Search by 0x address..."
            className="h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted text-sm w-60"
          />
          <button
            onClick={() => handleSearch(searchQuery)}
            className="h-10 px-4 bg-primary/20 text-primary rounded-lg font-bold text-sm hover:bg-primary/30"
          >
            Search
          </button>
        </div>
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
            {/* Add chain button */}
            <button
              onClick={() => setShowLinkChain(true)}
              className="border border-dashed border-neutral-border p-4 rounded-xl hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center gap-2 group hover:border-primary/50 hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined text-text-muted group-hover:text-primary transition-all duration-300 scale-125 group-hover:rotate-90">
                add_circle
              </span>
              <span className="text-sm font-bold text-text-muted group-hover:text-primary">
                Link Chain Account
              </span>
            </button>
            {/* Add social button */}
            <button
              onClick={() => setShowLinkSocial(true)}
              className="border border-dashed border-neutral-border p-4 rounded-xl hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center gap-2 group hover:border-primary/50 hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined text-text-muted group-hover:text-primary transition-all duration-300 scale-125 group-hover:rotate-90">
                person_add
              </span>
              <span className="text-sm font-bold text-text-muted group-hover:text-primary">
                Link Social Account
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
            <button
              onClick={() => setShowAuthDApp(true)}
              className="text-primary text-xs font-bold hover:underline"
            >
              + Authorize
            </button>
          </div>
          <div className="bg-neutral-muted/30 border border-neutral-border rounded-xl p-4 flex flex-col gap-4">
            {dApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                <span className="material-symbols-outlined text-4xl mb-2">apps</span>
                <p className="text-sm font-medium">No authorized dApps yet</p>
                <p className="text-xs mt-1">Authorize a dApp to let it access your identity</p>
                <button
                  onClick={() => setShowAuthDApp(true)}
                  className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/80 transition-colors"
                >
                  Authorize First dApp
                </button>
              </div>
            ) : (
              dApps.map((d, i) => (
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
                    <button
                      onClick={() => handleRevokeDApp(d.id)}
                      className="size-8 rounded flex items-center justify-center text-text-muted hover:text-red-400 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">
                        block
                      </span>
                    </button>
                  </div>
                  {i < dApps.length - 1 && (
                    <div className="h-px bg-neutral-border mt-4" />
                  )}
                </div>
              ))
            )}
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
