import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-etherscan";
import "@ericxstone/hardhat-blockscout-verify";
import {SOLIDITY_VERSION, EVM_VERSION} from "@ericxstone/hardhat-blockscout-verify";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const accounts =  process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : []
const config: HardhatUserConfig = {
  solidity: "0.8.4",
  networks: {
    harmonyTest: {
      url: `https://api.s0.b.hmny.io`,
      accounts
    },
    harmonyMainnet: {
      url: `https://api.harmony.one`,
      accounts
    },
    metisStardust: {
      url: `https://stardust.metis.io/?owner=588`,
      accounts
    },
    polygonMumbai: {
      url: `https://rpc-mumbai.matic.today`,
      accounts
    },
    matic: {
      url: `https://polygon-rpc.com`,
      accounts
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  blockscoutVerify: {
    blockscoutURL: "https://stardust-explorer.metis.io",
    contracts: {
      "MWWRegistarMetis" : {
        compilerVersion: SOLIDITY_VERSION.SOLIDITY_V_8_4, 
        optimization: false,
        evmVersion: EVM_VERSION.EVM_ISTANBUL,
        optimizationRuns: 0,
      },
      "MWWSubscription" : {
        compilerVersion: SOLIDITY_VERSION.SOLIDITY_V_8_4, 
        optimization: false,
        evmVersion: EVM_VERSION.EVM_ISTANBUL,
        optimizationRuns: 0,
      }
    }
  },
};




export default config;
