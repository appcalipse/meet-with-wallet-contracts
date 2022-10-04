/**
 *Submitted for verification at Etherscan.io on 2020-12-10
 */

// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    // Example class - a mock class using delivering from ERC20
    constructor(address destination) ERC20("Mock USDC", "USDC") {
        _mint(destination, 100 * 10**(decimals()));
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
