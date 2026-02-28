import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "../components/common";
import { getPlatformStats } from "../api";
import type { PlatformStats } from "../types";

export default function LandingPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    getPlatformStats().then((r) => r.success && setStats(r.data));
  }, []);

  return (
    <>
      {/* ─── Hero ──────────────────────────────────────────── */}
      <section className="relative pt-20 pb-16 px-6 lg:pt-32 lg:pb-24">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Text column */}
          <div className="flex flex-col gap-8 text-left animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Live on Polkadot Mainnet
              </span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-100 animate-fade-in-up stagger-2">
              Your Sovereign <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-400 gradient-text-animated">
                Identity
              </span>{" "}
              on Polkadot
            </h1>

            <p className="text-lg lg:text-xl text-slate-400 max-w-xl leading-relaxed animate-fade-in-up stagger-3">
              Secure, interoperable, and entirely yours. Manage your digital
              footprint across the multichain ecosystem with hardware-grade
              security and zero-knowledge proofs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up stagger-4">
              <Link
                to="/dashboard"
                className="h-14 px-8 bg-primary text-white text-lg font-bold rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">
                  account_balance_wallet
                </span>
                Get Started Now
              </Link>
              <a
                href="#features"
                className="h-14 px-8 bg-white/5 border border-white/10 text-white text-lg font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center"
              >
                View Documentation
              </a>
            </div>
          </div>

          {/* Visual column */}
          <div className="relative hidden lg:block animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl opacity-20 animate-glow-pulse" />
            <div className="relative aspect-square w-full max-w-[500px] mx-auto bg-gradient-to-br from-primary/10 to-transparent rounded-3xl border border-white/10 p-8 flex items-center justify-center overflow-hidden">
              {/* Decorative graphic */}
              <div className="grid grid-cols-4 gap-3 w-full h-full opacity-30">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-primary/20 animate-pulse"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>

              {/* Floating card */}
              <div className="absolute bottom-12 left-12 right-12 bg-background-dark/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl animate-float">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">
                      verified
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-none">
                      Identity Verified
                    </p>
                    <p className="text-xs text-slate-400">
                      Secured by Substrate
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────────── */}
      <section id="ecosystem" className="py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-6">
          <StatCard
            label="Users"
            value={stats?.users ?? "…"}
            subtext="Active unique identities created since launch"
            className="stagger-1"
          />
          <StatCard
            label="Ecosystem"
            value={stats?.parachains ?? "…"}
            subtext="Parachains integrated via XCM standards"
            className="stagger-2"
          />
          <StatCard
            label="Verified"
            value={stats?.credentials ?? "…"}
            subtext="Verifiable credentials issued securely"
            className="stagger-3"
          />
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 mb-16 max-w-3xl animate-fade-in-up">
            <h2 className="text-primary font-bold tracking-widest uppercase text-sm">
              Why PolkaMe?
            </h2>
            <h3 className="text-3xl md:text-5xl font-black text-white leading-tight">
              The Gold Standard for Web3 Identity Management
            </h3>
            <p className="text-lg text-slate-400">
              Leveraging the cross-chain capabilities of Substrate to provide a
              seamless, secure, and truly decentralized identity experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((f, idx) => (
              <div
                key={f.title}
                className={`group p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-primary/50 hover-lift hover-glow transition-all duration-300 animate-fade-in-up stagger-${idx + 1}`}
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:rotate-6 transition-all duration-300">
                  <span className="material-symbols-outlined text-primary group-hover:text-white text-3xl transition-all duration-300 group-hover:scale-110">
                    {f.icon}
                  </span>
                </div>
                <h4 className="text-xl font-bold text-white mb-4">
                  {f.title}
                </h4>
                <p className="text-slate-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary to-[#9e0055] p-12 lg:p-24 flex flex-col items-center text-center animate-scale-in hover-glow">
            <div className="absolute top-0 right-0 p-8 opacity-20 scale-150 animate-spin-slow">
              <span className="material-symbols-outlined text-white text-9xl">
                shield
              </span>
            </div>
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 max-w-3xl leading-tight">
              Ready to own your digital self?
            </h2>
            <p className="text-xl text-white/80 mb-12 max-w-2xl font-medium">
              Join thousands of users managing their identities on the most
              secure relay chain in the world.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
              <Link
                to="/dashboard"
                className="h-16 px-12 bg-white text-primary text-xl font-bold rounded-2xl hover:bg-slate-50 hover:scale-105 transition-all shadow-xl flex items-center justify-center"
              >
                Launch Dashboard
              </Link>
              <a
                href="#"
                className="h-16 px-12 bg-black/20 text-white text-xl font-bold rounded-2xl backdrop-blur-md hover:bg-black/30 transition-all border border-white/20 flex items-center justify-center"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── static data ──────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: "hub",
    title: "Polkadot Interoperability",
    body: "Seamlessly sign in to any parachain or dApp using XCM-compliant identity standards. One ID, the entire DOT ecosystem.",
  },
  {
    icon: "shield_with_heart",
    title: "Bank-Grade Security",
    body: "Your private keys never leave your device. Protected by advanced cryptographic proofs and TEE hardware compatibility.",
  },
  {
    icon: "person_check",
    title: "User-Owned Data",
    body: "Zero central authority. You decide who sees your sensitive data and for exactly how long. Revoke access instantly.",
  },
];
