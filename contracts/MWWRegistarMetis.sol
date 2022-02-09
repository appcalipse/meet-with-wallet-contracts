// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "./DIAOracleV2.sol";
import "./MWWRegistarBase.sol";
import "hardhat/console.sol";

contract MWWRegistarMetis is MWWRegistarBase {
	DIAOracleV2 public oracle;	

    constructor(address[] memory acceptableTokenAddresses) MWWRegistarBase(acceptableTokenAddresses) {}

	function setPriceFeed(address priceFeed) public onlyOwner {
		oracle = new DIAOracleV2(priceFeed);
	}

    function getNativeConvertedValue(uint256 usdPrice) public view override returns (uint256) {
		(value, timestamp) = oracle.getValue("Metis/USD");
		uint256 absoluteValue = value / 100000000;
		uint256 perUSD = 1 / absoluteValue;
		return perUSD * usdPrice;
	}
}
