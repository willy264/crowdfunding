// Crowdfunding Contract Deployment Script for Hardhat
import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy MockERC20 Token
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const mockERC20 = await MockERC20.deploy();
  await mockERC20.waitForDeployment();
  console.log("MockERC20 deployed to:", mockERC20.target);

  // Deploy Crowdfunding Contract
  const Crowdfunding = await hre.ethers.getContractFactory("CrowdFunding");
  const crowdfunding = await Crowdfunding.deploy();
  await crowdfunding.waitForDeployment();
  console.log("Crowdfunding deployed to:", crowdfunding.target);

  // Create Project
  const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  const txCreate = await crowdfunding.createProject(crowdfunding.target, "My Project Name", 1000, deadline, mockERC20.target);
  await txCreate.wait();
  console.log("Project created with goal of 1000 tokens");

  // Contribute to Project
  const [_, backer] = await hre.ethers.getSigners();
  await mockERC20.transfer(backer.address, 1000);
  await mockERC20.connect(backer).approve(crowdfunding.target, 500);
  const txContribute = await crowdfunding.connect(backer).contribute(0, 500);
  await txContribute.wait();
  console.log("Backer contributed 500 tokens");

  // Attempt to Release Funds (if goal met)
  try {
    const txRelease = await crowdfunding.releaseFunds(0);
    await txRelease.wait();
    console.log("Funds released to project creator");
  } catch (error) {
    console.error("Funds release failed (goal not met or deadline not passed)");
  }

  // Attempt to Claim Refund (if goal not met)
  try {
    const txRefund = await crowdfunding.connect(backer).refund(0);
    await txRefund.wait();
    console.log("Backer claimed refund");
  } catch (error) {
    console.error("Refund claim failed (goal met or not eligible)");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
