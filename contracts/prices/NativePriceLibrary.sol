// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./DIAOracleV2Interface.sol";

// @notice Interface for network specific price converter
// @author falleco.eth
library NativePriceLibrary {
    // @notice convert USD to Ethereum token
    function convertUsdToEthereum(AggregatorV3Interface feed, uint256 usdPrice)
        public
        view
        returns (uint256 amountInNative, uint256 timestamp)
    {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = feed.latestRoundData();

        uint8 decimals = feed.decimals();
        uint256 usdToWei = uint256(10**(18 + decimals)) / (uint256(price));
        uint256 _amountInNative = usdPrice * usdToWei;

        return (_amountInNative, timeStamp);
    }

    // @notice convert USD to Harmony token
    function convertUsdToHarmony(AggregatorV3Interface feed, uint256 usdPrice)
        public
        view
        returns (uint256 amountInNative, uint256 timestamp)
    {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = feed.latestRoundData();
        uint8 decimals = feed.decimals();
        uint256 usdToWei = uint256(10**(18 + decimals)) / (uint256(price));
        uint256 _amountInNative = usdPrice * usdToWei;

        return (_amountInNative, timeStamp);
    }

    // @notice convert USD to Polyton token
    function convertUsdToPolygon(AggregatorV3Interface feed, uint256 usdPrice)
        public
        view
        returns (uint256 amountInNative, uint256 timestamp)
    {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = feed.latestRoundData();
        uint8 decimals = feed.decimals();
        uint256 usdToWei = uint256(10**(18 + decimals)) / (uint256(price));
        uint256 _amountInNative = usdPrice * usdToWei;

        return (_amountInNative, timeStamp);
    }

    // @notice convert USD to Metis token
    function convertUsdToMetis(DIAOracleV2Interface oracle, uint256 usdPrice)
        public
        view
        returns (uint256 amountInNative, uint256 timestamp)
    {
        (uint256 value, uint256 timestamp) = oracle.getValue("Metis/USD");
        uint256 absoluteValue = value / 100000000;
        uint256 perUSD = 1 / absoluteValue;
        return (perUSD * usdPrice, timestamp);
    }
}
