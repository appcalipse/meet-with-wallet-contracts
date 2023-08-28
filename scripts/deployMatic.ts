// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" //https://polygonscan.com/token/0x2791bca1f2de4661ed88a30c99a7a9449aa84174 
const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" //https://polygonscan.com/token/0x8f3cf7ad23cd3cadbd9735aff958023239c6a063
const PRICE_FEED = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0" //https://docs.chain.link/docs/matic-addresses/

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const Registar = await ethers.getContractFactory("MWWRegistarPolygon")
  const registar = await Registar.deploy([USDC, DAI])
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