import { ethers } from "hardhat";
import { expect } from "chai";
import { faker } from "@faker-js/faker";
import { BigNumber, Contract, ContractFactory } from "ethers";

type Networks =
  | "EthereumPaidMeeting"
  | "PolygonPaidMeeting"
  | "MetisPaidMeeting"
  | "HarmonyPaidMeeting";

const availableNertorks: Networks[] = [
  "EthereumPaidMeeting",
  "PolygonPaidMeeting",
  "MetisPaidMeeting",
  "HarmonyPaidMeeting",
];

async function deployTestFixture(network: Networks) {
  const [owner, otherAddress, registrar] = await ethers.getSigners();

  // Library deployment
  const NativePriceLibrary = await ethers.getContractFactory(
    "NativePriceLibrary"
  );
  const lib = await NativePriceLibrary.deploy();

  const usdc = await (
    await ethers.getContractFactory("MockUSDC")
  ).deploy(otherAddress.address);
  const dai = await (
    await ethers.getContractFactory("MockDAI")
  ).deploy(otherAddress.address);

  let factory: ContractFactory;
  let contract: Contract;

  switch (network) {
    case "EthereumPaidMeeting":
    case "PolygonPaidMeeting":
    case "HarmonyPaidMeeting":
      const priceFeed = await (
        await ethers.getContractFactory("MockChainlinkAggregator")
      ).deploy();
      factory = await ethers.getContractFactory(network, {
        signer: owner,
        libraries: {
          NativePriceLibrary: lib.address,
        },
      });
      contract = await factory.deploy(usdc.address);
      await contract.setPriceFeed(priceFeed.address);
      break;
    case "MetisPaidMeeting":
      const oracleFeed = await (
        await ethers.getContractFactory("MockDIAOracle")
      ).deploy();
      factory = await ethers.getContractFactory(network, {
        signer: owner,
        libraries: {
          NativePriceLibrary: lib.address,
        },
      });
      contract = await factory.deploy(usdc.address);
      await contract.setPriceFeed(oracleFeed.address);
      break;
    default:
      throw new Error(`Invalid network provided: ${network}`);
  }

  await Promise.all([
    lib.deployed(),
    usdc.deployed(),
    dai.deployed(),
    contract.deployed(),
  ]);
  return { factory, contract, owner, otherAddress, usdc };
}

availableNertorks.forEach((testNetwork: Networks) => {
  describe(`Network > ${testNetwork}`, function () {
    describe("MWW Paid Meeting contract > As Owner", function () {
      it("should not be able to change tax not being the owner", async function () {
        // given
        const { contract, otherAddress } = await deployTestFixture(testNetwork);
        const newTax = 70;

        // when
        const response = contract.connect(otherAddress).setTax(newTax);

        // then
        await expect(response).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });

      it("should not be able to change tax with valid", async function () {
        // given
        const { contract } = await deployTestFixture(testNetwork);
        const newTax = 101;

        // when
        const response = contract.setTax(newTax);

        // then
        await expect(response).to.be.revertedWith(
          "Tax is percentual and must lesser or equal to 100"
        );
      });

      it("should be able to change tax being the owner", async function () {
        // given
        const { contract, owner } = await deployTestFixture(testNetwork);
        const newTax = 70;

        // when
        const response = contract.setTax(newTax);

        // then
        await expect(response)
          .to.emit(contract, "MWWTaxChange")
          .withArgs(5, newTax);
      });
    });

    describe("MWW Paid Meeting contract > Subscriptions", function () {
      it("should not be able to subscribe to a not existing meeting", async function () {
        // given
        const { contract, usdc } = await deployTestFixture(testNetwork);
        const meetingId = faker.datatype.uuid();

        // when
        const response = contract.subscribe(usdc.address, meetingId);

        // then
        await expect(response).to.be.revertedWith(
          "The meeting is not registered as paid in the contract"
        );
      });

      it("should be able to subscribe to a existing meeting", async function () {
        // given
        const { contract, owner, usdc, otherAddress } = await deployTestFixture(
          testNetwork
        );
        const meetingId = faker.datatype.uuid();
        const usdPrice = faker.datatype.number({ min: 1, max: 10 });
        const [planPriceInWei] = await contract.getNativeConvertedValue(
          usdPrice
        );
        const tax = await contract.meetWithWalletTax();
        const repass = BigNumber.from(100).sub(tax);

        expect(await usdc.balanceOf(owner.address)).to.equal(BigNumber.from(0));

        await Promise.all([
          usdc.connect(otherAddress).approve(contract.address, planPriceInWei),
          usdc.connect(otherAddress).approve(owner.address, planPriceInWei),
        ]);

        await contract.register(
          meetingId,
          usdPrice,
          faker.date.future().getTime()
        );

        // when
        const response = await contract
          .connect(otherAddress)
          .subscribe(usdc.address, meetingId, {
            value: planPriceInWei,
          });

        // // then
        const amountToRepass = planPriceInWei.div(100).mul(repass);
        const amountToRetain = planPriceInWei.sub(amountToRepass);
        await expect(response)
          .to.emit(contract, "MWWMeetingPaymentSplit")
          .withArgs(
            otherAddress.address,
            meetingId,
            amountToRepass,
            amountToRetain
          );

        // when
        const accessResponse = await contract
          .connect(otherAddress)
          .hasAccess(meetingId);

        // then
        expect(accessResponse).to.equals(true);
      });

      it("should correctly report access when user has no access", async function () {
        // given
        const { contract } = await deployTestFixture(testNetwork);
        const meetingId = faker.datatype.uuid();

        // when
        const response = await contract.hasAccess(meetingId);

        // then
        expect(response).to.equals(false);
      });

      it("should not be able to subscribe twice to a meeting", async function () {
        // given
        const { contract, usdc, owner, otherAddress } = await deployTestFixture(
          testNetwork
        );
        const meetingId = faker.datatype.uuid();
        const usdPrice = faker.datatype.number({ min: 1, max: 10 });
        const [planPriceInWei] = await contract.getNativeConvertedValue(
          usdPrice
        );

        await Promise.all([
          usdc.connect(otherAddress).approve(contract.address, planPriceInWei),
          usdc.connect(otherAddress).approve(owner.address, planPriceInWei),
        ]);

        // when
        await contract.register(
          meetingId,
          usdPrice,
          faker.date.future().getTime()
        );
        await contract
          .connect(otherAddress)
          .subscribe(usdc.address, meetingId, {
            value: planPriceInWei,
          });

        const response = contract
          .connect(otherAddress)
          .subscribe(usdc.address, meetingId, {
            value: planPriceInWei,
          });

        // then
        await expect(response).to.be.revertedWith(
          "The meeting is already paid for this wallet"
        );
      });
    });
  });
});
