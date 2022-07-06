// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" //https://etherscan.io/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 
const DAI = "0x6b175474e89094c44da98b954eedeac495271d0f" //https://etherscan.io/token/0x6b175474e89094c44da98b954eedeac495271d0f
const PRICE_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" // https://docs.chain.link/docs/ethereum-addresses/

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const Registar = await ethers.getContractFactory("MWWRegistarEthereum")
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
