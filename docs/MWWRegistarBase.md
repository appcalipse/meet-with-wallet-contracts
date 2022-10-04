## `MWWRegistarBase`

Base contract to handle common operations on different registars





### `constructor(address[] _acceptableTokens)` (internal)





### `withdraw(address tokenAddress, uint256 amount, address destination)` (public)





### `setDomainContract(address _address)` (public)





### `addAcceptableToken(address tokenAddress)` (public)





### `removeAcceptableToken(address tokenAddress)` (public)





### `addPlan(string _name, uint256 _usdPrice, uint8 _planId)` (public)





### `removePlan(uint8 _index, uint8 planId)` (public)





### `purchaseWithNative(uint8 planId, address planOwner, uint256 duration, string domain, string ipfsHash) → struct MWWStructs.Domain` (public)





### `purchaseWithToken(address tokenAddress, uint8 planId, address planOwner, uint256 duration, string domain, string ipfsHash) → struct MWWStructs.Domain` (public)





### `getAvailablePlans() → struct MWWRegistarBase.PlanInfo[]` (public)





### `getNativeConvertedValue(uint256 usdPrice) → uint256 amountInNative, uint256 timestamp` (public)






### `MWWPurchase(address planOwner, uint256 timestamp)`






### `PlanInfo`


string name


uint256 usdPrice



