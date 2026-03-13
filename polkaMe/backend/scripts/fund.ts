import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const [funder] = await ethers.getSigners();
  const target = "0x0718fC43b619b0D7254308A77F15dCBA81541c08";
  
  console.log(`Sending 100 ETH from ${await funder.getAddress()} to ${target}...`);
  const tx = await funder.sendTransaction({
    to: target,
    value: ethers.parseEther("100"),
  });
  await tx.wait();
  
  const balance = await ethers.provider.getBalance(target);
  console.log(`Done! New balance: ${ethers.formatEther(balance)} ETH`);
}

main().catch(console.error);
