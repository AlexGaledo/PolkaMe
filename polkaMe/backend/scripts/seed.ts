import { network } from "hardhat";

/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  PolkaMe — Seed Script                                           ║
 * ║  Populates all 4 contracts with realistic test data              ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 *  Run AFTER deploy.ts:
 *    npx hardhat run scripts/seed.ts
 */

async function main() {
  const { ethers } = await network.connect();
  const [deployer, user2, user3] = await ethers.getSigners();

  const ADDRS = {
    identity:   "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    accounts:   "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    governance: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    security:   "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  };

  // Attach contract instances
  const identity   = await ethers.getContractAt("PolkaMeIdentity",   ADDRS.identity);
  const accounts   = await ethers.getContractAt("PolkaMeAccounts",   ADDRS.accounts);
  const governance = await ethers.getContractAt("PolkaMeGovernance",  ADDRS.governance);
  const security   = await ethers.getContractAt("PolkaMeSecurity",   ADDRS.security);

  console.log("\n🌱 Seeding PolkaMe contracts...\n");

  // ─── 1. Identity ─────────────────────────────────────────────────
  console.log("1/8  Creating DIDs...");
  await (await identity.connect(deployer).createDID("Axel")).wait();
  await (await identity.connect(user2).createDID("Berlin")).wait();
  await (await identity.connect(user3).createDID("Carol")).wait();
  console.log("     ✅ 3 DIDs created");

  // ─── 2. Verification ─────────────────────────────────────────────
  console.log("2/8  Submitting verifications...");
  // field 0 = email, 1 = governance, 2 = socials, 3 = kyc
  await (await identity.connect(deployer).submitVerification(0)).wait();  // email pending
  await (await identity.connect(deployer).submitVerification(2)).wait();  // socials pending
  // Owner (trusted verifier) approves email: setVerificationState(user, field, state)
  // VerificationState: 0=Unverified, 1=Pending, 2=Verified
  await (await identity.setVerificationState(deployer.address, 0, 2)).wait(); // email verified
  console.log("     ✅ Email verified, socials pending");

  // ─── 3. Credentials ──────────────────────────────────────────────
  console.log("3/8  Issuing credentials...");
  // issueCredential(user, credType, title, issuer, expiresAt, metadataURI)
  // CredentialType: 0=KYC, 1=DAOBadge, 2=ReputationScore, 3=SocialProof, 4=ChainProof
  const oneYear = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
  const twoYears = Math.floor(Date.now() / 1000) + 730 * 24 * 3600;
  await (await identity.issueCredential(deployer.address, 0, "Basic KYC Credential", "PolkaMe Verifier", oneYear, "")).wait();
  await (await identity.issueCredential(deployer.address, 1, "PolkaMe Early Adopter", "PolkaMe DAO", twoYears, "")).wait();
  console.log("     ✅ 2 credentials issued (KYC, DAO Badge)");

  // ─── 4. Chain & Social Accounts ──────────────────────────────────
  console.log("4/8  Linking chain & social accounts...");
  // ChainType: 0=Polkadot, 1=Kusama, 2=Astar, 3=Moonbeam, 4=Custom
  await (await accounts.connect(deployer).linkChainAccount(
    0, "Polkadot", "15oF4uVJwmo4TdGW7VfQxNLavjCXviqWrztPu5C4sfrEAq1m", "Primary"
  )).wait();
  await (await accounts.connect(deployer).linkChainAccount(
    3, "Moonbeam", "0x1234567890abcdef1234567890abcdef12345678", "Hot"
  )).wait();
  await (await accounts.connect(deployer).linkChainAccount(
    1, "Kusama", "HNZata7iMyF9gMo7TFq6chz4qyqDJmDQMbBvMTtNaTXWbDY", "Staking"
  )).wait();

  // SocialType: 0=Twitter, 1=Discord, 2=Github
  await (await accounts.connect(deployer).linkSocialAccount(0, "@axel_polka")).wait();
  await (await accounts.connect(deployer).linkSocialAccount(1, "Axel#1337")).wait();
  await (await accounts.connect(deployer).linkSocialAccount(2, "axeldot")).wait();
  // Verify Twitter & Github (deployer is trusted verifier)
  await (await accounts.verifySocialAccount(deployer.address, 0)).wait();  // Twitter
  await (await accounts.verifySocialAccount(deployer.address, 2)).wait();  // Github
  console.log("     ✅ 3 chain accounts, 3 social accounts (2 verified)");

  // ─── 5. Authorized dApps ─────────────────────────────────────────
  console.log("5/8  Authorizing dApps...");
  await (await accounts.connect(deployer).authorizeDApp("Polkassembly", user2.address)).wait();
  await (await accounts.connect(deployer).authorizeDApp("SubSquare", user3.address)).wait();
  await (await accounts.connect(deployer).authorizeDApp("Moonwell", "0x0000000000000000000000000000000000000001")).wait();
  console.log("     ✅ 3 dApps authorized");

  // ─── 6. Activity log ─────────────────────────────────────────────
  console.log("6/8  Logging activities...");
  // ActivityStatus: 0=Success, 1=Pending, 2=Failed
  await (await accounts.connect(deployer).logActivity("Linked wallet", "PolkaMe", 0)).wait();
  await (await accounts.connect(deployer).logActivity("Sign Auth", "Polkassembly", 0)).wait();
  await (await accounts.connect(deployer).logActivity("Identity Update", "PolkaMe", 0)).wait();
  await (await accounts.connect(deployer).logActivity("Governance Vote", "SubSquare", 1)).wait();
  console.log("     ✅ 4 activity entries");

  // ─── 7. Governance (staking, proposals, validators) ──────────────
  console.log("7/8  Setting up governance...");

  // Stake ETH for deployer
  await (await governance.connect(deployer).stake({ value: ethers.parseEther("5.0") })).wait();
  await (await governance.connect(deployer).setConviction(3)).wait();       // 3x conviction
  await (await governance.connect(user2).stake({ value: ethers.parseEther("2.0") })).wait();

  // Create proposals (title, description, durationInSeconds)
  await (await governance.connect(deployer).createProposal(
    "Increase validator count to 500",
    "This proposal seeks to expand the active validator set from 297 to 500 to improve decentralization and network security.",
    7 * 24 * 3600  // 7 days
  )).wait();
  await (await governance.connect(deployer).createProposal(
    "Treasury allocation for parachain bridges",
    "Allocate 50,000 DOT from the treasury to fund development of trustless bridges between parachains.",
    14 * 24 * 3600  // 14 days
  )).wait();
  await (await governance.connect(user2).createProposal(
    "Reduce unbonding period to 14 days",
    "Shorter unbonding period will encourage more participation in staking without significantly impacting network security.",
    10 * 24 * 3600  // 10 days
  )).wait();

  // Vote on first proposal
  await (await governance.connect(user2).voteOnProposal(0, 1)).wait();  // Aye

  // Add validators
  await (await governance.addValidator(
    "Parity Tech", "PT", deployer.address, 200, ethers.parseEther("100")
  )).wait();
  await (await governance.addValidator(
    "Web3 Foundation", "W3", user2.address, 150, ethers.parseEther("250")
  )).wait();
  await (await governance.addValidator(
    "Stakeworld", "SW", user3.address, 350, ethers.parseEther("50")
  )).wait();
  // Set one validator to waiting
  await (await governance.setValidatorStatus(2, 1)).wait();  // ValidatorStatus.Waiting

  // Deposit reward pool and distribute to deployer
  await (await governance.depositRewardPool({ value: ethers.parseEther("1.0") })).wait();
  await (await governance.distributeReward(deployer.address, ethers.parseEther("0.25"))).wait();

  console.log("     ✅ 2 stakers, 3 proposals, 1 vote, 3 validators, rewards deposited");

  // ─── 8. Security (privacy, sessions, log) ────────────────────────
  console.log("8/8  Seeding security data...");

  // Initialize privacy preferences (creates default 3 prefs)
  await (await security.connect(deployer).initializePrivacyPrefs()).wait();

  // Create sessions
  await (await security.connect(deployer).createSession(
    "MacBook Pro 16\"", "Chrome 120", "San Francisco, US", true
  )).wait();
  await (await security.connect(deployer).createSession(
    "iPhone 15 Pro", "Safari Mobile", "San Francisco, US", false
  )).wait();
  await (await security.connect(deployer).createSession(
    "Windows Desktop", "Firefox 121", "New York, US", false
  )).wait();

  console.log("     ✅ 3 privacy prefs, 3 sessions\n");

  // ─── Summary ──────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log("  🎉 Seeding Complete!");
  console.log("  3 DIDs, 2 credentials, 3 chain accounts, 3 social accounts");
  console.log("  3 dApps, 4 activities, 3 proposals, 3 validators, 3 sessions");
  console.log("═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
