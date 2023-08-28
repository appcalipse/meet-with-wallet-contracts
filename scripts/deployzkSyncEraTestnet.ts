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

import { Wallet } from "zksync-web3";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { ethers } from "ethers";
import { Permission } from "../src/utils";

// load env file
import dotenv from "dotenv";
dotenv.config();

// load wallet private key from env file
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";

const BUXX_AMOUNT_THRESHOLD = process.env.BUXX_AMOUNT_THRESHOLD || "1";
const MAX_GAS_PER_PUBDATA_BYTE_LIMIT = process.env.MAX_GAS_PER_PUBDATA_BYTE_LIMIT || "800000";
const MAX_FEE_PER_ERG = process.env.MAX_FEE_PER_ERG || "10000000000000000";
const MIN_GAS_LIMIT = process.env.MIN_GAS_LIMIT || "0";
const MAX_GAS_LIMIT = process.env.MAX_GAS_LIMIT || "10000000000000000";


if (!PRIVATE_KEY)
  throw "⛔️ Private key not detected! Add it to the .env file!";

export default async function (hre: HardhatRuntimeEnvironment) {
  const wallet = new Wallet(PRIVATE_KEY);
  const deployer = new Deployer(hre, wallet);

  const BuidlBuxArtifact = await deployer.loadArtifact("BuidlBux");
  const buidlBux = await deployer.deploy(BuidlBuxArtifact);
  console.log("BuidlBux deployed to:", buidlBux.address)

  const paymasterArtifact = await deployer.loadArtifact('BuidlBuxPaymaster');
  const paymasterContract = await deployer.deploy(paymasterArtifact, []);
  console.log("Paymaster implementation deployed to:", paymasterContract.address);

  const paymasterInterface = new ethers.utils.Interface(paymasterArtifact.abi);
  const initializeData = paymasterInterface.encodeFunctionData("initialize", [
    buidlBux.address,
    BUXX_AMOUNT_THRESHOLD,
    MAX_GAS_PER_PUBDATA_BYTE_LIMIT,
    MAX_FEE_PER_ERG,
    MIN_GAS_LIMIT,
    MAX_GAS_LIMIT
  ]);

  const wallets = require("../testWallets/wallets.json") as { address: string, privateKey: string }[];

  const proxyArtifacts = await deployer.loadArtifact("TransparentUpgradeableProxy");
  const deployedProxy = await deployer.deploy(proxyArtifacts, [paymasterContract.address, wallets[0].address, initializeData]);
  const proxyContract = new ethers.Contract(deployedProxy.address, paymasterInterface, deployedProxy.signer);
  console.log("Paymaster proxy deployed to:", proxyContract.address);

  await hre.run("verify:verify", {
    address: buidlBux.address,
    contract: "contracts/BuidlBux.sol:BuidlBux"
  });

  await hre.run("verify:verify", {
    address: paymasterContract.address,
    contract: "contracts/BuidlBuxPaymaster.sol:BuidlBuxPaymaster"
  });

  await hre.run("verify:verify", {
    address: proxyContract.address,
    contract: "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
    constructorArguments: [paymasterContract.address, wallets[0].address, initializeData]
  });

  await (await proxyContract.setPaymasterStatus(true)).wait();

  // Fund all wallets with BuidlBux
  const amountToTransfer = 100 * (10 ** (await buidlBux.decimals()))

  for (const wallet of wallets) {
    try {
      console.log(`starting claim for ${wallet.address}`)
      await (await buidlBux.claim(wallet.address, amountToTransfer)).wait()
      console.log(`claimed for ${wallet.address}`)
    } catch (e) {
      console.log(`Error claiming for ${wallet.address}`)
      console.log(e)
    }
  };

  // Last wallet will be in the AllowList for claiming
  await buidlBux.addToAllowList([wallets[wallets.length - 1].address]);

  // Second last 2 wallets will be "vendors" in the desitnationList to receive transfer paid by the paymaster
  await proxyContract.changePermissions([wallets[wallets.length - 2].address, wallets[wallets.length - 3].address], [Permission.Receiver, Permission.Receiver]);

  console.log("Done");

  return
}
