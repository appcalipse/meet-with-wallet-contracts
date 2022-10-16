// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

const PRICE_FEED = "0xcEe686F89bc0dABAd95AEAAC980aE1d97A075FAD" //https://docs.chain.link/docs/harmony-price-feeds/

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

  const Registar = await ethers.getContractFactory("MWWRegistarHarmony")
  const registar = await Registar.deploy([mockDAI.address])
  await registar.deployed()
  await registar.setPriceFeed(PRICE_FEED)
  await registar.addPlan('PRO', 1, 1)

  const Subscripton = await ethers.getContractFactory("MWWDomain")
  const domainContract = await Subscripton.deploy(registar.address)
  await domainContract.deployed()
  await registar.setDomainContract(domainContract.address)

  console.log("mockDAI deployed to:", mockDAI.address);
  console.log("Registar deployed to:", registar.address);
  console.log("Domain deployed to:", domainContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
