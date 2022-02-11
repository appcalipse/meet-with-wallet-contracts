// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

const PRICE_FEED = "0x39879838beeA9A0F42bE0a39798D0b9768F8333C" //https://stardust-explorer.metis.io/address/0x39879838beeA9A0F42bE0a39798D0b9768F8333C/transactions

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const [deployer] = await ethers.getSigners();

  const mockDAI = await (await ethers.getContractFactory("MockDAI")).deploy(deployer.address)

  const Registar = await ethers.getContractFactory("MWWRegistarMetis")
  const registar = await Registar.deploy([mockDAI.address])
  await registar.deployed()
  await registar.setPriceFeed(PRICE_FEED)

  const Subscripton = await ethers.getContractFactory("MWWSubscription")
  const subscriptionContract = await Subscripton.deploy(registar.address)
  await subscriptionContract.deployed()
  await registar.setSubscriptionContract(subscriptionContract.address)

  console.log("mockDAI deployed to:", mockDAI.address);
  console.log("Registar deployed to:", registar.address);
  console.log("Subscription deployed to:", subscriptionContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
