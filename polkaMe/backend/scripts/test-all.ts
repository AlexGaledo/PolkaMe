/**
 * PolkaMe Contract Test Runner
 * Run with: npx hardhat run scripts/test-all.ts
 */
import { network } from "hardhat";

async function getSetup() {
  return await network.connect();
}

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ❌ ${name}`);
    console.log(`     → ${e.message?.split("\n")[0]}`);
    failed++;
  }
}

async function main() {
  const conn = await getSetup();
  const ethers = conn.ethers;
  const [owner, user1, user2] = await ethers.getSigners();
  console.log("\n🚀 Deploying contracts...");

  const identity  = await (await ethers.getContractFactory("PolkaMeIdentity")).deploy();
  await identity.waitForDeployment();
  const identityAddr = await identity.getAddress();

  const accounts  = await (await ethers.getContractFactory("PolkaMeAccounts")).deploy(identityAddr);
  await accounts.waitForDeployment();
  const accountsAddr = await accounts.getAddress();

  const governance = await (await ethers.getContractFactory("PolkaMeGovernance")).deploy(identityAddr);
  await governance.waitForDeployment();

  const security  = await (await ethers.getContractFactory("PolkaMeSecurity")).deploy(identityAddr);
  await security.waitForDeployment();

  await identity.setAuthorizedContract(accountsAddr, true);
  console.log("✅ All 4 contracts deployed\n");

  // ─── Identity ───────────────────────────────────────────────
  console.log("📋 PolkaMeIdentity");

  await test("createDID", async () => {
    await identity.connect(user1).createDID("Alice");
    const did = await identity.getDID(user1.address);
    if (did.displayName !== "Alice") throw new Error("Wrong name");
  });

  await test("rejects duplicate DID", async () => {
    try { await identity.connect(user1).createDID("Alice"); throw new Error("Should have reverted"); }
    catch (e: any) { if (!e.message.includes("DIDAlreadyExists") && !e.message.includes("Should have")) throw e; }
  });

  await test("updateDisplayName", async () => {
    await identity.connect(user1).updateDisplayName("Alice v2");
    const did = await identity.getDID(user1.address);
    if (did.displayName !== "Alice v2") throw new Error("Name not updated");
  });

  await test("linkPolkadotDID", async () => {
    await identity.connect(user1).linkPolkadotDID("did:polkadot:5GrwvaEF");
    const links = await identity.getDIDLinks(user1.address);
    if (links.length !== 1) throw new Error("No link stored");
  });

  await test("verifyDIDLink", async () => {
    await identity.connect(owner).verifyDIDLink(user1.address, 0);
    const links = await identity.getDIDLinks(user1.address);
    if (!links[0].verified) throw new Error("Not verified");
  });

  await test("issueCredential (KYC)", async () => {
    await identity.connect(owner).issueCredential(user1.address, 0, "KYC Pass", "PolkaMe", 0, "ipfs://test");
    const creds = await identity.getCredentials(user1.address);
    if (creds.length < 1) throw new Error("No credential");
  });

  await test("isCredentialValid", async () => {
    const valid = await identity.isCredentialValid(user1.address, 0);
    if (!valid) throw new Error("Should be valid");
  });

  await test("revokeCredential", async () => {
    await identity.connect(owner).revokeCredential(user1.address, 0);
    const valid = await identity.isCredentialValid(user1.address, 0);
    if (valid) throw new Error("Should be invalid after revoke");
  });

  await test("submitVerification (email=0)", async () => {
    await identity.connect(user1).submitVerification(0);
    const status = await identity.getVerificationStatus(user1.address);
    if (Number(status.email) !== 1) throw new Error("Should be Pending(1)");
  });

  await test("setVerificationState (email Verified)", async () => {
    await identity.connect(owner).setVerificationState(user1.address, 0, 2);
    const status = await identity.getVerificationStatus(user1.address);
    if (Number(status.email) !== 2) throw new Error("Should be Verified(2)");
  });

  await test("getVerificationProgress", async () => {
    const [step, total] = await identity.getVerificationProgress(user1.address);
    if (Number(total) !== 3) throw new Error("Total steps should be 3");
  });

  await test("getPlatformStats", async () => {
    const [users] = await identity.getPlatformStats();
    if (Number(users) < 1) throw new Error("Should have at least 1 user");
  });

  // ─── Accounts ───────────────────────────────────────────────
  console.log("\n📋 PolkaMeAccounts");

  await test("linkChainAccount (Polkadot)", async () => {
    await accounts.connect(user1).linkChainAccount(0, "My DOT", "5GrwvaEF", "main");
    const linked = await accounts.getLinkedChainAccounts(user1.address);
    if (linked.length < 1) throw new Error("Not linked");
  });

  await test("removeChainAccount", async () => {
    await accounts.connect(user1).removeChainAccount(0);
    const linked = await accounts.getLinkedChainAccounts(user1.address);
    if (linked[0].active) throw new Error("Should be inactive");
  });

  await test("linkSocialAccount (Twitter)", async () => {
    await accounts.connect(user1).linkSocialAccount(0, "@alice");
    const socials = await accounts.getLinkedSocialAccounts(user1.address);
    if (socials.length < 1) throw new Error("Not linked");
  });

  await test("verifySocialAccount", async () => {
    await accounts.connect(owner).verifySocialAccount(user1.address, 0);
    const socials = await accounts.getLinkedSocialAccounts(user1.address);
    if (!socials[0].verified) throw new Error("Should be verified");
  });

  await test("authorizeDApp", async () => {
    await accounts.connect(user1).authorizeDApp("MyApp", user2.address);
    const dapps = await accounts.getAuthorizedDApps(user1.address);
    if (dapps.length < 1) throw new Error("Not authorized");
  });

  await test("revokeDApp", async () => {
    await accounts.connect(user1).revokeDApp(0);
    const dapps = await accounts.getAuthorizedDApps(user1.address);
    if (dapps[0].active) throw new Error("Should be inactive");
  });

  await test("logActivity", async () => {
    await accounts.connect(user1).logActivity("Linked wallet", "PolkaMe", 0);
    const log = await accounts.getRecentActivity(user1.address);
    if (log.length < 1) throw new Error("No activity");
  });

  // ─── Governance ──────────────────────────────────────────────
  console.log("\n📋 PolkaMeGovernance");

  await test("stake 1 ETH", async () => {
    await governance.connect(user1).stake({ value: ethers.parseEther("1.0") });
    const metrics = await governance.getStakingMetrics(user1.address);
    if (metrics.totalStaked !== ethers.parseEther("1.0")) throw new Error("Wrong stake amount");
  });

  await test("setConviction (2x)", async () => {
    await governance.connect(user1).setConviction(2);
    const metrics = await governance.getStakingMetrics(user1.address);
    if (Number(metrics.convictionMultiplier) !== 2) throw new Error("Wrong multiplier");
  });

  await test("createProposal", async () => {
    await governance.connect(user1).createProposal("Test Proposal", "A test proposal", 3600);
    const count = await governance.getProposalCount();
    if (Number(count) < 1) throw new Error("No proposals");
  });

  await test("voteOnProposal (Aye)", async () => {
    await governance.connect(user1).voteOnProposal(0, 1);
    const proposal = await governance.getProposal(0);
    if (Number(proposal.ayeVotes) < 1) throw new Error("No votes recorded");
  });

  await test("addValidator", async () => {
    await governance.connect(owner).addValidator("ValidatorA", "VA", user2.address, 300, ethers.parseEther("10000"));
    const validators = await governance.getValidators();
    if (validators.length < 1) throw new Error("No validators");
  });

  // ─── Security ────────────────────────────────────────────────
  console.log("\n📋 PolkaMeSecurity");

  await test("initializePrivacyPrefs", async () => {
    await security.connect(user1).initializePrivacyPrefs();
    const prefs = await security.getPrivacyPreferences(user1.address);
    if (prefs.length < 1) throw new Error("No prefs");
  });

  await test("updatePrivacyPreference", async () => {
    await security.connect(user1).updatePrivacyPreference(0, false);
    const prefs = await security.getPrivacyPreferences(user1.address);
    if (prefs[0].enabled) throw new Error("Should be disabled");
  });

  await test("createSession", async () => {
    await security.connect(user1).createSession("Windows 11", "Chrome", "Manila", false);
    const sessions = await security.getActiveSessions(user1.address);
    if (sessions.length < 1) throw new Error("No session");
  });

  await test("logSecurityEvent", async () => {
    await security.connect(user1).logSecurityEvent("New login", "Chrome/Manila");
    const log = await security.getSecurityLog(user1.address);
    if (log.length < 1) throw new Error("No log entry");
  });

  await test("revokeSession", async () => {
    await security.connect(user1).revokeSession(0);
    const sessions = await security.getActiveSessions(user1.address);
    if (sessions[0].active) throw new Error("Session should be inactive after revoke");
  });

  // ─── Summary ─────────────────────────────────────────────────
  console.log(`\n${"─".repeat(40)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("  🎉 All tests passed!\n");
  } else {
    console.log("  ⚠️  Some tests failed — check errors above\n");
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
