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
        uint8 planId; // TODO: make this to uint256
    }

    MWWSubscription private subscriptionContract;

    mapping (address => ERC20) private acceptableTokens;
    mapping (address => bool) private acceptableTokenAddresses;

    mapping (uint8 => PlanInfo) private availablePlans;

    uint8[] planIds; // make this private

    event MWWPurchase(address planOwner, uint256 timestamp);

    receive() external payable { } 

    constructor(address[] memory _acceptableTokenAddresses) {
        // TODO: change from uin8 to uint256 or uint directly to save gas 
        for (uint8 i = 0; i < _acceptableTokenAddresses.length; i++) {
            // TODO: are you storing key/values here as the same ones ? 
            acceptableTokens[_acceptableTokenAddresses[i]] = ERC20(_acceptableTokenAddresses[i]);
            acceptableTokenAddresses[_acceptableTokenAddresses[i]] = true;
        }
    }
    
    // TODO: If you are the owner, i don't know why so many checks are needed, you will know that you gotta
    // pass the correct parameters. but if you're planning that this contract gets deployed multiple times
    // by other parties, then it's highly likely that they will withdraw eth to the contract address instead of EOA.
    // This means transfer is buggy and should be using `call.value`. 
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
            // TODO: NO NEED TO HAVE THIS LINE
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
        // TODO: do the same `delete` as above line here for code consistency.
        acceptableTokenAddresses[tokenAddress] = false;
    }

    function addPlan(string memory _name, uint256 _usdPrice, uint8 _planId) public onlyOwner {
        // bool planAdded = false;
        // for (uint i=0; i < planIds.length; i++) {
        //     if (_planId == planIds[i]) {
        //         planAdded = true;
        //     }
        // }
        // require(planAdded == false, "Plan already exists");

        // TODO: I removed the above code, too complicated for no reason. 
        // We can do something like this: Though, question, can planId be ever zero ?
        // if yes, ping me, if not leave, this solution        
        require(_planId != 0, "planId can't be 0");
        require(availablePlans[_planId].planId == 0, "Plan already exists");

        availablePlans[_planId] = PlanInfo(_name, _usdPrice, _planId);
        planIds.push(_planId);
    }

    function removePlan(uint8 _planId) public onlyOwner {
        // TODO: do we care about the order of elements in planIds ? 
        // If not, the code here can be changed to:
        
        // Below modification increases gas costs of `addPlan` by 23000 GAS approximately.
        // Though, removePlan decreases by 16000. So with my solution, we lose 7,000 GAS. 
        // Depends on if you want my better-readability solution or not for `removePlan`.

        // ====== modified code =======
        //// we add one more field `index` on the struct and when we add new plan, we store the index where it would go on planIds
        // uint index = availablePlans[_planId].index; 
        // planIds[index] = planIds[planIds.length-1];
        // planIds.pop();
        // delete availablePlans[_planId];

        // ======== original code ========
        // uint8[] memory auxPlans = new uint8[](planIds.length - 1);
        // uint8 j = 0;

        // for(uint8 i = 0; i < planIds.length; i++) {
        //     if (planIds[i] != _planId) {
        //         auxPlans[j] = planIds[i];
        //         j = j + 1;
        //     }
        // }
        // delete availablePlans[_planId];
        // planIds = auxPlans;
    }

    function purchaseWithNative(uint8 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash) public payable returns (MWWStructs.Subscription memory) {

        uint256 amount = getNativeConvertedValue(availablePlans[planId].usdPrice);

        uint256 finalPrice = getProportionalPriceForDuration(duration, amount);

        require(msg.value >= finalPrice, "Value is lower then plan price");
        // TODO: I don't understand this check, think about it. above line should be enough.
        require(msg.sender.balance >= finalPrice, "Sender doesn't have enough balance");
        
        // TODO: hm, this seems wrong. If this line's idea is to get money from user's account to this smart contract
        // then, the below line is not needed as msg.value >= finalPrice check already does this. Think about this
        // and remove it if I am right.
        payable(this).transfer(finalPrice);
            
       return _purchase(planId, planOwner, duration, domain, ipfsHash);
    }

    function purchaseWithToken(address tokenAddress, uint8 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash) public payable returns (MWWStructs.Subscription memory) {
        
        require(acceptableTokenAddresses[tokenAddress], "Token not accepted");
        
        // TODO: afrer looking around, `acceptableTokens` gets only used here.
        // its key/values seem to be the same tokenAddress. I'd say this mapping is not
        // necessary at all, because in this function, you anyways pass tokenAddress already.
        // you do this check require(acceptableTokenAddresses[tokenAddress], "Token not accepted");
        // which means that tokenAddress user passed is correct. Makes sense ? so I'd directly work
        // on tokenAddress that was passed. 
        ERC20 token = acceptableTokens[tokenAddress];
        uint256 finalPrice = getProportionalPriceForDuration(duration, availablePlans[planId].usdPrice * 10 ** token.decimals());
        // do you need allowance check at all ? transferFrom will anyways fail if not enough allowance is set.
        // I'd remove allowance check.
        require(token.allowance(msg.sender, address(this)) >= finalPrice , "Allowance lower than needed");
        // if you want your tokens to be very old ERC20 tokens, you should be using safeTransferFrom(library from OZ)
        require(token.transferFrom(msg.sender, address(this), finalPrice), "Failed to transfer token");
        
        return _purchase(planId, planOwner, duration, domain, ipfsHash);
    }

    function _purchase(uint8 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash) private returns (MWWStructs.Subscription memory) {
        // address(0) should be enough. never needed 0x0
        require(address(subscriptionContract) != address(0x0), "Subscription contract not set");
        require(availablePlans[planId].usdPrice != 0x0, "Plan does not exists");

        MWWStructs.Subscription memory subs = subscriptionContract.subscribe(planId, planOwner, duration, domain, ipfsHash);
        
        emit MWWPurchase(planOwner, block.timestamp);

        return subs;
    }

    function getAvailablePlans() public view returns (PlanInfo[] memory) {
        PlanInfo[] memory plans = new PlanInfo[](planIds.length);
        // TODO: from uint8 to uint256
        for (uint8 i = 0; i < planIds.length; i++) {
            plans[i] = availablePlans[planIds[i]];
        }
        return plans;
    }

    // TODO: remove safeMath at all and just directly do all arithmetic operations. solidity fixed it in 0.8 versions.
    function getProportionalPriceForDuration(uint256 duration, uint256 yearlyPrice) private pure returns (uint256) {
        uint256 proportion = duration.mul(uint256(10**8)).div(31_540_000);
        return yearlyPrice.mul(proportion).div(10**8);   
    }

    function getNativeConvertedValue(uint256 usdPrice) public view virtual returns (uint256);
}