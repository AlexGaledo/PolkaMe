import { useEffect, useState } from "react";
import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { client } from "../client";
import { ProgressBar } from "../components/common";
import {
  getVerificationProgress,
  getVerificationStatus,
  getLinkedSocialAccounts,
  submitVerification,
  linkSocialAccountAPI,
} from "../api";
import { ensureHardhatNetwork } from "../contracts";
import type { VerificationProgress, VerificationStatus, LinkedSocialAccount } from "../types";

export default function VerificationPage() {
  const activeAccount = useActiveAccount();
  const [progress, setProgress] = useState<VerificationProgress | null>(null);
  const [verStatus, setVerStatus] = useState<VerificationStatus | null>(null);
  const [socials, setSocials] = useState<LinkedSocialAccount[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Social link modal
  const [socialModal, setSocialModal] = useState<{
    open: boolean;
    platform: "twitter" | "discord" | "github";
  }>({ open: false, platform: "twitter" });
  const [socialHandle, setSocialHandle] = useState("");

  function reloadAll() {
    if (!activeAccount?.address) return;
    const addr = activeAccount.address;
    getVerificationProgress(addr).then((r) => r.success && setProgress(r.data));
    getVerificationStatus(addr).then((r) => r.success && setVerStatus(r.data));
    getLinkedSocialAccounts(addr).then((r) => r.success && setSocials(r.data));
  }

  useEffect(() => {
    reloadAll();
  }, [activeAccount?.address]);

  async function handleVerifyWallet() {
    setSubmitting("wallet");
    try {
      await ensureHardhatNetwork();
      const res = await submitVerification("wallet");
      if (res.success) reloadAll();
      else alert("Error: " + (res.error || "Unknown"));
    } catch (e: any) {
      alert(e.message);
    }
    setSubmitting(null);
  }

  async function handleLinkSocial() {
    if (!socialHandle.trim()) return;
    setSubmitting("social");
    try {
      await ensureHardhatNetwork();
      const linkRes = await linkSocialAccountAPI(socialModal.platform, socialHandle.trim());
      if (!linkRes.success) {
        alert("Link error: " + linkRes.error);
        setSubmitting(null);
        return;
      }
      const verRes = await submitVerification("social");
      if (verRes.success) {
        setSocialModal({ open: false, platform: "twitter" });
        setSocialHandle("");
        reloadAll();
      } else {
        alert("Verification error: " + (verRes.error || "Unknown"));
      }
    } catch (e: any) {
      alert(e.message);
    }
    setSubmitting(null);
  }

  async function handleStartKYC() {
    setSubmitting("kyc");
    try {
      await ensureHardhatNetwork();
      const res = await submitVerification("kyc");
      if (res.success) reloadAll();
      else alert("Error: " + (res.error || "Unknown"));
    } catch (e: any) {
      alert(e.message);
    }
    setSubmitting(null);
  }

  function getLinkedSocial(platform: string) {
    return socials.find((s) => s.platform === platform);
  }

  if (!activeAccount) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-20 animate-fade-in-up">
        <div className="size-24 bg-primary/20 rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-primary">verified_user</span>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black">Connect &amp; Verify</h2>
          <p className="text-text-muted mt-2 max-w-md">
            Connect your wallet to verify your identity and unlock premium features.
          </p>
        </div>
        <ConnectButton client={client} appMetadata={{ name: "PolkaMe", url: "https://polkame.io" }} />
      </div>
    );
  }

  const addr = activeAccount.address;
  const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const PLATFORM_LABELS: Record<string, string> = {
    twitter: "X (Twitter)",
    discord: "Discord",
    github: "GitHub",
  };
  const PLATFORM_PLACEHOLDER: Record<string, string> = {
    twitter: "@yourhandle",
    discord: "username#1234",
    github: "github-username",
  };
  const PLATFORM_CLS: Record<string, string> = {
    twitter: "bg-slate-900 text-white hover:bg-slate-800",
    discord: "bg-[#5865F2] text-white hover:brightness-110",
    github: "bg-slate-700 text-white hover:bg-slate-600",
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 -mt-2 page-enter">
      {/* ─── Social Link Modal ────────────────────────────── */}
      {socialModal.open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
          onClick={() => {
            setSocialModal({ ...socialModal, open: false });
            setSocialHandle("");
          }}
        >
          <div
            className="bg-background-dark border border-neutral-border rounded-xl p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">
              Link {PLATFORM_LABELS[socialModal.platform]}
            </h3>
            <p className="text-sm text-slate-400">
              Enter your {PLATFORM_LABELS[socialModal.platform]} handle to link
              it to your on-chain identity.
            </p>
            <input
              placeholder={PLATFORM_PLACEHOLDER[socialModal.platform]}
              value={socialHandle}
              onChange={(e) => setSocialHandle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLinkSocial()}
              className="w-full h-10 px-3 bg-neutral-muted border border-neutral-border rounded-lg text-white placeholder-text-muted"
              autoFocus
            />
            {getLinkedSocial(socialModal.platform) && (
              <div className="text-xs text-amber-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">info</span>
                Currently linked:{" "}
                <span className="font-bold">
                  {getLinkedSocial(socialModal.platform)!.handle}
                </span>{" "}
                — this will be replaced
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSocialModal({ ...socialModal, open: false });
                  setSocialHandle("");
                }}
                className="flex-1 h-10 bg-neutral-border rounded-lg font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleLinkSocial}
                disabled={submitting === "social" || !socialHandle.trim()}
                className="flex-1 h-10 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center"
              >
                {submitting === "social" ? (
                  <div className="animate-spin size-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  "Link & Verify"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Header + progress ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Verify Your Identity
            </h1>
            <p className="text-slate-400 mt-1">
              Complete each verification step to increase your identity score
              and unlock features.
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

      {/* ─── Connected wallet banner ──────────────────────── */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <span className="material-symbols-outlined text-emerald-400">
          check_circle
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-emerald-400">
            Wallet Connected
          </p>
          <p className="text-xs text-slate-400 font-mono">{addr}</p>
        </div>
        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase">
          Active
        </span>
      </div>

      {/* ─── Verification cards ────────────────────────────── */}
      <div className="grid gap-6">
        {/* 1. On-chain Identity */}
        <VCard
          icon="account_balance_wallet"
          tag="Decentralized"
          title="On-chain Identity"
          status={verStatus?.email}
          bgIcon="hub"
          idx={0}
        >
          <p className="text-slate-400 text-sm leading-relaxed">
            Verify ownership of your connected wallet (
            <span className="font-mono text-white">{shortAddr}</span>) to prove
            on-chain identity, asset ownership, and transaction history.
          </p>
          {verStatus?.email === "verified" ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
              <span className="material-symbols-outlined text-sm">
                verified
              </span>
              Wallet Verified
            </div>
          ) : (
            <button
              onClick={handleVerifyWallet}
              disabled={submitting !== null}
              className="flex items-center justify-center gap-2 rounded-lg h-11 px-6 font-bold bg-primary text-white hover:brightness-110 transition-all w-fit disabled:opacity-50"
            >
              {submitting === "wallet" ? (
                <div className="animate-spin size-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>Verify Wallet</span>
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          )}
        </VCard>

        {/* 2. Social Accounts */}
        <VCard
          icon="share"
          tag="Social Proof"
          title="Social Accounts"
          status={verStatus?.socials}
          bgIcon="public"
          idx={1}
        >
          <p className="text-slate-400 text-sm leading-relaxed">
            Link your social profiles to establish your digital reputation.
            You'll enter your handle first, then confirm the on-chain
            transaction.
          </p>
          {/* Existing linked socials */}
          {socials.length > 0 && (
            <div className="flex flex-wrap gap-2 my-1">
              {socials.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-sm"
                >
                  <span className="material-symbols-outlined text-emerald-400 text-sm">
                    verified
                  </span>
                  <span className="capitalize font-medium">{s.platform}</span>
                  <span className="text-text-muted">{s.handle}</span>
                  <button
                    onClick={() => {
                      setSocialModal({ open: true, platform: s.platform });
                      setSocialHandle(s.handle);
                    }}
                    className="text-primary text-xs hover:underline ml-1"
                  >
                    Replace
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {(["twitter", "discord", "github"] as const).map((platform) => (
              <button
                key={platform}
                onClick={() => {
                  setSocialModal({ open: true, platform });
                  setSocialHandle(getLinkedSocial(platform)?.handle || "");
                }}
                disabled={submitting !== null}
                className={`flex items-center justify-center gap-2 rounded-lg h-9 px-4 text-xs font-bold transition-all disabled:opacity-50 ${PLATFORM_CLS[platform]}`}
              >
                {getLinkedSocial(platform)
                  ? `Update ${PLATFORM_LABELS[platform]}`
                  : `Link ${PLATFORM_LABELS[platform]}`}
              </button>
            ))}
          </div>
        </VCard>

        {/* 3. KYC */}
        <VCard
          icon="badge"
          tag="Official"
          title="Real-world Credentials (KYC)"
          status={verStatus?.kyc}
          bgIcon="verified_user"
          idx={2}
        >
          <p className="text-slate-400 text-sm leading-relaxed">
            Submit a Know-Your-Customer (KYC) verification to prove your
            real-world identity on-chain. This sets your KYC status to
            "pending" for review.
          </p>
          <p className="text-xs text-amber-400/80 italic">
            Demo mode: No real documents required. Clicking below simulates a
            KYC submission.
          </p>
          {verStatus?.kyc === "verified" ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
              <span className="material-symbols-outlined text-sm">
                verified
              </span>
              KYC Verified
            </div>
          ) : (
            <button
              onClick={handleStartKYC}
              disabled={submitting !== null}
              className="flex items-center justify-center gap-2 rounded-lg h-11 px-6 font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all w-fit disabled:opacity-50"
            >
              {submitting === "kyc" ? (
                <div className="animate-spin size-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>Start KYC Verification</span>
                  <span className="material-symbols-outlined text-sm">
                    photo_camera
                  </span>
                </>
              )}
            </button>
          )}
        </VCard>
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

/* ─── Helper sub-component ─────────────────────────────────────────── */

function VCard({
  icon,
  tag,
  title,
  status,
  bgIcon,
  idx,
  children,
}: {
  icon: string;
  tag: string;
  title: string;
  status?: string;
  bgIcon: string;
  idx: number;
  children: React.ReactNode;
}) {
  const badge =
    status === "verified"
      ? { text: "Verified", cls: "bg-emerald-500/10 text-emerald-400" }
      : status === "pending"
        ? { text: "Pending", cls: "bg-amber-500/10 text-amber-400" }
        : { text: "Not Started", cls: "bg-slate-500/10 text-slate-400" };

  return (
    <div
      className={`group relative flex flex-col md:flex-row items-stretch justify-between gap-6 rounded-xl bg-primary/5 border border-primary/20 p-6 hover:border-primary/50 hover-lift hover-glow transition-all duration-300 shadow-sm animate-fade-in-up stagger-${idx + 1}`}
    >
      <div className="flex flex-1 flex-col justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined group-hover:rotate-12 transition-transform duration-300">
                {icon}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest">
                {tag}
              </span>
            </div>
            <span
              className={`px-2 py-1 text-[10px] font-bold rounded-full ${badge.cls}`}
            >
              {badge.text}
            </span>
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        {children}
      </div>
      <div className="w-full md:w-48 h-32 md:h-auto bg-primary/10 rounded-lg overflow-hidden relative flex items-center justify-center group-hover:bg-primary/15 transition-colors">
        <span className="material-symbols-outlined text-6xl opacity-20 group-hover:scale-110 group-hover:opacity-30 transition-all duration-500">
          {bgIcon}
        </span>
      </div>
    </div>
  );
}
