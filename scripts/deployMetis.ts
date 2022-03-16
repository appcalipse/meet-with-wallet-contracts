// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

const USDC = "0xea32a96608495e54156ae48931a7c20f0dcc1a21" //https://andromeda-explorer.metis.io/token/0xEA32A96608495e54156Ae48931A7c20f0dcc1a21/ 
const PRICE_FEED = "0x6E6E633320Ca9f2c8a8722c5f4a993D9a093462E" //https://andromeda-explorer.metis.io/address/0x6E6E633320Ca9f2c8a8722c5f4a993D9a093462E/

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const Registar = await ethers.getContractFactory("MWWRegistarMetis")
  const registar = await Registar.deploy([USDC])
  await registar.deployed()
  await registar.setPriceFeed(PRICE_FEED)
  await registar.addPlan('PRO', 30, 1)

  const Subscripton = await ethers.getContractFactory("MWWDomain")
  const domainContract = await Subscripton.deploy(registar.address)
  await domainContract.deployed()
  await registar.setDomainContract(domainContract.address)

  console.log("Registar deployed to:", registar.address);
  console.log("Domain deployed to:", domainContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
