## `MWWDomain`

The main Meet With Wallet contract that handles the domain registration




### `onlyAdmin()`

restrict execution for authorized admins only



### `onlyRegisterContract()`






### `constructor(address _registar)` (public)





### `setRegisterContract(address _address)` (public)

Create OR update a boss, only the contract owner can perform this action.




### `removeAdmin(address admin)` (public)

removes admin status from a specific address




### `addAdmin(address admin)` (public)

adds admin status from a specific address




### `isDelegate(string domain) → bool` (public)





### `addDelegate(string domain, address delegate)` (public)





### `removeDelegate(string domain, address delegate)` (public)





### `subscribe(address originalCaller, uint256 planId, address planOwner, uint256 duration, string domain, string ipfsHash) → struct MWWStructs.Domain` (public)





### `addDomains(struct MWWStructs.Domain[] domainsToAdd) → bool` (public)





### `changeDomain(string domain, string newDomain) → struct MWWStructs.Domain` (public)





### `changeDomainConfigHash(string domain, string ipfsHash)` (public)





### `isSubscriptionActive(string domain) → bool` (public)





### `getDomainsForAccount(address account) → string[]` (public)





### `getDelegatesForDomain(string domain) → address[]` (public)






### `MWWSubscribed(address subscriber, uint256 planId, uint256 expiryTime, string domain)`





### `MWWDomainChanged(address subscriber, string originalDomain, string newDomain)`







