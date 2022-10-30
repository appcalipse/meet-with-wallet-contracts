// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

interface DIAOracleV2Interface {
    function getValue(string memory key)
        external
        view
        returns (uint128 price, uint128 timestamp);
}
