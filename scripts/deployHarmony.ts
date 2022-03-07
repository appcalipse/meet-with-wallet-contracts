// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

const USDC = "0x985458e523db3d53125813ed68c274899e9dfab4" //https://explorer.harmony.one/address/0x985458e523db3d53125813ed68c274899e9dfab4
const DAI = "0xef977d2f931c1978db5f6747666fa1eacb0d0339" //https://explorer.harmony.one/address/0xef977d2f931c1978db5f6747666fa1eacb0d0339
const PRICE_FEED = "0xdCD81FbbD6c4572A69a534D8b8152c562dA8AbEF" //https://docs.chain.link/docs/harmony-price-feeds/

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const Registar = await ethers.getContractFactory("MWWRegistarHarmony")
  const registar = await Registar.deploy([USDC, DAI])
  await registar.deployed()
  await registar.setPriceFeed(PRICE_FEED)

  const Subscripton = await ethers.getContractFactory("MWWDomain")
  const domainContract = await Subscripton.deploy(registar.address)
  await domainContract.deployed()
  await registar.setDomainContract(domainContract.address)

  console.log("Registar deployed to:", registar.address);
  console.log("Subscription deployed to:", domainContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
