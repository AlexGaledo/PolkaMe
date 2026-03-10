import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThirdwebProvider } from "thirdweb/react";
import { WalletProvider } from "./contexts/WalletContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletProvider>
      <ThirdwebProvider>
        <App />
      </ThirdwebProvider>
    </WalletProvider>
  </React.StrictMode>
);
