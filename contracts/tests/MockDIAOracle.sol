// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "../prices/DIAOracleV2Interface.sol";

contract MockDIAOracle is DIAOracleV2Interface {
    function getValue(string memory key)
        external
        view
        override
        returns (uint128, uint128)
    {
        return ((uint128)(14332124956), (uint128)(block.timestamp) - 1 hours);
    }
}
