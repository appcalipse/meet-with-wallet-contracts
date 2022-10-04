// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "./helper/DIAOracleV2Interface.sol";
import "./MWWRegistarBase.sol";

/// @notice Main contract operations for Metis network
/// @author 9tails.eth
contract MWWRegistarMetis is MWWRegistarBase {
    DIAOracleV2Interface public oracle;

    constructor(address[] memory acceptableTokenAddresses)
        MWWRegistarBase(acceptableTokenAddresses)
    {}

    function setPriceFeed(address priceFeed) public onlyOwner {
        oracle = DIAOracleV2Interface(priceFeed);
    }

    function getNativeConvertedValue(uint256 usdPrice)
        public
        view
        override
        returns (uint256 amountInNative, uint256 timestamp)
    {
        (uint256 value, uint256 timestamp) = oracle.getValue("Metis/USD");
        uint256 absoluteValue = value / 100000000;
        uint256 perUSD = 1 / absoluteValue;
        return (perUSD * usdPrice, timestamp);
    }
}
