import { useState, useRef, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client } from "../../client";
import { SearchDropdown, NotificationDropdown } from "../common";

interface SidebarLink {
  to: string;
  label: string;
  icon: string;
}

const SIDEBAR_LINKS: SidebarLink[] = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/verification", label: "Verification", icon: "verified_user" },
  { to: "/governance", label: "Governance", icon: "gavel" },
  { to: "/security", label: "Security", icon: "security" },
];

export default function DashboardLayout() {
  const { pathname } = useLocation();
  const activeAccount = useActiveAccount();
  const [showWalletInfo, setShowWalletInfo] = useState(false);
  const walletRef = useRef<HTMLDivElement>(null);

  // Close wallet dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) {
        setShowWalletInfo(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addr = activeAccount?.address;
  const shortAddr = addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : null;

  return (
    <div className="flex h-screen overflow-hidden bg-background-dark">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex w-72 flex-shrink-0 border-r border-neutral-border flex-col justify-between p-4">
        {/* Top: logo + nav */}
        <div className="flex flex-col gap-8">
          <Link to="/" className="flex items-center gap-3 px-2 group">
            <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white group-hover:rotate-12 transition-transform duration-300">
              <span className="material-symbols-outlined">fingerprint</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold leading-tight">PolkaMe</h1>
              <p className="text-text-muted text-xs">identity.polkadot</p>
            </div>
          </Link>

          <nav className="flex flex-col gap-2">
            {SIDEBAR_LINKS.map((l) => {
              const isActive = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm shadow-primary/10"
                      : "hover:bg-neutral-muted hover:translate-x-1 text-text-muted"
                  }`}
                >
                  <span className="material-symbols-outlined">{l.icon}</span>
                  <span className="text-sm font-medium">{l.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: wallet connect via thirdweb */}
        <div className="flex flex-col gap-4">
          <ConnectButton
            client={client}
            appMetadata={{
              name: "PolkaMe",
              url: "https://polkame.io",
            }}
          />
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Top bar */}
        <header className="h-16 border-b border-neutral-border flex items-center justify-between px-8 bg-background-dark/50 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-bold capitalize">
            {SIDEBAR_LINKS.find((l) => l.to === pathname)?.label ?? "PolkaMe"}
          </h2>
          <div className="flex items-center gap-4">
            <SearchDropdown
              placeholder="Search accounts..."
              className="hidden sm:block w-64"
            />
            <NotificationDropdown />
            {/* Wallet quick-view */}
            <div ref={walletRef} className="relative">
              <button
                onClick={() => setShowWalletInfo(!showWalletInfo)}
                className="size-10 bg-neutral-muted rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-primary/20 transition-all duration-200 hover:scale-105"
              >
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </button>
              {showWalletInfo && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-background-dark border border-neutral-border rounded-xl shadow-2xl z-50 p-4 space-y-3">
                  <h4 className="font-bold text-sm">Wallet Info</h4>
                  {addr ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-sm">account_balance_wallet</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold">Connected</p>
                          <p className="text-[10px] text-text-muted font-mono truncate">{addr}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-400"></span>
                        <span className="text-xs text-emerald-400">Hardhat Local Network</span>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(addr); setShowWalletInfo(false); }}
                        className="w-full py-2 bg-neutral-muted hover:bg-neutral-border text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        Copy Address
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-text-muted">No wallet connected. Use the sidebar to connect.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
