// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "witnet-solidity-bridge/contracts/interfaces/IWitnetPriceRouter.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MWWRegistarBase.sol";
import "hardhat/console.sol";

contract MWWRegistarMetis is MWWRegistarBase {
	IWitnetPriceRouter public router;

    constructor(address[] memory acceptableTokenAddresses) MWWRegistarBase(acceptableTokenAddresses) {
		router = IWitnetPriceRouter(0xD39D4d972C7E166856c4eb29E54D3548B4597F53);
	}

    function getNativeConvertedValue(int256 usdPrice) public view override returns (int256) {
    	(_price,,) = router.valueFor(bytes32(0x4ba45817));
	}
    
}
