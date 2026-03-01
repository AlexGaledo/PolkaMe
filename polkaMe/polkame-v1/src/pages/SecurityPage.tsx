import { useEffect, useState } from "react";
import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { client } from "../client";
import { Toggle, Badge } from "../components/common";
import {
  getHardwareWallets,
  getPrivacyPreferences,
  getActiveSessions,
  getSecurityLog,
  connectHardwareWallet,
  updatePrivacyPreference,
  revokeSession,
  revokeAllRemoteSessions,
  initPrivacyPrefs,
  createSession,
} from "../api";
import { ensureHardhatNetwork, resetSigner } from "../contracts";
import type {
  HardwareWallet,
  PrivacyPreference,
  ActiveSession,
  SecurityLogEntry,
} from "../types";

export default function SecurityPage() {
  const activeAccount = useActiveAccount();
  const [wallets, setWallets] = useState<HardwareWallet[]>([]);
  const [prefs, setPrefs] = useState<PrivacyPreference[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [logs, setLogs] = useState<SecurityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initingPrefs, setInitingPrefs] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [seedPassword, setSeedPassword] = useState("");
  const [seedRevealed, setSeedRevealed] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      if (!activeAccount?.address) { setLoading(false); return; }
      await ensureHardhatNetwork();
      const [hw, pp, ss, sl] = await Promise.all([
        getHardwareWallets(),
        getPrivacyPreferences(activeAccount?.address),
        getActiveSessions(activeAccount?.address),
        getSecurityLog(activeAccount?.address),
      ]);
      if (hw.success) setWallets(hw.data);
      if (pp.success) setPrefs(pp.data);
      if (ss.success) setSessions(ss.data);
      if (sl.success) setLogs(sl.data);
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

  const togglePref = async (id: string, val: boolean) => {
    setPrefs((p) =>
      p.map((pp) => (pp.id === id ? { ...pp, enabled: val } : pp)),
    );
    const res = await updatePrivacyPreference(id, val);
    if (!res.success) {
      // Revert
      setPrefs((p) => p.map((pp) => (pp.id === id ? { ...pp, enabled: !val } : pp)));
      alert("Toggle error: " + res.error);
    }
  };

  async function handleInitPrefs() {
    setInitingPrefs(true);
    const res = await initPrivacyPrefs();
    if (res.success) { await loadAll(); }
    else { alert("Init prefs error: " + res.error); }
    setInitingPrefs(false);
  }

  async function handleCreateSession() {
    setCreatingSession(true);
    const ua = navigator.userAgent;
    let device = "Desktop";
    if (ua.includes("Windows")) device = "Windows PC";
    else if (ua.includes("Mac")) device = "MacBook";
    else if (ua.includes("Linux")) device = "Linux PC";
    else if (ua.includes("iPhone")) device = "iPhone";
    else if (ua.includes("Android")) device = "Android";
    let browser = "Browser";
    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";
    const res = await createSession(device, browser, "Local");
    if (res.success) { await loadAll(); }
    else { alert("Session error: " + res.error); }
    setCreatingSession(false);
  }

  function handleRevealPhrase() {
    setShowSeedPhrase(true);
    setSeedRevealed(false);
    setSeedPassword("");
  }

  function handleConfirmReveal() {
    if (seedPassword === "polkame-demo") {
      setSeedRevealed(true);
    } else {
      alert("Incorrect password. Hint: polkame-demo");
    }
  }

  function handleDownloadEncrypted() {
    const content = [
      "PolkaMe — Encrypted Seed Phrase Backup (DEMO)",
      "================================================",
      "",
      "This is a demonstration file. In a real application,",
      "this would contain your AES-256 encrypted seed phrase.",
      "",
      `Wallet: ${activeAccount?.address || "unknown"}`,
      `Generated: ${new Date().toISOString()}`,
      `Algorithm: AES-256-GCM`,
      `Format: Base64`,
      "",
      "--- ENCRYPTED PAYLOAD (DEMO) ---",
      btoa(`demo-seed-phrase-${activeAccount?.address}-${Date.now()}`),
      "--- END ---",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "polkame-seed-backup.enc.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleRevokeSession(id: string) {
    const res = await revokeSession(id);
    if (res.success) { await loadAll(); }
    else { alert("Revoke error: " + res.error); }
  }

  async function handleRevokeAll() {
    if (!confirm("Revoke all remote sessions?")) return;
    const res = await revokeAllRemoteSessions();
    if (res.success) { await loadAll(); }
    else { alert("Error: " + res.error); }
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
          <span className="material-symbols-outlined text-5xl text-primary">security</span>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black">Connect &amp; Secure</h2>
          <p className="text-text-muted mt-2 max-w-md">Connect your wallet to manage security settings.</p>
        </div>
        <ConnectButton client={client} appMetadata={{ name: "PolkaMe", url: "https://polkame.io" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl page-enter">
      {/* Seed Phrase Modal */}
      {showSeedPhrase && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setShowSeedPhrase(false)}>
          <div className="bg-background-dark border border-neutral-border rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-red-400">warning</span>
              Reveal Seed Phrase
            </h3>
            {!seedRevealed ? (
              <>
                <p className="text-sm text-slate-400">
                  Your seed phrase is the master key to your wallet. <strong className="text-white">Never share it with anyone.</strong>
                </p>
                <p className="text-xs text-amber-400">Enter password to reveal (demo password: <code>polkame-demo</code>)</p>
                <input
                  type="password"
                  placeholder="Enter password..."
                  value={seedPassword}
                  onChange={(e) => setSeedPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmReveal()}
                  className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowSeedPhrase(false)} className="flex-1 h-10 bg-neutral-border rounded-lg font-bold text-sm">Cancel</button>
                  <button onClick={handleConfirmReveal} className="flex-1 h-10 bg-red-600 text-white rounded-lg font-bold text-sm">Reveal</button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                  <p className="text-xs text-red-400 font-bold mb-3">DO NOT share this with anyone!</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["abandon","ability","able","about","above","absent","absorb","abstract","absurd","abuse","access","accident","account","accuse","achieve","acid","acoustic","acquire","across","act","action","actor","actress","actual"].map((w, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs">
                        <span className="text-text-muted w-5 text-right">{i+1}.</span>
                        <span className="font-mono text-white">{w}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-400 mt-3 italic">This is a demo seed phrase. Real phrases are managed by your wallet (MetaMask).</p>
                </div>
                <button onClick={() => setShowSeedPhrase(false)} className="w-full h-10 bg-neutral-border rounded-lg font-bold text-sm">Close</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight">
          Advanced Protection
        </h2>
        <p className="text-text-muted max-w-2xl text-base mt-1">
          Manage your cryptographic identity, hardware integration, and access
          controls for maximum asset safety.
        </p>
      </div>

      {/* ─── Seed Phrase ───────────────────────────────────── */}
      <section className="flex flex-col gap-4 animate-fade-in-up">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary hover-wiggle">key</span>
          Seed Phrase Management
        </h3>
        <div className="bg-background-dark border border-primary/20 rounded-xl overflow-hidden shadow-sm hover-glow">
          <div className="p-6 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1 space-y-4">
              <Badge variant="danger">
                <span className="material-symbols-outlined text-sm mr-1">
                  warning
                </span>
                Critical Action
              </Badge>
              <h4 className="text-lg font-bold">Secure Backup Phrase</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your 24-word seed phrase is the only way to recover your funds
                if you lose access to this device. PolkaMe employees will never
                ask for this.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleRevealPhrase}
                  className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-md hover:opacity-90 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] hover-glow"
                >
                  Reveal Phrase
                </button>
                <button
                  onClick={handleDownloadEncrypted}
                  className="px-5 py-2.5 bg-primary/10 text-primary rounded-lg text-sm font-bold hover:bg-primary/20 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                >
                  Download Encrypted
                </button>
              </div>
            </div>
            <div className="w-full md:w-48 h-32 bg-gradient-to-br from-primary/20 to-background-dark rounded-xl flex items-center justify-center border border-dashed border-primary/40">
              <span className="material-symbols-outlined text-5xl text-primary/40 animate-float">
                lock_reset
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Hardware Wallets ──────────────────────────────── */}
      <section className="flex flex-col gap-4 animate-fade-in-up stagger-2">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary hover-wiggle">usb</span>
          Hardware Wallet Integration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wallets.map((w) => (
            <div
              key={w.id}
              className="p-5 rounded-xl border border-primary/20 bg-background-dark/40 hover:border-primary/50 hover-lift hover-glow transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="size-12 rounded-lg bg-slate-900 flex items-center justify-center text-white group-hover:rotate-6 transition-transform duration-300">
                  <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">
                    {w.icon}
                  </span>
                </div>
                <span
                  className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${
                    w.badgeVariant === "recommended"
                      ? "bg-green-500/10 text-green-500"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {w.badge}
                </span>
              </div>
              <h4 className="font-bold mb-1">{w.name}</h4>
              <p className="text-xs text-slate-400 mb-4">{w.description}</p>
              <button
                onClick={() =>
                  connectHardwareWallet(
                    w.id === "hw1" ? "ledger" : "trezor",
                  )
                }
                className="w-full py-2 border border-primary/30 rounded-lg text-xs font-bold text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98]"
              >
                Connect {w.name.split(" ")[0]}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Privacy & Sessions grid ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Privacy */}
        <section className="flex flex-col gap-4 animate-slide-in-left">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary hover-wiggle">
              privacy_tip
            </span>
            Privacy Preferences
          </h3>
          <div className="bg-background-dark border border-primary/20 rounded-xl divide-y divide-primary/10">
            {prefs.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-slate-400 mb-3">No privacy preferences initialized yet.</p>
                <button onClick={handleInitPrefs} disabled={initingPrefs}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 mx-auto">
                  {initingPrefs ? <div className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full" /> : "Initialize Preferences"}
                </button>
              </div>
            ) : prefs.map((p) => (
              <Toggle
                key={p.id}
                label={p.label}
                description={p.description}
                enabled={p.enabled}
                onChange={(v) => togglePref(p.id, v)}
              />
            ))}
          </div>
        </section>

        {/* Sessions */}
        <section className="flex flex-col gap-4 animate-slide-in-right">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary hover-wiggle">
                devices
              </span>
              Active Sessions
            </h3>
            <button onClick={handleCreateSession} disabled={creatingSession}
              className="text-primary text-xs font-bold hover:underline flex items-center gap-1 disabled:opacity-50">
              {creatingSession ? <div className="animate-spin size-3 border-2 border-primary border-t-transparent rounded-full" /> : <span className="material-symbols-outlined text-xs">add</span>}
              Register Session
            </button>
          </div>
          <div className="bg-background-dark border border-primary/20 rounded-xl overflow-hidden">
            {sessions.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-400">
                No active sessions. Click "Register Session" to add your current device.
              </div>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`p-4 flex items-center gap-3 border-b border-primary/10 ${
                  !s.isCurrent ? "opacity-70" : ""
                }`}
              >
                <span className="material-symbols-outlined text-primary">
                  {s.icon}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {s.device} &bull; {s.browser}
                  </p>
                  <p
                    className={`text-xs ${
                      s.isCurrent
                        ? "text-green-500"
                        : "text-slate-400"
                    }`}
                  >
                    {s.isCurrent
                      ? `Current Session • ${s.location}`
                      : `Last active ${s.lastActive} • ${s.location}`}
                  </p>
                </div>
                {s.isCurrent ? (
                  <Badge variant="primary">Active</Badge>
                ) : (
                  <button
                    onClick={() => handleRevokeSession(s.id)}
                    className="text-red-500 hover:text-red-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">
                      cancel
                    </span>
                  </button>
                )}
              </div>
            ))}
            <div className="p-3 bg-primary/5 text-center">
              <button
                onClick={handleRevokeAll}
                className="text-xs font-bold text-primary hover:underline"
              >
                Revoke All Remote Sessions
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ─── Security Log ──────────────────────────────────── */}
      <section className="flex flex-col gap-4 mb-10 animate-fade-in-up stagger-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary hover-wiggle">
            history_edu
          </span>
          Security Log
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-y-2">
            <thead>
              <tr className="text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr
                  key={l.id}
                  className="bg-primary/5 rounded-lg border border-primary/10"
                >
                  <td className="px-4 py-3 font-medium rounded-l-lg border-y border-l border-primary/10">
                    {l.event}
                  </td>
                  <td className="px-4 py-3 border-y border-primary/10">
                    {l.source}
                  </td>
                  <td className="px-4 py-3 text-right rounded-r-lg border-y border-r border-primary/10 text-slate-500">
                    {l.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
