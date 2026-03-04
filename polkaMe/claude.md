Restructure the frontend to reflect all contracts in the Practice_Contracts directory. Implement a master wallet toggle button that allows users to switch between an EVM-compatible wallet (e.g. MetaMask) and a Polkadot native wallet (e.g. Polkadot.js). Every contract interaction and feature must have a fully working counterpart for both wallet types — no functionality should exist in one mode but be missing in the other.

Guidelines:
- Minor tweaks to the frontend layout and structure are allowed, but preserve the original design language, fonts, and core concepts throughout
- Before resolving any dependency errors, pause and ask for confirmation — do not auto-fix
- For every feature or function implemented, include a detailed yet concise inline comment or explanation describing what it does and why
- Route all contract calls through the appropriate provider based on the active wallet mode: use ethers.js or viem for EVM, and @polkadot/api for Polkadot Native
- dont add backend logic in the frontend only placeholder for api calls in the backend ready to connect
- add a new txt file titled backend_guide to keep backend endpoints relevant to frontend
- make sure no keys are xposed in the frontend
