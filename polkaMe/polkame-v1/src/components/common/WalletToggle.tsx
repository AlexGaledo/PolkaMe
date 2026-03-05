import { useWallet, type WalletMode } from "../../contexts/WalletContext";

const MODE_CONFIG: Record<WalletMode, { label: string; icon: string; color: string }> = {
  evm: {
    label: "EVM",
    icon: "token",
    color: "from-blue-500 to-indigo-600",
  },
  polkadot: {
    label: "Polkadot",
    icon: "hub",
    color: "from-pink-500 to-primary",
  },
};

export default function WalletToggle({ compact = false }: { compact?: boolean }) {
  const { walletMode, setWalletMode } = useWallet();

  return (
    <div className="flex items-center gap-1 p-1 bg-neutral-muted rounded-xl">
      {(Object.keys(MODE_CONFIG) as WalletMode[]).map((mode) => {
        const cfg = MODE_CONFIG[mode];
        const isActive = walletMode === mode;
        return (
          <button
            key={mode}
            onClick={() => setWalletMode(mode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive
                ? `bg-gradient-to-r ${cfg.color} text-white shadow-lg shadow-primary/20`
                : "text-text-muted hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-base">{cfg.icon}</span>
            {!compact && <span>{cfg.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
