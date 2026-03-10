export const ADDRESSES = {
  identity:   "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  accounts:   "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  governance: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  security:   "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
} as const;

export const HARDHAT_RPC = "http://127.0.0.1:8545";

export const VERIFICATION_STATE = ["unverified", "pending", "verified"] as const;
export const CHAIN_TYPE = ["polkadot", "kusama", "astar", "moonbeam", "custom"] as const;
export const SOCIAL_TYPE = ["twitter", "discord", "github"] as const;
export const ACTIVITY_STATUS = ["success", "pending", "failed"] as const;
export const VALIDATOR_STATUS = ["active", "waiting", "inactive"] as const;
