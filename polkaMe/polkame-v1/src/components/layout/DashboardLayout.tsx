import { Link, useLocation, Outlet } from "react-router-dom";
import { ConnectButton } from "thirdweb/react";
import { client } from "../../client";
import { SearchInput } from "../common";

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
            <SearchInput
              placeholder="Search accounts..."
              className="hidden sm:block w-64"
            />
            <button className="size-10 bg-neutral-muted rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-primary/20 transition-all duration-200 hover:scale-105">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="size-10 bg-neutral-muted rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-primary/20 transition-all duration-200 hover:scale-105">
              <span className="material-symbols-outlined">
                account_balance_wallet
              </span>
            </button>
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
