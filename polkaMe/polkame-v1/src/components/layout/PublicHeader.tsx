import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "thirdweb/react";
import { client } from "../../client";

const NAV_LINKS = [
  { to: "/", label: "Features", hash: "#features" },
  { to: "/", label: "Ecosystem", hash: "#ecosystem" },
  { to: "/governance", label: "Governance" },
  { to: "/", label: "Docs", hash: "#docs" },
];

export default function PublicHeader() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background-dark/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-primary p-2 rounded-lg group-hover:rotate-12 transition-transform duration-300">
            <span className="material-symbols-outlined text-white text-2xl">
              fingerprint
            </span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-100 uppercase group-hover:tracking-wider transition-all duration-300">
            Polka<span className="text-primary">Me</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.hash ? `${l.to}${l.hash}` : l.to}
              className={`text-sm font-medium transition-all duration-200 hover:scale-105 ${
                pathname === l.to && !l.hash
                  ? "text-primary"
                  : "text-slate-300 hover:text-primary"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <ConnectButton
              client={client}
              appMetadata={{
                name: "PolkaMe",
                url: "https://polkame.io",
              }}
            />
          </div>
          <button className="md:hidden text-slate-100">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
