// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";
import "./MWWSubscription.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

abstract contract MWWRegistarBase is Ownable, ReentrancyGuard {
    using SafeMath for *;

    struct PlanInfo {
        string name;
        uint256 usdPrice;
        uint8 planId;
    }

    MWWSubscription private subscriptionContract;

    mapping (address => ERC20) private acceptableTokens;
    mapping (address => bool) private acceptableTokenAddresses;

    mapping (uint8 => PlanInfo) private availablePlans;

    uint8[] planIds;

    event MWWPurchase(address planOwner, uint256 timestamp);

    receive() external payable { } 

    constructor(address[] memory _acceptableTokenAddresses) {
        for (uint8 i = 0; i < _acceptableTokenAddresses.length; i++) {
            acceptableTokens[_acceptableTokenAddresses[i]] = ERC20(_acceptableTokenAddresses[i]);
            acceptableTokenAddresses[_acceptableTokenAddresses[i]] = true;
        }
    }

    function withdraw(address tokenAddress, uint256 amount, address destination) public onlyOwner nonReentrant {
        require(amount > 0, "Amount can't be zero");
        require(destination != address(0), "Destination can't be zero");
        require(destination != address(this), "Can't send to this contract");

        if(tokenAddress == address(0)) {
            require(address(this).balance >= amount, "Not enough funds to be withdrawn");
            payable(destination).transfer(amount);
        } else {
            require(acceptableTokenAddresses[tokenAddress], "Token not accepted");
            ERC20 token = acceptableTokens[tokenAddress];
            require(token.balanceOf(address(this)) >= amount, "Not enough funds to be withdrawn");
            require(token.transfer(destination, amount), "Failed to withdraw token");
        }
    }

    function setSubscriptionContract(address _address) public onlyOwner {
        subscriptionContract = MWWSubscription(_address);
    }

    function addAcceptableToken(address tokenAddress) public onlyOwner {
        acceptableTokens[tokenAddress] = ERC20(tokenAddress);
        acceptableTokenAddresses[tokenAddress] = true;
    }

    function removeAcceptableToken(address tokenAddress) public onlyOwner {
        delete acceptableTokens[tokenAddress];
        acceptableTokenAddresses[tokenAddress] = false;
    }

    function addPlan(string memory _name, uint256 _usdPrice, uint8 _planId) public onlyOwner {
        bool planAdded = false;
        for (uint i=0; i < planIds.length; i++) {
            if (_planId == planIds[i]) {
                planAdded = true;
            }
        }
        require(planAdded == false, "Plan already exists");
        availablePlans[_planId] = PlanInfo(_name, _usdPrice, _planId);
        planIds.push(_planId);
    }

    function removePlan(uint8 _planId) public onlyOwner {
        uint8[] memory auxPlans = new uint8[](planIds.length - 1);
        uint8 j = 0;

        for(uint8 i = 0; i < planIds.length; i++) {
            if (planIds[i] != _planId) {
                auxPlans[j] = planIds[i];
                j = j + 1;
            }
        }
        delete availablePlans[_planId];
        planIds = auxPlans;
    }

    function purchaseWithNative(uint8 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash) public payable returns (MWWStructs.Subscription memory) {

        uint256 amount = getNativeConvertedValue(availablePlans[planId].usdPrice);

        uint256 finalPrice = getProportionalPriceForDuration(duration, amount);

        require(msg.value >= finalPrice, "Value is lower then plan price");
        require(msg.sender.balance >= finalPrice, "Sender doesn't have enough balance");
        
        payable(this).transfer(finalPrice);
            
       return _purchase(planId, planOwner, duration, domain, ipfsHash);
    }

    function purchaseWithToken(address tokenAddress, uint8 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash) public payable returns (MWWStructs.Subscription memory) {
        
        require(acceptableTokenAddresses[tokenAddress], "Token not accepted");
        
        ERC20 token = acceptableTokens[tokenAddress];
        uint256 finalPrice = getProportionalPriceForDuration(duration, availablePlans[planId].usdPrice * 10 ** token.decimals());
        require(token.allowance(msg.sender, address(this)) >= finalPrice , "Allowance lower than needed");
        require(token.transferFrom(msg.sender, address(this), finalPrice), "Failed to transfer token");
        
        return _purchase(planId, planOwner, duration, domain, ipfsHash);
    }

    function _purchase(uint8 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash) private returns (MWWStructs.Subscription memory) {
        require(address(subscriptionContract) != address(0x0), "Subscription contract not set");
        require(availablePlans[planId].usdPrice != 0x0, "Plan does not exists");

        MWWStructs.Subscription memory subs = subscriptionContract.subscribe(planId, planOwner, duration, domain, ipfsHash);
        
        emit MWWPurchase(planOwner, block.timestamp);

        return subs;
    }

    function getAvailablePlans() public view returns (PlanInfo[] memory) {
        PlanInfo[] memory plans = new PlanInfo[](planIds.length);
        for (uint8 i = 0; i < planIds.length; i++) {
            plans[i] = availablePlans[planIds[i]];
        }
        return plans;
    }

    function getProportionalPriceForDuration(uint256 duration, uint256 yearlyPrice) private pure returns (uint256) {
        uint256 proportion = duration.mul(uint256(10**8)).div(31_540_000);
        return yearlyPrice.mul(proportion).div(10**8);   
    }

    function getNativeConvertedValue(uint256 usdPrice) public view virtual returns (uint256);
}