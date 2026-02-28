import { useEffect, useState } from "react";
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
} from "../api";
import type {
  HardwareWallet,
  PrivacyPreference,
  ActiveSession,
  SecurityLogEntry,
} from "../types";

export default function SecurityPage() {
  const [wallets, setWallets] = useState<HardwareWallet[]>([]);
  const [prefs, setPrefs] = useState<PrivacyPreference[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [logs, setLogs] = useState<SecurityLogEntry[]>([]);

  useEffect(() => {
    getHardwareWallets().then((r) => r.success && setWallets(r.data));
    getPrivacyPreferences().then((r) => r.success && setPrefs(r.data));
    getActiveSessions().then((r) => r.success && setSessions(r.data));
    getSecurityLog().then((r) => r.success && setLogs(r.data));
  }, []);

  const togglePref = async (id: string, val: boolean) => {
    setPrefs((p) =>
      p.map((pp) => (pp.id === id ? { ...pp, enabled: val } : pp)),
    );
    await updatePrivacyPreference(id, val);
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl page-enter">
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
                <button className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-md hover:opacity-90 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] hover-glow">
                  Reveal Phrase
                </button>
                <button className="px-5 py-2.5 bg-primary/10 text-primary rounded-lg text-sm font-bold hover:bg-primary/20 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]">
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
            {prefs.map((p) => (
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
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary hover-wiggle">
              devices
            </span>
            Active Sessions
          </h3>
          <div className="bg-background-dark border border-primary/20 rounded-xl overflow-hidden">
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
                    onClick={() => revokeSession(s.id)}
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
                onClick={() => revokeAllRemoteSessions()}
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
