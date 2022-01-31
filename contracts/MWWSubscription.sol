// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

library MWWStructs {
   struct Subscription {
        address owner;
        uint256 planId; //purposely an int so it can be expanded in the future. 
        uint256 expiryTime; //valid until when
        string domain;
        string configIpfsHash;
        uint256 registeredAt;
    }    
}

contract MWWSubscription is Ownable {

    mapping (address => bool) private admins;
    mapping (string => MWWStructs.Subscription) private subscriptions;
    mapping (address => string[]) private accountDomains;
    address public registerContract;
    mapping (string => address[]) private domainDelegates;

    event MWWSubscribed(address indexed subscriber, uint256 planId, uint256 expiryTime, string domain);
    event MWWDomainChanged(address indexed subscriber, string originalDomain, string newDomain);

    constructor(address _registar) {
        admins[msg.sender] = true;
        registerContract = _registar;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "Only admin can do it");
        _;
    }

    modifier onlyRegisterContract() {
        require(msg.sender == registerContract, "Only the register can call this");
        _;
    }

    function setRegisterContract(address _address) public onlyOwner {
        registerContract = _address;
    }

    function removeAdmin(address admin) public onlyOwner {
        admins[admin] = false;
    }
    
    function addAdmin(address admin) public onlyAdmin {
        admins[admin] = true;
    }

    function isDelegate(string memory domain) public view returns (bool) {
        address[] memory delegates = domainDelegates[domain];

        for(uint256 i = 0; i< delegates.length; i++) {
            if (delegates[i] == msg.sender) {
                return true;
            }
        }
        
        return false;
    }

    function isAllowedToManageDomain(string memory domain) private view returns (bool) {
        return isDelegate(domain) || subscriptions[domain].owner == msg.sender;
    }

    function getDelegatesForDomain(string memory domain) public view returns (address[] memory) {
        return domainDelegates[domain];
    }

    function addDelegate(string memory domain, address delegate) public {
        require(isAllowedToManageDomain(domain), "You are not allowed to do this");
        domainDelegates[domain].push(delegate);
    }

    function removeDelegate(string memory domain, address delegate) public {
        require(isAllowedToManageDomain(domain), "You are not allowed to do this");
        
        uint256 j = 0;
        address[] memory auxDelegates = new address[](domainDelegates[domain].length - 1);
        for(uint256 i = 0; i < domainDelegates[domain].length; i++) {
            if (domainDelegates[domain][i] != delegate) {
                auxDelegates[j] = domainDelegates[domain][i];
                j = j + 1;
            }
        }
        domainDelegates[domain] = auxDelegates;
    }

    function subscribe(address originalCaller, uint256 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash) public onlyRegisterContract returns (MWWStructs.Subscription memory) {
        return _subscribe(originalCaller, planId, planOwner, duration, domain, ipfsHash);
    }

    function addSubscription(uint256 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash) public onlyAdmin returns (MWWStructs.Subscription memory) {
        return _subscribe(address(0), planId, planOwner, duration, domain, ipfsHash);
    }

    function _subscribe(address originalCaller, uint256 planId, address planOwner, uint256 duration, string memory domain, string memory ipfsHash) private returns (MWWStructs.Subscription memory) {
        
        if(subscriptions[domain].owner != address(0) && subscriptions[domain].expiryTime > block.timestamp) { // check subscription exists and is not expired
            require(subscriptions[domain].owner == planOwner, "Domain registered for someone else");
            require(subscriptions[domain].planId == planId, "Domain registered with another plan");
            
            MWWStructs.Subscription memory existingSubscription = subscriptions[domain];
            existingSubscription.expiryTime = existingSubscription.expiryTime + duration;
            subscriptions[domain] = existingSubscription;

            return existingSubscription;
        }

        MWWStructs.Subscription memory subscription = MWWStructs.Subscription({
            owner: planOwner,
            planId: planId,
            expiryTime: block.timestamp + duration,
            domain: domain,
            configIpfsHash: ipfsHash,
            registeredAt: block.timestamp
        });

        if(originalCaller != address(0) && planOwner != originalCaller) {
            domainDelegates[domain].push(originalCaller);
        }
        
        subscriptions[domain] = subscription;

        accountDomains[planOwner].push(domain);

        emit MWWSubscribed(planOwner, planId, duration, domain);

        return subscription;
    }

    function changeDomain(string memory domain, string memory newDomain) public returns (MWWStructs.Subscription memory) {
        
        MWWStructs.Subscription memory subs = subscriptions[domain];

        require(isAllowedToManageDomain(domain) , "Only the owner or delegates can manage the domain");
        require(isSubscriptionActive(domain) == true, "Subscription expired");
        require(isSubscriptionActive(newDomain) == false, "Domain is already registered");

        subscriptions[newDomain] = MWWStructs.Subscription({
            owner: subs.owner,
            planId: subs.planId,
            expiryTime: subs.expiryTime,
            domain: newDomain,
            configIpfsHash: subs.configIpfsHash,
            registeredAt: subs.registeredAt
        });

        delete subscriptions[domain];

        string[] memory auxDomains = new string[](accountDomains[subs.owner].length);
        auxDomains[0] = newDomain;
        uint256 j = 1; 

        // TODO: same pattern can be used here (Check removePlan function comments in RegistarBase contract)
        for (uint256 i = 0; i < accountDomains[subs.owner].length; i++){
            
            if(keccak256(bytes(accountDomains[subs.owner][i])) != keccak256(bytes(domain))) {
                auxDomains[j]=(accountDomains[subs.owner][i]);
                j = j + 1;
            }
        }

        accountDomains[subs.owner] = auxDomains;

        emit MWWDomainChanged(subs.owner, domain, newDomain);

        return subscriptions[newDomain];
    }

    function changeSubscriptionConfigHash(string memory domain, string memory ipfsHash) public {
        require(isAllowedToManageDomain(domain) , "Only the owner or delegates can manage the domain");
        subscriptions[domain].configIpfsHash = ipfsHash;
    }

    function getSubscription(string memory domain) public view returns (MWWStructs.Subscription memory) {
        return subscriptions[domain];
    }
    
    function isSubscriptionActive(string memory domain) public view returns (bool) {
        return subscriptions[domain].expiryTime > block.timestamp;
    }

    function getDomainsForAccount(address account) public view returns (string[] memory) {
        return accountDomains[account];
    }
}