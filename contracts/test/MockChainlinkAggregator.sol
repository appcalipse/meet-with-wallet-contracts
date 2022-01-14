// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract MockChainlinkAggregator is AggregatorV3Interface {

    function decimals()
    external
    override
    pure
    returns (
      uint8
    ) {
        return 8;
    }

  function description()
    external
    pure
    override
    returns (
      string memory
    ) {
        return "Mock Chainlink Aggregator";
    }

  function version()
    external
    override
    pure
    returns (
      uint256
    ) {
        return 3;
    }

  // getRoundData and latestRoundData should both raise "No data present"
  // if they do not have data to report, instead of returning unset values
  // which could be misinterpreted as actual reported values.
  function getRoundData(
    uint80 _roundId
  )
    external
    override
    pure
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
        return (1, 220206450, 1537396800000, 1537396800000, 1);
    }

  function latestRoundData()
    external
    override
    pure
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
    return (1, 220206450, 1537396800000, 1537396800000, 1);
    }

}
