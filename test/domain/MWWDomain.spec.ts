import { BigNumber, Contract } from "ethers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const blockChainDelay = async (delay: number) => {
  await network.provider.send("evm_increaseTime", [delay]);
  await network.provider.send("evm_mine");
};

describe("MWWDomain", async () => {
  let instance: Contract;
  let [deployer, registrar, user, newAdmin, randomUser]: SignerWithAddress[] =
    [];

  beforeEach("should setup the contract instance", async () => {
    [deployer, registrar, user, newAdmin, randomUser] =
      await ethers.getSigners();
    instance = await (
      await ethers.getContractFactory("MWWDomain")
    ).deploy(registrar.address);
  });

  it("should have first account as owner", async () => {
    const owner = await instance.owner();
    expect(owner).to.equal(deployer.address);
  });

  it("should have second account as registrar", async () => {
    const _registar = await instance.registerContract();
    expect(_registar).to.equal(registrar.address);
  });

  it("should fail to change owner", async () => {
    await expect(
      instance.connect(registrar).transferOwnership(user.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should change owner", async () => {
    await instance.transferOwnership(newAdmin.address);
    const newOwner = await instance.owner();
    expect(newOwner).to.equal(newAdmin.address);
  });

  it("admin can manually add subscriptions", async () => {
    const expirTime = new Date().getTime() + 500;
    await instance.addAdmin(newAdmin.address);
    await instance
      .connect(newAdmin)
      .addDomains([[user.address, 1, expirTime, "mww.eth", "", 0]]);
    const active = await instance.isSubscriptionActive("mww.eth");
    expect(active).to.equal(true);
    await instance.connect(newAdmin).addDomains([
      [user.address, 1, expirTime, "mww2.eth", "", 0],
      [user.address, 1, expirTime, "mww3.eth", "", 0],
    ]);
    const active2 = await instance.isSubscriptionActive("mww2.eth");
    expect(active2).to.equal(true);
    const active3 = await instance.isSubscriptionActive("mww3.eth");
    expect(active3).to.equal(true);
  });

  it("removing admin should then fail to manually add subscription", async () => {
    await instance.addAdmin(newAdmin.address);
    await instance.removeAdmin(newAdmin.address);
    await expect(
      instance
        .connect(user)
        .addDomains([[user.address, 1, 100, "mww.eth", "", 0]])
    ).to.be.revertedWith("Only admin can do it");
  });

  it("should create subscription", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");

    const sub = await instance.domains("mww.eth");
    expect(sub.domain).to.equal("mww.eth");
    expect(sub.planId).to.equal(1);
    expect(sub.owner).to.equal(user.address);
    const active = await instance.isSubscriptionActive("mww.eth");
    expect(active).to.equal(true);
  });

  it("should emit subscription event", async () => {
    await expect(
      instance
        .connect(registrar)
        .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "")
    )
      .to.emit(instance, "MWWSubscribed")
      .withArgs(user.address, 1, 100, "mww.eth");
  });

  it("should fail to subscribe", async () => {
    await expect(
      instance
        .connect(user)
        .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "")
    ).to.be.revertedWith("Only the register can call this");
    await expect(
      instance
        .connect(user)
        .addDomains([[user.address, 1, 100, "mww.eth", "", 0]])
    ).to.be.revertedWith("Only admin can do it");
  });

  it("subscription should expire", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    await instance.isSubscriptionActive("mww.eth");
    await blockChainDelay(200);
    const active = await instance.isSubscriptionActive("mww.eth");
    expect(active).to.equal(false);
  });

  it("Fetching domains from account works", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww2.eth", "");

    const domains = await instance.getDomainsForAccount(user.address);
    expect(domains).to.include.ordered.members(["mww.eth", "mww2.eth"]);
  });

  it("Should extend subscription", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 300, "mww.eth", "");
    const sub = await instance.domains("mww.eth");
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 300, "mww.eth", "");
    const updatedSub = await instance.domains("mww.eth");
    const domains = await instance.getDomainsForAccount(user.address);
    expect(BigNumber.from(sub.expiryTime).add(300)).to.equal(
      BigNumber.from(updatedSub.expiryTime)
    );
    expect(domains).to.have.lengthOf(1);
  });

  it("Should fail to extend subscription with different plan or user", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    await expect(
      instance
        .connect(registrar)
        .subscribe(randomUser.address, 2, user.address, 500, "mww.eth", "")
    ).to.be.revertedWith("Domain registered with another plan");
    await expect(
      instance
        .connect(registrar)
        .subscribe(randomUser.address, 1, newAdmin.address, 500, "mww.eth", "")
    ).to.be.revertedWith("Domain registered for someone else");

    await blockChainDelay(1000);

    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, newAdmin.address, 100, "mww.eth", "");
  });

  it("should be able to change domain on subscription", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    const sub = await instance.domains("mww.eth");
    await instance.connect(user).changeDomain("mww.eth", "mww2.eth");
    const changedSub = await instance.domains("mww2.eth");
    expect(sub.expiryTime).to.equal(changedSub.expiryTime);

    const domains = await instance.getDomainsForAccount(user.address);

    expect(domains).to.include.ordered.members(["mww2.eth"]);
  });

  it("should not be able to change domain on subscription it doesn't own", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, newAdmin.address, 100, "mww2.eth", "");

    await expect(
      instance.connect(user).changeDomain("mww2.eth", "whatever.eth")
    ).to.be.revertedWith("Only the owner or delegates can manage the domain");
  });

  it("should not be able to change domain on expired subscription", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    await blockChainDelay(200);

    await expect(
      instance.connect(user).changeDomain("mww.eth", "whatever.eth")
    ).to.be.revertedWith("Subscription expired");
  });

  it("should not be able to change domain to one that is being used by another subscription", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, newAdmin.address, 100, "mww2.eth", "");

    await expect(
      instance.connect(user).changeDomain("mww.eth", "mww2.eth")
    ).to.be.revertedWith("New Domain must be unregistered or expired.");
  });

  it("should emit event for changing domain", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    await expect(instance.connect(user).changeDomain("mww.eth", "whatever.eth"))
      .to.emit(instance, "MWWDomainChanged")
      .withArgs(user.address, "mww.eth", "whatever.eth");
  });

  it("should add delegate", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    await instance.connect(user).addDelegate("mww.eth", newAdmin.address);
    const delegates = await instance.getDelegatesForDomain("mww.eth");
    expect(delegates).to.include.ordered.members([
      randomUser.address,
      newAdmin.address,
    ]);
  });

  it("should fail to add delegate", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    await expect(
      instance.connect(newAdmin).addDelegate("mww.eth", newAdmin.address)
    ).to.be.revertedWith("You are not allowed to do this");
  });

  it("should remove delegate", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    await instance.connect(user).removeDelegate("mww.eth", randomUser.address);
    const delegates = await instance.getDelegatesForDomain("mww.eth");
    expect(delegates).to.be.empty;
  });

  it("should fail to remove delegate", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    await instance.connect(user).addDelegate("mww.eth", newAdmin.address);
    await expect(
      instance.connect(newAdmin).removeDelegate("mww.eth", newAdmin.address)
    ).to.be.revertedWith("You are not allowed to do this");
  });

  it("delegate can change domain", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "");
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww3.eth", "");
    await instance.connect(user).addDelegate("mww.eth", newAdmin.address);
    await instance.connect(newAdmin).changeDomain("mww.eth", "mww2.eth");
    const domains = await instance.getDomainsForAccount(user.address);
    expect(domains).to.include.ordered.members(["mww2.eth", "mww3.eth"]);
  });

  it("should change ipfs hash", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "hash1");
    const sub = await instance.domains("mww.eth");
    expect(sub.configIpfsHash).to.equal("hash1");
    await instance.connect(user).changeDomainConfigHash("mww.eth", "hash2");
    const changedSub = await instance.domains("mww.eth");
    expect(changedSub.configIpfsHash).to.equal("hash2");
  });

  it("should change ipfs hash as delegate", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "hash1");
    await instance.connect(user).addDelegate("mww.eth", newAdmin.address);
    const sub = await instance.domains("mww.eth");
    expect(sub.configIpfsHash).to.equal("hash1");
    await instance.connect(newAdmin).changeDomainConfigHash("mww.eth", "hash2");
    const changedSub = await instance.domains("mww.eth");
    expect(changedSub.configIpfsHash).to.equal("hash2");
  });

  it("should fail to change ipfs hash", async () => {
    await instance
      .connect(registrar)
      .subscribe(randomUser.address, 1, user.address, 100, "mww.eth", "hash1");
    const sub = await instance.domains("mww.eth");
    expect(sub.configIpfsHash).to.equal("hash1");
    await expect(
      instance.connect(newAdmin).changeDomainConfigHash("mww.eth", "hash2")
    ).to.be.revertedWith("Only the owner or delegates can manage the domain");
  });
});
