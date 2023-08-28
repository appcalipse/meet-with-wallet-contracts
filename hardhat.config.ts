import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@matterlabs/hardhat-zksync-deploy";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-verify";
import "@nomiclabs/hardhat-ethers";

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
  solidity: "0.8.17",
  networks: {
    ethereum: {
      url: `https://eth-mainnet.nodereal.io/v1/1659dfb40aa24bbb8153a677b98064d7`,
      accounts,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/cb1145f032c843528e32188dad3c2286`,
      accounts,
    },
    harmonyTest: {
      url: `https://api.s0.b.hmny.io`,
      accounts,
    },
    harmonyMainnet: {
      url: `https://api.s0.t.hmny.io`,
      accounts,
      gasPrice: 2250000000000,
    },
    metisStardust: {
      url: `https://stardust.metis.io/?owner=588`,
      accounts,
    },
    metisAndromeda: {
      url: `https://andromeda.metis.io/?owner=1088`,
      accounts,
    },
    polygonMumbai: {
      url: `https://matic-mumbai.chainstacklabs.com`,
      accounts,
    },
    matic: {
      url: `https://polygon-rpc.com`,
      accounts,
    },
    zkSyncEraTestnet: {
      url: "https://testnet.era.zksync.dev",
      ethNetwork: "goerli",
      zksync: true,
    },
    zkSyncEraMainnet: {
      url: "https://mainnet.era.zksync.io",
      ethNetwork: "mainnet",
      zksync: true,
      verifyURL: "https://zksync2-mainnet-explorer.zksync.io/contract_verification"
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  }
};

export default config;
