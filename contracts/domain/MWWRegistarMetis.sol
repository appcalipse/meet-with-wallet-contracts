// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "./MWWRegistarBase.sol";
import "../prices/NativePriceLibrary.sol";
import "../prices/NativePriceLibrary.sol";

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
        return NativePriceLibrary.convertUsdToMetis(oracle, usdPrice);
    }
}
