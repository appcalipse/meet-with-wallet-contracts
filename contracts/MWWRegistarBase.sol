// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";
import "./MWWSubscription.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

abstract contract MWWRegistarBase is Ownable, ReentrancyGuard {
    using SafeERC20 for ERC20;

    struct PlanInfo {
        string name;
        uint256 usdPrice;
        uint8 planId;
    }

    MWWSubscription private subscriptionContract;

    mapping (address => bool) private acceptableTokenAddresses;

    mapping (uint8 => PlanInfo) private availablePlans;

    uint8[] private planIds; 

    event MWWPurchase(address planOwner, uint256 timestamp);

    receive() external payable { } 

    constructor(address[] memory _acceptableTokenAddresses) {
        for (uint256 i = 0; i < _acceptableTokenAddresses.length; i++) {
            acceptableTokenAddresses[_acceptableTokenAddresses[i]] = true;
        }
    }
    
    function withdraw(address tokenAddress, uint256 amount, address destination) public onlyOwner nonReentrant {
        require(amount > 0, "Amount can't be zero");
        require(destination != address(0), "Destination can't be zero");
        require(destination != address(this), "Can't send to this contract");

        if(tokenAddress == address(0)) {
            (bool ok, ) = destination.call{value: amount}("");
            require(ok, "Failed to withdraw funds");
        } else {
            require(acceptableTokenAddresses[tokenAddress], "Token not accepted");
            ERC20 token = ERC20(tokenAddress);
            token.safeTransfer(destination, amount);
        }
    }

    function setSubscriptionContract(address _address) public onlyOwner {
        subscriptionContract = MWWSubscription(_address);
    }

    function addAcceptableToken(address tokenAddress) public onlyOwner {
        acceptableTokenAddresses[tokenAddress] = true;
    }

    function removeAcceptableToken(address tokenAddress) public onlyOwner {
        delete acceptableTokenAddresses[tokenAddress];
    }

    function addPlan(string memory _name, uint256 _usdPrice, uint8 _planId) public onlyOwner {     
        require(_planId != 0, "planId can't be 0");
        require(availablePlans[_planId].planId == 0, "Plan already exists");

        availablePlans[_planId] = PlanInfo(_name, _usdPrice, _planId);
        planIds.push(_planId);
    }

    function removePlan(uint8 _index, uint8 planId) public onlyOwner {
        planIds[_index] = planIds[planIds.length-1];
        planIds.pop();
        delete availablePlans[planId];
    }

    function purchaseWithNative(uint8 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash) public payable returns (MWWStructs.Subscription memory) {

        uint256 amount = getNativeConvertedValue(availablePlans[planId].usdPrice);

        uint256 finalPrice = getProportionalPriceForDuration(duration, amount);

        require(msg.value >= finalPrice, "Value is lower then plan price");
                    
        return _purchase(planId, planOwner, duration, domain, ipfsHash);
    }

    function purchaseWithToken(address tokenAddress, uint8 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash) public payable returns (MWWStructs.Subscription memory) {
        
        require(acceptableTokenAddresses[tokenAddress], "Token not accepted");
        
        ERC20 token = ERC20(tokenAddress);
        uint256 finalPrice = getProportionalPriceForDuration(duration, availablePlans[planId].usdPrice * 10 ** token.decimals());

        token.safeTransferFrom(msg.sender, address(this), finalPrice);
        
        return _purchase(planId, planOwner, duration, domain, ipfsHash);
    }

    function _purchase(uint8 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash) private returns (MWWStructs.Subscription memory) {

        require(address(subscriptionContract) != address(0), "Subscription contract not set");
        require(availablePlans[planId].usdPrice != 0x0, "Plan does not exists");

        MWWStructs.Subscription memory subs = subscriptionContract.subscribe(msg.sender, planId, planOwner, duration, domain, ipfsHash);
        
        emit MWWPurchase(planOwner, block.timestamp);

        return subs;
    }

    function getAvailablePlans() public view returns (PlanInfo[] memory) {
        PlanInfo[] memory plans = new PlanInfo[](planIds.length);

        for (uint256 i = 0; i < planIds.length; i++) {
            plans[i] = availablePlans[planIds[i]];
        }
        return plans;
    }

    function getProportionalPriceForDuration(uint256 duration, uint256 yearlyPrice) private pure returns (uint256) {
        uint256 proportion = (duration * uint256(10**8)) / (31_540_000);
        return (yearlyPrice * proportion) / (10**8);   
    }

    function getNativeConvertedValue(uint256 usdPrice) public view virtual returns (uint256);
}