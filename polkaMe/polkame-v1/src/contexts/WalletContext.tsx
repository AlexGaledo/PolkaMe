import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { ApiPromise } from "@polkadot/api";

export type WalletMode = "evm" | "polkadot";

interface WalletState {
  walletMode: WalletMode;
  setWalletMode: (mode: WalletMode) => void;
  evmAddress: string;
  polkadotAddress: string;
  activeAddress: string;
  isConnected: boolean;
  polkadotApi: ApiPromise | null;
  connectEvm: () => Promise<string>;
  connectPolkadot: () => Promise<string>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletMode, setWalletMode] = useState<WalletMode>("evm");
  const [evmAddress, setEvmAddress] = useState("");
  const [polkadotAddress, setPolkadotAddress] = useState("");
  const [polkadotApi, setPolkadotApi] = useState<ApiPromise | null>(null);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;

    eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts[0]) setEvmAddress(accounts[0]);
    }).catch(() => {});

    const handleAccountsChanged = (accounts: string[]) => {
      setEvmAddress(accounts[0] ?? "");
    };
    eth.on("accountsChanged", handleAccountsChanged);
    return () => eth.removeListener("accountsChanged", handleAccountsChanged);
  }, []);

  const connectEvm = useCallback(async (): Promise<string> => {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("No EVM wallet detected. Please install MetaMask.");
    const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
    const addr = accounts[0] ?? "";
    setEvmAddress(addr);
    return addr;
  }, []);

  const connectPolkadot = useCallback(async (): Promise<string> => {
    const { web3Enable, web3Accounts } = await import("@polkadot/extension-dapp");
    const extensions = await web3Enable("PolkaMe");
    if (extensions.length === 0) {
      throw new Error("No Polkadot wallet detected. Please install the Polkadot.js extension.");
    }

    const accounts = await web3Accounts();
    if (accounts.length === 0) {
      throw new Error("No Polkadot accounts found. Create one in your Polkadot.js extension.");
    }

    const addr = accounts[0].address;
    setPolkadotAddress(addr);

    if (!polkadotApi) {
      const { ApiPromise: Api, WsProvider } = await import("@polkadot/api");
      const wsEndpoint = import.meta.env.VITE_POLKADOT_WS_ENDPOINT || "wss://rpc.polkadot.io";
      const provider = new WsProvider(wsEndpoint);
      const api = await Api.create({ provider });
      setPolkadotApi(api);
    }

    return addr;
  }, [polkadotApi]);

  const disconnect = useCallback(() => {
    if (walletMode === "evm") {
      setEvmAddress("");
    } else {
      setPolkadotAddress("");
      if (polkadotApi) {
        polkadotApi.disconnect();
        setPolkadotApi(null);
      }
    }
  }, [walletMode, polkadotApi]);

  const activeAddress = walletMode === "evm" ? evmAddress : polkadotAddress;
  const isConnected = activeAddress.length > 0;

  return (
    <WalletContext.Provider
      value={{
        walletMode,
        setWalletMode,
        evmAddress,
        polkadotAddress,
        activeAddress,
        isConnected,
        polkadotApi,
        connectEvm,
        connectPolkadot,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
