import { useEffect, useState } from "react";
import { ProgressBar } from "../components/common";
import { getVerificationProgress, submitVerification } from "../api";
import type { VerificationProgress } from "../types";

export default function VerificationPage() {
  const [progress, setProgress] = useState<VerificationProgress | null>(null);

  useEffect(() => {
    getVerificationProgress().then((r) => r.success && setProgress(r.data));
  }, []);

  const handleSubmit = async (method: "wallet" | "social" | "kyc") => {
    await submitVerification(method);
    // In production, refresh progress here
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 -mt-2 page-enter">
      {/* Header + progress */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Verify Your Identity
            </h1>
            <p className="text-slate-400 mt-1">
              Choose a verification method to secure your account and unlock
              premium features.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-primary uppercase tracking-tighter">
              Step {progress?.currentStep ?? "—"} of{" "}
              {progress?.totalSteps ?? "—"}
            </p>
            <p className="text-2xl font-black">
              {progress?.percentComplete ?? 0}%
            </p>
          </div>
        </div>
        <ProgressBar value={progress?.percentComplete ?? 0} />
      </div>

      {/* ─── Verification methods ──────────────────────────── */}
      <div className="grid gap-6">
        {METHODS.map((m, idx) => (
          <div
            key={m.title}
            className={`group relative flex flex-col md:flex-row items-stretch justify-between gap-6 rounded-xl bg-primary/5 border border-primary/20 p-6 hover:border-primary/50 hover-lift hover-glow transition-all duration-300 shadow-sm animate-fade-in-up stagger-${idx + 1}`}
          >
            <div className="flex flex-1 flex-col justify-between gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined group-hover:rotate-12 transition-transform duration-300">{m.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {m.tag}
                  </span>
                </div>
                <h3 className="text-xl font-bold">{m.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {m.description}
                </p>
              </div>
              {m.buttons.length === 1 ? (
                <button
                  onClick={() => handleSubmit(m.apiMethod)}
                  className={`flex items-center justify-center gap-2 rounded-lg h-11 px-6 font-bold transition-all w-full md:w-fit ${m.buttons[0].cls}`}
                >
                  <span>{m.buttons[0].label}</span>
                  <span className="material-symbols-outlined text-sm">
                    {m.buttons[0].iconRight}
                  </span>
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {m.buttons.map((b) => (
                    <button
                      key={b.label}
                      onClick={() => handleSubmit(m.apiMethod)}
                      className={`flex items-center justify-center gap-2 rounded-lg h-9 px-4 text-xs font-bold transition-all ${b.cls}`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Visual area */}
            <div className="w-full md:w-48 h-32 md:h-auto bg-primary/10 rounded-lg overflow-hidden relative flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <span className="material-symbols-outlined text-6xl opacity-20 group-hover:scale-110 group-hover:opacity-30 transition-all duration-500">
                {m.bgIcon}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Privacy notice ────────────────────────────────── */}
      <div className="mt-4 p-6 rounded-xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-6 animate-bounce-subtle hover-glow">
        <div className="bg-primary/20 p-4 rounded-full animate-glow-pulse">
          <span className="material-symbols-outlined text-primary text-3xl">
            lock
          </span>
        </div>
        <div>
          <h4 className="font-bold">Privacy &amp; Security First</h4>
          <p className="text-sm text-slate-400">
            Your data is processed using zero-knowledge proofs. We never store
            your raw identification documents on our central servers. All
            sensitive information is encrypted at rest and in transit.
          </p>
        </div>
      </div>

      {/* Compliance badges */}
      <div className="flex justify-center gap-8 pb-4">
        {["AES-256 Encryption", "GDPR Compliant", "ISO 27001"].map((t) => (
          <div
            key={t}
            className="flex items-center gap-2 text-slate-500 text-xs font-medium"
          >
            <span className="material-symbols-outlined text-sm">
              check_circle
            </span>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── static data ──────────────────────────────────────────────────── */
interface MethodButton {
  label: string;
  cls: string;
  iconRight?: string;
}

interface MethodDef {
  icon: string;
  tag: string;
  title: string;
  description: string;
  bgIcon: string;
  apiMethod: "wallet" | "social" | "kyc";
  buttons: MethodButton[];
}

const METHODS: MethodDef[] = [
  {
    icon: "account_balance_wallet",
    tag: "Decentralized",
    title: "On-chain Identity",
    description:
      "Connect your Web3 wallet to verify ownership of assets, NFT memberships, and historical transaction data safely.",
    bgIcon: "hub",
    apiMethod: "wallet",
    buttons: [
      {
        label: "Connect Wallet",
        cls: "bg-primary text-white hover:brightness-110",
        iconRight: "arrow_forward",
      },
    ],
  },
  {
    icon: "share",
    tag: "Social Proof",
    title: "Social Accounts",
    description:
      "Link your Twitter, Discord, or GitHub profiles to establish your digital reputation across major social platforms.",
    bgIcon: "public",
    apiMethod: "social",
    buttons: [
      {
        label: "Link X (Twitter)",
        cls: "bg-slate-900 text-white hover:bg-slate-800",
      },
      {
        label: "Link Discord",
        cls: "bg-[#5865F2] text-white hover:brightness-110",
      },
    ],
  },
  {
    icon: "badge",
    tag: "Official",
    title: "Real-world Credentials",
    description:
      "Securely upload government-issued ID, passports, or driver's licenses via our encrypted biometric verification system.",
    bgIcon: "verified_user",
    apiMethod: "kyc",
    buttons: [
      {
        label: "Start KYC Scan",
        cls: "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20",
        iconRight: "photo_camera",
      },
    ],
  },
];
