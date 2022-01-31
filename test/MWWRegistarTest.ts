import { BigNumber, Contract } from "ethers";
import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ERC20 } from "../typechain";

chai.use(solidity);

const YEAR_IN_SECONDS = 31_540_000

describe("MWWRegistar", async () => {

  let instance: Contract;
  let subscriptionContract: Contract;
  let [deployer, registrar, user, newAdmin]: SignerWithAddress[] = [];
  let usdc: ERC20
  let dai: ERC20

  beforeEach('should setup the contract instance', async () => {
    [deployer, registrar, user, newAdmin] = await ethers.getSigners();
    usdc = await (await ethers.getContractFactory("MockUSDC")).deploy(user.address)
    dai = await (await ethers.getContractFactory("MockDAI")).deploy(user.address)
    const priceFeed = await (await ethers.getContractFactory("MockChainlinkAggregator")).deploy()
    instance = await (await ethers.getContractFactory("MWWRegistarPolygon")).deploy([usdc.address])
    await instance.setPriceFeed(priceFeed.address)
    subscriptionContract = await (await ethers.getContractFactory("MWWSubscription")).deploy(instance.address)
    await instance.setSubscriptionContract(subscriptionContract.address)
  });

  it("should add plans", async () => {
    await instance.addPlan("PRO", 30, 1)
    const plans = await instance.getAvailablePlans()
    const plan = plans[0]
    expect(plan.name).to.eq("PRO")
    expect(plan.usdPrice).to.eq(BigNumber.from(30))
    expect(plan.planId).to.eq(1)
  });

  it("should fail to add plan", async () => {
    await instance.addPlan("PRO", 30, 1)
    await expect(instance.addPlan("DAO", 200, 1)).to.be.revertedWith("Plan already exists")
  });

  it("should remove plan", async () => {
    await instance.addPlan("PRO", 30, 1)
    await instance.addPlan("DAO", 200, 2)
    const plans = await instance.getAvailablePlans()
    expect(plans).to.have.lengthOf(2)
    await instance.removePlan(0, 1)
    const plans2 = await instance.getAvailablePlans()
    expect(plans2).to.have.lengthOf(1)
    expect(plans2[0].name).to.eq("DAO")
  });

  it("should fail to pruchase without plan", async () => {
    await expect(instance.purchaseWithNative(0, user.address, YEAR_IN_SECONDS, "look at me", "hash")).to.be.revertedWith("Plan does not exists")
  });

  it("should purchase with MATIC", async () => {
    const provider = waffle.provider;
    const contractBalance = await provider.getBalance(instance.address)
    const newAdminBalance = await provider.getBalance(newAdmin.address)
    const userBalance = await provider.getBalance(user.address)
    await instance.addPlan("PRO", 30, 1)
    const planPriceInWei = (await instance.getNativeConvertedValue(30))
    await instance.connect(newAdmin).purchaseWithNative(1, user.address, YEAR_IN_SECONDS, "look at me", "hash", {value: planPriceInWei})
    const newContractBalance = await provider.getBalance(instance.address)
    const newNewAdminBalance = await provider.getBalance(newAdmin.address)
    const newUserBalance = await provider.getBalance(user.address)
    expect(newContractBalance).to.eq(contractBalance.add(planPriceInWei))
    expect(newNewAdminBalance).to.lt(newAdminBalance.sub(planPriceInWei)) //gas fees
    expect(newUserBalance).to.eq(userBalance)
    const domains = await subscriptionContract.getDomainsForAccount(user.address)
    expect(domains).to.include.ordered.members(["look at me"]) 
  });

  it("should be delegate when buying for other", async () => {
    await instance.addPlan("PRO", 30, 1)
    const planPriceInWei = (await instance.getNativeConvertedValue(30))
    await instance.connect(newAdmin).purchaseWithNative(1, user.address, YEAR_IN_SECONDS, "mww.eth", "hash", {value: planPriceInWei})
    const delegates = await subscriptionContract.getDelegatesForDomain("mww.eth")
    expect(delegates).to.include.ordered.members([newAdmin.address])
  });

  it("should calculate price properly", async () => {
    const maticWei = (await instance.getNativeConvertedValue(30))
    expect(maticWei.toString()).to.eq("13623579145842458280")
  });

  it("should change plan price", async () => {
    await instance.addPlan("PRO", 30, 1)
    const plans = await instance.getAvailablePlans()
    expect(plans[0].planId).to.eq(1)
    expect(plans[0].usdPrice).to.eq(BigNumber.from(30))
    await instance.removePlan(0, 1)
    await instance.addPlan("PRO", 50, 1)
    const plans2 = await instance.getAvailablePlans()
    expect(plans2[0].planId).to.eq(1)
    expect(plans2[0].usdPrice).to.eq(BigNumber.from(50))
  });

  it("should fail to purchase without approving token", async () => {
    await instance.addPlan("PRO", 30, 1)
    await expect(instance.purchaseWithToken(usdc.address, 1, user.address, YEAR_IN_SECONDS, "look at me", "hash")).to.be.revertedWith("ERC20: transfer amount exceeds balance")
  });

  it("should purchase with USDC", async () => {
    await usdc.connect(user).transfer(newAdmin.address, 30*10**6)
    const contractBalance = await usdc.balanceOf(instance.address)
    const newAdminBalance = await usdc.balanceOf(newAdmin.address)
    const userBalance = await usdc.balanceOf(user.address)
    await usdc.connect(newAdmin).approve(instance.address, 30*10**6)
    await instance.addPlan("PRO", 30, 1)
    await instance.connect(newAdmin).purchaseWithToken(usdc.address, 1, user.address, YEAR_IN_SECONDS, "look at me", "hash")
    const newContractBalance = await usdc.balanceOf(instance.address)
    const newNewAdminBalance = await usdc.balanceOf(newAdmin.address)
    const newUserBalance = await usdc.balanceOf(user.address)
    expect(newContractBalance).to.eq(contractBalance.add(30*10**6))
    expect(newUserBalance).to.eq(userBalance)
    expect(newNewAdminBalance).to.eq(newAdminBalance.sub(30*10**6))
    const domains = await subscriptionContract.getDomainsForAccount(user.address)
    expect(domains).to.include.ordered.members(["look at me"]) 
  });

  it("should purchase with USDC for other durations", async () => {
    await usdc.connect(user).approve(instance.address, 100*10**6)
    await instance.addPlan("PRO", 30, 1)
    await instance.connect(user).purchaseWithToken(usdc.address, 1, user.address, 2*YEAR_IN_SECONDS, "look at me", "hash")
    
    const userBalance = await usdc.balanceOf(user.address)
    expect(userBalance).to.eq(40*10**6)

    const sub = await subscriptionContract.getSubscription("look at me")
    expect(sub.expiryTime).to.equal(Number(sub.registeredAt) + 2*YEAR_IN_SECONDS)
    
    await instance.connect(user).purchaseWithToken(usdc.address, 1, user.address, Math.round(YEAR_IN_SECONDS/3), "look at me2", "hash")
    const newUserBalance = await usdc.balanceOf(user.address)
    expect(newUserBalance).to.be.closeTo(BigNumber.from(30*10**6),10)
  });

  it("should fail to buy with non accepted token", async () => { 
    await expect(instance.purchaseWithToken(dai.address, 1, user.address, YEAR_IN_SECONDS, "look at me", "hash")).to.be.revertedWith("Token not accepted")
  });

  it("should remove acceptable token", async () => {
    await instance.removeAcceptableToken(usdc.address)
    await expect(instance.purchaseWithToken(usdc.address, 1, user.address, YEAR_IN_SECONDS, "look at me", "hash")).to.be.revertedWith("Token not accepted")
  });

  it("should add acceptable token and pay with it", async () => { 
    await instance.addPlan("PRO", 30, 1)
    await instance.addAcceptableToken(dai.address)
    await dai.connect(user).approve(instance.address, BigNumber.from("30000000000000000000"))
    await instance.connect(user).purchaseWithToken(dai.address, 1, user.address, YEAR_IN_SECONDS, "look at me", "hash")
  });

  it("should withdraw", async () => {
    const provider = waffle.provider;

    const contractEthBalance = await provider.getBalance(instance.address)
    const contractUSDCBalance = await usdc.balanceOf(instance.address)
    const contractDAIBalance = await dai.balanceOf(instance.address)

    await instance.addPlan("PRO", 30, 1)
    await instance.addAcceptableToken(dai.address)
    await dai.connect(user).approve(instance.address, BigNumber.from("30000000000000000000"))
    await usdc.connect(user).approve(instance.address, 30*10**6)

    await instance.connect(user).purchaseWithToken(usdc.address, 1, user.address, YEAR_IN_SECONDS, "look at me", "hash")
    await instance.connect(user).purchaseWithToken(dai.address, 1, user.address, YEAR_IN_SECONDS, "look at me", "hash")
    const planPriceInWei = (await instance.getNativeConvertedValue(30))
    await instance.connect(newAdmin).purchaseWithNative(1, user.address, YEAR_IN_SECONDS, "look at me", "hash", {value: planPriceInWei})

    const newContractEthBalance = await provider.getBalance(instance.address)
    const newContractUSDCBalance = await usdc.balanceOf(instance.address)
    const newContractDAIBalance = await dai.balanceOf(instance.address)

    expect(newContractEthBalance).to.eq(contractEthBalance.add(planPriceInWei))
    expect(newContractUSDCBalance).to.eq(contractUSDCBalance.add(30*10**6))
    expect(newContractDAIBalance).to.eq(contractDAIBalance.add(BigNumber.from("30000000000000000000")))

    const userEthBalance = await provider.getBalance(user.address)
    const userUSDCBalance = await usdc.balanceOf(user.address)
    const userDAIBalance = await dai.balanceOf(user.address)

    await instance.withdraw(ethers.constants.AddressZero, newContractEthBalance, user.address)
    await instance.withdraw(usdc.address, newContractUSDCBalance, user.address)
    await instance.withdraw(dai.address, newContractDAIBalance, user.address)

    const newUserEthBalance = await provider.getBalance(user.address)
    const newUserUSDCBalance = await usdc.balanceOf(user.address)
    const newUserDAIBalance = await dai.balanceOf(user.address)

    expect(newUserEthBalance).to.eq(userEthBalance.add(planPriceInWei))
    expect(newUserUSDCBalance).to.eq(userUSDCBalance.add(30*10**6))
    expect(newUserDAIBalance).to.eq(userDAIBalance.add(BigNumber.from("30000000000000000000")))
  });

  it("should fail to withdraw", async () => {
    await expect(instance.withdraw(ethers.constants.AddressZero, 100, user.address)).to.be.revertedWith("Failed to withdraw funds")
    await expect(instance.withdraw(dai.address, 100, user.address)).to.be.revertedWith("Token not accepted")
  })

 });

