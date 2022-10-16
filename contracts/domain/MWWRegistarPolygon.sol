// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./MWWRegistarBase.sol";
import "../prices/NativePriceLibrary.sol";

/// @notice Main contract operations for Polygon network
/// @author 9tails.eth
contract MWWRegistarPolygon is MWWRegistarBase {
    AggregatorV3Interface public priceFeed;

    constructor(address[] memory acceptableTokenAddresses)
        MWWRegistarBase(acceptableTokenAddresses)
    {}

    function setPriceFeed(address _priceFeedAddress) public onlyOwner {
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    function getNativeConvertedValue(uint256 usdPrice)
        public
        view
        override
        returns (uint256 amountInNative, uint256 timestamp)
    {
        return NativePriceLibrary.convertUsdToPolygon(priceFeed, usdPrice);
    }
}
