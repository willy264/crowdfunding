// Crowdfunding Test Script for Hardhat (with Custom Error Handling)
import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Crowdfunding Tests", function () {
  const deployCrowdfunding = async () => {
    const [owner, backer1, backer2] = await hre.ethers.getSigners();
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const mockERC20 = await MockERC20.deploy();
    const Crowdfunding = await hre.ethers.getContractFactory("CrowdFunding");
    const crowdfunding = await Crowdfunding.deploy();
    await crowdfunding.createProject(owner.address, "Test Project", 1000, (await time.latest()) + 86400, mockERC20.target);
    return { crowdfunding, mockERC20, owner, backer1, backer2 };
  };

  describe("Contributioned", function () {

    it("should revert if contribution amount is zero", async function () {
      const { crowdfunding, backer1 } = await loadFixture(deployCrowdfunding);

      await expect(crowdfunding.connect(backer1).contribute(0, 0))
        .to.be.revertedWithCustomError(crowdfunding, "ContributionZero");
    });

    it("should accept contributions from multiple backers", async function () {
      const { crowdfunding, mockERC20, backer1, backer2 } = await loadFixture(deployCrowdfunding);
      await mockERC20.connect(backer1).approve(crowdfunding.target, 1000);
      await mockERC20.connect(backer2).approve(crowdfunding.target, 1000);
      await crowdfunding.connect(backer1).contribute(0, 500);
      await crowdfunding.connect(backer2).contribute(0, 500);
      const totalFund = await crowdfunding.projects(0).totalFunded;
      expect(totalFund).to.equal(1000);
    });

  });

  describe("Funds Release and Refunds", function () {
    it("should revert if non-creator tries to release funds", async function () {
      const { crowdfunding, backer1 } = await loadFixture(deployCrowdfunding);
      await expect(crowdfunding.connect(backer1).releaseFunds(0))
        .to.be.revertedWithCustomError(crowdfunding, "NotProjectCreator");
    });

    it("should revert refund if deadline not reached", async function () {
      const { crowdfunding, backer1 } = await loadFixture(deployCrowdfunding);
      await expect(crowdfunding.connect(backer1).refund(0))
        .to.be.revertedWithCustomError(crowdfunding, "DeadlineNotReached");
    });

    it("should release funds to the creator if goal is reached", async function () {
      const { crowdfunding, mockERC20, owner, backer1 } = await loadFixture(deployCrowdfunding);
      await mockERC20.connect(backer1).approve(crowdfunding.target, 1000);
      await crowdfunding.connect(backer1).contribute(0, 1000);
      await time.increase(3600);
      await expect(crowdfunding.connect(owner).releaseFunds(0)).to.emit(crowdfunding, "FundsReleased").withArgs(0);
    });

  });

  describe("Refund", function () {
    it("should refund backers if goal is not met", async function () {
      const { crowdfunding, mockERC20, backer1 } = await loadFixture(deployCrowdfunding);
      await mockERC20.connect(backer1).approve(crowdfunding.target, 500);
      await crowdfunding.connect(backer1).contribute(0, 500);
      await time.increase(86500);
      await expect(crowdfunding.connect(backer1).refund(0))
        .to.emit(crowdfunding, "RefundIssued")
        .withArgs(0, backer1.address, 500);
    });
  });

});


