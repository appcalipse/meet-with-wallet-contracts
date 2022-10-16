// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./AbstractPaidMeeting.sol";
import "../prices/NativePriceLibrary.sol";

/// @notice Paid Meeting contract implementation specific for Harmony network
/// @author falleco.eth
contract HarmonyPaidMeeting is AbstractPaidMeeting {
    AggregatorV3Interface priceFeed;

    constructor(address acceptableTokenAddresses)
        AbstractPaidMeeting(acceptableTokenAddresses)
    {}

    function setPriceFeed(address _priceFeedAddress) public {
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    function getNativeConvertedValue(uint256 usdPrice)
        public
        view
        override
        returns (uint256 amountInNative, uint256 timestamp)
    {
        return NativePriceLibrary.convertUsdToHarmony(priceFeed, usdPrice);
    }
}
