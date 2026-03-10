import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  console.log("\n🚀 Deploying PolkaMe contracts with account:", deployer.address);

  // 1. Deploy PolkaMeIdentity (no constructor args)
  const Identity = await ethers.getContractFactory("PolkaMeIdentity");
  const identity = await Identity.deploy();
  await identity.waitForDeployment();
  const identityAddr = await identity.getAddress();
  console.log("✅ PolkaMeIdentity deployed at:", identityAddr);

  // 2. Deploy PolkaMeAccounts (needs Identity address)
  const Accounts = await ethers.getContractFactory("PolkaMeAccounts");
  const accounts = await Accounts.deploy(identityAddr);
  await accounts.waitForDeployment();
  const accountsAddr = await accounts.getAddress();
  console.log("✅ PolkaMeAccounts deployed at:", accountsAddr);

  // 3. Deploy PolkaMeGovernance (needs Identity address)
  const Governance = await ethers.getContractFactory("PolkaMeGovernance");
  const governance = await Governance.deploy(identityAddr);
  await governance.waitForDeployment();
  const governanceAddr = await governance.getAddress();
  console.log("✅ PolkaMeGovernance deployed at:", governanceAddr);

  // 4. Deploy PolkaMeSecurity (needs Identity address)
  const Security = await ethers.getContractFactory("PolkaMeSecurity");
  const security = await Security.deploy(identityAddr);
  await security.waitForDeployment();
  const securityAddr = await security.getAddress();
  console.log("✅ PolkaMeSecurity deployed at:", securityAddr);

  // 5. Authorize PolkaMeAccounts to call addScoreFor/subScoreFor on Identity
  await identity.setAuthorizedContract(accountsAddr, true);
  console.log("✅ PolkaMeAccounts authorized on Identity");

  console.log("\n📋 Deployment Summary:");
  console.log("  PolkaMeIdentity  :", identityAddr);
  console.log("  PolkaMeAccounts  :", accountsAddr);
  console.log("  PolkaMeGovernance:", governanceAddr);
  console.log("  PolkaMeSecurity  :", securityAddr);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
