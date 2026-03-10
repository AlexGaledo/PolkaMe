import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "thirdweb/react";
import { client } from "../../client";
import { WalletToggle } from "../common";
import { useWallet } from "../../contexts/WalletContext";

const NAV_LINKS = [
  { to: "/", label: "Features", hash: "#features" },
  { to: "/", label: "Ecosystem", hash: "#ecosystem" },
  { to: "/governance", label: "Governance" },
  { to: "/", label: "Docs", hash: "#docs" },
];

export default function PublicHeader() {
  const { pathname } = useLocation();
  const { walletMode, isConnected, activeAddress, connectPolkadot } = useWallet();

  const shortAddr = activeAddress
    ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background-dark/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
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

        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <WalletToggle compact />
          </div>
          <div className="hidden sm:block">
            {walletMode === "evm" ? (
              <ConnectButton
                client={client}
                appMetadata={{ name: "PolkaMe", url: "https://polkame.io" }}
              />
            ) : (
              <button
                onClick={() => connectPolkadot().catch((e: any) => alert(e.message))}
                className="py-2 px-4 bg-gradient-to-r from-pink-500 to-primary text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">hub</span>
                {isConnected ? shortAddr : "Connect Polkadot"}
              </button>
            )}
          </div>
          <button className="md:hidden text-slate-100">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
