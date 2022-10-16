// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "./AbstractPaidMeeting.sol";
import "../prices/NativePriceLibrary.sol";
import "../prices/NativePriceLibrary.sol";

/// @notice Main contract operations for Metis network
/// @author 9tails.eth
contract MetisPaidMeeting is AbstractPaidMeeting {
    DIAOracleV2Interface public oracle;

    constructor(address acceptableTokenAddresses)
        AbstractPaidMeeting(acceptableTokenAddresses)
    {}

    function setPriceFeed(address priceFeed) public {
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
