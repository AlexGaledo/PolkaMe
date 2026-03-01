import { ethers } from "hardhat";
import { expect } from "chai";

describe("PolkaMe Contracts", function () {
  let identity: any, accounts: any, governance: any, security: any;
  let owner: any, user1: any, user2: any;
  let identityAddr: string, accountsAddr: string;

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy all contracts
    const Identity = await ethers.getContractFactory("PolkaMeIdentity");
    identity = await Identity.deploy();
    await identity.waitForDeployment();
    identityAddr = await identity.getAddress();

    const Accounts = await ethers.getContractFactory("PolkaMeAccounts");
    accounts = await Accounts.deploy(identityAddr);
    await accounts.waitForDeployment();
    accountsAddr = await accounts.getAddress();

    const Governance = await ethers.getContractFactory("PolkaMeGovernance");
    governance = await Governance.deploy(identityAddr);
    await governance.waitForDeployment();

    const Security = await ethers.getContractFactory("PolkaMeSecurity");
    security = await Security.deploy(identityAddr);
    await security.waitForDeployment();

    // Authorize accounts contract to update reputation scores
    await identity.setAuthorizedContract(accountsAddr, true);

    console.log("  📦 All contracts deployed");
  });

  // ═══════════════════════════════════════
  //  IDENTITY CONTRACT
  // ═══════════════════════════════════════
  describe("PolkaMeIdentity", function () {

    it("should create a DID", async function () {
      await identity.connect(user1).createDID("Alice");
      expect(await identity.hasDID(user1.address)).to.equal(true);
      const did = await identity.getDID(user1.address);
      expect(did.displayName).to.equal("Alice");
      expect(did.reputationScore).to.equal(10);
    });

    it("should reject duplicate DID creation", async function () {
      let reverted = false;
      try {
        await identity.connect(user1).createDID("Alice Again");
      } catch (e: any) {
        reverted = true;
        expect(e.message).to.include("DIDAlreadyExists");
      }
      expect(reverted).to.equal(true);
    });

    it("should update display name", async function () {
      await identity.connect(user1).updateDisplayName("Alice Updated");
      const did = await identity.getDID(user1.address);
      expect(did.displayName).to.equal("Alice Updated");
    });

    it("should link a Polkadot DID", async function () {
      await identity.connect(user1).linkPolkadotDID("did:polkadot:5GrwvaEF...");
      const links = await identity.getDIDLinks(user1.address);
      expect(links.length).to.equal(1);
      expect(links[0].polkadotDid).to.equal("did:polkadot:5GrwvaEF...");
      expect(links[0].verified).to.equal(false);
    });

    it("should verify a DID link (owner is verifier)", async function () {
      await identity.connect(owner).verifyDIDLink(user1.address, 0);
      const links = await identity.getDIDLinks(user1.address);
      expect(links[0].verified).to.equal(true);
    });

    it("should issue a credential", async function () {
      // CredentialType: 0=KYC, 1=DAOBadge, 2=Reputation, 3=SocialProof, 4=ChainProof
      await identity.connect(owner).issueCredential(
        user1.address,
        0, // KYC
        "KYC Verified",
        "PolkaMe",
        0, // never expires
        "ipfs://Qm..."
      );
      const creds = await identity.getCredentials(user1.address);
      expect(creds.length).to.equal(1);
      expect(creds[0].title).to.equal("KYC Verified");
      expect(creds[0].revoked).to.equal(false);
    });

    it("should validate a credential", async function () {
      expect(await identity.isCredentialValid(user1.address, 0)).to.equal(true);
    });

    it("should revoke a credential", async function () {
      await identity.connect(owner).revokeCredential(user1.address, 0);
      expect(await identity.isCredentialValid(user1.address, 0)).to.equal(false);
    });

    it("should submit verification (uint8 field)", async function () {
      // field: 0=email, 1=governance, 2=socials, 3=kyc
      await identity.connect(user1).submitVerification(0); // email
      const status = await identity.getVerificationStatus(user1.address);
      expect(status.email).to.equal(1); // 1 = Pending
    });

    it("should set verification state", async function () {
      await identity.connect(owner).setVerificationState(user1.address, 0, 2); // 2=Verified
      const status = await identity.getVerificationStatus(user1.address);
      expect(status.email).to.equal(2); // Verified
    });

    it("should return verification progress", async function () {
      const [step, total, pct] = await identity.getVerificationProgress(user1.address);
      expect(total).to.equal(3);
      expect(step).to.be.gte(0);
    });

    it("should return platform stats", async function () {
      const [users, creds, links] = await identity.getPlatformStats();
      expect(users).to.be.gte(1n);
    });
  });

  // ═══════════════════════════════════════
  //  ACCOUNTS CONTRACT
  // ═══════════════════════════════════════
  describe("PolkaMeAccounts", function () {

    it("should link a chain account", async function () {
      // ChainType: 0=Polkadot, 1=Kusama, 2=Astar, 3=Moonbeam, 4=Custom
      await accounts.connect(user1).linkChainAccount(0, "My Polkadot", "5GrwvaEF...", "main");
      const linked = await accounts.getLinkedChainAccounts(user1.address);
      expect(linked.length).to.equal(1);
      expect(linked[0].chain).to.equal(0n);
      expect(linked[0].label).to.equal("My Polkadot");
    });

    it("should link a social account", async function () {
      // SocialType: 0=Twitter, 1=Discord, 2=Github
      await accounts.connect(user1).linkSocialAccount(0, "@alice_web3");
      const socials = await accounts.getLinkedSocialAccounts(user1.address);
      expect(socials.length).to.equal(1);
      expect(socials[0].handle).to.equal("@alice_web3");
      expect(socials[0].verified).to.equal(false);
    });

    it("should verify a social account", async function () {
      await accounts.connect(owner).verifySocialAccount(user1.address, 0);
      const socials = await accounts.getLinkedSocialAccounts(user1.address);
      expect(socials[0].verified).to.equal(true);
    });

    it("should authorize a dApp", async function () {
      await accounts.connect(user1).authorizeDApp("TestDApp", user2.address);
      const dapps = await accounts.getAuthorizedDApps(user1.address);
      expect(dapps.length).to.equal(1);
      expect(dapps[0].name).to.equal("TestDApp");
    });

    it("should revoke a dApp", async function () {
      await accounts.connect(user1).revokeDApp(0);
      const dapps = await accounts.getAuthorizedDApps(user1.address);
      expect(dapps[0].active).to.equal(false);
    });

    it("should log activity", async function () {
      // ActivityStatus: 0=Success, 1=Pending, 2=Failed
      await accounts.connect(user1).logActivity("Linked wallet", "PolkaMe", 0);
      const log = await accounts.getRecentActivity(user1.address);
      expect(log.length).to.equal(1);
      expect(log[0].action).to.equal("Linked wallet");
    });
  });

  // ═══════════════════════════════════════
  //  GOVERNANCE CONTRACT
  // ═══════════════════════════════════════
  describe("PolkaMeGovernance", function () {

    it("should stake tokens", async function () {
      await governance.connect(user1).stake({ value: ethers.parseEther("1.0") });
      const metrics = await governance.getStakingMetrics(user1.address);
      expect(metrics.totalStaked).to.equal(ethers.parseEther("1.0"));
    });

    it("should set conviction multiplier", async function () {
      await governance.connect(user1).setConviction(2); // 2x
      const metrics = await governance.getStakingMetrics(user1.address);
      expect(metrics.convictionMultiplier).to.equal(2n);
    });

    it("should create a proposal", async function () {
      const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      await governance.connect(user1).createProposal(1, "tech", "Test Proposal", "A test proposal", endTime);
      expect(await governance.getProposalCount()).to.equal(1n);
    });

    it("should vote on a proposal", async function () {
      // Vote: 0=None, 1=Aye, 2=Nay
      await governance.connect(user1).voteOnProposal(0, 1); // Aye
      const proposal = await governance.getProposal(0);
      expect(proposal.ayeVotes).to.be.gte(1n);
    });

    it("should add a validator", async function () {
      await governance.connect(owner).addValidator("ValidatorA", "VA", user2.address, 300, { value: ethers.parseEther("0.1") });
      const validators = await governance.getValidators();
      expect(validators.length).to.equal(1);
      expect(validators[0].shortName).to.equal("ValidatorA");
    });
  });

  // ═══════════════════════════════════════
  //  SECURITY CONTRACT
  // ═══════════════════════════════════════
  describe("PolkaMeSecurity", function () {

    it("should initialize privacy preferences", async function () {
      await security.connect(user1).initializePrivacyPrefs();
      const prefs = await security.getPrivacyPreferences(user1.address);
      expect(prefs.length).to.be.gte(1);
    });

    it("should update a privacy preference", async function () {
      await security.connect(user1).updatePrivacyPreference(0, false);
      const prefs = await security.getPrivacyPreferences(user1.address);
      expect(prefs[0].enabled).to.equal(false);
    });

    it("should create a session", async function () {
      await security.connect(user1).createSession("Windows 11", "Chrome", "Manila, PH");
      const sessions = await security.getActiveSessions(user1.address);
      expect(sessions.length).to.equal(1);
      expect(sessions[0].device).to.equal("Windows 11");
    });

    it("should log a security event", async function () {
      await security.connect(user1).logSecurityEvent("Login from new device", "Chrome/Manila");
      const log = await security.getSecurityLog(user1.address);
      expect(log.length).to.equal(1);
      expect(log[0].eventDescription).to.equal("Login from new device");
    });

    it("should revoke a session", async function () {
      await security.connect(user1).revokeSession(0);
      const sessions = await security.getActiveSessions(user1.address);
      expect(sessions.length).to.equal(0);
    });
  });
});
