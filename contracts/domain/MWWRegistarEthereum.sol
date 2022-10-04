// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./MWWRegistarBase.sol";

/// @notice Main contract operations for Ethereum network
/// @author 9tails.eth
contract MWWRegistarEthereum is MWWRegistarBase {
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
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        uint8 decimals = priceFeed.decimals();

        uint256 usdToWei = uint256(10**(18 + decimals)) / (uint256(price));

        uint256 _amountInNative = usdPrice * usdToWei;

        return (_amountInNative, timeStamp);
    }
}
