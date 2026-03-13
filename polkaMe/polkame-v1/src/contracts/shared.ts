export const ADDRESSES = {
  identity:   "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  accounts:   "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  governance: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  security:   "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
} as const;

export const HARDHAT_RPC = "http://127.0.0.1:8545";

export const VERIFICATION_STATE = ["unverified", "pending", "verified"] as const;
export const CHAIN_TYPE = ["polkadot", "kusama", "astar", "moonbeam", "custom"] as const;
export const SOCIAL_TYPE = ["twitter", "discord", "github"] as const;
export const ACTIVITY_STATUS = ["success", "pending", "failed"] as const;
export const VALIDATOR_STATUS = ["active", "waiting", "inactive"] as const;
