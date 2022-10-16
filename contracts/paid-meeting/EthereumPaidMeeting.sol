// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./AbstractPaidMeeting.sol";
import "../prices/NativePriceLibrary.sol";

/// @notice Paid Meeting contract implementation specific for Ethereum network
/// @author falleco.eth
contract EthereumPaidMeeting is AbstractPaidMeeting {
    AggregatorV3Interface public priceFeed;

    constructor(address acceptableTokenAddresses)
        AbstractPaidMeeting(acceptableTokenAddresses)
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
        return NativePriceLibrary.convertUsdToEthereum(priceFeed, usdPrice);
    }
}
